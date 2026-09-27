/**
 * Types definition for MaelG Backoffice.
 */

export interface Tenant {
  id: string;
  name: string;
  code: string; // e.g. TEN-0042
  nif: string;
  province: string;
  city: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  planSlug: string;
  productSlug: string;
  registrationDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
  trialEndsAt?: string;
  nextBillingAt?: string;
  schoolCode?: string;
  adminCode?: string;
  adminPassword?: string;
  adminRole?: string;
  maelgestOutput?: {
    schoolCode: string;
    adminCode: string;
    adminRole: string;
    adminPassword?: string;
    firstAccess: string;
    apiPayload: string;
    sqlAtomic: string;
  };
}

export interface Product {
  name: string;
  slug: string; // maelgest, maelfinance, maelrh
  status: 'active' | 'beta' | 'inactive';
  description: string;
  iconName: string;
  apiEndpoint: string;
  token: string;
  tenantsCount: number;
  mrr: number;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
}

export interface Plan {
  name: string;
  slug: string;
  price: number; // in AOA
  billingInterval: 'monthly' | 'annually';
  status: 'active' | 'inactive';
  description: string;
  productSlug: string;
  limits: {
    label: string;
    value: string;
  }[];
}

export interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  planSlug: string;
  planName: string;
  productSlug: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  startDate: string;
  endDate?: string;
  nextBillingDate: string;
  amount: number;
  billingInterval: 'monthly' | 'annually';
  history: {
    id: string;
    action: string;
    date: string;
    operator: string;
    notes?: string;
  }[];
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  invoiceNumber: string; // e.g. FT-2026/0042
  amount: number;
  paymentMethod: 'bank_transfer' | 'multicaixa_referencia' | 'cash' | 'check';
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentDate?: string;
  dueDate: string;
  notes?: string;
  receiptUrl?: string;
}

export interface AuditLog {
  id: string;
  action: string; // e.g. tenant.provision, tenant.suspend, payment.register
  operatorName: string;
  operatorRole: string;
  operatorIp: string;
  timestamp: string;
  entityType: 'tenant' | 'payment' | 'plan' | 'subscription' | 'operator' | 'settings';
  entityId: string;
  details: string;
  before?: string; // JSON string representing state before
  after?: string;  // JSON string representing state after
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'finance_admin' | 'support_admin';
  avatarUrl: string;
  lastAccess: string;
  active: boolean;
}

export interface PlatformSettings {
  platformName: string;
  platformUrl: string;
  supportEmail: string;
  activeMaintenance: boolean;
  emailTemplates: {
    provisioned: string;
    suspended: string;
    invoicePending: string;
  };
  jobs: {
    id: string;
    name: string;
    schedule: string;
    lastRun: string;
    status: 'success' | 'running' | 'failed';
    nextRun: string;
  }[];
}
