import type { ParsedMimeAttachment, ParsedMimeMessage } from './types';

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, '')
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function decodeBody(content: string, encoding: string | null): string {
  const normalized = encoding?.toLowerCase() ?? '';
  if (normalized.includes('quoted-printable')) {
    return decodeQuotedPrintable(content);
  }
  return content;
}

function parseHeaders(rawHeaders: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = rawHeaders.split(/\r?\n/);
  let currentKey: string | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    if (/^\s+/.test(line) && currentKey) {
      headers[currentKey] = `${headers[currentKey]} ${line.trim()}`;
      continue;
    }

    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    headers[key] = value;
    currentKey = key;
  }

  return headers;
}

function parseAddressList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getBoundary(contentType: string | undefined): string | null {
  if (!contentType) {
    return null;
  }

  const match = contentType.match(/boundary="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

function parseMultipart(
  body: string,
  boundary: string,
): Array<{ headers: Record<string, string>; body: string }> {
  const delimiter = `--${boundary}`;
  const parts = body.split(delimiter).slice(1, -1);

  return parts.map((part) => {
    const trimmed = part.replace(/^\r?\n/, '').replace(/--\s*$/, '');
    const splitIndex = trimmed.search(/\r?\n\r?\n/);
    if (splitIndex === -1) {
      return { headers: {}, body: trimmed };
    }

    const rawHeaders = trimmed.slice(0, splitIndex);
    const partBody = trimmed.slice(splitIndex).replace(/^\r?\n\r?\n/, '');
    return {
      headers: parseHeaders(rawHeaders),
      body: partBody,
    };
  });
}

function filenameFromPart(headers: Record<string, string>): string | null {
  const disposition = headers['content-disposition'];
  if (!disposition) {
    return null;
  }

  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

function collectParts(
  headers: Record<string, string>,
  body: string,
  attachments: ParsedMimeAttachment[],
  state: { bodyText: string | null; bodyHtml: string | null },
): void {
  const contentType = headers['content-type'] ?? '';
  const boundary = getBoundary(contentType);

  if (boundary) {
    for (const part of parseMultipart(body, boundary)) {
      collectParts(part.headers, part.body, attachments, state);
    }
    return;
  }

  const mimeType =
    contentType.split(';')[0]?.trim().toLowerCase() ?? 'text/plain';
  const encoding = headers['content-transfer-encoding'] ?? null;
  const decoded = decodeBody(body, encoding);
  const filename = filenameFromPart(headers);

  if (filename) {
    const bytes = new TextEncoder().encode(decoded);
    attachments.push({
      filename,
      mimeType,
      content: bytes,
      sizeBytes: bytes.byteLength,
    });
    return;
  }

  if (mimeType === 'text/html' && !state.bodyHtml) {
    state.bodyHtml = decoded;
    return;
  }

  if (mimeType.startsWith('text/') && !state.bodyText) {
    state.bodyText = decoded;
  }
}

export function parseMimeMessage(raw: string): ParsedMimeMessage {
  const splitIndex = raw.search(/\r?\n\r?\n/);
  const rawHeaders = splitIndex === -1 ? raw : raw.slice(0, splitIndex);
  const body =
    splitIndex === -1 ? '' : raw.slice(splitIndex).replace(/^\r?\n\r?\n/, '');
  const headers = parseHeaders(rawHeaders);
  const attachments: ParsedMimeAttachment[] = [];
  const state = {
    bodyText: null as string | null,
    bodyHtml: null as string | null,
  };

  collectParts(headers, body, attachments, state);

  if (!state.bodyText && !headers['content-type']?.includes('multipart')) {
    state.bodyText = decodeBody(
      body,
      headers['content-transfer-encoding'] ?? null,
    );
  }

  return {
    headers,
    subject: headers.subject ?? null,
    sender: headers.from ?? null,
    recipients: parseAddressList(headers.to),
    cc: parseAddressList(headers.cc),
    bcc: parseAddressList(headers.bcc),
    bodyText: state.bodyText,
    bodyHtml: state.bodyHtml,
    attachments,
  };
}

export function buildEmbeddingText(message: ParsedMimeMessage): string {
  const parts = [
    message.subject,
    message.sender,
    message.bodyText,
    message.bodyHtml?.replace(/<[^>]+>/g, ' '),
  ].filter(Boolean);

  return parts.join('\n').slice(0, 6000);
}
