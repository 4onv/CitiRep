export type Related = {
  id: number;
  title: string;
  relationship: string;
  source_url: string;
};
export type Document = {
  id: number;
  title: string;
  kind: string;
  provenance: string;
  description: string;
  excerpt?: string;
  tags: string[];
  locations: string[];
  published_at: string | null;
  checked_at: string;
  updated_at: string;
  status: string;
  source_url: string | null;
  availability: string;
  body?: string;
  related_bylaws: Related[];
  chunks?: { id: number; page: number | null; text: string }[];
};
export type Results = {
  items: Document[];
  total: number;
  limit: number;
  offset: number;
};
export type Revision = {
  id: number;
  title: string;
  captured_at: string;
  body?: string;
};

export type UploadPreview = {
  title: string;
  description: string;
  body: string;
  tags: string[];
  locations: string[];
  chunks: { page?: number | null; text: string }[];
  published: false;
};
