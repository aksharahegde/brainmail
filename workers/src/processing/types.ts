export type EmailProcessingStatus =
  | 'pending'
  | 'parsed'
  | 'classified'
  | 'entities_extracted'
  | 'embedded'
  | 'completed'
  | 'failed';

export type EmailIngestedMessage = {
  type: 'email_ingested';
  emailId: string;
  userId: string;
  sourceId: string;
};

export type EmailPipelineMessage = {
  type: 'process_email';
  emailId: string;
  userId: string;
};

export type AttachmentPipelineMessage = {
  type: 'process_attachments';
  emailId: string;
  userId: string;
};

export const EMAIL_CATEGORIES = [
  'invoice',
  'receipt',
  'subscription',
  'purchase',
  'travel',
  'flight',
  'hotel',
  'newsletter',
  'marketing',
  'social',
  'support',
  'personal',
  'work',
  'meeting',
  'job',
  'security',
  'finance',
  'promotion',
  'otp',
  'other',
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export type ClassificationResult = {
  category: EmailCategory;
  confidence: number;
};

export type ExtractedEntity = {
  entityType: string;
  confidence: number;
  data: Record<string, unknown>;
};

export type ParsedMimeAttachment = {
  filename: string;
  mimeType: string;
  content: Uint8Array;
  sizeBytes: number;
};

export type ParsedMimeMessage = {
  headers: Record<string, string>;
  subject: string | null;
  sender: string | null;
  recipients: string[];
  cc: string[];
  bcc: string[];
  bodyText: string | null;
  bodyHtml: string | null;
  attachments: ParsedMimeAttachment[];
};
