/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getDb, saveDb } from './src/db/dbStore';
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
  SaaSStats,
} from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'billing_super_secret_jwt_key_2026';

app.use(express.json());

// --- AUTH MIDDLEWARE ---
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'customer';
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = user;
    next();
  });
}

function authorizeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

// --- UTILITY HELPER FOR LOGGING ---
function logAudit(userId: string, email: string, action: string, details: string, ip: string = '127.0.0.1') {
  const db = getDb();
  const log: AuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    userEmail: email,
    action,
    details,
    ipAddress: ip,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  saveDb(db);
}

function logActivity(userId: string, action: string, category: string) {
  const db = getDb();
  const log: ActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    action,
    category,
    createdAt: new Date().toISOString(),
  };
  db.activityLogs.unshift(log);
  saveDb(db);
}

function createNotification(userId: string, title: string, message: string, type: 'billing' | 'plan' | 'security') {
  const db = getDb();
  const notif: Notification = {
    id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    title,
    message,
    read: false,
    type,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  saveDb(db);
}

// --- 1. AUTHENTICATION ROUTES ---

app.post('/api/auth/register', (req: Request, res: Response): void => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const db = getDb();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(400).json({ error: 'Email already registered' });
    return;
  }

  const salt = bcryptjs.genSaltSync(10);
  const hashedPassword = bcryptjs.hashSync(password, salt);

  const newUser: User = {
    id: `usr_${Date.now()}`,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'customer',
    name,
    status: 'active',
    notificationPreferences: { invoices: true, marketing: true, alerts: true },
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);

  logAudit(newUser.id, newUser.email, 'USER_REGISTER', 'User registered standard customer account');
  createNotification(newUser.id, 'Welcome to the platform!', 'Complete your profile and view subscription plans to get started.', 'security');

  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
  
  const { password: _, ...userResp } = newUser as any;
  res.status(201).json({ user: userResp, token });
});

app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.password) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
    return;
  }

  const valid = bcryptjs.compareSync(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  logAudit(user.id, user.email, 'LOGIN_SUCCESS', `User logged in from web client (${user.role})`);
  logActivity(user.id, 'Logged into platform dashboard', 'security');

  const { password: _, ...userResp } = user as any;
  res.json({ user: userResp, token });
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { password: _, ...userResp } = user as any;
  res.json(userResp);
});

app.post('/api/auth/preferences', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { name, notificationPreferences } = req.body;
  const db = getDb();
  const userIdx = db.users.findIndex(u => u.id === req.user!.id);
  if (userIdx === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (name) db.users[userIdx].name = name;
  if (notificationPreferences) db.users[userIdx].notificationPreferences = notificationPreferences;

  saveDb(db);
  logActivity(req.user!.id, 'Updated profile preferences', 'security');

  const { password: _, ...userResp } = db.users[userIdx] as any;
  res.json(userResp);
});


// --- 2. SUBSCRIPTION PLANS ROUTES ---

app.get('/api/plans', (req: Request, res: Response): void => {
  const db = getDb();
  res.json(db.plans.filter(p => p.active));
});

app.post('/api/plans', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { name, monthlyPrice, yearlyPrice, features, apiLimit, storageLimit, teamMembers, prioritySupport } = req.body;
  if (!name || monthlyPrice === undefined || yearlyPrice === undefined) {
    res.status(400).json({ error: 'Name and prices are required' });
    return;
  }

  const db = getDb();
  const newPlan: Plan = {
    id: `plan_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
    name,
    monthlyPrice: Number(monthlyPrice),
    yearlyPrice: Number(yearlyPrice),
    features: Array.isArray(features) ? features : [],
    apiLimit: Number(apiLimit) || 1000,
    storageLimit: Number(storageLimit) || 5,
    teamMembers: Number(teamMembers) || 1,
    prioritySupport: !!prioritySupport,
    active: true,
  };

  db.plans.push(newPlan);
  saveDb(db);

  logAudit(req.user!.id, req.user!.email, 'PLAN_CREATE', `Created new plan: ${name}`);
  res.status(201).json(newPlan);
});

app.put('/api/plans/:id', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = getDb();
  const planIdx = db.plans.findIndex(p => p.id === id);
  if (planIdx === -1) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const { name, monthlyPrice, yearlyPrice, features, apiLimit, storageLimit, teamMembers, prioritySupport, active } = req.body;
  if (name) db.plans[planIdx].name = name;
  if (monthlyPrice !== undefined) db.plans[planIdx].monthlyPrice = Number(monthlyPrice);
  if (yearlyPrice !== undefined) db.plans[planIdx].yearlyPrice = Number(yearlyPrice);
  if (features) db.plans[planIdx].features = features;
  if (apiLimit !== undefined) db.plans[planIdx].apiLimit = Number(apiLimit);
  if (storageLimit !== undefined) db.plans[planIdx].storageLimit = Number(storageLimit);
  if (teamMembers !== undefined) db.plans[planIdx].teamMembers = Number(teamMembers);
  if (prioritySupport !== undefined) db.plans[planIdx].prioritySupport = !!prioritySupport;
  if (active !== undefined) db.plans[planIdx].active = !!active;

  saveDb(db);
  logAudit(req.user!.id, req.user!.email, 'PLAN_UPDATE', `Updated plan: ${db.plans[planIdx].name}`);
  res.json(db.plans[planIdx]);
});

app.delete('/api/plans/:id', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = getDb();
  const planIdx = db.plans.findIndex(p => p.id === id);
  if (planIdx === -1) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  // Soft delete
  db.plans[planIdx].active = false;
  saveDb(db);

  logAudit(req.user!.id, req.user!.email, 'PLAN_DELETE', `Soft-deleted plan: ${db.plans[planIdx].name}`);
  res.json({ message: 'Plan deactivated successfully' });
});


// --- 3. COUPONS ROUTES ---

app.get('/api/coupons', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  if (req.user!.role === 'admin') {
    res.json(db.coupons);
  } else {
    res.json(db.coupons.filter(c => c.active && new Date(c.expiryDate) > new Date()));
  }
});

app.post('/api/coupons', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { code, type, value, expiryDate, usageLimit, minPurchase, maxDiscount } = req.body;
  if (!code || !type || value === undefined || !expiryDate) {
    res.status(400).json({ error: 'Code, type, value, and expiryDate are required' });
    return;
  }

  const db = getDb();
  const existing = db.coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
  if (existing) {
    res.status(400).json({ error: 'Coupon code already exists' });
    return;
  }

  const newCoupon: Coupon = {
    id: `coup_${Date.now()}`,
    code: code.toUpperCase(),
    type,
    value: Number(value),
    expiryDate,
    usageLimit: Number(usageLimit) || 100,
    usageCount: 0,
    minPurchase: minPurchase !== undefined ? Number(minPurchase) : undefined,
    maxDiscount: maxDiscount !== undefined ? Number(maxDiscount) : undefined,
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.coupons.push(newCoupon);
  saveDb(db);

  logAudit(req.user!.id, req.user!.email, 'COUPON_CREATE', `Created coupon: ${newCoupon.code}`);
  res.status(201).json(newCoupon);
});

app.post('/api/coupons/validate', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { code, amount } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Coupon code required' });
    return;
  }

  const db = getDb();
  const coupon = db.coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
  if (!coupon) {
    res.status(404).json({ error: 'Invalid or inactive coupon code' });
    return;
  }

  if (new Date(coupon.expiryDate) < new Date()) {
    res.status(400).json({ error: 'Coupon has expired' });
    return;
  }

  if (coupon.usageCount >= coupon.usageLimit) {
    res.status(400).json({ error: 'Coupon usage limit reached' });
    return;
  }

  if (amount !== undefined && coupon.minPurchase !== undefined && amount < coupon.minPurchase) {
    res.status(400).json({ error: `Minimum purchase of $${coupon.minPurchase} is required` });
    return;
  }

  res.json(coupon);
});

app.delete('/api/coupons/:id', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = getDb();
  const couponIdx = db.coupons.findIndex(c => c.id === id);
  if (couponIdx === -1) {
    res.status(404).json({ error: 'Coupon not found' });
    return;
  }

  db.coupons[couponIdx].active = false;
  saveDb(db);

  logAudit(req.user!.id, req.user!.email, 'COUPON_DISABLE', `Disabled coupon: ${db.coupons[couponIdx].code}`);
  res.json({ message: 'Coupon disabled successfully' });
});


// --- 4. SUBSCRIPTIONS & BILLING LOGIC ---

app.get('/api/personal-subscriptions', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  if (!db.personalSubscriptions) {
    db.personalSubscriptions = [];
  }
  const userSubs = db.personalSubscriptions.filter(s => s.userId === req.user!.id);
  
  if (userSubs.length === 0) {
    const now = new Date();
    const defaults: any[] = [
      {
        id: `pers_netflix_${Date.now()}_1`,
        userId: req.user!.id,
        name: 'Netflix Premium',
        price: 15.49,
        billingCycle: 'monthly',
        category: 'Entertainment',
        nextRenewalDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        logoColor: 'bg-red-600',
      },
      {
        id: `pers_amazon_${Date.now()}_2`,
        userId: req.user!.id,
        name: 'Amazon Prime',
        price: 14.99,
        billingCycle: 'monthly',
        category: 'Shopping',
        nextRenewalDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        logoColor: 'bg-cyan-600',
      },
      {
        id: `pers_claude_${Date.now()}_3`,
        userId: req.user!.id,
        name: 'Claude AI Pro',
        price: 20.00,
        billingCycle: 'monthly',
        category: 'AI / Productivity',
        nextRenewalDate: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        logoColor: 'bg-amber-600',
      },
      {
        id: `pers_spotify_${Date.now()}_4`,
        userId: req.user!.id,
        name: 'Spotify Family',
        price: 11.99,
        billingCycle: 'monthly',
        category: 'Music',
        nextRenewalDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        logoColor: 'bg-emerald-600',
      }
    ];
    db.personalSubscriptions.push(...defaults);
    saveDb(db);
    res.json(defaults);
    return;
  }
  
  res.json(userSubs);
});

app.post('/api/personal-subscriptions', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { name, price, billingCycle, category, nextRenewalDate, status, logoColor } = req.body;
  if (!name || price === undefined || !billingCycle || !category || !nextRenewalDate || !status) {
    res.status(400).json({ error: 'Name, price, billingCycle, category, nextRenewalDate, and status are required' });
    return;
  }

  const db = getDb();
  if (!db.personalSubscriptions) {
    db.personalSubscriptions = [];
  }

  const newSub: any = {
    id: `pers_${Date.now()}`,
    userId: req.user!.id,
    name,
    price: Number(price),
    billingCycle,
    category,
    nextRenewalDate,
    status,
    logoColor: logoColor || 'bg-slate-600',
  };

  db.personalSubscriptions.push(newSub);
  saveDb(db);

  logActivity(req.user!.id, `Added personal subscription tracker for ${name}`, 'billing');
  res.status(201).json(newSub);
});

app.put('/api/personal-subscriptions/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { name, price, billingCycle, category, nextRenewalDate, status, logoColor } = req.body;

  const db = getDb();
  if (!db.personalSubscriptions) {
    db.personalSubscriptions = [];
  }

  const subIdx = db.personalSubscriptions.findIndex(s => s.id === id && s.userId === req.user!.id);
  if (subIdx === -1) {
    res.status(404).json({ error: 'Personal subscription not found' });
    return;
  }

  const sub = db.personalSubscriptions[subIdx];
  if (name !== undefined) sub.name = name;
  if (price !== undefined) sub.price = Number(price);
  if (billingCycle !== undefined) sub.billingCycle = billingCycle;
  if (category !== undefined) sub.category = category;
  if (nextRenewalDate !== undefined) sub.nextRenewalDate = nextRenewalDate;
  if (status !== undefined) sub.status = status;
  if (logoColor !== undefined) sub.logoColor = logoColor;

  saveDb(db);
  logActivity(req.user!.id, `Updated personal subscription ${sub.name}`, 'billing');
  res.json(sub);
});

app.delete('/api/personal-subscriptions/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;

  const db = getDb();
  if (!db.personalSubscriptions) {
    db.personalSubscriptions = [];
  }

  const subIdx = db.personalSubscriptions.findIndex(s => s.id === id && s.userId === req.user!.id);
  if (subIdx === -1) {
    res.status(404).json({ error: 'Personal subscription not found' });
    return;
  }

  const deletedName = db.personalSubscriptions[subIdx].name;
  db.personalSubscriptions.splice(subIdx, 1);
  saveDb(db);

  logActivity(req.user!.id, `Deleted personal subscription tracker for ${deletedName}`, 'billing');
  res.json({ message: 'Personal subscription deleted successfully' });
});

app.get('/api/subscriptions/current', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const sub = db.subscriptions.find(s => s.userId === req.user!.id && s.status === 'active');
  if (!sub) {
    res.json(null);
    return;
  }
  const plan = db.plans.find(p => p.id === sub.planId);
  res.json({ subscription: sub, plan });
});

app.get('/api/subscriptions/stats', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const sub = db.subscriptions.find(s => s.userId === req.user!.id && s.status === 'active');
  if (!sub) {
    res.status(404).json({ error: 'No active subscription' });
    return;
  }
  const plan = db.plans.find(p => p.id === sub.planId);
  res.json({
    apiUsage: sub.apiUsage,
    apiLimit: plan ? plan.apiLimit : 100,
    storageUsage: sub.storageUsage,
    storageLimit: plan ? plan.storageLimit : 1,
    teamMembers: plan ? plan.teamMembers : 1,
  });
});

app.post('/api/subscriptions', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { planId, billingCycle, couponCode } = req.body;
  if (!planId || !billingCycle) {
    res.status(400).json({ error: 'PlanId and billingCycle are required' });
    return;
  }

  const db = getDb();
  const plan = db.plans.find(p => p.id === planId && p.active);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found or inactive' });
    return;
  }

  // Cancel any active subscriptions first
  db.subscriptions = db.subscriptions.map(s => {
    if (s.userId === req.user!.id && s.status === 'active') {
      return { ...s, status: 'expired' };
    }
    return s;
  });

  // Calculate pricing & discount
  let subtotal = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  let discount = 0;
  let couponId: string | undefined = undefined;

  if (couponCode) {
    const coupon = db.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.active);
    if (coupon && new Date(coupon.expiryDate) > new Date() && coupon.usageCount < coupon.usageLimit) {
      if (coupon.type === 'percentage') {
        discount = subtotal * (coupon.value / 100);
        if (coupon.maxDiscount !== undefined && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.value;
      }
      if (discount > subtotal) discount = subtotal;
      couponId = coupon.id;
      coupon.usageCount++;
    }
  }

  const tax = Number(((subtotal - discount) * 0.1).toFixed(2)); // 10% VAT
  const finalAmount = Number((subtotal - discount + tax).toFixed(2));

  // Create subscription
  const now = new Date();
  const durationDays = billingCycle === 'monthly' ? 30 : 365;
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const newSub: Subscription = {
    id: `sub_${Date.now()}`,
    userId: req.user!.id,
    planId: plan.id,
    billingCycle,
    status: 'active',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    cancelAtPeriodEnd: false,
    apiUsage: 0,
    storageUsage: 0,
    couponId,
    pricePaid: finalAmount,
  };

  db.subscriptions.push(newSub);

  // Generate Invoice
  const invoiceNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newInvoice: Invoice = {
    id: `inv_${Date.now()}`,
    userId: req.user!.id,
    invoiceNumber: invoiceNum,
    planName: `${plan.name} Plan (${billingCycle})`,
    periodStart: now.toISOString(),
    periodEnd: endDate.toISOString(),
    subtotal,
    tax,
    discount,
    finalAmount,
    paymentStatus: finalAmount > 0 ? 'paid' : 'paid', // Instant paid simulation
    downloadUrl: `/api/invoices/inv_${Date.now()}/download`,
    couponCode: couponCode ? couponCode.toUpperCase() : undefined,
    createdAt: now.toISOString(),
  };

  db.invoices.push(newInvoice);

  // Create payment record
  if (finalAmount > 0) {
    const paymentRecord: Payment = {
      id: `pay_${Date.now()}`,
      userId: req.user!.id,
      subscriptionId: newSub.id,
      invoiceId: newInvoice.id,
      amount: finalAmount,
      status: 'succeeded',
      paymentMethod: 'card',
      createdAt: now.toISOString(),
    };
    db.payments.push(paymentRecord);
  }

  saveDb(db);

  logActivity(req.user!.id, `Subscribed to ${plan.name} plan`, 'billing');
  logAudit(req.user!.id, req.user!.email, 'SUBSCRIPTION_CREATE', `Subscribed to ${plan.name} (${billingCycle}). Paid: $${finalAmount}`);
  createNotification(req.user!.id, 'Subscription Activated', `Your ${plan.name} subscription is active. Invoice ${invoiceNum} generated.`, 'billing');

  res.status(201).json({ subscription: newSub, invoice: newInvoice });
});

// UPGRADE SUBSCRIPTION (PRORATED)
app.post('/api/subscriptions/upgrade', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { targetPlanId, billingCycle } = req.body;
  if (!targetPlanId || !billingCycle) {
    res.status(400).json({ error: 'targetPlanId and billingCycle are required' });
    return;
  }

  const db = getDb();
  const currentSub = db.subscriptions.find(s => s.userId === req.user!.id && s.status === 'active');
  if (!currentSub) {
    res.status(404).json({ error: 'No active subscription to upgrade' });
    return;
  }

  const currentPlan = db.plans.find(p => p.id === currentSub.planId);
  const targetPlan = db.plans.find(p => p.id === targetPlanId && p.active);

  if (!targetPlan) {
    res.status(404).json({ error: 'Target plan not found or inactive' });
    return;
  }

  const now = new Date();
  const currentEnd = new Date(currentSub.endDate);
  const totalDays = currentSub.billingCycle === 'monthly' ? 30 : 365;
  const remainingMs = currentEnd.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

  const currentPrice = currentSub.billingCycle === 'monthly' ? (currentPlan?.monthlyPrice || 0) : (currentPlan?.yearlyPrice || 0);
  const newPrice = billingCycle === 'monthly' ? targetPlan.monthlyPrice : targetPlan.yearlyPrice;

  // Calculate proration credit for unused portion of old plan
  const dailyValueOld = currentPrice / totalDays;
  const oldCredit = dailyValueOld * remainingDays;

  // Calculate remaining cost for new plan
  const targetTotalDays = billingCycle === 'monthly' ? 30 : 365;
  const dailyValueNew = newPrice / targetTotalDays;
  const newPlanCostRemaining = dailyValueNew * remainingDays;

  // Prorated Charge
  const proratedCharge = Math.max(0, Number((newPlanCostRemaining - oldCredit).toFixed(2)));
  const tax = Number((proratedCharge * 0.1).toFixed(2));
  const finalAmount = Number((proratedCharge + tax).toFixed(2));

  // Mark old active expired
  currentSub.status = 'expired';

  // Create upgraded subscription
  const endDate = billingCycle === 'monthly' 
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const upgradedSub: Subscription = {
    id: `sub_${Date.now()}`,
    userId: req.user!.id,
    planId: targetPlan.id,
    billingCycle,
    status: 'active',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    cancelAtPeriodEnd: false,
    apiUsage: 0,
    storageUsage: 0,
    pricePaid: newPrice,
  };

  db.subscriptions.push(upgradedSub);

  // Generate Invoice
  const invoiceNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const prorationInvoice: Invoice = {
    id: `inv_${Date.now()}`,
    userId: req.user!.id,
    invoiceNumber: invoiceNum,
    planName: `Prorated Upgrade: ${currentPlan?.name || 'Old'} to ${targetPlan.name} (${billingCycle})`,
    periodStart: now.toISOString(),
    periodEnd: endDate.toISOString(),
    subtotal: proratedCharge,
    tax,
    discount: 0,
    finalAmount,
    paymentStatus: 'paid',
    downloadUrl: `/api/invoices/inv_${Date.now()}/download`,
    createdAt: now.toISOString(),
  };

  db.invoices.push(prorationInvoice);

  if (finalAmount > 0) {
    const paymentRecord: Payment = {
      id: `pay_${Date.now()}`,
      userId: req.user!.id,
      subscriptionId: upgradedSub.id,
      invoiceId: prorationInvoice.id,
      amount: finalAmount,
      status: 'succeeded',
      paymentMethod: 'card',
      createdAt: now.toISOString(),
    };
    db.payments.push(paymentRecord);
  }

  saveDb(db);

  logActivity(req.user!.id, `Upgraded subscription to ${targetPlan.name}`, 'billing');
  logAudit(req.user!.id, req.user!.email, 'SUBSCRIPTION_UPGRADE', `Upgraded to ${targetPlan.name}. Prorated Charge: $${finalAmount}`);
  createNotification(req.user!.id, 'Subscription Upgraded', `Successfully upgraded to ${targetPlan.name}. Invoice ${invoiceNum} paid.`, 'billing');

  res.json({ subscription: upgradedSub, invoice: prorationInvoice });
});

// DOWNGRADE OR CANCEL AT PERIOD END
app.post('/api/subscriptions/cancel', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const subIdx = db.subscriptions.findIndex(s => s.userId === req.user!.id && s.status === 'active');
  if (subIdx === -1) {
    res.status(404).json({ error: 'No active subscription found to cancel' });
    return;
  }

  db.subscriptions[subIdx].cancelAtPeriodEnd = true;
  saveDb(db);

  logActivity(req.user!.id, 'Cancelled recurring auto-renewal', 'billing');
  logAudit(req.user!.id, req.user!.email, 'SUBSCRIPTION_CANCEL', `Subscription set to cancel at period end (${db.subscriptions[subIdx].endDate})`);
  createNotification(req.user!.id, 'Renewal Cancelled', `Your subscription auto-renewal is off. Access continues until ${new Date(db.subscriptions[subIdx].endDate).toLocaleDateString()}.`, 'billing');

  res.json(db.subscriptions[subIdx]);
});


// --- 5. INVOICES ROUTES ---

app.get('/api/invoices', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  if (req.user!.role === 'admin') {
    res.json(db.invoices);
  } else {
    res.json(db.invoices.filter(i => i.userId === req.user!.id));
  }
});

app.get('/api/invoices/:id/download', (req: Request, res: Response): void => {
  const { id } = req.params;
  const db = getDb();
  const invoice = db.invoices.find(i => i.id === id);
  if (!invoice) {
    res.status(404).send('Invoice not found');
    return;
  }
  const user = db.users.find(u => u.id === invoice.userId);

  // Send beautifully rendered responsive printable HTML representing the invoice PDF!
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 text-slate-800 font-sans p-6 md:p-12">
      <div class="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div class="bg-slate-900 text-white p-8 md:p-12 flex justify-between items-center">
          <div>
            <h1 class="text-3xl font-extrabold tracking-tight">SaaS Billing</h1>
            <p class="text-slate-400 mt-1 text-sm">Enterprise Subscription billing</p>
          </div>
          <div class="text-right">
            <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">${invoice.paymentStatus}</span>
            <p class="text-slate-400 mt-2 text-sm">Invoice #: ${invoice.invoiceNumber}</p>
          </div>
        </div>

        <div class="p-8 md:p-12 space-y-8">
          <div class="grid grid-cols-2 gap-8 text-sm">
            <div>
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To</h3>
              <p class="font-bold text-slate-900 mt-1">${user?.name || 'Customer'}</p>
              <p class="text-slate-500">${user?.email || ''}</p>
            </div>
            <div class="text-right">
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Details</h3>
              <p class="mt-1"><span class="text-slate-500">Date:</span> <span class="font-semibold">${new Date(invoice.createdAt).toLocaleDateString()}</span></p>
              <p><span class="text-slate-500">Period Start:</span> <span class="font-semibold">${new Date(invoice.periodStart).toLocaleDateString()}</span></p>
              <p><span class="text-slate-500">Period End:</span> <span class="font-semibold">${new Date(invoice.periodEnd).toLocaleDateString()}</span></p>
            </div>
          </div>

          <div class="border-t border-slate-200 pt-8">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-slate-200 pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th>Description</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="py-4">
                  <td class="py-4 font-semibold text-slate-900">${invoice.planName}</td>
                  <td class="py-4 text-right font-semibold text-slate-900">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="border-t border-slate-200 pt-6 flex justify-end">
            <div class="w-64 space-y-2 text-sm">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span class="font-semibold text-slate-900">$${invoice.subtotal.toFixed(2)}</span>
              </div>
              ${invoice.discount > 0 ? `
              <div class="flex justify-between text-rose-500">
                <span>Discount (${invoice.couponCode || 'Promo'})</span>
                <span class="font-semibold">-$${invoice.discount.toFixed(2)}</span>
              </div>` : ''}
              <div class="flex justify-between text-slate-500">
                <span>Tax (10%)</span>
                <span class="font-semibold text-slate-900">$${invoice.tax.toFixed(2)}</span>
              </div>
              <div class="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total Paid</span>
                <span>$${invoice.finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-50 px-8 py-4 flex justify-between items-center border-t border-slate-100 text-xs text-slate-500">
          <span>Thank you for your business!</span>
          <button onclick="window.print()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm transition">Print Invoice / Save PDF</button>
        </div>
      </div>
    </body>
    </html>
  `);
});


// --- 6. PAYMENTS ROUTES ---

app.get('/api/payments', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  if (req.user!.role === 'admin') {
    res.json(db.payments);
  } else {
    res.json(db.payments.filter(p => p.userId === req.user!.id));
  }
});

// ADMIN REFUND SIMULATION
app.post('/api/payments/:id/refund', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const db = getDb();
  const paymentIdx = db.payments.findIndex(p => p.id === id);
  if (paymentIdx === -1) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  const payment = db.payments[paymentIdx];
  if (payment.status === 'refunded') {
    res.status(400).json({ error: 'Payment already refunded' });
    return;
  }

  // Mark payment refunded
  payment.status = 'refunded';

  // Mark invoice voided or unpaid/refunded
  const invoiceIdx = db.invoices.findIndex(i => i.id === payment.invoiceId);
  if (invoiceIdx !== -1) {
    db.invoices[invoiceIdx].paymentStatus = 'void';
  }

  // Mark subscription cancelled
  const subIdx = db.subscriptions.findIndex(s => s.id === payment.subscriptionId);
  if (subIdx !== -1) {
    db.subscriptions[subIdx].status = 'cancelled';
  }

  saveDb(db);

  logAudit(req.user!.id, req.user!.email, 'PAYMENT_REFUND', `Refunded payment ${id} of amount $${payment.amount}`);
  createNotification(payment.userId, 'Payment Refunded', `Your payment of $${payment.amount} has been fully refunded. Access deactivated.`, 'billing');

  res.json(payment);
});


// --- 7. ADMIN DASHBOARD & ANALYTICS ---

app.get('/api/admin/stats', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();

  const totalCustomers = db.users.filter(u => u.role === 'customer').length;
  const activeSubs = db.subscriptions.filter(s => s.status === 'active');
  const activeCustomers = new Set(activeSubs.map(s => s.userId)).size;
  const cancelledCustomers = db.subscriptions.filter(s => s.status === 'cancelled').length;

  // Calculate MRR / ARR
  let monthlyRevenue = 0;
  let annualRevenue = 0;

  activeSubs.forEach(s => {
    const plan = db.plans.find(p => p.id === s.planId);
    if (plan) {
      if (s.billingCycle === 'monthly') {
        monthlyRevenue += s.pricePaid;
      } else {
        annualRevenue += s.pricePaid;
      }
    }
  });

  // Complete MRR is sum of monthly plus (annual/12)
  const totalMRR = Number((monthlyRevenue + (annualRevenue / 12)).toFixed(2));
  const totalARR = Number((totalMRR * 12).toFixed(2));

  // Recent transactions
  const recentTransactions = [...db.payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  
  // Recent registrations
  const recentRegistrations = db.users.filter(u => u.role === 'customer').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // System logs
  const auditTimeline = db.auditLogs.slice(0, 10);

  // Plan popularity & revenue by plan
  const planPopularity = db.plans.map(p => {
    const count = db.subscriptions.filter(s => s.planId === p.id && s.status === 'active').length;
    const revenue = db.payments.filter(pay => {
      const sub = db.subscriptions.find(s => s.id === pay.subscriptionId);
      return sub && sub.planId === p.id && pay.status === 'succeeded';
    }).reduce((acc, pay) => acc + pay.amount, 0);

    return {
      name: p.name,
      count,
      revenue,
    };
  });

  // Coupons Used
  const couponsUsedCount = db.coupons.reduce((acc, c) => acc + c.usageCount, 0);

  // Dynamic monthly history graph for charts
  const revenueByMonth = [
    { month: 'Feb', revenue: 1450, churn: 1.2 },
    { month: 'Mar', revenue: 1820, churn: 1.5 },
    { month: 'Apr', revenue: 2210, churn: 1.1 },
    { month: 'May', revenue: 2900, churn: 0.9 },
    { month: 'Jun', revenue: 3450, churn: 1.4 },
    { month: 'Jul', revenue: Number((totalMRR).toFixed(2)) || 4200, churn: 1.2 },
  ];

  const pendingPaymentsCount = db.invoices.filter(i => i.paymentStatus === 'unpaid').length;

  const stats: SaaSStats = {
    monthlyRevenue: totalMRR,
    annualRevenue: totalARR,
    totalCustomers,
    activeCustomers,
    cancelledCustomers,
    pendingPaymentsCount,
    revenueByMonth,
    planPopularity,
    averageRevenuePerUser: activeCustomers > 0 ? Number((totalMRR / activeCustomers).toFixed(2)) : 0,
    revenueGrowthRate: 15.4, // Simulated monthly growth percentage
    subscriptionChurnRate: 1.2, // Simulated churn
    couponsUsedCount,
    recentTransactions,
    recentRegistrations,
    auditTimeline,
  };

  res.json(stats);
});

// MANAGE CUSTOMERS
app.get('/api/admin/users', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const customers = db.users.filter(u => u.role === 'customer').map(u => {
    const activeSub = db.subscriptions.find(s => s.userId === u.id && s.status === 'active');
    const plan = activeSub ? db.plans.find(p => p.id === activeSub.planId) : null;
    const { password: _, ...cleanUser } = u as any;
    return {
      ...cleanUser,
      subscription: activeSub ? {
        id: activeSub.id,
        planName: plan?.name || 'Unknown',
        billingCycle: activeSub.billingCycle,
        endDate: activeSub.endDate,
        cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd,
      } : null,
    };
  });
  res.json(customers);
});

app.post('/api/admin/users/:id/status', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { status } = req.body;
  if (status !== 'active' && status !== 'suspended') {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }

  const db = getDb();
  const userIdx = db.users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  db.users[userIdx].status = status;
  saveDb(db);

  logAudit(req.user!.id, req.user!.email, 'USER_STATUS_CHANGE', `Changed user ${id} status to ${status}`);
  res.json(db.users[userIdx]);
});

app.get('/api/admin/audit-logs', authenticateToken, authorizeAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  res.json(db.auditLogs);
});


// --- 8. NOTIFICATIONS ---

app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  res.json(db.notifications.filter(n => n.userId === req.user!.id));
});

app.post('/api/notifications/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  db.notifications = db.notifications.map(n => {
    if (n.userId === req.user!.id) {
      return { ...n, read: true };
    }
    return n;
  });
  saveDb(db);
  res.json({ message: 'Notifications marked read' });
});


// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
