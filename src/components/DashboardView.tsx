import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  Target,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Plus,
  Compass,
  PieChart as PieIcon,
  Calendar,
  Sparkles,
  LayoutGrid,
  List,
  Coffee,
  CalendarClock,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { Task, Habit, Roadmap, TimeEntry, YearlyVision, DailyRoutineItem } from '../types';
import { getTodayStr, formatBnDate, formatBnNumber } from '../utils/storage';
import { fireConfetti } from '../utils/confetti';

interface DashboardViewProps {
  tasks: Task[];
  habits: Habit[];
  activeRoadmap?: Roadmap;
  timeEntries: TimeEntry[];
  yearlyVision: YearlyVision;
  dailyRoutine?: DailyRoutineItem[];
  onToggleTask: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenNewTask: () => void;
  onOpenUpcoming?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  habits,
  activeRoadmap,
  timeEntries,
  yearlyVision,
  dailyRoutine = [],
  onToggleTask,
  onNavigateTab,
  onOpenNewTask,
  onOpenUpcoming,
}) => {
  const [todayStr, setTodayStr] = useState<string>(() => getTodayStr());

  // Automatically update the date at midnight / 12:01 AM
  useEffect(() => {
    const checkDate = () => {
      const current = getTodayStr();
      setTodayStr((prev) => (prev !== current ? current : prev));
    };

    const timer = setInterval(checkDate, 10000);
    return () => clearInterval(timer);
  }, []);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const completionRate = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const upcomingCount = tasks.filter((t) => t.date > todayStr && !t.completed).length;

  // Time metrics for today
  const todayEntries = timeEntries.filter((e) => e.date === todayStr);
  const prodMinutes = todayEntries
    .filter((e) => e.type === 'productive')
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const wastedMinutes = todayEntries
    .filter((e) => e.type === 'wasted')
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const prodHours = (prodMinutes / 60).toFixed(1);
  const wastedHours = (wastedMinutes / 60).toFixed(1);

  // Habits active today
  const activeHabitsDoneToday = habits.filter((h) => h.history[todayStr]).length;
  const highestStreak = habits.reduce((max, h) => (h.currentStreak > max ? h.currentStreak : max), 0);

  // Eisenhower Matrix grouping
  const p1Tasks = todayTasks.filter((t) => t.priority === 'P1');
  const p2Tasks = todayTasks.filter((t) => t.priority === 'P2');
  const p3Tasks = todayTasks.filter((t) => t.priority === 'P3');
  const p4Tasks = todayTasks.filter((t) => t.priority === 'P4');

  const priorityTasks = todayTasks.filter((t) => t.priority === 'P1' || t.priority === 'P2');

  // Sorted list of all today's tasks (P1 -> P2 -> P3 -> P4, uncompleted first, then time)
  const priorityOrder: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const diff = (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
    if (diff !== 0) return diff;
    return (a.time || '').localeCompare(b.time || '');
  });

  const handleTaskCheck = (taskId: string, wasCompleted: boolean) => {
    onToggleTask(taskId);
    if (!wasCompleted) {
      fireConfetti();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#005B96] via-[#004b7c] to-[#00385c] rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-sm border border-[#00A3E0]/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-[#16a34a] border border-[#15803d] flex items-center gap-1.5 text-white font-black text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span className="text-white tracking-wide">{formatBnDate(todayStr)}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              দৈনিক সময় ও কর্মপরিকল্পনা ড্যাশবোর্ড
            </h1>
            <p className="text-xs sm:text-sm text-[#d0e5f2] mt-1 max-w-xl leading-relaxed">
              প্রতিটি ঘণ্টার সঠিক মূল্যায়ন করুন। অপচয় কমিয়ে আজকের লক্ষ্যগুলো শান্ত চিত্তে পূরণ করুন।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewTask}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0E68C]/30 text-[#005B96] font-extrabold text-xs sm:text-sm shadow-xs border border-white/60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-[#005B96]" />
              <span>আজকের কাজ যোগ করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Tasks Completion */}
        <div
          onClick={() => onNavigateTab('daily')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs hover:shadow-xs hover:border-[#005B96]/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-[#55697a]">আজকের কাজের অগ্রগতি</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#005B96]/10 text-[#005B96] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-[#005B96] font-mono">
              {formatBnNumber(completedToday)}/{formatBnNumber(todayTasks.length)}
            </span>
            <span className="text-xs font-bold text-[#00A3E0]">({formatBnNumber(completionRate)}%)</span>
          </div>
          <div className="w-full bg-[#e8edf2] rounded-full h-1.5 sm:h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-[#005B96] h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 2: Productive vs Wasted */}
        <div
          onClick={() => onNavigateTab('time-analysis')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs hover:shadow-xs hover:border-[#00A3E0]/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-[#55697a]">আজকের কাজের সময়</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#00A3E0]/10 text-[#00A3E0] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-[#005B96] font-mono">
              {formatBnNumber(prodHours)} ঘণ্টা
            </span>
            <span className="text-[11px] text-[#FF8C00] font-bold">
              অপচয়: {formatBnNumber(wastedHours)} ঘণ্টা
            </span>
          </div>
          <div className="text-[11px] text-[#7d8f8a] mt-2 truncate">
            {prodMinutes >= 120 ? 'দারুণ ফোকাস বজায় রয়েছে' : 'আরও ডিপ ফোকাস প্রয়োজন'}
          </div>
        </div>

        {/* Metric 3: Habits Streak */}
        <div
          onClick={() => onNavigateTab('habits')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs hover:shadow-xs hover:border-[#F6A600]/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-[#55697a]">অভ্যাস ধারাবাহিকতা</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F6A600]/15 text-[#F6A600] flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-[#005B96] font-mono">
              {formatBnNumber(activeHabitsDoneToday)}/{formatBnNumber(habits.length)}
            </span>
            <span className="text-xs font-bold text-[#F6A600]">হয়েছে</span>
          </div>
          <div className="text-[11px] text-[#7d8f8a] mt-2 truncate">
            সর্বোচ্চ স্ট্রিক: {formatBnNumber(highestStreak)} দিন
          </div>
        </div>

        {/* Metric 4: Yearly Vision */}
        <div
          onClick={() => onNavigateTab('yearly')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs hover:shadow-xs hover:border-[#00A3E0]/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-[#55697a]">বার্ষিক ভিশন {yearlyVision.year}</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#00A3E0]/10 text-[#00A3E0] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#005B96] truncate">
            {yearlyVision.theme || 'লক্ষ্য অর্জন করা'}
          </div>
          <div className="text-[11px] text-[#00A3E0] font-semibold mt-2 truncate">
            4টি কোয়ার্টারের লক্ষ্য দেখুন →
          </div>
        </div>
      </div>

      {/* Main Section: Priority Tasks & Eisenhower Matrix + Active Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Tasks & Eisenhower Matrix */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4">
          {/* Header & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeae2] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF8C00]"></div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#005B96]">
                অগ্রাধিকার ব্যবস্থাপনা
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center bg-[#f3f0e8] p-0.5 rounded-xl text-xs font-bold border border-[#e6e2d9]">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[#16a34a] text-white shadow-2xs font-black'
                      : 'text-[#697b76] hover:text-[#16a34a]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>তালিকা</span>
                </button>
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'matrix'
                      ? 'bg-[#16a34a] text-white shadow-2xs font-black'
                      : 'text-[#697b76] hover:text-[#16a34a]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>4-কোয়াড্রেন্ট ম্যাট্রিক্স</span>
                </button>
              </div>

              <button
                onClick={() => onNavigateTab('daily')}
                className="text-xs font-bold text-[#005B96] hover:text-[#004877] flex items-center gap-0.5 cursor-pointer ml-1"
                title="আজকের সকল কাজ দেখুন"
              >
                <span>আজকের কাজ ({todayTasks.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {upcomingCount > 0 && (
                <button
                  onClick={() => (onOpenUpcoming ? onOpenUpcoming() : onNavigateTab('daily'))}
                  className="text-xs font-bold text-[#00A3E0] hover:text-[#005B96] bg-[#00A3E0]/10 hover:bg-[#00A3E0]/20 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ml-1 border border-[#00A3E0]/30"
                  title="আগামী 1 মাসের নির্ধারিত কাজের তালিকা দেখুন"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[#00A3E0]" />
                  <span>আসন্ন কাজ ({formatBnNumber(upcomingCount)}) →</span>
                </button>
              )}
            </div>
          </div>

          {/* Mode 1: List View */}
          {viewMode === 'list' && (
            <div>
              {sortedTodayTasks.length === 0 ? (
                <div className="text-center py-10 bg-[#faf8f4] rounded-2xl border border-dashed border-[#e3ded6]">
                  <CheckCircle2 className="w-10 h-10 text-[#005B96] mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-bold text-[#1a2724]">আজকের কোনো কাজ এখনও যোগ করা হয়নি!</p>
                  <p className="text-[11px] text-[#788984] mt-1">নতুন কোনো পরিকল্পনা থাকলে যোগ করুন।</p>
                  <button
                    onClick={onOpenNewTask}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#005B96] text-white text-xs font-bold hover:bg-[#004877] cursor-pointer shadow-xs"
                  >
                    + কাজ যোগ করুন
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedTodayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        task.completed
                          ? 'bg-[#f8f7f4] border-[#e7e3dc] opacity-60'
                          : 'bg-white border-[#e6e2da] hover:border-[#005B96]/40 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleTaskCheck(task.id, task.completed)}
                          className="mt-1 w-4 h-4 rounded text-[#005B96] focus:ring-[#005B96] cursor-pointer shrink-0 accent-[#005B96]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md shrink-0 ${
                                task.priority === 'P1'
                                  ? 'bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/30'
                                  : task.priority === 'P2'
                                  ? 'bg-[#005B96]/10 text-[#005B96] border border-[#005B96]/30'
                                  : task.priority === 'P3'
                                  ? 'bg-[#00A3E0]/10 text-[#00A3E0] border border-[#00A3E0]/30'
                                  : 'bg-[#F6A600]/10 text-[#F6A600] border border-[#F6A600]/30'
                              }`}
                            >
                              <span className="sm:hidden">{task.priority}</span>
                              <span className="hidden sm:inline">
                                {task.priority === 'P1'
                                  ? 'P1 (খুব জরুরি কাজ)'
                                  : task.priority === 'P2'
                                  ? 'P2 (গুরুত্বপূর্ণ কাজ)'
                                  : task.priority === 'P3'
                                  ? 'P3 (রুটিন কাজ)'
                                  : 'P4 (কম জরুরি কাজ)'}
                              </span>
                            </span>
                            <h3
                              className={`text-xs sm:text-sm font-bold break-words min-w-0 flex-1 ${
                                task.completed ? 'line-through text-[#8d9f9a]' : 'text-[#1a2724]'
                              }`}
                            >
                              {task.title}
                            </h3>
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-[#6d7e79] mt-0.5 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-[#869792] mt-1.5">
                            <span className="flex items-center gap-1 font-mono font-medium text-[#4f615c]">
                              <Clock className="w-3 h-3 text-[#869792]" />
                              <span>{task.time || '--:--'}</span>
                              {task.durationMinutes && (
                                <span className="text-[10px]">({formatBnNumber(task.durationMinutes)} মি.)</span>
                              )}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#f2efe9] text-[#4f615c]">
                              {task.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Eisenhower 4-Quadrant Matrix View */}
          {viewMode === 'matrix' && (
            <div className="space-y-2 pt-1">
              {/* Matrix Axis Guide */}
              <div className="hidden sm:grid grid-cols-2 gap-3 text-[11px] font-bold text-center">
                <div className="py-1 px-3 rounded-xl bg-orange-50/70 border border-orange-200/60 text-orange-900 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ea580c]"></span>
                  <span>জরুরি (Urgent - দ্রুত করণীয়)</span>
                </div>
                <div className="py-1 px-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-[#005B96] flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#005B96]"></span>
                  <span>জরুরি নয় (Not Urgent - দীর্ঘমেয়াদী)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Q1: Urgent & Important (P1) */}
                <div className="p-4 rounded-2xl bg-[#fff7ed]/80 border border-[#ea580c]/30 shadow-2xs space-y-2.5 transition-all hover:border-[#ea580c]/60">
                  <div className="flex items-center justify-between border-b border-[#ea580c]/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#ea580c] text-white text-[11px] font-black tracking-wide">
                        P1
                      </span>
                      <div>
                        <span className="text-xs font-black text-[#9a3412] block">খুব জরুরি ও গুরুত্বপূর্ণ</span>
                        <span className="text-[10px] text-[#ea580c] font-bold">Q1 • অবিলম্বে করুন</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#ea580c]/15 text-[#9a3412]">
                      {formatBnNumber(p1Tasks.length)}টি
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[95px]">
                    {p1Tasks.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-[#9a3412]/70 font-medium">
                        কোনো P1 (খুব জরুরি) কাজ নেই
                      </div>
                    ) : (
                      p1Tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleTaskCheck(t.id, t.completed)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            t.completed
                              ? 'bg-white/50 border-[#ea580c]/20 line-through text-[#8f9f9b]'
                              : 'bg-white border-[#ea580c]/30 text-[#1a2724] shadow-2xs hover:border-[#ea580c]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#ea580c] accent-[#ea580c] cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold break-words block">{t.title}</span>
                            <div className="flex items-center gap-2 text-[10px] text-[#718096] mt-0.5">
                              {t.time && <span className="font-mono">{t.time}</span>}
                              {t.durationMinutes && (
                                <span>({formatBnNumber(t.durationMinutes)} মি.)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Q2: Important, Not Urgent (P2) */}
                <div className="p-4 rounded-2xl bg-[#f0f7fc]/80 border border-[#005B96]/30 shadow-2xs space-y-2.5 transition-all hover:border-[#005B96]/60">
                  <div className="flex items-center justify-between border-b border-[#005B96]/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#005B96] text-white text-[11px] font-black tracking-wide">
                        P2
                      </span>
                      <div>
                        <span className="text-xs font-black text-[#005B96] block">গুরুত্বপূর্ণ, জরুরি নয়</span>
                        <span className="text-[10px] text-[#0077b6] font-bold">Q2 • পরিকল্পনা করুন</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#005B96]/15 text-[#005B96]">
                      {formatBnNumber(p2Tasks.length)}টি
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[95px]">
                    {p2Tasks.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-[#005B96]/70 font-medium">
                        কোনো P2 (গুরুত্বপূর্ণ) কাজ নেই
                      </div>
                    ) : (
                      p2Tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleTaskCheck(t.id, t.completed)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            t.completed
                              ? 'bg-white/50 border-[#005B96]/20 line-through text-[#8f9f9b]'
                              : 'bg-white border-[#005B96]/30 text-[#1a2724] shadow-2xs hover:border-[#005B96]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#005B96] accent-[#005B96] cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold break-words block">{t.title}</span>
                            <div className="flex items-center gap-2 text-[10px] text-[#718096] mt-0.5">
                              {t.time && <span className="font-mono">{t.time}</span>}
                              {t.durationMinutes && (
                                <span>({formatBnNumber(t.durationMinutes)} মি.)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Q3: Urgent, Not Important (P3) */}
                <div className="p-4 rounded-2xl bg-[#f0f9ff]/80 border border-[#0284c7]/30 shadow-2xs space-y-2.5 transition-all hover:border-[#0284c7]/60">
                  <div className="flex items-center justify-between border-b border-[#0284c7]/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#0284c7] text-white text-[11px] font-black tracking-wide">
                        P3
                      </span>
                      <div>
                        <span className="text-xs font-black text-[#0369a1] block">জরুরি কিন্তু কম গুরুত্বপূর্ণ</span>
                        <span className="text-[10px] text-[#0284c7] font-bold">Q3 • রুটিন বা দ্রুত সারুন</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0284c7]/15 text-[#0369a1]">
                      {formatBnNumber(p3Tasks.length)}টি
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[95px]">
                    {p3Tasks.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-[#0369a1]/70 font-medium">
                        কোনো P3 (রুটিন) কাজ নেই
                      </div>
                    ) : (
                      p3Tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleTaskCheck(t.id, t.completed)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            t.completed
                              ? 'bg-white/50 border-[#0284c7]/20 line-through text-[#8f9f9b]'
                              : 'bg-white border-[#0284c7]/30 text-[#1a2724] shadow-2xs hover:border-[#0284c7]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#0284c7] accent-[#0284c7] cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold break-words block">{t.title}</span>
                            <div className="flex items-center gap-2 text-[10px] text-[#718096] mt-0.5">
                              {t.time && <span className="font-mono">{t.time}</span>}
                              {t.durationMinutes && (
                                <span>({formatBnNumber(t.durationMinutes)} মি.)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Q4: Not Urgent, Not Important (P4) */}
                <div className="p-4 rounded-2xl bg-[#fffbeb]/80 border border-[#d97706]/30 shadow-2xs space-y-2.5 transition-all hover:border-[#d97706]/60">
                  <div className="flex items-center justify-between border-b border-[#d97706]/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#d97706] text-white text-[11px] font-black tracking-wide">
                        P4
                      </span>
                      <div>
                        <span className="text-xs font-black text-[#b45309] block">কম জরুরি ও ঐচ্ছিক</span>
                        <span className="text-[10px] text-[#d97706] font-bold">Q4 • অবসরে করুন</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#d97706]/15 text-[#b45309]">
                      {formatBnNumber(p4Tasks.length)}টি
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[95px]">
                    {p4Tasks.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-[#b45309]/70 font-medium">
                        কোনো P4 (ঐচ্ছিক) কাজ নেই
                      </div>
                    ) : (
                      p4Tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleTaskCheck(t.id, t.completed)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            t.completed
                              ? 'bg-white/50 border-[#d97706]/20 line-through text-[#8f9f9b]'
                              : 'bg-white border-[#d97706]/30 text-[#1a2724] shadow-2xs hover:border-[#d97706]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#d97706] accent-[#d97706] cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold break-words block">{t.title}</span>
                            <div className="flex items-center gap-2 text-[10px] text-[#718096] mt-0.5">
                              {t.time && <span className="font-mono">{t.time}</span>}
                              {t.durationMinutes && (
                                <span>({formatBnNumber(t.durationMinutes)} মি.)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Active Roadmap & Quick Tools */}
        <div className="space-y-4">
          {/* Daily Routine Box (ড্যাশবোর্ডের ডান পাশে নতুন সেকশন) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#005B96]/30 shadow-2xs space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#eeeae2] pb-2.5">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#005B96]" />
                <h3 className="text-xs sm:text-sm font-extrabold text-[#005B96]">
                  ডেইলি রুটিন (06:00 - 24:00)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('daily-routine')}
                className="text-[11px] font-bold text-[#005B96] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>সম্পূর্ণ রুটিন ও এডিট</span>
                <span>→</span>
              </button>
            </div>

            {/* Quick Stats Pills */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-rose-700 font-bold block">বাধ্যতামূলক</span>
                <span className="text-xs font-black text-rose-800 mt-0.5">
                  {formatBnNumber(dailyRoutine.filter((i) => i.priority === 'mandatory').length)}টি
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-amber-800 font-bold block">কম জরুরি</span>
                <span className="text-xs font-black text-amber-900 mt-0.5">
                  {formatBnNumber(dailyRoutine.filter((i) => i.priority === 'less_important').length)}টি
                </span>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-blue-700 font-bold block">রুটিন কাজ</span>
                <span className="text-xs font-black text-blue-900 mt-0.5">
                  {formatBnNumber(dailyRoutine.filter((i) => i.priority === 'routine').length)}টি
                </span>
              </div>
            </div>

            {/* Routine Slots Preview */}
            <div className="space-y-1.5">
              {dailyRoutine.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab('daily-routine')}
                  className="p-2.5 rounded-xl border border-[#e6e2da] hover:border-[#005B96]/50 bg-[#fbfbfa] hover:bg-white transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#005B96] px-1.5 py-0.5 bg-white rounded-md border border-[#e2ddd5]">
                        {item.startTime} - {item.endTime}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          item.priority === 'mandatory'
                            ? 'bg-rose-100 text-rose-700'
                            : item.priority === 'less_important'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.priority === 'mandatory'
                          ? 'বাধ্যতামূলক'
                          : item.priority === 'less_important'
                          ? 'কম গুরুত্বপূর্ণ'
                          : 'রুটিন কাজ'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#1a2724] break-words mt-1">
                      {item.title}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#005B96] font-bold shrink-0">এডিট →</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('daily-routine')}
              className="w-full py-2 rounded-xl bg-[#005B96]/10 hover:bg-[#005B96]/15 text-[#005B96] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>সব রুটিন স্লট দেখুন ও কাস্টমাইজ করুন ({formatBnNumber(dailyRoutine.length)}টি)</span>
            </button>
          </div>

          {/* Active Yearly Vision Box */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#eeeae2] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#005B96]" />
                <h3 className="text-xs sm:text-sm font-extrabold text-[#005B96]">
                  বাৎসরিক ভিশন ({formatBnNumber(yearlyVision.year || 2026)})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('yearly')}
                className="text-[11px] font-bold text-[#005B96] hover:underline cursor-pointer"
              >
                বিস্তারিত →
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{yearlyVision.theme}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{yearlyVision.coreVision}</p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#55697a]">কোয়ার্টার লক্ষ্যসমূহ (Quarters):</div>
                {[
                  { key: 'q1', label: 'Q1 (জানু — মার্চ)', goals: yearlyVision.quarterGoals.q1 },
                  { key: 'q2', label: 'Q2 (এপ্রিল — জুন)', goals: yearlyVision.quarterGoals.q2 },
                  { key: 'q3', label: 'Q3 (জুলাই — সেপ্টে)', goals: yearlyVision.quarterGoals.q3 },
                  { key: 'q4', label: 'Q4 (অক্টো — ডিসে)', goals: yearlyVision.quarterGoals.q4 },
                ].map((q) => (
                  <div key={q.key} className="p-2.5 rounded-xl bg-[#F0E68C]/15 border border-[#F0E68C]/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1a2724]">{q.label}</span>
                      <span className="text-[10px] font-mono text-[#005B96] font-extrabold">
                        {formatBnNumber(q.goals.length)}টি লক্ষ্য
                      </span>
                    </div>
                    {q.goals.length > 0 && (
                      <div className="text-[10px] text-[#55697a] mt-0.5 break-words">
                        • {q.goals[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Navigate Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateTab('time-analysis')}
              className="p-3 rounded-xl bg-white border border-[#e6e2da] hover:border-[#00A3E0]/50 shadow-2xs text-left transition-all cursor-pointer group"
            >
              <PieIcon className="w-4 h-4 text-[#00A3E0] mb-1 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-extrabold text-[#005B96]">সময় বিশ্লেষণ</div>
              <div className="text-[10px] text-[#7d8f8a]">গ্রাফ ও অপচয় লগ</div>
            </button>

            <button
              onClick={() => onNavigateTab('reports')}
              className="p-3 rounded-xl bg-white border border-[#e6e2da] hover:border-[#005B96]/50 shadow-2xs text-left transition-all cursor-pointer group"
            >
              <TrendingUp className="w-4 h-4 text-[#005B96] mb-1 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-extrabold text-[#005B96]">অগ্রগতি রিপোর্ট</div>
              <div className="text-[10px] text-[#7d8f8a]">গ্রেড ও অন্তর্দৃষ্টি</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
