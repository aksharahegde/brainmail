import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  companyId: text('company_id'),
  sourceId: text('source_id'),
  invoiceNumber: text('invoice_number'),
  amount: real('amount'),
  currency: text('currency'),
  invoiceDate: text('invoice_date'),
  dueDate: text('due_date'),
  confidence: real('confidence'),
  attachmentId: text('attachment_id'),
});

export const receipts = sqliteTable('receipts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  companyId: text('company_id'),
  sourceId: text('source_id'),
  amount: real('amount'),
  currency: text('currency'),
  receiptDate: text('receipt_date'),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  companyId: text('company_id'),
  sourceId: text('source_id'),
  name: text('name'),
  amount: real('amount'),
  currency: text('currency'),
  billingPeriod: text('billing_period'),
  renewalDate: text('renewal_date'),
  status: text('status'),
});
