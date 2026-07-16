/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div id="toast-wrapper" class="fixed top-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          class="flex items-start gap-3 p-4 bg-white/95 border border-slate-200 backdrop-blur shadow-lg rounded-xl pointer-events-auto transition-all duration-300 transform translate-y-0"
        >
          {toast.type === 'success' && (
            <CheckCircle class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info class="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
          )}

          <div class="flex-1 text-sm font-medium text-slate-800">
            {toast.message}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            class="text-slate-400 hover:text-slate-600 transition"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
