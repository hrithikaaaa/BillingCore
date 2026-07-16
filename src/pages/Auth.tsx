/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User as UserIcon, CheckCircle, ArrowRight } from 'lucide-react';

export default function Auth() {
  const { login, register, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoLogin = async (demoEmail: string) => {
    setIsSubmitting(true);
    try {
      await login(demoEmail, 'password123');
    } catch (err) {
      console.error('Demo login failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) return;

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      console.error('Auth action failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="auth-page" class="min-h-screen flex flex-col lg:flex-row bg-zinc-950 text-zinc-100">
      {/* Visual panel */}
      <div class="hidden lg:flex lg:w-1/2 bg-[#0c0c0e] border-r border-zinc-850 p-16 flex-col justify-between text-white relative overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.12),transparent)] opacity-60"></div>
        <div class="relative z-10 flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/10">
            <Shield class="w-6 h-6 text-white" />
          </div>
          <span class="font-display text-xl font-extrabold tracking-tight">SaaS Billing Engine</span>
        </div>

        <div class="relative z-10 my-auto max-w-md space-y-6">
          <h1 class="font-display text-4xl font-extrabold leading-tight tracking-tight text-white">
            Enterprise-Grade SaaS Subscription Billing Engine
          </h1>
          <p class="text-zinc-400 text-base leading-relaxed">
            Unify billing pipelines, manage customers, generate dynamic tax calculations, handle prorated upgrades, and analyze core MRR analytics.
          </p>
          <div class="space-y-4 pt-4 text-sm text-zinc-300">
            <div class="flex items-center gap-3">
              <CheckCircle class="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Secure, granular JWT role authorizations</span>
            </div>
            <div class="flex items-center gap-3">
              <CheckCircle class="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Real-time proration, tax, and coupon calculations</span>
            </div>
            <div class="flex items-center gap-3">
              <CheckCircle class="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Professional analytics dashboards & invoices</span>
            </div>
          </div>
        </div>

        <div class="relative z-10 text-xs text-zinc-600">
          © 2026 SaaS Subscription Billing Engine. Verified production-grade sandbox.
        </div>
      </div>

      {/* Action form panel */}
      <div class="flex-1 flex flex-col justify-center p-6 md:p-16 lg:p-24 max-w-2xl mx-auto lg:max-w-none w-full">
        <div class="w-full max-w-md mx-auto space-y-8">
          {/* Logo mobile */}
          <div class="lg:hidden flex items-center gap-3 mb-6">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield class="w-5 h-5 text-white" />
            </div>
            <span class="font-display text-lg font-bold">SaaS Billing Engine</span>
          </div>

          <div>
            <h2 class="font-display text-3xl font-extrabold tracking-tight text-white">
              {isLogin ? 'Sign in to dashboard' : 'Create an account'}
            </h2>
            <p class="text-sm text-zinc-400 mt-2">
              {isLogin ? "Welcome back! Enter your details to view billing details." : "Get started with your enterprise subscription billing engine."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} class="space-y-4">
            {!isLogin && (
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Full Name</label>
                <div class="relative">
                  <UserIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    class="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-zinc-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Email Address</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  class="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-zinc-600"
                />
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1.5">
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => alert('Demo platform account passwords are all: password123')}
                    class="text-xs text-indigo-400 font-semibold hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  class="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-zinc-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight class="w-4 h-4" />
            </button>
          </form>

          <div class="text-center text-sm text-zinc-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              class="text-indigo-400 font-semibold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          {/* Quick Demo Logins Section */}
          <div class="border-t border-zinc-800 pt-6 space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
              Quick Demo Accounts
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@billing.com')}
                disabled={isSubmitting}
                class="p-2.5 text-left bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl hover:border-indigo-500/50 text-xs transition cursor-pointer text-zinc-100"
              >
                <p class="font-bold text-zinc-200">Admin Account</p>
                <p class="text-zinc-500 truncate">admin@billing.com</p>
                <p class="text-[10px] text-indigo-400 font-semibold mt-1">Role: Admin Dashboard</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('john@example.com')}
                disabled={isSubmitting}
                class="p-2.5 text-left bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl hover:border-indigo-500/50 text-xs transition cursor-pointer text-zinc-100"
              >
                <p class="font-bold text-zinc-200">John (Active Pro)</p>
                <p class="text-zinc-500 truncate">john@example.com</p>
                <p class="text-[10px] text-emerald-400 font-semibold mt-1">Role: Active Customer</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('alice@example.com')}
                disabled={isSubmitting}
                class="p-2.5 text-left bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl hover:border-indigo-500/50 text-xs transition cursor-pointer text-zinc-100"
              >
                <p class="font-bold text-zinc-200">Alice (Active Starter)</p>
                <p class="text-zinc-500 truncate">alice@example.com</p>
                <p class="text-[10px] text-amber-400 font-semibold mt-1">Role: Active Customer</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
