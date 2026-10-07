export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type DocumentType = 'PAN' | 'AADHAAR';
export type SortOrder = 'asc' | 'desc';

export interface ApiResponse<T = any> {
  status: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
