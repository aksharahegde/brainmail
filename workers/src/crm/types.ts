export type ContactSummaryRecord = {
  id: string;
  name: string | null;
  email: string | null;
  companyId: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  interactionCount: number | null;
  relationshipScore: number;
  daysSinceLastContact: number | null;
  followUpPriority: 'high' | 'medium' | 'low' | null;
};

export type FollowUpReminder = {
  contactId: string;
  name: string | null;
  email: string | null;
  daysSinceLastContact: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  relationshipScore: number;
};

export type CommunicationAnalytics = {
  totalEmails: number;
  emailsLast30Days: number;
  emailsLast7Days: number;
  averageGapDays: number | null;
  lastInboundAt: string | null;
  trend: 'increasing' | 'stable' | 'declining';
};

export type CrmSummary = {
  totalContacts: number;
  averageRelationshipScore: number;
  followUpCount: number;
  followUpReminders: FollowUpReminder[];
  communicationAnalytics: {
    emailsLast30Days: number;
    activeContactsLast30Days: number;
    averageEmailsPerContact: number;
  };
};

export type ContactProfile = {
  contact: ContactSummaryRecord;
  relationship: {
    id: string;
    relationshipScore: number | null;
    lastInteraction: string | null;
    metadata: Record<string, unknown> | null;
  } | null;
  activity: Array<{
    id: string;
    subject: string | null;
    sender: string | null;
    receivedAt: string | null;
    category: string | null;
  }>;
  analytics: CommunicationAnalytics;
  followUpReminder: FollowUpReminder | null;
};
