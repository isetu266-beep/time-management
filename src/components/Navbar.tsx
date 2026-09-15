import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Calendar,
  PieChart as PieIcon,
  Compass,
  Flame,
  Target,
  Sparkles,
  FileText,
  Plus,
  Bell,
  Cloud,
  CheckSquare,
  CalendarClock,
  NotebookPen,
  LayoutGrid,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewTask?: () => void;
  onOpenReminders: () => void;
  onOpenCloudSync: () => void;
  activeRemindersCount: number;
  userEmail?: string;
  isSyncing?: boolean;
}

export const navItems = [
  { id: 'dashboard', label: 'ড্যাশবোর্ড', shortLabel: 'হোম', icon: Layers, desc: 'সারসংক্ষেপ ও প্রায়োরিটি ম্যাট্রিক্স' },
  { id: 'daily-routine', label: 'ডেইলি রুটিন', shortLabel: 'রুটিন', icon: CalendarClock, desc: 'প্রতিদিনের সময়সূচী ও রুটিন চেকার' },
  { id: 'daily', label: 'আজ ও আগামীকালের কাজ', shortLabel: 'দৈনিক', icon: Calendar, desc: 'আজ, আগামী ও আসন্ন 1 মাসের কাজ' },
  { id: 'time-analysis', label: 'সময় বিশ্লেষণ ও গ্রাফ', shortLabel: 'গ্রাফ', icon: PieIcon, desc: 'কাজের সময় ও ক্যাটাগরি বিশ্লেষণ' },
  { id: 'monthly', label: 'মাসিক প্ল্যানার', shortLabel: 'মাসিক', icon: Target, desc: 'মাসিক গোল ও অগ্রগতি পর্যবেক্ষণ' },
  { id: 'yearly', label: 'বাৎসরিক ভিশন', shortLabel: 'বাৎসরিক', icon: Sparkles, desc: 'বাৎসরিক লক্ষ্য ও ত্রৈমাসিক রোডম্যাপ' },
  { id: 'habits', label: 'অভ্যাসের তালিকা', shortLabel: 'অভ্যাস', icon: Flame, desc: 'দৈনন্দিন ভালো অভ্যাস গড়ার ট্র্যাকার' },
  { id: 'reports', label: 'অগ্রগতি রিপোর্ট', shortLabel: 'রিপোর্ট', icon: FileText, desc: 'দৈনিক, সাপ্তাহিক ও মাসিক পূর্ণাঙ্গ রিপোর্ট' },
  { id: 'checklists', label: 'চেক মার্ক লিস্ট', shortLabel: 'চেকলিস্ট', icon: CheckSquare, desc: 'বহুমুখী চেকলিস্ট ও টাস্ক ড্রয়ার' },
  { id: 'notes', label: 'নোট করুন', shortLabel: 'নোট', icon: NotebookPen, desc: 'ব্যক্তিগত তথ্য, হিসাব ও জরুরি মেমো' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTask,
  onOpenReminders,
  onOpenCloudSync,
  activeRemindersCount,
  userEmail,
  isSyncing,
}) => {
  const [isAllMenusOpen, setIsAllMenusOpen] = useState(false);

  return (
    <>
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e6e2da] shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Branding */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#005B96] flex items-center justify-center text-white shadow-xs font-black text-xs sm:text-sm tracking-wider">
              TM
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#005B96]">
                  আমার টাইম ম্যানেজমেন্ট
                </span>
              </div>
              <p className="text-[10px] text-[#55697a] -mt-0.5 hidden xs:block">
                দৈনিক, মাসিক ও বাৎসরিক টাইম ম্যানেজমেন্ট
              </p>
            </div>
          </div>

          {/* Quick Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenReminders}
              className="relative p-2 rounded-xl border border-[#e2ddd5] hover:bg-[#f8f7f0] active:scale-95 text-[#005B96] transition-colors cursor-pointer"
              title="রিমাইন্ডার সেন্টার"
            >
              <Bell className="w-4 h-4 text-[#F6A600]" />
              {activeRemindersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF8C00] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {activeRemindersCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenCloudSync}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                userEmail
                  ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100'
                  : 'border-[#e2ddd5] hover:bg-[#f8f7f0] text-[#005B96]'
              }`}
              title={
                userEmail
                  ? `জিমেইল অটো সিঙ্ক সক্রিয় (${userEmail})`
                  : 'জিমেইল দিয়ে ক্লাউড সিঙ্ক করুন'
              }
            >
              {userEmail ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className={`inline-flex rounded-full h-2 w-2 bg-emerald-500 ${isSyncing ? 'animate-ping' : ''}`}></span>
                  </span>
                  <Cloud className={`w-4 h-4 text-emerald-600 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span className="text-[11px] font-bold hidden sm:inline truncate max-w-[120px]">
                    {userEmail.split('@')[0]}
                  </span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 text-[#00A3E0]" />
                  <span className="text-[11px] font-bold hidden md:inline text-slate-600">
                    সিঙ্ক
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1. PC Mode Navigation Menu Bar (Desktop/Tablet) - Exactly as before */}
        <div className="hidden md:block border-t border-[#ede9e1] bg-white">
          <div className="max-w-7xl w-full mx-auto px-2 sm:px-4 py-1.5 grid grid-cols-10 gap-1 sm:gap-1.5 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1.5 md:py-2 px-1 lg:px-2 text-[11px] lg:text-[11.5px] xl:text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer rounded-xl select-none text-center w-full ${
                    active
                      ? 'bg-[#16a34a] text-white font-black shadow-sm ring-1 ring-[#15803d]'
                      : 'text-[#55697a] hover:text-[#16a34a] hover:bg-[#f0fdf4] bg-transparent border border-transparent'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 ${active ? 'text-white' : 'text-[#8fa3b3]'}`} />
                  <span className={`truncate ${active ? 'text-white' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Mobile Mode Navigation Header (Only on Mobile) */}
        <div className="md:hidden border-t border-[#ede9e1] bg-white px-2.5 pt-1.5 pb-2.5">
          <div className="flex items-center justify-between gap-1.5">
            {/* Left: 'হোম' button */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`min-h-[36px] px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-[#005B96]/10 text-[#005B96] border border-[#005B96]/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
              title="হোমে ফিরুন"
            >
              <Layers className="w-3.5 h-3.5 shrink-0 text-[#005B96]" />
              <span className="leading-normal py-0.5">হোম</span>
            </button>

            {/* Middle: Currently Selected Menu (Always clearly centered & highlighted) */}
            <div className="flex-1 flex items-center justify-center min-w-0 px-1">
              <button
                onClick={() => setIsAllMenusOpen(true)}
                className="min-h-[36px] w-full max-w-[210px] flex items-center justify-center gap-1.5 text-[11.5px] font-black px-2.5 rounded-xl transition-all cursor-pointer select-none bg-[#16a34a] text-white shadow-xs border border-[#15803d] hover:bg-[#15803d] active:scale-98"
                title="মেনু পরিবর্তন করতে ট্যাপ করুন"
              >
                {(() => {
                  const currentItem = navItems.find((i) => i.id === activeTab) || navItems[0];
                  const ItemIcon = currentItem.icon;
                  return (
                    <>
                      <ItemIcon className="w-3.5 h-3.5 shrink-0 text-white" />
                      <span className="truncate leading-normal py-0.5 text-center">{currentItem.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 text-white/80 ml-0.5" />
                    </>
                  );
                })()}
              </button>
            </div>

            {/* Right: 'সব মেনু দেখুন' button */}
            <button
              onClick={() => setIsAllMenusOpen(true)}
              className="min-h-[36px] px-2.5 rounded-xl text-[10.5px] sm:text-[11px] font-bold bg-[#005B96]/10 hover:bg-[#005B96]/15 active:scale-95 text-[#005B96] border border-[#005B96]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title="অ্যাপের সকল 10টি মেনু তালিকা খুলুন"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#005B96] shrink-0" />
              <span className="leading-normal py-0.5">সব মেনু দেখুন</span>
            </button>
          </div>
        </div>
      </header>

      {/* All 10 Menus Quick Drawer Modal for Mobile */}
      {isAllMenusOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsAllMenusOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200 p-4 pb-8 max-h-[85vh] overflow-y-auto shadow-2xl space-y-3.5 z-10 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#005B96]/10 text-[#005B96] flex items-center justify-center font-black">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">অ্যাপ্লিকেশনের সকল মেনু (10টি)</h3>
                  <p className="text-[11px] text-slate-500">যেকোনো মেনুতে ট্যাপ করে সরাসরি যান</p>
                </div>
              </div>
              <button
                onClick={() => setIsAllMenusOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of All 10 Menus */}
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsAllMenusOpen(false);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#16a34a] border-[#15803d] text-white shadow-sm ring-2 ring-[#16a34a]/30'
                        : 'bg-white border-slate-200 hover:border-[#16a34a]/40 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#005B96]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black truncate block ${active ? 'text-white' : 'text-slate-900'}`}>
                          {item.label}
                        </span>
                      </div>
                      <p className={`text-[10px] mt-0.5 line-clamp-1 ${active ? 'text-white/80' : 'text-slate-500'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

