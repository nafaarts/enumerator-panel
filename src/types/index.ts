export interface Organization {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Enumerator {
  id: string;
  name: string;
  phone: string;
  organization_id: string;
  access_token: string | null;
  device_id: string | null;
  expired_at: string | null; // ISO string
  created_at: string;
}

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'location' | 'image' | 'data-warga';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: { label: string; value: string }[]; // For select, checkbox, radio
  placeholder?: string;
  description?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormSchema {
  fields?: FormField[]; // Legacy support
  sections?: FormSection[]; // New standard
}

export interface FormTemplate {
  id: string;
  title: string;
  version: number;
  schema: FormSchema; // JSON Schema
  created_at: string;
}

export interface FormAssignment {
  id: string;
  form_id: string;
  organization_id: string;
  assigned_at: string;
}

export interface EnumeratorAssignment {
  enumerator_id: string;
  form_id: string;
}


export interface Submission {
  id: string;
  form_id: string;
  form_version: number;
  enumerator_name: string;
  enumerator_phone: string;
  data: Record<string, unknown>;
  created_at: string;
  status: 'pending' | 'verified' | 'rejected';
  admin_notes?: string;
  verified_at?: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}
