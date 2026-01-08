export interface Enumerator {
  id: string;
  name: string;
  phone: string;
  access_token: string | null;
  device_id: string | null;
  expired_at: string | null; // ISO string
  created_at: string;
}

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'location' | 'image';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: { label: string; value: string }[]; // For select, checkbox, radio
  placeholder?: string;
  description?: string;
}

export interface FormSchema {
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  title: string;
  version: number;
  schema: FormSchema; // JSON Schema
  created_at: string;
}

export interface Assignment {
  enumerator_id: string;
  form_id: string;
}

export interface Submission {
  id: string;
  form_id: string;
  form_version: number;
  enumerator_id: string;
  data: Record<string, unknown>;
  created_at: string;
}
