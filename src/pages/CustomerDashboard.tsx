/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles, CheckCircle2, Shield, Calendar, CreditCard, Cloud, Terminal, Check,
  ChevronRight, AlertTriangle, FileText, Settings, Bell, LogOut, ArrowUpRight,
  ChevronDown, X, Gift, Percent, RefreshCw, Send, CheckSquare, MessageSquare, History
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Plan, Subscription, Invoice, Coupon, Notification, ActivityLog } from '../types';

export default function CustomerDashboard() {
  const { user, token, logout, updatePreferences, showToast } = useAuth();
  
  // Dashboard states
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Personal Subscriptions tracker states
  const [personalSubs, setPersonalSubs] = useState<any[]>([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [isAddingPersonalSub, setIsAddingPersonalSub] = useState(false);
  const [editingPersonalSub, setEditingPersonalSub] = useState<any | null>(null);

  // Form states for adding/editing personal subscriptions
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pBillingCycle, setPBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pCategory, setPCategory] = useState('Entertainment');
  const [pNextRenewalDate, setPNextRenewalDate] = useState('');
  const [pStatus, setPStatus] = useState<'active' | 'paused' | 'cancelled'>('active');
  const [pLogoColor, setPLogoColor] = useState('bg-red-600');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'personal' | 'billing' | 'usage' | 'settings'>('personal');

  // Coupon billing helper state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Billing Flow modal states
  const [selectedPlanForSubscribe, setSelectedPlanForSubscribe] = useState<Plan | null>(null);
  const [subscribeBillingCycle, setSubscribeBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Prorated Upgrade preview helper
  const [upgradePreview, setUpgradePreview] = useState<{
    proratedCharge: number;
    tax: number;
    total: number;
  } | null>(null);
  const [isLoadingUpgradePreview, setIsLoadingUpgradePreview] = useState(false);

  // User details local copy for forms
  const [profileName, setProfileName] = useState(user?.name || '');
  const [notifPref, setNotifPref] = useState({
    invoices: user?.notificationPreferences?.invoices ?? true,
    marketing: user?.notificationPreferences?.marketing ?? true,
    alerts: user?.notificationPreferences?.alerts ?? true,
  });

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [subRes, plansRes, invoicesRes, notifRes, personalRes] = await Promise.all([
        axios.get('/api/subscriptions/current', { headers }),
        axios.get('/api/plans', { headers }),
        axios.get('/api/invoices', { headers }),
        axios.get('/api/notifications', { headers }),
        axios.get('/api/personal-subscriptions', { headers }),
      ]);

      if (subRes.data) {
        setActiveSub(subRes.data.subscription);
        setCurrentPlan(subRes.data.plan);
      } else {
        setActiveSub(null);
        setCurrentPlan(null);
      }

      setAllPlans(plansRes.data);
      setInvoices(invoicesRes.data);
      setNotifications(notifRes.data);
      setPersonalSubs(personalRes.data || []);
      
      // Load custom user logs
      setProfileName(user?.name || '');
      if (user?.notificationPreferences) {
        setNotifPref(user.notificationPreferences);
      }
    } catch (err) {
      console.error('Failed to load customer subscription data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [token, user]);

  // Handle coupon validation
  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    try {
      const basePrice = selectedPlanForSubscribe
        ? (subscribeBillingCycle === 'monthly' ? selectedPlanForSubscribe.monthlyPrice : selectedPlanForSubscribe.yearlyPrice)
        : 0;

      const res = await axios.post(
        '/api/coupons/validate',
        { code: couponCode, amount: basePrice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppliedCoupon(res.data);
      showToast(`Coupon ${res.data.code} applied!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Invalid coupon code', 'error');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Subscribe action
  const handleSubscribe = async () => {
    if (!selectedPlanForSubscribe) return;
    try {
      await axios.post(
        '/api/subscriptions',
        {
          planId: selectedPlanForSubscribe.id,
          billingCycle: subscribeBillingCycle,
          couponCode: appliedCoupon?.code,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Successfully subscribed to ${selectedPlanForSubscribe.name}!`, 'success');
      setSelectedPlanForSubscribe(null);
      setCouponCode('');
      setAppliedCoupon(null);
      fetchCustomerData();
    } catch (err) {
      showToast('Failed to create subscription', 'error');
    }
  };

  // Downgrade action
  const handleDowngrade = async (targetPlan: Plan) => {
    const cycle = activeSub?.billingCycle || 'monthly';
    if (!confirm(`Are you sure you want to change your tier to ${targetPlan.name}? The new price will apply starting from your next billing cycle.`)) return;
    try {
      await axios.post(
        '/api/subscriptions',
        { planId: targetPlan.id, billingCycle: cycle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Subscription adjusted to ${targetPlan.name} (${cycle})!`, 'success');
      fetchCustomerData();
    } catch (err) {
      showToast('Failed to downgrade plan', 'error');
    }
  };

  // Prorated Upgrade preview loading
  const handleLoadUpgradePreview = async (targetPlan: Plan) => {
    setIsLoadingUpgradePreview(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const cycle = activeSub?.billingCycle || 'monthly';
      
      // Calculate inline proration estimation matching the backend:
      const now = new Date();
      const currentEnd = new Date(activeSub!.endDate);
      const totalDays = activeSub!.billingCycle === 'monthly' ? 30 : 365;
      const remainingMs = currentEnd.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      const currentPrice = activeSub!.billingCycle === 'monthly' ? (currentPlan?.monthlyPrice || 0) : (currentPlan?.yearlyPrice || 0);
      const targetPrice = cycle === 'monthly' ? targetPlan.monthlyPrice : targetPlan.yearlyPrice;

      const oldDailyValue = currentPrice / totalDays;
      const credit = oldDailyValue * remainingDays;

      const newDailyValue = targetPrice / totalDays;
      const newCost = newDailyValue * remainingDays;

      const proratedCharge = Math.max(0, Number((newCost - credit).toFixed(2)));
      const tax = Number((proratedCharge * 0.1).toFixed(2));
      const finalAmount = Number((proratedCharge + tax).toFixed(2));

      setUpgradePreview({
        proratedCharge,
        tax,
        total: finalAmount,
      });
      setSelectedPlanForSubscribe(targetPlan);
      setSubscribeBillingCycle(cycle);
    } catch (err) {
      showToast('Failed to load upgrade billing calculations', 'error');
    } finally {
      setIsLoadingUpgradePreview(false);
    }
  };

  // Confirm Upgrade
  const handleConfirmUpgrade = async () => {
    if (!selectedPlanForSubscribe) return;
    try {
      await axios.post(
        '/api/subscriptions/upgrade',
        {
          targetPlanId: selectedPlanForSubscribe.id,
          billingCycle: subscribeBillingCycle,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Successfully upgraded to ${selectedPlanForSubscribe.name}!`, 'success');
      setSelectedPlanForSubscribe(null);
      setUpgradePreview(null);
      fetchCustomerData();
    } catch (err) {
      showToast('Upgrade request failed', 'error');
    }
  };

  // Cancel Auto Renewal
  const handleCancelAutoRenewal = async () => {
    if (!confirm('Are you sure you want to cancel your subscription renewal? Your access remains fully active until the end of your billing period.')) return;
    try {
      await axios.post(
        '/api/subscriptions/cancel',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Subscription auto-renewal deactivated successfully', 'success');
      fetchCustomerData();
    } catch (err) {
      showToast('Failed to cancel renewal', 'error');
    }
  };

  // Clear visual notifications
  const handleMarkNotificationsRead = async () => {
    try {
      await axios.post(
        '/api/notifications/read-all',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('All messages marked read', 'success');
      fetchCustomerData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save local preferences
  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updatePreferences(profileName, notifPref);
      fetchCustomerData();
    } catch (err) {
      // Toast handles error internally
    }
  };

  // --- Personal Subscriptions CRUD handlers ---
  const handleSavePersonalSub = async (e: FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice || !pNextRenewalDate) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        name: pName,
        price: Number(pPrice),
        billingCycle: pBillingCycle,
        category: pCategory,
        nextRenewalDate: pNextRenewalDate,
        status: pStatus,
        logoColor: pLogoColor,
      };

      if (editingPersonalSub) {
        const res = await axios.put(`/api/personal-subscriptions/${editingPersonalSub.id}`, payload, { headers });
        setPersonalSubs(prev => prev.map(s => s.id === editingPersonalSub.id ? res.data : s));
        showToast(`Successfully updated ${pName}!`, 'success');
      } else {
        const res = await axios.post('/api/personal-subscriptions', payload, { headers });
        setPersonalSubs(prev => [res.data, ...prev]);
        showToast(`Successfully added ${pName}!`, 'success');
      }

      setIsAddingPersonalSub(false);
      setEditingPersonalSub(null);
      resetPersonalForm();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save subscription', 'error');
    }
  };

  const handleDeletePersonalSub = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to stop tracking ${name}?`)) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/personal-subscriptions/${id}`, { headers });
      setPersonalSubs(prev => prev.filter(s => s.id !== id));
      showToast(`Stopped tracking ${name}.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete subscription', 'error');
    }
  };

  const resetPersonalForm = () => {
    setPName('');
    setPPrice('');
    setPBillingCycle('monthly');
    setPCategory('Entertainment');
    setPNextRenewalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPStatus('active');
    setPLogoColor('bg-red-600');
  };

  const openAddPersonalModal = () => {
    setEditingPersonalSub(null);
    resetPersonalForm();
    setIsAddingPersonalSub(true);
  };

  const openEditPersonalModal = (sub: any) => {
    setEditingPersonalSub(sub);
    setPName(sub.name);
    setPPrice(sub.price.toString());
    setPBillingCycle(sub.billingCycle);
    setPCategory(sub.category);
    setPNextRenewalDate(sub.nextRenewalDate);
    setPStatus(sub.status);
    setPLogoColor(sub.logoColor || 'bg-red-600');
    setIsAddingPersonalSub(true);
  };

  const getPriceBeforeCoupon = () => {
    if (!selectedPlanForSubscribe) return 0;
    return subscribeBillingCycle === 'monthly' ? selectedPlanForSubscribe.monthlyPrice : selectedPlanForSubscribe.yearlyPrice;
  };

  const getDiscountedPriceAndTax = () => {
    const subtotal = getPriceBeforeCoupon();
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        discount = subtotal * (appliedCoupon.value / 100);
      } else {
        discount = appliedCoupon.value;
      }
    }
    if (discount > subtotal) discount = subtotal;
    const taxedTotal = (subtotal - discount) * 1.1; // 10% VAT
    const taxValue = (subtotal - discount) * 0.1;

    return {
      discount,
      tax: taxValue,
      total: taxedTotal,
    };
  };

  // --- Dynamic Personal Subscriptions Spend & Renewal Calculations ---
  const activePersonalSubs = personalSubs.filter(s => s.status === 'active');
  const totalMonthlySpend = activePersonalSubs.reduce((sum, s) => {
    const monthlyCost = s.billingCycle === 'yearly' ? s.price / 12 : s.price;
    return sum + monthlyCost;
  }, 0);

  const upcomingRenewal = activePersonalSubs.length > 0 
    ? [...activePersonalSubs].sort((a, b) => new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime())[0]
    : null;

  const getDaysUntilRenewal = (dateStr: string) => {
    if (!dateStr) return 0;
    const renewal = new Date(dateStr);
    const today = new Date();
    renewal.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = renewal.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div id="customer-loading" class="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <RefreshCw class="w-8 h-8 animate-spin text-indigo-600" />
        <p class="font-display font-semibold text-slate-600 tracking-wide">Syncing subscription engine...</p>
      </div>
    );
  }

  const calculationDetails = selectedPlanForSubscribe ? getDiscountedPriceAndTax() : null;

  return (
    <div id="customer-panel" class="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-800">
      
      {/* 1. CUSTOMER SIDEBAR */}
      <aside class="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
        <div>
          <div class="p-6 flex items-center gap-2.5 border-b border-slate-100">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Shield class="w-4.5 h-4.5 text-white" />
            </div>
            <span class="font-display font-extrabold text-lg tracking-tight text-slate-900">Billing Core</span>
          </div>

          <nav class="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('personal')}
              id="personal-subs-tab"
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'personal' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Sparkles class="w-4 h-4 text-amber-500" />
              My Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'billing' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <CreditCard class="w-4 h-4" />
              Plans & Invoices
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'usage' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Terminal class="w-4 h-4" />
              API Usage Trackers
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Settings class="w-4 h-4" />
              Preferences Settings
            </button>
          </nav>
        </div>

        <div class="p-4 border-t border-slate-100">
          <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600">U</div>
            <div class="truncate">
              <p class="text-xs font-bold text-slate-800">{user?.name || 'Customer'}</p>
              <p class="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            class="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition cursor-pointer"
          >
            <LogOut class="w-4 h-4" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* 2. CORE WORKSPACE */}
      <main class="flex-1 overflow-y-auto p-6 md:p-10 max-w-7xl mx-auto w-full">
        
        {/* Alerts & Notifications Block */}
        {notifications.filter(n => !n.read).length > 0 && (
          <div id="notifications-banner" class="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl mb-8 flex items-start justify-between gap-4">
            <div class="flex gap-3">
              <Bell class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 class="text-xs font-bold text-indigo-900 uppercase tracking-wider">Unread Alerts</h4>
                <div class="space-y-1 mt-2 text-xs text-indigo-800">
                  {notifications.filter(n => !n.read).map(n => (
                    <p key={n.id}>• {n.message}</p>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleMarkNotificationsRead}
              class="text-xs font-semibold text-indigo-600 hover:underline shrink-0"
            >
              Dismiss All
            </button>
          </div>
        )}

        {/* TAB 0: PERSONAL SUBSCRIPTIONS TRACKER */}
        {activeTab === 'personal' && (
          <div id="personal-tab" class="space-y-8 animate-fade-in">
            {/* Header section with add button */}
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">Personal Spend Tracker</span>
                <h2 class="font-display text-2xl font-extrabold text-slate-900">My Subscriptions</h2>
                <p class="text-sm text-slate-500">Log, track, and optimize external subscriptions you have taken.</p>
              </div>
              <button
                onClick={openAddPersonalModal}
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-indigo-100"
              >
                <Sparkles class="w-4 h-4 text-amber-300" />
                Track Subscription
              </button>
            </div>

            {/* Quick spend overview metrics cards */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Spending */}
              <div class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <CreditCard class="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p class="text-xs text-slate-400 font-medium font-mono uppercase tracking-wider">Total Monthly Spend</p>
                  <p class="text-2xl font-extrabold text-slate-950 font-mono mt-0.5">
                    ${totalMonthlySpend.toFixed(2)}
                  </p>
                  <p class="text-[10px] text-slate-400 mt-1">Billed & prorated monthly cost</p>
                </div>
              </div>

              {/* Card 2: Count */}
              <div class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 class="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p class="text-xs text-slate-400 font-medium font-mono uppercase tracking-wider">Active Subscriptions</p>
                  <p class="text-2xl font-extrabold text-slate-950 font-mono mt-0.5">
                    {activePersonalSubs.length} <span class="text-xs font-normal text-slate-400 font-sans">tracked</span>
                  </p>
                  <p class="text-[10px] text-slate-400 mt-1">{personalSubs.filter(s => s.status !== 'active').length} paused/cancelled</p>
                </div>
              </div>

              {/* Card 3: Upcoming renewal */}
              <div class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Calendar class="w-6 h-6 text-amber-600" />
                </div>
                <div class="truncate bg-transparent">
                  <p class="text-xs text-slate-400 font-medium font-mono uppercase tracking-wider">Upcoming Renewal</p>
                  {upcomingRenewal ? (
                    <>
                      <p class="text-md font-extrabold text-slate-950 truncate mt-0.5">
                        {upcomingRenewal.name}
                      </p>
                      <p class="text-[10px] text-slate-500 font-medium mt-1">
                        {getDaysUntilRenewal(upcomingRenewal.nextRenewalDate) <= 0 
                          ? 'Renewing today' 
                          : `In ${getDaysUntilRenewal(upcomingRenewal.nextRenewalDate)} days (${new Date(upcomingRenewal.nextRenewalDate).toLocaleDateString()})`}
                      </p>
                    </>
                  ) : (
                    <>
                      <p class="text-md font-bold text-slate-400 mt-0.5">No active renewals</p>
                      <p class="text-[10px] text-slate-400 mt-1">All trackers paused or empty</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Subscriptions Grid/Table */}
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 class="font-display font-extrabold text-slate-900">Your Subscription Roll</h3>
                <span class="text-xs text-slate-400 font-mono">Total tracked: {personalSubs.length}</span>
              </div>

              {personalLoading ? (
                <div class="p-12 text-center">
                  <RefreshCw class="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  <p class="text-xs text-slate-400 mt-2">Loading custom tracking list...</p>
                </div>
              ) : personalSubs.length === 0 ? (
                <div class="p-16 text-center space-y-4 bg-transparent">
                  <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                    <Sparkles class="w-8 h-8" />
                  </div>
                  <div class="space-y-1">
                    <h4 class="font-bold text-slate-800 text-sm">No personal subscriptions logged</h4>
                    <p class="text-xs text-slate-500 max-w-sm mx-auto">Click "Track Subscription" to add your subscriptions like Netflix, Amazon Prime, Claude AI, and Spotify.</p>
                  </div>
                </div>
              ) : (
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs divide-y divide-slate-100">
                    <thead class="bg-slate-50/60 text-slate-500 uppercase tracking-wider font-mono">
                      <tr>
                        <th class="p-4">Subscription Service</th>
                        <th class="p-4">Price</th>
                        <th class="p-4">Billing Frequency</th>
                        <th class="p-4">Category</th>
                        <th class="p-4">Next Renewal</th>
                        <th class="p-4">Status</th>
                        <th class="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-sans">
                      {personalSubs.map(sub => {
                        const daysLeft = getDaysUntilRenewal(sub.nextRenewalDate);
                        const isRenewingSoon = daysLeft > 0 && daysLeft <= 7 && sub.status === 'active';
                        return (
                          <tr key={sub.id} class="hover:bg-slate-50/40">
                            {/* Service Identity */}
                            <td class="p-4">
                              <div class="flex items-center gap-3">
                                <div class={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm ${sub.logoColor || 'bg-indigo-600'}`}>
                                  {sub.name.charAt(0)}
                                </div>
                                <div>
                                  <p class="font-bold text-slate-900 text-sm">{sub.name}</p>
                                  <p class="text-[10px] text-slate-400">External service</p>
                                </div>
                              </div>
                            </td>

                            {/* Price */}
                            <td class="p-4 font-bold text-slate-900 font-mono text-sm">
                              ${sub.price.toFixed(2)}
                            </td>

                            {/* Cycle */}
                            <td class="p-4 text-slate-600 capitalize">
                              {sub.billingCycle}
                            </td>

                            {/* Category */}
                            <td class="p-4">
                              <span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-semibold">
                                {sub.category}
                              </span>
                            </td>

                            {/* Renewal */}
                            <td class="p-4">
                              <div class="space-y-0.5">
                                <p class="font-mono text-slate-800">{new Date(sub.nextRenewalDate).toLocaleDateString()}</p>
                                {sub.status === 'active' && (
                                  <p class={`text-[10px] font-medium ${isRenewingSoon ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                                    {daysLeft <= 0 ? 'Today' : `in ${daysLeft} days`}
                                    {isRenewingSoon && ' ⚠️'}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td class="p-4">
                              <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                sub.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                sub.status === 'paused' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {sub.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td class="p-4 text-right">
                              <div class="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => openEditPersonalModal(sub)}
                                  class="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                                  title="Edit tracker details"
                                >
                                  <Settings class="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePersonalSub(sub.id, sub.name)}
                                  class="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Remove tracker"
                                >
                                  <X class="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: BILLING AND PLANS */}
        {activeTab === 'billing' && (
          <div id="billing-tab" class="space-y-10 animate-fade-in">
            {/* CURRENT ACTIVE SUBSCRIPTION DISPLAY */}
            <div class="bg-white border border-slate-150 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600"></div>
              
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">Current Status</span>
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active Subscription
                  </span>
                </div>
                
                <h2 class="font-display text-2xl font-extrabold text-slate-900">
                  {currentPlan ? `${currentPlan.name} Plan` : 'Free Tier'}
                </h2>
                
                {activeSub && (
                  <p class="text-sm text-slate-500 flex items-center gap-1.5">
                    <Calendar class="w-4 h-4 text-slate-400" />
                    Billed {activeSub.billingCycle}. Next charge on <b class="text-slate-800 font-semibold">{new Date(activeSub.endDate).toLocaleDateString()}</b>.
                  </p>
                )}
              </div>

              {activeSub ? (
                <div class="flex flex-col items-end gap-2.5">
                  <p class="text-2xl font-extrabold text-slate-950 font-mono">
                    ${activeSub.pricePaid.toFixed(2)} <span class="text-xs font-normal text-slate-400 font-sans">/ {activeSub.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </p>
                  
                  {activeSub.cancelAtPeriodEnd ? (
                    <div class="text-right text-xs text-rose-500 font-semibold max-w-[200px] leading-relaxed bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                      Auto-renewal is Off. Subscription expires on {new Date(activeSub.endDate).toLocaleDateString()}.
                    </div>
                  ) : (
                    <button
                      onClick={handleCancelAutoRenewal}
                      class="px-4 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs rounded-xl border border-slate-200 hover:border-rose-100 transition cursor-pointer"
                    >
                      Turn Off Auto-Renewal
                    </button>
                  )}
                </div>
              ) : (
                <div class="text-slate-400 text-sm">
                  Subscribe to a premium tier below to unlock high-capacity API limits and storage.
                </div>
              )}
            </div>

            {/* UPGRADE AND TIER SELECTION LIST */}
            <div class="space-y-4">
              <div>
                <h3 class="font-display text-xl font-bold text-slate-900">Available Subscription Tiers</h3>
                <p class="text-sm text-slate-500">Scale seamlessly. Choose a plan tailored for your active team scale.</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                {allPlans.map(plan => {
                  const isCurrent = currentPlan?.id === plan.id;
                  const isUpgradable = activeSub && plan.monthlyPrice > (currentPlan?.monthlyPrice ?? 0);
                  const isDowngradable = activeSub && plan.monthlyPrice < (currentPlan?.monthlyPrice ?? 0);

                  return (
                    <div
                      key={plan.id}
                      class={`bg-white p-6 rounded-2xl border flex flex-col justify-between relative shadow-sm transition ${
                        isCurrent ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isCurrent && (
                        <span class="absolute top-3 right-3 px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-indigo-100">
                          Active Plan
                        </span>
                      )}

                      <div>
                        <h4 class="font-display font-extrabold text-slate-900 text-base">{plan.name}</h4>
                        
                        <div class="mt-4 pb-4 border-b border-slate-100">
                          <p class="text-slate-950 text-2xl font-extrabold font-mono">${plan.monthlyPrice} <span class="text-xs text-slate-400 font-normal">/ mo</span></p>
                          <p class="text-xs text-slate-400 mt-0.5 font-mono">${plan.yearlyPrice} billed annually</p>
                        </div>

                        <ul class="mt-6 space-y-2.5 text-xs text-slate-500">
                          {plan.features.map((feat, i) => (
                            <li key={i} class="flex items-center gap-2">
                              <Check class="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div class="mt-6 pt-4 border-t border-slate-100">
                        {isCurrent ? (
                          <div class="w-full text-center py-2 text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl">
                            Active Subscription
                          </div>
                        ) : isUpgradable ? (
                          <button
                            onClick={() => handleLoadUpgradePreview(plan)}
                            class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow shadow-indigo-600/15 transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            Upgrade Plan <ArrowUpRight class="w-3.5 h-3.5" />
                          </button>
                        ) : isDowngradable ? (
                          <button
                            onClick={() => handleDowngrade(plan)}
                            class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            Downgrade Plan
                          </button>
                        ) : (
                          // Customer has no active sub, allow new subscription
                          <button
                            onClick={() => {
                              setSelectedPlanForSubscribe(plan);
                              setSubscribeBillingCycle('monthly');
                            }}
                            class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            Subscribe
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INVOICES SECTION */}
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div class="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 class="font-display font-extrabold text-slate-900">Billing Invoice History</h3>
                <span class="text-xs text-slate-400 font-mono">PDF Generation Sandbox</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs divide-y divide-slate-100">
                  <thead class="bg-slate-50/60 text-slate-500 uppercase tracking-wider font-mono">
                    <tr>
                      <th class="p-4">Invoice Number</th>
                      <th class="p-4">Billed Date</th>
                      <th class="p-4">Billing Plan</th>
                      <th class="p-4">Amount Paid</th>
                      <th class="p-4">Status</th>
                      <th class="p-4 text-right">Invoice Document</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-sans">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colspan="6" class="p-8 text-center text-slate-400">
                          No invoice documents generated yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map(inv => (
                        <tr key={inv.id} class="hover:bg-slate-50/40">
                          <td class="p-4 font-mono font-semibold text-slate-900">{inv.invoiceNumber}</td>
                          <td class="p-4 text-slate-500 font-mono">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td class="p-4 font-medium text-slate-700">{inv.planName}</td>
                          <td class="p-4 font-bold text-slate-900 font-mono">${inv.finalAmount.toFixed(2)}</td>
                          <td class="p-4">
                            <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td class="p-4 text-right">
                            <a
                              href={`/api/invoices/${inv.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              class="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition"
                            >
                              <FileText class="w-3.5 h-3.5" /> View HTML / Print PDF
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: API USAGE METERS */}
        {activeTab === 'usage' && (
          <div id="usage-tab" class="space-y-8 animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* API REQUESTS METER */}
              <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <div class="flex justify-between items-start">
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">Usage metrics</span>
                    <h3 class="font-display text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Terminal class="w-4.5 h-4.5 text-slate-500" /> API Requests Consumption
                    </h3>
                  </div>
                  {currentPlan && (
                    <span class="text-xs font-mono font-semibold text-slate-500">
                      {(((activeSub?.apiUsage || 0) / currentPlan.apiLimit) * 100).toFixed(1)}% used
                    </span>
                  )}
                </div>

                <div class="mt-6">
                  <p class="text-3xl font-extrabold font-mono text-slate-950">
                    {(activeSub?.apiUsage || 0).toLocaleString()} <span class="text-sm font-normal text-slate-400">/ {currentPlan ? currentPlan.apiLimit.toLocaleString() : '100'} reqs/mo</span>
                  </p>
                  
                  {/* Progress bar */}
                  <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-4">
                    <div
                      class="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentPlan ? Math.min(100, ((activeSub?.apiUsage || 0) / currentPlan.apiLimit) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                <p class="text-xs text-slate-400 mt-4 leading-relaxed">
                  API request limits reset monthly on your renewal billing date. Additional high-capacity limits are unlocked on the Business tier.
                </p>
              </div>

              {/* CLOUD STORAGE METER */}
              <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <div class="flex justify-between items-start">
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">Usage metrics</span>
                    <h3 class="font-display text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Cloud class="w-4.5 h-4.5 text-slate-500" /> Cloud Storage Consumption
                    </h3>
                  </div>
                  {currentPlan && (
                    <span class="text-xs font-mono font-semibold text-slate-500">
                      {(((activeSub?.storageUsage || 0) / currentPlan.storageLimit) * 100).toFixed(1)}% used
                    </span>
                  )}
                </div>

                <div class="mt-6">
                  <p class="text-3xl font-extrabold font-mono text-slate-950">
                    {(activeSub?.storageUsage || 0).toFixed(1)} <span class="text-sm font-normal text-slate-400">/ {currentPlan ? currentPlan.storageLimit : '1'} GB storage</span>
                  </p>
                  
                  {/* Progress bar */}
                  <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-4">
                    <div
                      class="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentPlan ? Math.min(100, ((activeSub?.storageUsage || 0) / currentPlan.storageLimit) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                <p class="text-xs text-slate-400 mt-4 leading-relaxed">
                  Your cloud workspace hosts private assets, file cache files, and structured logs. Upgrade tiers dynamically to immediately allocate more storage blocks.
                </p>
              </div>
            </div>

            {/* SIMULATED DYNAMIC USAGE CHART */}
            <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 class="font-display font-extrabold text-slate-900 mb-6">Historical Consumption Insights</h3>
              <div class="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { date: 'Jul 10', requests: 1200 },
                    { date: 'Jul 11', requests: 1800 },
                    { date: 'Jul 12', requests: 3400 },
                    { date: 'Jul 13', requests: 5200 },
                    { date: 'Jul 14', requests: 8300 },
                    { date: 'Jul 15', requests: 14200 },
                    { date: 'Jul 16', requests: activeSub?.apiUsage || 23450 },
                  ]}>
                    <defs>
                      <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="requests" name="Requests" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER SETTINGS */}
        {activeTab === 'settings' && (
          <div id="settings-tab" class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Update details form */}
            <div class="lg:col-span-2 bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm">
              <h3 class="font-display font-extrabold text-slate-900 mb-6">Profile Settings</h3>
              <form onSubmit={handleSaveSettings} class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address (Read Only)</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email}
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-400 bg-slate-50 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div class="border-t border-slate-100 pt-6">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Email Notifications Preferences</h4>
                  <div class="space-y-3">
                    <div class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pref_invoices"
                        checked={notifPref.invoices}
                        onChange={e => setNotifPref({ ...notifPref, invoices: e.target.checked })}
                        class="w-4.5 h-4.5 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="pref_invoices" class="text-sm text-slate-600 font-medium">Send copy of PDF invoices after successful charges</label>
                    </div>

                    <div class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pref_marketing"
                        checked={notifPref.marketing}
                        onChange={e => setNotifPref({ ...notifPref, marketing: e.target.checked })}
                        class="w-4.5 h-4.5 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="pref_marketing" class="text-sm text-slate-600 font-medium">Send marketing promotions & feature updates</label>
                    </div>

                    <div class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pref_alerts"
                        checked={notifPref.alerts}
                        onChange={e => setNotifPref({ ...notifPref, alerts: e.target.checked })}
                        class="w-4.5 h-4.5 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="pref_alerts" class="text-sm text-slate-600 font-medium">Send critical API and storage threshold warning logs</label>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow shadow-indigo-600/15 hover:shadow-indigo-600/25 transition cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            </div>

            {/* Help guidelines card */}
            <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 class="font-display font-extrabold text-slate-900 mb-4">Integrations Security</h3>
                <p class="text-xs text-slate-500 leading-relaxed">
                  Your credentials and API keys are stored with enterprise-grade SHA-256 salts. Ensure standard TLS protection headers are included in all browser SDK requests.
                </p>
                
                <div class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600">
                  <p class="font-bold text-slate-800">Connection string:</p>
                  <p class="mt-1 truncate">Bearer billing_super_secret_jwt_key...</p>
                </div>
              </div>

              <div class="pt-6 border-t border-slate-100 text-center">
                <p class="text-[10px] text-slate-400">SaaS Billing Platform Engine Sandbox Client</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- SUBSCRIBE PLAN MODAL (WITH COUPON FLOW) --- */}
      {selectedPlanForSubscribe && !upgradePreview && (
        <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-scale-up text-slate-800">
            <button
              onClick={() => {
                setSelectedPlanForSubscribe(null);
                setCouponCode('');
                setAppliedCoupon(null);
              }}
              class="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition"
            >
              <X class="w-5 h-5" />
            </button>

            <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">Checkout Pipeline</span>
            <h3 class="font-display text-xl font-extrabold text-slate-900 mt-1">Subscribe to {selectedPlanForSubscribe.name}</h3>

            <div class="mt-6 space-y-4">
              {/* Billing Cycle Choice */}
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select billing frequency</label>
                <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => { setSubscribeBillingCycle('monthly'); setAppliedCoupon(null); }}
                    class={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      subscribeBillingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Monthly (${selectedPlanForSubscribe.monthlyPrice}/mo)
                  </button>
                  <button
                    onClick={() => { setSubscribeBillingCycle('yearly'); setAppliedCoupon(null); }}
                    class={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      subscribeBillingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Yearly (${selectedPlanForSubscribe.yearlyPrice}/yr)
                  </button>
                </div>
              </div>

              {/* Coupon input */}
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Apply coupon code</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SAVE20"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-indigo-500 text-slate-800"
                  />
                  <button
                    onClick={handleValidateCoupon}
                    disabled={isValidatingCoupon}
                    class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Price Details Breakdown */}
              {calculationDetails && (
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-600">
                  <div class="flex justify-between">
                    <span>Subscription Price</span>
                    <span class="font-bold text-slate-900 font-mono">${getPriceBeforeCoupon().toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div class="flex justify-between text-rose-500">
                      <span>Discount Coupon ({appliedCoupon.code})</span>
                      <span class="font-bold font-mono">-${calculationDetails.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div class="flex justify-between">
                    <span>Prorated VAT Sales Tax (10%)</span>
                    <span class="font-bold text-slate-900 font-mono">${calculationDetails.tax.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                    <span>Total checkout charge</span>
                    <span class="font-mono text-indigo-600">${calculationDetails.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div class="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedPlanForSubscribe(null);
                  setCouponCode('');
                  setAppliedCoupon(null);
                }}
                class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow shadow-indigo-600/15 transition cursor-pointer text-center"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRORATED UPGRADE PREVIEW MODAL --- */}
      {selectedPlanForSubscribe && upgradePreview && (
        <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-scale-up text-slate-800">
            <button
              onClick={() => {
                setSelectedPlanForSubscribe(null);
                setUpgradePreview(null);
              }}
              class="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition"
            >
              <X class="w-5 h-5" />
            </button>

            <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 font-mono">Proration Engine</span>
            <h3 class="font-display text-xl font-extrabold text-slate-900 mt-1">Upgrade Checkout Details</h3>

            <div class="mt-6 space-y-4">
              <div class="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2 text-slate-600 leading-relaxed">
                <p>
                  You are upgrading from the <b class="text-slate-800">{currentPlan?.name}</b> tier to <b class="text-slate-800">{selectedPlanForSubscribe.name}</b>.
                </p>
                <p>
                  The system calculates credit for unused days of your current cycle, subtracting it from the target plan's remaining value.
                </p>
              </div>

              <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-50 text-xs space-y-2 text-slate-600">
                <div class="flex justify-between">
                  <span>Prorated Upgrade Cost</span>
                  <span class="font-bold text-slate-900 font-mono">${upgradePreview.proratedCharge.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Sales Tax (10%)</span>
                  <span class="font-bold text-slate-900 font-mono">${upgradePreview.tax.toFixed(2)}</span>
                </div>
                <div class="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                  <span>Prorated charge due now</span>
                  <span class="font-mono text-indigo-600">${upgradePreview.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedPlanForSubscribe(null);
                  setUpgradePreview(null);
                }}
                class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpgrade}
                class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow shadow-indigo-600/15 transition cursor-pointer text-center"
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PERSONAL SUBSCRIPTION ADD/EDIT MODAL --- */}
      {isAddingPersonalSub && (
        <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div class="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up text-slate-800">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div class="flex items-center gap-2">
                <Sparkles class="w-5 h-5 text-indigo-600 animate-spin" />
                <h3 class="font-display font-extrabold text-slate-900">
                  {editingPersonalSub ? `Edit Tracked Subscription` : 'Track Personal Subscription'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddingPersonalSub(false)}
                class="p-1.5 hover:bg-slate-100 rounded-xl transition cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePersonalSub} class="p-6 space-y-6">
              {/* Preset templates */}
              {!editingPersonalSub && (
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Popular Templates</label>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: 'Netflix Premium', price: 15.49, category: 'Entertainment', logoColor: 'bg-red-600' },
                      { name: 'Amazon Prime', price: 14.99, category: 'Shopping', logoColor: 'bg-cyan-600' },
                      { name: 'Claude AI Pro', price: 20.00, category: 'AI / Productivity', logoColor: 'bg-amber-600' },
                      { name: 'Spotify Family', price: 11.99, category: 'Music', logoColor: 'bg-emerald-600' },
                      { name: 'YouTube Premium', price: 13.99, category: 'Entertainment', logoColor: 'bg-rose-600' },
                      { name: 'ChatGPT Plus', price: 20.00, category: 'AI / Productivity', logoColor: 'bg-teal-600' },
                      { name: 'Github Copilot', price: 10.00, category: 'AI / Productivity', logoColor: 'bg-slate-800' },
                      { name: 'Disney+', price: 13.99, category: 'Entertainment', logoColor: 'bg-blue-800' }
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPName(preset.name);
                          setPPrice(preset.price.toString());
                          setPCategory(preset.category);
                          setPLogoColor(preset.logoColor);
                        }}
                        class="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <span class={`w-2.5 h-2.5 rounded-full ${preset.logoColor}`}></span>
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Fields */}
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2 space-y-1.5">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Subscription Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netflix Premium"
                    value={pName}
                    onChange={e => setPName(e.target.value)}
                    class="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Cost Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="e.g. 15.49"
                    value={pPrice}
                    onChange={e => setPPrice(e.target.value)}
                    class="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Billing Frequency *</label>
                  <select
                    value={pBillingCycle}
                    onChange={e => setPBillingCycle(e.target.value as any)}
                    class="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Category *</label>
                  <select
                    value={pCategory}
                    onChange={e => setPCategory(e.target.value)}
                    class="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Entertainment">Entertainment</option>
                    <option value="AI / Productivity">AI / Productivity</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Music">Music</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Next Renewal Date *</label>
                  <input
                    type="date"
                    required
                    value={pNextRenewalDate}
                    onChange={e => setPNextRenewalDate(e.target.value)}
                    class="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                  />
                </div>

                <div class="space-y-1.5 font-sans">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Status *</label>
                  <select
                    value={pStatus}
                    onChange={e => setPStatus(e.target.value as any)}
                    class="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Brand Theme Color</label>
                  <select
                    value={pLogoColor}
                    onChange={e => setPLogoColor(e.target.value)}
                    class="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  >
                    <option value="bg-red-600">Red (Netflix / YouTube)</option>
                    <option value="bg-cyan-600">Cyan (Prime Video)</option>
                    <option value="bg-amber-600">Amber (Claude AI)</option>
                    <option value="bg-emerald-600">Green (Spotify)</option>
                    <option value="bg-teal-600">Teal (ChatGPT)</option>
                    <option value="bg-slate-800">Slate (Github)</option>
                    <option value="bg-blue-800">Blue (Disney+)</option>
                    <option value="bg-indigo-600">Indigo (Default)</option>
                  </select>
                </div>
              </div>

              <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingPersonalSub(false)}
                  class="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {editingPersonalSub ? 'Save Changes' : 'Track Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
