import { UserRole } from "@/config/site";
import { Permission } from "@/lib/constants";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BaseDocument {
  _id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: UserRole;
  permissions: Permission[];
}