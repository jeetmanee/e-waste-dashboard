export type Visibility = 'public' | 'private';
export type ProjectRole = 'admin' | 'editor';

export interface DocumentRecord {
  id: string;
  title: string;
  file_name: string;
  description: string | null;
  storage_path: string;
  mime_type: string;
  file_size: number;
  category: string;
  tags: string[];
  visibility: Visibility;
  workstream: string | null;
  semester: string | null;
  version: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ActivityRecord {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  category: string | null;
  activity_date: string;
  status: string;
  visibility: Visibility;
  created_at: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  publisher: string | null;
  source_type: string;
  url: string | null;
  publication_date: string | null;
  accessed_date: string | null;
  description: string | null;
  findings: string | null;
  category: string | null;
  verification_status: string;
  visibility: Visibility;
}

export interface OrganisationRecord {
  id: string;
  name: string;
  organisation_type: string;
  location: string | null;
  address: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  verification_status: string;
  visibility: Visibility;
}

export interface DeliverableRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  document_id: string | null;
  version: string | null;
  visibility: Visibility;
  updated_at: string;
}
