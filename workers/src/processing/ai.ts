import {
  EMAIL_CATEGORIES,
  type ClassificationResult,
  type EmailCategory,
  type ExtractedEntity,
} from './types';
import {
  withSecuritySystemPrompt,
  wrapUntrustedEmailContent,
} from '../security/prompt-safety';

const CLASSIFICATION_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

function extractJsonObject<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function heuristicClassification(input: {
  subject: string | null;
  sender: string | null;
  bodyText: string | null;
}): ClassificationResult {
  const haystack =
    `${input.subject ?? ''} ${input.sender ?? ''} ${input.bodyText ?? ''}`
      .toLowerCase()
      .trim();

  const rules: Array<{ category: EmailCategory; patterns: RegExp[] }> = [
    { category: 'invoice', patterns: [/invoice/, /billing statement/] },
    { category: 'receipt', patterns: [/receipt/, /order confirmation/] },
    { category: 'subscription', patterns: [/subscription/, /renewal/] },
    { category: 'flight', patterns: [/flight/, /boarding pass/, /itinerary/] },
    { category: 'hotel', patterns: [/hotel/, /check-in/, /reservation/] },
    { category: 'newsletter', patterns: [/newsletter/, /unsubscribe/] },
    { category: 'otp', patterns: [/verification code/, /one-time/, /\botp\b/] },
    {
      category: 'security',
      patterns: [/security alert/, /suspicious sign-in/],
    },
    {
      category: 'meeting',
      patterns: [/calendar invitation/, /meeting invite/],
    },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return { category: rule.category, confidence: 0.72 };
    }
  }

  return { category: 'other', confidence: 0.5 };
}

function heuristicEntities(input: {
  subject: string | null;
  sender: string | null;
  bodyText: string | null;
  category: EmailCategory;
}): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const senderEmail = input.sender?.match(/<([^>]+)>/)?.[1] ?? input.sender;
  const senderName =
    input.sender?.replace(/<[^>]+>/g, '').trim() ||
    senderEmail ||
    'Unknown sender';

  if (senderEmail) {
    entities.push({
      entityType: 'contact',
      confidence: 0.8,
      data: { name: senderName, email: senderEmail },
    });
  }

  const domain = senderEmail?.split('@')[1];
  if (domain) {
    entities.push({
      entityType: 'company',
      confidence: 0.7,
      data: { name: domain.split('.')[0], domain },
    });
  }

  if (input.category === 'invoice' || input.category === 'receipt') {
    const amountMatch = `${input.subject ?? ''} ${input.bodyText ?? ''}`.match(
      /\$\s?(\d+(?:\.\d{2})?)/,
    );
    if (amountMatch) {
      entities.push({
        entityType: input.category,
        confidence: 0.65,
        data: {
          vendor: senderName,
          amount: Number(amountMatch[1]),
          currency: 'USD',
        },
      });
    }
  }

  if (input.category === 'subscription') {
    const amountMatch = `${input.subject ?? ''} ${input.bodyText ?? ''}`.match(
      /\$\s?(\d+(?:\.\d{2})?)/,
    );
    entities.push({
      entityType: 'subscription',
      confidence: 0.68,
      data: {
        vendor: senderName,
        amount: amountMatch ? Number(amountMatch[1]) : null,
        currency: 'USD',
        status: 'active',
      },
    });
  }

  if (
    input.category === 'flight' ||
    input.category === 'hotel' ||
    input.category === 'travel'
  ) {
    const destinationMatch =
      `${input.subject ?? ''} ${input.bodyText ?? ''}`.match(
        /to\s+([A-Za-z][A-Za-z\s]{1,30})/i,
      );
    entities.push({
      entityType: input.category === 'hotel' ? 'hotel' : 'flight',
      confidence: 0.66,
      data: {
        destination: destinationMatch?.[1]?.trim() ?? null,
        flight:
          input.category === 'flight'
            ? (input.subject ?? 'Flight itinerary')
            : null,
        hotel:
          input.category === 'hotel'
            ? (input.subject ?? 'Hotel booking')
            : null,
      },
    });
  }

  return entities;
}

export async function classifyEmail(
  env: Env,
  input: {
    subject: string | null;
    sender: string | null;
    bodyText: string | null;
  },
): Promise<ClassificationResult> {
  if (!env.AI) {
    return heuristicClassification(input);
  }

  try {
    const response = await env.AI.run(CLASSIFICATION_MODEL, {
      messages: [
        {
          role: 'system',
          content: withSecuritySystemPrompt(
            'Classify the email into one category and return JSON only: {"category":"invoice","confidence":0.9}. Allowed categories: ' +
              EMAIL_CATEGORIES.join(', '),
          ),
        },
        {
          role: 'user',
          content: wrapUntrustedEmailContent(input),
        },
      ],
      max_tokens: 120,
    });

    const text =
      typeof response === 'object' &&
      response &&
      'response' in response &&
      typeof response.response === 'string'
        ? response.response
        : JSON.stringify(response);

    const parsed = extractJsonObject<ClassificationResult>(text);
    if (
      parsed &&
      EMAIL_CATEGORIES.includes(parsed.category) &&
      typeof parsed.confidence === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Fall back to heuristics when Workers AI is unavailable locally.
  }

  return heuristicClassification(input);
}

export async function extractEntities(
  env: Env,
  input: {
    subject: string | null;
    sender: string | null;
    bodyText: string | null;
    category: EmailCategory;
  },
): Promise<ExtractedEntity[]> {
  if (!env.AI) {
    return heuristicEntities(input);
  }

  try {
    const response = await env.AI.run(CLASSIFICATION_MODEL, {
      messages: [
        {
          role: 'system',
          content: withSecuritySystemPrompt(
            'Extract structured entities from the email. Return JSON only: {"entities":[{"entityType":"contact","confidence":0.9,"data":{"name":"Jane","email":"jane@example.com"}}]}. Entity types may include contact, company, invoice, receipt, subscription, flight, hotel, meeting, task.',
          ),
        },
        {
          role: 'user',
          content: wrapUntrustedEmailContent(input),
        },
      ],
      max_tokens: 500,
    });

    const text =
      typeof response === 'object' &&
      response &&
      'response' in response &&
      typeof response.response === 'string'
        ? response.response
        : JSON.stringify(response);

    const parsed = extractJsonObject<{ entities?: ExtractedEntity[] }>(text);
    if (parsed?.entities?.length) {
      return parsed.entities.filter(
        (entity) =>
          typeof entity.entityType === 'string' &&
          typeof entity.confidence === 'number' &&
          entity.data &&
          typeof entity.data === 'object',
      );
    }
  } catch {
    // Fall back to heuristics when Workers AI is unavailable locally.
  }

  return heuristicEntities(input);
}

export async function generateEmbedding(
  env: Env,
  text: string,
): Promise<number[] | null> {
  if (!env.AI || !text.trim()) {
    return null;
  }

  try {
    const response = await env.AI.run(EMBEDDING_MODEL, {
      text: [text.slice(0, 6000)],
    });

    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray(response.data) &&
      Array.isArray(response.data[0])
    ) {
      return response.data[0] as number[];
    }
  } catch {
    return null;
  }

  return null;
}
