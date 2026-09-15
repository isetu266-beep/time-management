import React, { useState, useRef } from 'react';
import {
  X,
  Cloud,
  Check,
  RefreshCw,
  AlertCircle,
  Mail,
  LogOut,
  ShieldCheck,
  Download,
  Upload,
} from 'lucide-react';
import { AppData } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onRestoreData: (data: AppData) => void;
  userEmail: string;
  onConnectEmail: (email: string) => Promise<{ success: boolean; isNew?: boolean; message: string }>;
  onDisconnectEmail: () => void;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  onManualSyncNow: () => Promise<boolean>;
  onRestoreFromCloud?: () => Promise<{ success: boolean; message: string }>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  appData,
  onRestoreData,
  userEmail,
  onConnectEmail,
  onDisconnectEmail,
  isSyncing,
  lastSyncTime,
  onManualSyncNow,
  onRestoreFromCloud,
}) => {
  const [inputEmail, setInputEmail] = useState(() => {
    try {
      return (
        localStorage.getItem('timecraft_user_gmail') ||
        localStorage.getItem('timecraft_last_input_email') ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const [manualSyncLoading, setManualSyncLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Connect & Sync with Gmail
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inputEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setFeedback({ type: 'error', text: 'অনুগ্রহ করে একটি সঠিক জিমেইল আইডি লিখুন (যেমন: yourname@gmail.com)।' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await onConnectEmail(email);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        try {
          localStorage.setItem('timecraft_last_input_email', email);
        } catch {}
      } else {
        setFeedback({ type: 'error', text: res.message || 'কানেক্ট করতে ব্যর্থ হয়েছে। ইন্টারনেট চেক করুন।' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'সার্ভার সংযোগে ত্রুটি হয়েছে। অনুগ্রহ করে ইন্টারনেট চেক করুন।' });
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual cloud sync
  const handleTriggerManualSync = async () => {
    setManualSyncLoading(true);
    setFeedback(null);
    try {
      const ok = await onManualSyncNow();
      if (ok) {
        const count = appData.tasks.length;
        setFeedback({
          type: 'success',
          text: `ক্লাউডে সফলভাবে ${count}টি কাজ, ${appData.habits.length}টি অভ্যাস ও সমস্ত ডেটা ব্যাকআপ হয়েছে!`,
        });
      } else {
        setFeedback({ type: 'error', text: 'ক্লাউডে সিঙ্ক করা সম্ভব হয়নি। ইন্টারনেট কানেকশন চেক করুন।' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'সার্ভারের সাথে সংযোগে ত্রুটি হয়েছে।' });
    } finally {
      setManualSyncLoading(false);
    }
  };

  // Trigger manual cloud restore
  const handleTriggerRestoreFromCloud = async () => {
    if (!onRestoreFromCloud) return;
    setManualSyncLoading(true);
    setFeedback(null);
    try {
      const res = await onRestoreFromCloud();
      setFeedback({ type: res.success ? 'success' : 'error', text: res.message });
    } catch {
      setFeedback({ type: 'error', text: 'ক্লাউড থেকে রিস্টোর করতে সমস্যা হয়েছে।' });
    } finally {
      setManualSyncLoading(false);
    }
  };

  // Offline JSON export
  const handleDownloadBackup = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(appData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('download', `timecraft_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setFeedback({
        type: 'success',
        text: 'অফলাইন ব্যাকআপ ফাইল (.json) সফলভাবে আপনার ডিভাইসে ডাউনলোড হয়েছে। এটি সম্পূর্ণ সুরক্ষিত।',
      });
    } catch {
      setFeedback({ type: 'error', text: 'ব্যাকআপ ফাইল তৈরিতে সমস্যা হয়েছে।' });
    }
  };

  // Offline JSON import
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onRestoreData(parsed);
          setFeedback({
            type: 'success',
            text: 'ফাইল থেকে সকল কাজ ও রুটিন সফলভাবে রিস্টোর করা হয়েছে!',
          });
        } else {
          setFeedback({ type: 'error', text: 'ফাইলটি সঠিক ব্যাকআপ ফাইল নয়।' });
        }
      } catch {
        setFeedback({ type: 'error', text: 'ফাইলটি পড়তে ব্যর্থ হয়েছে।' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base sm:text-lg">
                জিমেইল অটো সিঙ্ক ও ব্যাকআপ
              </h3>
              <p className="text-xs text-slate-500">
                রিয়েল-টাইম ক্লাউড ব্যাকআপ এবং অটো রিস্টোর
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Feedback Message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Connected State vs Disconnected State */}
          {userEmail ? (
            /* User is already connected with Gmail */
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                  </span>
                  <span className="text-xs font-black text-emerald-900 tracking-wide uppercase">
                    রিয়েল-টাইম অটো সিঙ্ক সক্রিয়
                  </span>
                </div>
                {isSyncing && (
                  <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    সিঙ্ক হচ্ছে...
                  </span>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {userEmail}
                  </span>
                </div>
                <button
                  onClick={onDisconnectEmail}
                  className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title="লগআউট বা ডিসকানেক্ট করুন"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>

              <p className="text-xs text-emerald-800 leading-relaxed">
                ✨ <strong>স্বয়ংক্রিয় ব্যাকআপ চালু আছে:</strong> আপনি নতুন কাজ যোগ করলে বা কোনো পরিবর্তন করলে তা স্বয়ংক্রিয়ভাবে আপনার এই জিমেইলে সেভ হচ্ছে। মোবাইল পরিবর্তন বা অ্যাপ আনইনস্টল করে পুনরায় এই জিমেইল দিলেই সব ডাটা সাথে সাথে ফেরত পাবেন।
              </p>

              {/* Manual Cloud Sync & Restore Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerManualSync}
                  disabled={manualSyncLoading || isSyncing}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${manualSyncLoading || isSyncing ? 'animate-spin' : ''}`} />
                  <span>{manualSyncLoading ? 'সিঙ্ক হচ্ছে...' : 'এখনই ক্লাউডে ব্যাকআপ নিন'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerRestoreFromCloud}
                  disabled={manualSyncLoading || isSyncing}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ক্লাউড থেকে রিস্টোর করুন</span>
                </button>
              </div>

              {lastSyncTime && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>সর্বশেষ ক্লাউড সিঙ্ক: {lastSyncTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                </div>
              )}
            </div>
          ) : (
            /* User is NOT connected - Direct Gmail Option */
            <div className="space-y-4">
              <form onSubmit={handleConnect} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    আপনার জিমেইল আইডি লিখুন:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="যেমন: yourname@gmail.com"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Cloud className="w-4 h-4" />
                  <span>{loading ? 'কানেক্ট ও সিঙ্ক হচ্ছে...' : 'জিমেইল কানেক্ট ও ডেটা সিঙ্ক করুন'}</span>
                </button>
              </form>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] sm:text-xs text-slate-700 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>আপনার জন্য এটি যেভাবে কাজ করবে:</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>সহজ কানেকশন:</strong> আপনি আপনার পছন্দমতো যেকোনো জিমেইল আইডি লিখে কোনো পাসওয়ার্ড ছাড়াই সরাসরি কানেক্ট করতে পারবেন।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>অটো ক্লাউড সিঙ্ক:</strong> আপনার জিমেইল দেওয়ার সাথে সাথে সমস্ত কাজের ডাটা স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক ও সেভ হতে থাকবে।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>100% অটো রিস্টোর:</strong> পরবর্তীতে যদি কখনো অ্যাপটি আনইনস্টল (Uninstall) করে ফেলেন বা ডিলিট হয়ে যায়, তবে পুনরায় অ্যাপটি ইনস্টল করে আপনার পূর্বের দেওয়া জিমেইলটি লিখলেই আগের সমস্ত ডাটা ও রুটিন সাথে সাথে অটো রিস্টোর হয়ে যাবে।</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Offline File Backup & Restore (Zero Data Loss Guarantee) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>অফলাইন ফাইল ব্যাকআপ ও রিস্টোর</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">ইন্টারনেট ছাড়াও কার্যকর</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="সম্পূর্ণ ডেটা JSON ফাইল হিসেবে ডাউনলোড করুন"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>ফাইল ডাউনলোড</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="পূর্বের ব্যাকআপ ফাইল থেকে রিস্টোর করুন"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>ফাইল রিস্টোর</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileRestore}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>গুগল ফায়ারবেস ক্লাউড স্টোরেজ</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
