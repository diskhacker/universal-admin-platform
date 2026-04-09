export interface AuthContext {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface ApiKeyContext {
  keyId: string;
  tenantId: string;
  scopes: string[];
}

export type RequestContext = {
  auth?: AuthContext;
  apiKey?: ApiKeyContext;
  tenantId?: string;
  requestId: string;
  ipAddress: string;
  userAgent: string;
};

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductRegistration {
  name: string;
  displayName: string;
  description?: string;
  domain?: string;
  plans: Array<{
    name: string;
    displayName: string;
    priceMonthly: number;
    priceYearly: number;
    limits: Record<string, number>;
    features: string[];
  }>;
  roles: Array<{
    name: string;
    displayName: string;
    permissions: string[];
    isDefault?: boolean;
  }>;
}
