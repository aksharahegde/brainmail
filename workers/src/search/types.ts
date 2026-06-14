export type SearchMode = 'keyword' | 'vector' | 'hybrid';

export type SearchEmailResult = {
  id: string;
  subject: string | null;
  sender: string | null;
  snippet: string | null;
  category: string | null;
  receivedAt: string | null;
  score: number;
  source: 'keyword' | 'vector' | 'hybrid';
};

export type SearchEntityResult = {
  id: string;
  type: string;
  label: string;
  summary: string | null;
  score: number;
};

export type SearchContactResult = {
  id: string;
  name: string | null;
  email: string | null;
  score: number;
};

export type SearchVendorResult = {
  id: string;
  name: string | null;
  domain: string | null;
  score: number;
};

export type SearchWorkspaceResult = {
  id: string;
  name: string | null;
  description: string | null;
  workspaceType: string | null;
  score: number;
};

export type SearchArtifactResult = {
  id: string;
  title: string | null;
  artifactType: string | null;
  score: number;
};

export type GlobalSearchResult = {
  query: string;
  mode: SearchMode;
  emails: SearchEmailResult[];
  entities: SearchEntityResult[];
  contacts: SearchContactResult[];
  vendors: SearchVendorResult[];
  artifacts: SearchArtifactResult[];
  workspaces: SearchWorkspaceResult[];
};
