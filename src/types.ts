/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  email: string;
  password?: string; // Hashed password, omitted in API responses
  role: UserRole;
  name: string;
  profileImage?: string;
  status: 'active' | 'suspended';
  notificationPreferences: {
    invoices: boolean;
    marketing: boolean;
    alerts: boolean;
  };
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string; // 'Free' | 'Starter' | 'Professional' | 'Business' | 'Enterprise'
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  apiLimit: number; // requests/month
  storageLimit: number; // GB
  teamMembers: number;
  prioritySupport: boolean;
  active: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  cancelAtPeriodEnd: boolean;
  apiUsage: number;
  storageUsage: number;
  couponId?: string;
  pricePaid: number;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  planName: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  tax: number;
  discount: number;
  finalAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'void';
  downloadUrl: string;
  couponCode?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number; // % or $
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
  minPurchase?: number;
  maxDiscount?: number;
  active: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  invoiceId: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'bank' | 'paypal';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'billing' | 'plan' | 'security';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  category: string;
  createdAt: string;
}

export interface PersonalSubscription {
  id: string;
  userId: string;
  name: string; // Netflix, Claude AI, Amazon Prime, etc.
  price: number;
  billingCycle: 'monthly' | 'yearly';
  category: string; // Entertainment, Productivity, Utilities, Music, Shopping, AI, Other
  nextRenewalDate: string;
  status: 'active' | 'paused' | 'cancelled';
  logoColor?: string; // Tailwind bg color class
}

export interface SaaSStats {
  monthlyRevenue: number;
  annualRevenue: number;
  totalCustomers: number;
  activeCustomers: number;
  cancelledCustomers: number;
  pendingPaymentsCount: number;
  revenueByMonth: { month: string; revenue: number; churn: number }[];
  planPopularity: { name: string; count: number; revenue: number }[];
  averageRevenuePerUser: number;
  revenueGrowthRate: number;
  subscriptionChurnRate: number;
  couponsUsedCount: number;
  recentTransactions: Payment[];
  recentRegistrations: User[];
  auditTimeline: AuditLog[];
}
