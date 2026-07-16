/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, Users, DollarSign, Activity, FileText, Gift, Settings, LogOut, ShieldAlert,
  Plus, Search, Edit2, Trash2, Check, RefreshCw, Eye, Download, ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import { SaaSStats, User, Plan, Coupon, Payment, AuditLog } from '../types';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

export default function AdminDashboard() {
  const { token, logout, showToast } = useAuth();
  const [stats, setStats] = useState<SaaSStats | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'plans' | 'coupons' | 'logs'>('overview');

  // Modal forms
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    monthlyPrice: 19,
    yearlyPrice: 180,
    features: '',
    apiLimit: 10000,
    storageLimit: 10,
    teamMembers: 5,
    prioritySupport: false
  });

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'flat',
    value: 15,
    expiryDays: 30,
    usageLimit: 100,
    minPurchase: 0
  });

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, custRes, plansRes, couponsRes, auditRes] = await Promise.all([
        axios.get('/api/admin/stats', { headers }),
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/plans', { headers }),
        axios.get('/api/coupons', { headers }),
        axios.get('/api/admin/audit-logs', { headers }),
      ]);
      setStats(statsRes.data);
      setCustomers(custRes.data);
      setPlans(plansRes.data);
      setCoupons(couponsRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
      showToast('Error loading enterprise data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Customer Management
  const handleToggleStatus = async (customerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await axios.post(
        `/api/admin/users/${customerId}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`User status set to ${nextStatus}`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast('Failed to modify user status', 'error');
    }
  };

  // Plan actions
  const handleCreateOrUpdatePlan = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...planForm,
        features: planForm.features.split('\n').filter(f => f.trim() !== ''),
      };
      const headers = { Authorization: `Bearer ${token}` };

      if (planForm.id) {
        await axios.put(`/api/plans/${planForm.id}`, body, { headers });
        showToast('Billing subscription plan modified successfully', 'success');
      } else {
        await axios.post('/api/plans', body, { headers });
        showToast('Created new SaaS Subscription Plan', 'success');
      }
      setShowPlanModal(false);
      setPlanForm({ id: '', name: '', monthlyPrice: 19, yearlyPrice: 180, features: '', apiLimit: 10000, storageLimit: 10, teamMembers: 5, prioritySupport: false });
      fetchAdminData();
    } catch (err) {
      showToast('Failed to save plan details', 'error');
    }
  };

  const handleEditPlanClick = (plan: Plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      features: plan.features.join('\n'),
      apiLimit: plan.apiLimit,
      storageLimit: plan.storageLimit,
      teamMembers: plan.teamMembers,
      prioritySupport: plan.prioritySupport,
    });
    setShowPlanModal(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to deactivate this plan? Existing subscriptions won\'t be cancelled immediately.')) return;
    try {
      await axios.delete(`/api/plans/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Subscription plan deactivated successfully', 'success');
      fetchAdminData();
    } catch (err) {
      showToast('Failed to delete plan', 'error');
    }
  };

  // Coupon actions
  const handleCreateCoupon = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + couponForm.expiryDays);

      const body = {
        code: couponForm.code.toUpperCase(),
        type: couponForm.type,
        value: couponForm.value,
        expiryDate: expiryDate.toISOString(),
        usageLimit: couponForm.usageLimit,
        minPurchase: couponForm.minPurchase > 0 ? couponForm.minPurchase : undefined,
      };

      await axios.post('/api/coupons', body, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`Discount coupon ${body.code} issued!`, 'success');
      setShowCouponModal(false);
      setCouponForm({ code: '', type: 'percentage', value: 15, expiryDays: 30, usageLimit: 100, minPurchase: 0 });
      fetchAdminData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create coupon', 'error');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await axios.delete(`/api/coupons/${couponId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Coupon deactivated successfully', 'success');
      fetchAdminData();
    } catch (err) {
      showToast('Failed to disable coupon', 'error');
    }
  };

  // Refund Payment
  const handleRefundPayment = async (paymentId: string) => {
    if (!confirm('Confirm refund? This action will void the invoice, deactivate the matching subscription and issue a full credit refund.')) return;
    try {
      await axios.post(`/api/payments/${paymentId}/refund`, {}, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Invoice refunded and access revoked', 'success');
      fetchAdminData();
    } catch (err) {
      showToast('Failed to refund payment', 'error');
    }
  };

  // Simulate Report Export
  const handleExportReport = (reportType: string) => {
    showToast(`Generating ${reportType} report...`, 'info');
    setTimeout(() => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `saas_billing_${reportType.toLowerCase()}_2026.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`${reportType} exported successfully! Check your downloads folder.`, 'success');
    }, 1500);
  };

  if (loading) {
    return (
      <div id="admin-loading" class="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-white">
        <RefreshCw class="w-10 h-10 animate-spin text-indigo-500" />
        <p class="font-display font-medium tracking-wide">Loading enterprise stats & pipelines...</p>
      </div>
    );
  }

  return (
    <div id="admin-panel" class="min-h-screen flex bg-slate-900 text-slate-100">
      
      {/* 1. ADMIN SIDEBAR */}
      <aside class="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0">
        <div>
          <div class="p-6 flex items-center gap-3 border-b border-slate-800">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles class="w-5 h-5 text-white" />
            </div>
            <span class="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">Billing Core</span>
          </div>

          <nav class="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <TrendingUp class="w-4 h-4" />
              SaaS Overview
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'customers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Users class="w-4 h-4" />
              Manage Customers
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <FileText class="w-4 h-4" />
              Billing Plans
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'coupons' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Gift class="w-4 h-4" />
              Discount Coupons
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Activity class="w-4 h-4" />
              Audit Logs
            </button>
          </nav>
        </div>

        <div class="p-4 border-t border-slate-800">
          <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400">A</div>
            <div class="truncate">
              <p class="text-xs font-bold text-white">Administrator</p>
              <p class="text-[10px] text-slate-500 truncate">admin@billing.com</p>
            </div>
          </div>
          <button
            onClick={logout}
            class="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition cursor-pointer"
          >
            <LogOut class="w-4 h-4" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main class="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        <header class="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
          <div>
            <span class="text-xs text-indigo-400 font-bold uppercase tracking-widest font-mono">Control Plane</span>
            <h1 class="font-display text-2xl font-extrabold text-white mt-1">Enterprise Analytics Dashboard</h1>
          </div>
          <div class="flex items-center gap-3">
            <button
              onClick={() => handleExportReport('Revenue')}
              class="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl border border-slate-800 flex items-center gap-2 transition cursor-pointer"
            >
              <Download class="w-3.5 h-3.5" />
              Export Financials
            </button>
            <button
              onClick={fetchAdminData}
              class="p-2 bg-slate-850 hover:bg-slate-850 border border-slate-800 rounded-xl transition text-slate-300 cursor-pointer"
              title="Sync Database"
            >
              <RefreshCw class="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && stats && (
          <div id="overview-tab" class="space-y-8 animate-fade-in">
            {/* Stat Cards */}
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div class="flex justify-between items-start text-slate-500">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Revenue (MRR)</span>
                  <DollarSign class="w-4 h-4 text-emerald-500" />
                </div>
                <h3 class="font-display text-2xl font-extrabold text-white mt-2 font-mono">
                  ${stats.monthlyRevenue.toFixed(2)}
                </h3>
                <p class="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp class="w-3 h-3" />
                  +{stats.revenueGrowthRate}% growth
                </p>
              </div>

              <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div class="flex justify-between items-start text-slate-500">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Annual Run Rate (ARR)</span>
                  <DollarSign class="w-4 h-4 text-indigo-500" />
                </div>
                <h3 class="font-display text-2xl font-extrabold text-white mt-2 font-mono">
                  ${stats.annualRevenue.toFixed(2)}
                </h3>
                <p class="text-xs text-slate-500 mt-1">Multiplied x12 based on MRR</p>
              </div>

              <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div class="flex justify-between items-start text-slate-500">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Active Subscriptions</span>
                  <Users class="w-4 h-4 text-blue-500" />
                </div>
                <h3 class="font-display text-2xl font-extrabold text-white mt-2 font-mono">
                  {stats.activeCustomers} <span class="text-xs font-normal text-slate-500">/ {stats.totalCustomers}</span>
                </h3>
                <p class="text-xs text-rose-400 font-semibold mt-1">Churn rate: {stats.subscriptionChurnRate}%</p>
              </div>

              <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div class="flex justify-between items-start text-slate-500">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">ARPU</span>
                  <Activity class="w-4 h-4 text-amber-500" />
                </div>
                <h3 class="font-display text-2xl font-extrabold text-white mt-2 font-mono">
                  ${stats.averageRevenuePerUser.toFixed(2)}
                </h3>
                <p class="text-xs text-slate-500 mt-1">Average Revenue Per User</p>
              </div>
            </div>

            {/* Graphs Grid */}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* MRR Growth Chart */}
              <div class="lg:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <h3 class="font-display font-extrabold text-white mb-6">Revenue Performance & MRR</h3>
                <div class="h-80 w-full text-slate-300">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.revenueByMonth}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                      <Area type="monotone" dataKey="revenue" name="MRR ($)" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Plan Popularity Pie */}
              <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <h3 class="font-display font-extrabold text-white mb-4">Plan Distribution</h3>
                <div class="h-60 w-full flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.planPopularity.filter(p => p.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {stats.planPopularity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} active`, 'Subscriptions']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div class="space-y-1.5 pt-4 text-xs">
                  {stats.planPopularity.map((plan, index) => (
                    <div key={plan.name} class="flex justify-between items-center">
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span class="text-slate-400">{plan.name}</span>
                      </div>
                      <span class="font-bold text-white font-mono">{plan.count} ({plan.count > 0 ? `$${plan.revenue}` : '$0'})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions & Health Card */}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div class="lg:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div class="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 class="font-display font-extrabold text-white">Recent Financial Transactions</h3>
                  <span class="px-2.5 py-0.5 text-xs bg-slate-900 border border-slate-800 font-bold rounded-lg text-slate-400">Stripe Sandbox Logs</span>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs divide-y divide-slate-800">
                    <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-mono">
                      <tr>
                        <th class="p-4">Transaction ID</th>
                        <th class="p-4">Customer Email</th>
                        <th class="p-4">Method</th>
                        <th class="p-4">Amount</th>
                        <th class="p-4">Status</th>
                        <th class="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800 font-mono">
                      {stats.recentTransactions.map(pay => {
                        const user = customers.find(u => u.id === pay.userId);
                        return (
                          <tr key={pay.id} class="hover:bg-slate-900/40">
                            <td class="p-4 font-semibold text-slate-300">{pay.id.substring(0, 12)}...</td>
                            <td class="p-4 text-slate-300 font-sans">{user?.email || 'Customer'}</td>
                            <td class="p-4 capitalize text-slate-400">{pay.paymentMethod}</td>
                            <td class="p-4 font-bold text-white">${pay.amount.toFixed(2)}</td>
                            <td class="p-4">
                              <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                pay.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {pay.status}
                              </span>
                            </td>
                            <td class="p-4">
                              {pay.status === 'succeeded' && (
                                <button
                                  onClick={() => handleRefundPayment(pay.id)}
                                  class="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold text-[10px] rounded transition cursor-pointer"
                                >
                                  Refund
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System Health Status */}
              <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 class="font-display font-extrabold text-white mb-6">Payment Pipeline Health</h3>
                  <div class="space-y-4">
                    <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <ShieldCheck class="w-5 h-5 text-emerald-400" />
                        <div>
                          <h4 class="text-xs font-bold text-white">Bcrypt Security Hashing</h4>
                          <p class="text-[10px] text-slate-500">JWT Token Security Operational</p>
                        </div>
                      </div>
                      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>

                    <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <DollarSign class="w-5 h-5 text-indigo-400" />
                        <div>
                          <h4 class="text-xs font-bold text-white">Stripe Webhooks (Simulated)</h4>
                          <p class="text-[10px] text-slate-500">Prorated calculations active</p>
                        </div>
                      </div>
                      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>

                    <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <AlertCircle class="w-5 h-5 text-amber-400" />
                        <div>
                          <h4 class="text-xs font-bold text-white">Tax calculations</h4>
                          <p class="text-[10px] text-slate-500">VAT (10%) fully calculated</p>
                        </div>
                      </div>
                      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>
                  </div>
                </div>

                <div class="pt-6 border-t border-slate-800 text-center">
                  <p class="text-[11px] text-slate-500">All gateway connections online. Core database: JSON sandbox.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div id="customers-tab" class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden animate-fade-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 class="font-display font-extrabold text-white">User Accounts & Subscriptions</h3>
              <button
                onClick={() => handleExportReport('Users')}
                class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Download class="w-3 h-3" /> Export CSV
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs divide-y divide-slate-800">
                <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-mono">
                  <tr>
                    <th class="p-4">Customer</th>
                    <th class="p-4">Current Subscription</th>
                    <th class="p-4">Billing Plan</th>
                    <th class="p-4">Renews / Expires</th>
                    <th class="p-4">Security Status</th>
                    <th class="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 font-sans">
                  {customers.map(cust => (
                    <tr key={cust.id} class="hover:bg-slate-900/40">
                      <td class="p-4">
                        <div>
                          <p class="font-bold text-white">{cust.name}</p>
                          <p class="text-xs text-slate-400 font-mono mt-0.5">{cust.email}</p>
                        </div>
                      </td>
                      <td class="p-4 font-mono font-medium">
                        {cust.subscription ? (
                          <span class="text-slate-300">{cust.subscription.id.substring(0, 10)}...</span>
                        ) : (
                          <span class="text-slate-500">No active subscription</span>
                        )}
                      </td>
                      <td class="p-4">
                        {cust.subscription ? (
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                            {cust.subscription.planName} ({cust.subscription.billingCycle})
                          </span>
                        ) : (
                          <span class="text-slate-500">-</span>
                        )}
                      </td>
                      <td class="p-4 font-mono text-slate-400">
                        {cust.subscription ? new Date(cust.subscription.endDate).toLocaleDateString() : '-'}
                      </td>
                      <td class="p-4">
                        <span class={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cust.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          <span class={`w-1.5 h-1.5 rounded-full ${cust.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {cust.status}
                        </span>
                      </td>
                      <td class="p-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(cust.id, cust.status)}
                          class={`px-3 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                            cust.status === 'active' 
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {cust.status === 'active' ? 'Suspend Account' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PLANS */}
        {activeTab === 'plans' && (
          <div id="plans-tab" class="space-y-6 animate-fade-in">
            <div class="flex justify-between items-center">
              <h3 class="font-display font-extrabold text-white text-lg">Platform Subscription Tiers</h3>
              <button
                onClick={() => {
                  setPlanForm({ id: '', name: '', monthlyPrice: 19, yearlyPrice: 180, features: '', apiLimit: 10000, storageLimit: 10, teamMembers: 5, prioritySupport: false });
                  setShowPlanModal(true);
                }}
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow shadow-indigo-600/15 hover:shadow-indigo-600/25 transition cursor-pointer flex items-center gap-2"
              >
                <Plus class="w-4 h-4" /> Add Custom Plan
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(p => (
                <div key={p.id} class="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
                  {!p.active && (
                    <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <span class="px-3 py-1 bg-rose-500 text-white font-bold text-xs uppercase tracking-widest rounded-full">Inactive / Archived</span>
                    </div>
                  )}

                  <div>
                    <div class="flex justify-between items-start">
                      <h4 class="font-display text-lg font-bold text-white">{p.name}</h4>
                      <div class="flex gap-1">
                        <button
                          onClick={() => handleEditPlanClick(p)}
                          class="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <Edit2 class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          class="p-1.5 hover:bg-slate-900 rounded-lg text-rose-400 hover:text-rose-300 transition cursor-pointer"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div class="mt-4 pb-4 border-b border-slate-800">
                      <p class="text-white text-2xl font-extrabold font-mono">${p.monthlyPrice} <span class="text-xs text-slate-500 font-normal">/ mo</span></p>
                      <p class="text-xs text-slate-400 mt-1 font-mono">${p.yearlyPrice} billed annually</p>
                    </div>

                    <ul class="mt-6 space-y-2.5 text-xs text-slate-400">
                      <li class="flex items-center gap-2">
                        <Check class="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Up to <b class="text-slate-300 font-mono">{p.apiLimit.toLocaleString()}</b> API reqs/mo</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <Check class="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Up to <b class="text-slate-300 font-mono">{p.storageLimit} GB</b> cloud storage</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <Check class="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Up to <b class="text-slate-300 font-mono">{p.teamMembers}</b> team members</span>
                      </li>
                      {p.features.map((feat, i) => (
                        <li key={i} class="flex items-center gap-2">
                          <Check class="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div class="mt-6 pt-4 border-t border-slate-800 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Priority Support: {p.prioritySupport ? 'Yes (24h)' : 'Standard'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: COUPONS */}
        {activeTab === 'coupons' && (
          <div id="coupons-tab" class="space-y-6 animate-fade-in">
            <div class="flex justify-between items-center">
              <h3 class="font-display font-extrabold text-white text-lg">Discount Coupons System</h3>
              <button
                onClick={() => setShowCouponModal(true)}
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow shadow-indigo-600/15 hover:shadow-indigo-600/25 transition cursor-pointer flex items-center gap-2"
              >
                <Plus class="w-4 h-4" /> Create Coupon
              </button>
            </div>

            <div class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table class="w-full text-left text-xs divide-y divide-slate-800">
                <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-mono">
                  <tr>
                    <th class="p-4">Coupon Code</th>
                    <th class="p-4">Type</th>
                    <th class="p-4">Discount Value</th>
                    <th class="p-4">Redemption Count</th>
                    <th class="p-4">Expiry Date</th>
                    <th class="p-4">Security State</th>
                    <th class="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 font-mono">
                  {coupons.map(c => (
                    <tr key={c.id} class="hover:bg-slate-900/40">
                      <td class="p-4 font-bold text-indigo-400 font-mono text-sm tracking-wide">{c.code}</td>
                      <td class="p-4 capitalize text-slate-300">{c.type}</td>
                      <td class="p-4 font-bold text-white">
                        {c.type === 'percentage' ? `${c.value}% OFF` : `$${c.value} FLAT`}
                      </td>
                      <td class="p-4 text-slate-400">
                        {c.usageCount} <span class="text-slate-600">/ {c.usageLimit} limit</span>
                      </td>
                      <td class="p-4 text-slate-400">{new Date(c.expiryDate).toLocaleDateString()}</td>
                      <td class="p-4">
                        <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.active && new Date(c.expiryDate) > new Date() ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {c.active && new Date(c.expiryDate) > new Date() ? 'Active' : 'Expired/Inactive'}
                        </span>
                      </td>
                      <td class="p-4 text-right">
                        {c.active && (
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            class="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold rounded-lg transition cursor-pointer"
                          >
                            Disable
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div id="logs-tab" class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden animate-fade-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 class="font-display font-extrabold text-white">System Security Audit Timeline</h3>
              <span class="px-2.5 py-0.5 text-xs bg-indigo-500/15 border border-indigo-500/10 text-indigo-400 font-bold rounded-lg">Failsafe Security Verified</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs divide-y divide-slate-800">
                <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-mono">
                  <tr>
                    <th class="p-4">Timestamp</th>
                    <th class="p-4">Operator Email</th>
                    <th class="p-4">System Event Action</th>
                    <th class="p-4">Granular Details</th>
                    <th class="p-4">Gateway IP</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 font-mono">
                  {auditLogs.map(log => (
                    <tr key={log.id} class="hover:bg-slate-900/40">
                      <td class="p-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                      <td class="p-4 font-sans font-medium text-slate-300">{log.userEmail}</td>
                      <td class="p-4 font-bold text-indigo-400 uppercase">{log.action}</td>
                      <td class="p-4 text-slate-300 font-sans">{log.details}</td>
                      <td class="p-4 text-slate-500">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* --- PLAN FORM MODAL --- */}
      {showPlanModal && (
        <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl">
            <h3 class="font-display text-xl font-bold mb-4">{planForm.id ? 'Modify Subscription Plan' : 'Add Custom Subscription Plan'}</h3>
            <form onSubmit={handleCreateOrUpdatePlan} class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Developer, Scale"
                  value={planForm.name}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-sans"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Monthly Price ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={planForm.monthlyPrice}
                    onChange={e => setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Yearly Price ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={planForm.yearlyPrice}
                    onChange={e => setPlanForm({ ...planForm, yearlyPrice: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">API Limit</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={planForm.apiLimit}
                    onChange={e => setPlanForm({ ...planForm, apiLimit: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Storage (GB)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planForm.storageLimit}
                    onChange={e => setPlanForm({ ...planForm, storageLimit: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Team Members</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planForm.teamMembers}
                    onChange={e => setPlanForm({ ...planForm, teamMembers: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Additional Features (One per line)</label>
                <textarea
                  placeholder="Advanced Analytics&#10;Custom Domains&#10;SLA Guarantees"
                  value={planForm.features}
                  rows={3}
                  onChange={e => setPlanForm({ ...planForm, features: e.target.value })}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-sans"
                />
              </div>

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prioritySupport"
                  checked={planForm.prioritySupport}
                  onChange={e => setPlanForm({ ...planForm, prioritySupport: e.target.checked })}
                  class="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="prioritySupport" class="text-xs text-slate-400 font-bold uppercase">Enable Priority 24/7 Support</label>
              </div>

              <div class="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  class="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow shadow-indigo-600/15 transition cursor-pointer"
                >
                  Save Tier Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- COUPON FORM MODAL --- */}
      {showCouponModal && (
        <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl max-w-md w-full text-slate-100 shadow-2xl">
            <h3 class="font-display text-xl font-bold mb-4">Issue Discount Coupon</h3>
            <form onSubmit={handleCreateCoupon} class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH30, HALFOFF"
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value })}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono tracking-wider"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Coupon Type</label>
                  <select
                    value={couponForm.type}
                    onChange={e => setCouponForm({ ...couponForm, type: e.target.value as any })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-sans"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat ($)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={couponForm.value}
                    onChange={e => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={couponForm.usageLimit}
                    onChange={e => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Days Until Expiry</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={couponForm.expiryDays}
                    onChange={e => setCouponForm({ ...couponForm, expiryDays: Number(e.target.value) })}
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Minimum Purchase Amount ($)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={couponForm.minPurchase}
                  onChange={e => setCouponForm({ ...couponForm, minPurchase: Number(e.target.value) })}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                />
              </div>

              <div class="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  class="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow shadow-indigo-600/15 transition cursor-pointer"
                >
                  Publish Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
