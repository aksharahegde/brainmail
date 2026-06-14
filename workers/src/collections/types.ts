export const COLLECTION_TYPES = ['system', 'user', 'ai_generated'] as const;
export type CollectionType = (typeof COLLECTION_TYPES)[number];

export const COLLECTION_STATUSES = ['active', 'suggested', 'archived'] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const MEMBER_ADDED_BY = ['user', 'ai', 'system'] as const;
export type MemberAddedBy = (typeof MEMBER_ADDED_BY)[number];

export type CollectionRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string | null;
  description: string | null;
  collectionType: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function isCollectionType(value: string): value is CollectionType {
  return COLLECTION_TYPES.includes(value as CollectionType);
}

export function isCollectionStatus(value: string): value is CollectionStatus {
  return COLLECTION_STATUSES.includes(value as CollectionStatus);
}
