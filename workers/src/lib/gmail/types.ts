export type GmailSyncStatus =
  | 'pending'
  | 'syncing'
  | 'idle'
  | 'watching'
  | 'error';

export type GmailSyncMode = 'initial' | 'incremental';

export type GmailSyncQueueMessage =
  | {
      type: 'sync_account';
      accountId: string;
      userId: string;
      mode: GmailSyncMode;
    }
  | {
      type: 'sync_all';
      mode: GmailSyncMode;
    }
  | {
      type: 'renew_watches';
    };

export type GmailProfile = {
  emailAddress: string;
  historyId: string;
  messagesTotal: number;
  threadsTotal: number;
};

export type GmailMessageListItem = {
  id: string;
  threadId: string;
};

export type GmailMessageHeader = {
  name: string;
  value: string;
};

export type GmailMessageMetadata = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailMessageHeader[];
  };
};

export type GmailHistoryRecord = {
  id: string;
  messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
};

export type GmailWatchResponse = {
  historyId: string;
  expiration: string;
};

export type GmailSyncStatusView = {
  accountId: string;
  provider: string;
  email: string | null;
  status: GmailSyncStatus;
  historyId: string | null;
  watchExpiration: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncedMessageCount: number;
  initialSyncComplete: boolean;
};
