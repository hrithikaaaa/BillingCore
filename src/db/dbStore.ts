/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import bcryptjs from 'bcryptjs';
import {
  User,
  Plan,
  Subscription,
  Invoice,
  Coupon,
  Payment,
  Notification,
  AuditLog,
  ActivityLog,
  PersonalSubscription,
} from '../types';

const DB_FILE = path.join(process.cwd(), 'database.json');

export interface DBStructure {
  users: User[];
  plans: Plan[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  coupons: Coupon[];
  payments: Payment[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  activityLogs: ActivityLog[];
  personalSubscriptions?: PersonalSubscription[];
}

let dbInstance: DBStructure | null = null;

export function getDb(): DBStructure {
  if (dbInstance) return dbInstance;

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbInstance = JSON.parse(content);
      return dbInstance!;
    } catch (e) {
      console.error('Failed to parse database file, re-initializing...', e);
    }
  }

  // Generate seed data
  dbInstance = generateSeedData();
  saveDb(dbInstance);
  return dbInstance;
}

export function saveDb(data: DBStructure) {
  dbInstance = data;
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateSeedData(): DBStructure {
  const salt = bcryptjs.genSaltSync(10);
  const adminHash = bcryptjs.hashSync('password123', salt);
  const johnHash = bcryptjs.hashSync('password123', salt);
  const aliceHash = bcryptjs.hashSync('password123', salt);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // 1. Users
  const users: User[] = [
    {
      id: 'usr_admin',
      email: 'admin@billing.com',
      password: adminHash,
      role: 'admin',
      name: 'System Administrator',
      status: 'active',
      notificationPreferences: { invoices: true, marketing: true, alerts: true },
      createdAt: sixtyDaysAgo.toISOString(),
    },
    {
      id: 'usr_john',
      email: 'john@example.com',
      password: johnHash,
      role: 'customer',
      name: 'John Doe',
      status: 'active',
      notificationPreferences: { invoices: true, marketing: false, alerts: true },
      createdAt: thirtyDaysAgo.toISOString(),
    },
    {
      id: 'usr_alice',
      email: 'alice@example.com',
      password: aliceHash,
      role: 'customer',
      name: 'Alice Smith',
      status: 'active',
      notificationPreferences: { invoices: true, marketing: true, alerts: true },
      createdAt: fortyFiveDaysAgo().toISOString(),
    },
  ];

  function fortyFiveDaysAgo() {
    return new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  }

  // 2. Plans
  const plans: Plan[] = [
    {
      id: 'plan_free',
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: ['Up to 100 API requests', '1 GB storage limit', '1 team member', 'Community Support'],
      apiLimit: 100,
      storageLimit: 1,
      teamMembers: 1,
      prioritySupport: false,
      active: true,
    },
    {
      id: 'plan_starter',
      name: 'Starter',
      monthlyPrice: 15,
      yearlyPrice: 144, // $12/mo billed yearly
      features: ['Up to 5,000 API requests', '5 GB storage limit', '3 team members', 'Standard Support'],
      apiLimit: 5000,
      storageLimit: 5,
      teamMembers: 3,
      prioritySupport: false,
      active: true,
    },
    {
      id: 'plan_professional',
      name: 'Professional',
      monthlyPrice: 49,
      yearlyPrice: 468, // $39/mo billed yearly
      features: ['Up to 50,000 API requests', '20 GB storage limit', '10 team members', 'Priority Support (24h)', 'Advanced Analytics', 'Custom Domains'],
      apiLimit: 50000,
      storageLimit: 20,
      teamMembers: 10,
      prioritySupport: true,
      active: true,
    },
    {
      id: 'plan_business',
      name: 'Business',
      monthlyPrice: 129,
      yearlyPrice: 1236, // $103/mo billed yearly
      features: ['Up to 250,000 API requests', '100 GB storage limit', 'Unlimited team members', 'Priority Support (4h)', 'Advanced Analytics', 'SLA Guarantee', 'Dedicated IP'],
      apiLimit: 250000,
      storageLimit: 100,
      teamMembers: 9999,
      prioritySupport: true,
      active: true,
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      monthlyPrice: 499,
      yearlyPrice: 4788, // $399/mo billed yearly
      features: ['Unlimited API requests', '1 TB storage limit', 'Unlimited team members', '24/7 Phone Support', 'Dedicated Account Manager', 'Custom Contracts', 'On-premise deployment option'],
      apiLimit: 10000000,
      storageLimit: 1000,
      teamMembers: 9999,
      prioritySupport: true,
      active: true,
    },
  ];

  // 3. Coupons
  const coupons: Coupon[] = [
    {
      id: 'coup_save20',
      code: 'SAVE20',
      type: 'percentage',
      value: 20,
      expiryDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 100,
      usageCount: 42,
      active: true,
      createdAt: sixtyDaysAgo.toISOString(),
    },
    {
      id: 'coup_flat50',
      code: 'FLAT50',
      type: 'flat',
      value: 50,
      expiryDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 50,
      usageCount: 12,
      minPurchase: 100,
      active: true,
      createdAt: thirtyDaysAgo.toISOString(),
    },
    {
      id: 'coup_welcome10',
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      expiryDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 500,
      usageCount: 210,
      active: true,
      createdAt: sixtyDaysAgo.toISOString(),
    },
  ];

  // 4. Subscriptions
  // John (usr_john): Subscribed to Professional monthly, active. Started 25 days ago, renews in 5 days.
  const johnSubStart = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
  const johnSubEnd = new Date(johnSubStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Alice (usr_alice): Subscribed to Starter yearly, active. Started 40 days ago, renews in 325 days.
  const aliceSubStart = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
  const aliceSubEnd = new Date(aliceSubStart.getTime() + 365 * 24 * 60 * 60 * 1000);

  const subscriptions: Subscription[] = [
    {
      id: 'sub_john',
      userId: 'usr_john',
      planId: 'plan_professional',
      billingCycle: 'monthly',
      status: 'active',
      startDate: johnSubStart.toISOString(),
      endDate: johnSubEnd.toISOString(),
      cancelAtPeriodEnd: false,
      apiUsage: 23450, // out of 50000
      storageUsage: 14.2, // out of 20
      couponId: 'coup_save20',
      pricePaid: 39.2, // 49 * 0.8
    },
    {
      id: 'sub_alice',
      userId: 'usr_alice',
      planId: 'plan_starter',
      billingCycle: 'yearly',
      status: 'active',
      startDate: aliceSubStart.toISOString(),
      endDate: aliceSubEnd.toISOString(),
      cancelAtPeriodEnd: false,
      apiUsage: 1420, // out of 5000
      storageUsage: 1.8, // out of 5
      pricePaid: 144, // No coupon
    },
  ];

  // 5. Invoices
  const invoices: Invoice[] = [
    {
      id: 'inv_john_1',
      userId: 'usr_john',
      invoiceNumber: 'INV-2026-0001',
      planName: 'Professional Plan',
      periodStart: johnSubStart.toISOString(),
      periodEnd: johnSubEnd.toISOString(),
      subtotal: 49.0,
      tax: 3.92, // 10% tax
      discount: 9.8, // 20% off SAVE20
      finalAmount: 43.12, // (49 - 9.8) * 1.1 = 43.12
      paymentStatus: 'paid',
      downloadUrl: '/api/invoices/inv_john_1/download',
      couponCode: 'SAVE20',
      createdAt: johnSubStart.toISOString(),
    },
    {
      id: 'inv_alice_1',
      userId: 'usr_alice',
      invoiceNumber: 'INV-2026-0002',
      planName: 'Starter Plan',
      periodStart: aliceSubStart.toISOString(),
      periodEnd: aliceSubEnd.toISOString(),
      subtotal: 144.0,
      tax: 14.4, // 10% tax
      discount: 0,
      finalAmount: 158.4, // 144 * 1.1 = 158.4
      paymentStatus: 'paid',
      downloadUrl: '/api/invoices/inv_alice_1/download',
      createdAt: aliceSubStart.toISOString(),
    },
  ];

  // 6. Payments
  const payments: Payment[] = [
    {
      id: 'pay_john_1',
      userId: 'usr_john',
      subscriptionId: 'sub_john',
      invoiceId: 'inv_john_1',
      amount: 43.12,
      status: 'succeeded',
      paymentMethod: 'card',
      createdAt: johnSubStart.toISOString(),
    },
    {
      id: 'pay_alice_1',
      userId: 'usr_alice',
      subscriptionId: 'sub_alice',
      invoiceId: 'inv_alice_1',
      amount: 158.4,
      status: 'succeeded',
      paymentMethod: 'card',
      createdAt: aliceSubStart.toISOString(),
    },
  ];

  // 7. Notifications
  const notifications: Notification[] = [
    {
      id: 'not_john_1',
      userId: 'usr_john',
      title: 'Welcome to SaaS Billing Platform!',
      message: 'Thank you for signing up. Explore our dashboard and subscribe to a premium plan today.',
      read: true,
      type: 'plan',
      createdAt: thirtyDaysAgo.toISOString(),
    },
    {
      id: 'not_john_2',
      userId: 'usr_john',
      title: 'Subscription Activated',
      message: 'Your Professional subscription has been successfully activated. Invoice INV-2026-0001 has been paid.',
      read: false,
      type: 'billing',
      createdAt: johnSubStart.toISOString(),
    },
    {
      id: 'not_alice_1',
      userId: 'usr_alice',
      title: 'Subscription Activated',
      message: 'Your Starter subscription has been activated yearly. Invoice INV-2026-0002 has been paid.',
      read: false,
      type: 'billing',
      createdAt: aliceSubStart.toISOString(),
    },
  ];

  // 8. Audit Logs & Activity Logs
  const auditLogs: AuditLog[] = [
    {
      id: 'aud_1',
      userId: 'usr_admin',
      userEmail: 'admin@billing.com',
      action: 'LOGIN_SUCCESS',
      details: 'Administrator successfully logged in',
      ipAddress: '127.0.0.1',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'aud_2',
      userId: 'usr_admin',
      userEmail: 'admin@billing.com',
      action: 'PLAN_UPDATE',
      details: 'Updated professional plan pricing details',
      ipAddress: '127.0.0.1',
      createdAt: thirtyDaysAgo.toISOString(),
    },
    {
      id: 'aud_3',
      userId: 'usr_john',
      userEmail: 'john@example.com',
      action: 'SUBSCRIPTION_CREATE',
      details: 'Created Professional subscription using coupon SAVE20',
      ipAddress: '192.168.1.10',
      createdAt: johnSubStart.toISOString(),
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'act_1',
      userId: 'usr_john',
      action: 'Logged into SaaS billing client portal',
      category: 'security',
      createdAt: now.toISOString(),
    },
    {
      id: 'act_2',
      userId: 'usr_john',
      action: 'API request limits reached 40%',
      category: 'usage',
      createdAt: fifteenDaysAgo.toISOString(),
    },
  ];

  const personalSubscriptions: PersonalSubscription[] = [
    {
      id: 'pers_1',
      userId: 'usr_john',
      name: 'Netflix Premium',
      price: 15.49,
      billingCycle: 'monthly',
      category: 'Entertainment',
      nextRenewalDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      logoColor: 'bg-red-600',
    },
    {
      id: 'pers_2',
      userId: 'usr_john',
      name: 'Amazon Prime',
      price: 14.99,
      billingCycle: 'monthly',
      category: 'Shopping',
      nextRenewalDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      logoColor: 'bg-cyan-600',
    },
    {
      id: 'pers_3',
      userId: 'usr_john',
      name: 'Claude AI Pro',
      price: 20.00,
      billingCycle: 'monthly',
      category: 'AI / Productivity',
      nextRenewalDate: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      logoColor: 'bg-amber-600',
    },
    {
      id: 'pers_4',
      userId: 'usr_john',
      name: 'Spotify Family',
      price: 11.99,
      billingCycle: 'monthly',
      category: 'Music',
      nextRenewalDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      logoColor: 'bg-emerald-600',
    },
    {
      id: 'pers_5',
      userId: 'usr_alice',
      name: 'Netflix Premium',
      price: 15.49,
      billingCycle: 'monthly',
      category: 'Entertainment',
      nextRenewalDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      logoColor: 'bg-red-600',
    },
    {
      id: 'pers_6',
      userId: 'usr_alice',
      name: 'Claude AI Pro',
      price: 20.00,
      billingCycle: 'monthly',
      category: 'AI / Productivity',
      nextRenewalDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      logoColor: 'bg-amber-600',
    },
  ];

  return {
    users,
    plans,
    subscriptions,
    invoices,
    coupons,
    payments,
    notifications,
    auditLogs,
    activityLogs,
    personalSubscriptions,
  };
}
