export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface SurveyWork {
  id: string;
  client_id?: string;
  governorate: string;
  district: string;
  area_name: string;
  property_number: string;
  notes?: string;
  status: 'active' | 'completed';
  created_at: string;
  completed_at?: string;
  client?: Client;
  items?: SurveyWorkItem[];
  files?: SurveyWorkFile[];
}

export interface SurveyWorkItem {
  id: string;
  survey_work_id: string;
  name: string;
  completed: boolean;
  order_index: number;
  completed_at?: string;
  created_at: string;
}

export interface SurveyWorkFile {
  id: string;
  survey_work_id: string;
  name: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export interface TransactionType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  stages?: TransactionTypeStage[];
}

export interface TransactionTypeStage {
  id: string;
  transaction_type_id: string;
  name: string;
  description?: string;
  image_url?: string;
  notes?: string;
  order_index: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  transaction_type_id?: string;
  client_id?: string;
  governorate?: string;
  district?: string;
  area_name?: string;
  property_number?: string;
  notes?: string;
  status: 'active' | 'completed';
  created_at: string;
  completed_at?: string;
  client?: Client;
  transaction_type?: TransactionType;
  stage_statuses?: TransactionStageStatus[];
}

export interface TransactionStageStatus {
  id: string;
  transaction_id: string;
  stage_id: string;
  completed: boolean;
  notes?: string;
  created_at: string;
  stage?: TransactionTypeStage;
  files?: TransactionFile[];
}

export interface TransactionFile {
  id: string;
  transaction_stage_status_id: string;
  name: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id?: string;
  title: string;
  work_type: 'survey' | 'transaction';
  date: string;
  time?: string;
  notes?: string;
  property_ref?: string;
  file_url?: string;
  created_at: string;
  client?: Client;
}

export interface Note {
  id: string;
  user_id?: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldFile {
  id: string;
  name: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  folder: string;
  description?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  client_id?: string;
  work_type: 'survey' | 'transaction' | 'consultation' | 'daily' | 'other';
  survey_work_id?: string;
  transaction_id?: string;
  amount: number;
  currency: 'USD' | 'LBP' | 'EUR';
  type: 'income' | 'expense';
  status: 'paid' | 'pending' | 'cancelled';
  description?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
  client?: Client;
}

export interface CadFile {
  id: string;
  name: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  survey_work_id?: string;
  project_name?: string;
  description?: string;
  created_at: string;
}

export interface PagePermission {
  read: boolean;
  write: boolean;
}

export interface Permissions {
  dashboard?: PagePermission;
  survey?: PagePermission;
  transactions?: PagePermission;
  clients?: PagePermission;
  map?: PagePermission;
  gps?: PagePermission;
  field_files?: PagePermission;
  files?: PagePermission;
  payments?: PagePermission;
  cad?: PagePermission;
  settings?: PagePermission;
}

export type UserRole = 'admin' | 'employee' | 'accountant' | 'surveyor';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  role: UserRole;
  permissions: Permissions;
  avatar_url?: string;
  is_primary: boolean;
  created_at: string;
}

export type NavSection =
  | 'dashboard'
  | 'survey'
  | 'transactions'
  | 'clients'
  | 'map'
  | 'gps'
  | 'field_files'
  | 'files'
  | 'payments'
  | 'cad'
  | 'settings';

export const DEFAULT_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    dashboard: { read: true, write: true },
    survey: { read: true, write: true },
    transactions: { read: true, write: true },
    clients: { read: true, write: true },
    map: { read: true, write: true },
    gps: { read: true, write: true },
    field_files: { read: true, write: true },
    files: { read: true, write: true },
    payments: { read: true, write: true },
    cad: { read: true, write: true },
    settings: { read: true, write: true },
  },
  employee: {
    dashboard: { read: true, write: true },
    survey: { read: true, write: true },
    transactions: { read: true, write: true },
    clients: { read: true, write: true },
    map: { read: true, write: false },
    gps: { read: true, write: false },
    field_files: { read: true, write: true },
    files: { read: true, write: false },
    payments: { read: true, write: false },
    cad: { read: true, write: true },
    settings: { read: false, write: false },
  },
  accountant: {
    dashboard: { read: true, write: false },
    survey: { read: true, write: false },
    transactions: { read: true, write: false },
    clients: { read: true, write: false },
    map: { read: false, write: false },
    gps: { read: false, write: false },
    field_files: { read: true, write: false },
    files: { read: true, write: false },
    payments: { read: true, write: true },
    cad: { read: false, write: false },
    settings: { read: false, write: false },
  },
  surveyor: {
    dashboard: { read: true, write: false },
    survey: { read: true, write: true },
    transactions: { read: true, write: false },
    clients: { read: true, write: false },
    map: { read: true, write: true },
    gps: { read: true, write: true },
    field_files: { read: true, write: true },
    files: { read: true, write: false },
    payments: { read: false, write: false },
    cad: { read: true, write: true },
    settings: { read: false, write: false },
  },
};
