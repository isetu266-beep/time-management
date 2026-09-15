import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  PieChart as PieIcon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Coffee,
} from 'lucide-react';
import { TimeEntry } from '../types';
import { getTodayStr, formatBnNumber, formatBnDate } from '../utils/storage';
import { playSuccessChime, playTick } from '../utils/audio';

interface TimeAnalysisViewProps {
  timeEntries: TimeEntry[];
  onAddTimeEntry: (entry: Omit<TimeEntry, 'id'>) => void;
  onDeleteTimeEntry: (id: string) => void;
}

export const TimeAnalysisView: React.FC<TimeAnalysisViewProps> = ({
  timeEntries,
  onAddTimeEntry,
  onDeleteTimeEntry,
}) => {
  const todayStr = getTodayStr();

  // 1. Pomodoro Focus Timer State
  const [timerSeconds, setTimerSeconds] = useState(30 * 60);
  const [initialSeconds, setInitialSeconds] = useState(30 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerTaskName, setTimerTaskName] = useState('ডিপ ফোকাস সেশন');
  const [customMinutes, setCustomMinutes] = useState('');

  // 2. Manual Time Entry Form State
  const [activity, setActivity] = useState('');
  const [durationMins, setDurationMins] = useState(30);
  const [entryType, setEntryType] = useState<'productive' | 'wasted' | 'neutral'>('productive');
  const [category, setCategory] = useState('কাজ');
  const [notes, setNotes] = useState('');

  // Timer Tick Effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            return 0;
          }
          if (prev % 60 === 0) {
            playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Handle Session Completion cleanly in an effect, avoiding setState inside render
  useEffect(() => {
    if (timerActive && timerSeconds === 0) {
      setTimerActive(false);
      playSuccessChime();
      const minutesDone = Math.max(1, Math.round(initialSeconds / 60));
      onAddTimeEntry({
        date: todayStr,
        startTime: new Date().toTimeString().substring(0, 5),
        durationMinutes: minutesDone,
        type: 'productive',
        activity: timerTaskName || 'পমোডোরো ফোকাস সম্পন্ন',
        category: 'ফোকাস সেশন',
      });
    }
  }, [timerActive, timerSeconds, initialSeconds, timerTaskName, todayStr, onAddTimeEntry]);

  const handleStartTimer = () => setTimerActive(true);
  const handlePauseTimer = () => setTimerActive(false);
  const handleResetTimer = (mins: number) => {
    setTimerActive(false);
    setInitialSeconds(mins * 60);
    setTimerSeconds(mins * 60);
  };

  const handleResetButtonClick = () => {
    setTimerActive(false);
    // If the timer was running or partially elapsed, reset to the current session start
    if (timerSeconds !== initialSeconds) {
      setTimerSeconds(initialSeconds);
    } else {
      // If already at the start, reset to the default 30 mins and clear custom minutes input
      setCustomMinutes('');
      setInitialSeconds(30 * 60);
      setTimerSeconds(30 * 60);
    }
  };

  const handleApplyCustomMinutes = () => {
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      handleResetTimer(mins);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Manual Add Form Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) return;

    onAddTimeEntry({
      date: todayStr,
      startTime: new Date().toTimeString().substring(0, 5),
      durationMinutes: durationMins,
      type: entryType,
      activity: activity.trim(),
      category,
      notes: notes.trim() || undefined,
    });

    setActivity('');
    setNotes('');
  };

  // Calculations for Today
  const todayLogs = timeEntries.filter((e) => e.date === todayStr);
  const prodMins = todayLogs.filter((e) => e.type === 'productive').reduce((a, b) => a + b.durationMinutes, 0);
  const wastedMins = todayLogs.filter((e) => e.type === 'wasted').reduce((a, b) => a + b.durationMinutes, 0);
  const neutralMins = todayLogs.filter((e) => e.type === 'neutral').reduce((a, b) => a + b.durationMinutes, 0);
  const totalMins = prodMins + wastedMins + neutralMins;

  const prodPercent = totalMins > 0 ? Math.round((prodMins / totalMins) * 100) : 0;
  const wastedPercent = totalMins > 0 ? Math.round((wastedMins / totalMins) * 100) : 0;
  const neutralPercent = totalMins > 0 ? 100 - (prodPercent + wastedPercent) : 0;

  // 7-day trend calculation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const trendData = last7Days.map((dStr) => {
    const dayEntries = timeEntries.filter((e) => e.date === dStr);
    const p = dayEntries.filter((e) => e.type === 'productive').reduce((a, b) => a + b.durationMinutes, 0) / 60;
    const w = dayEntries.filter((e) => e.type === 'wasted').reduce((a, b) => a + b.durationMinutes, 0) / 60;
    const dayName = new Date(dStr).toLocaleDateString('bn-BD', { weekday: 'short' });
    return { date: dStr, dayName, p, w };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner: Pomodoro & Live Stopwatch */}
      <div className="bg-gradient-to-br from-[#00385e] via-[#004b7c] to-[#005B96] p-4 sm:p-7 rounded-2xl sm:rounded-3xl text-white shadow-md border border-[#005B96]/30">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              মনোযোগ ধরে রাখুন, অপচয় রুখে দিন
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-md">
              30 মিনিট নিবিড় কাজ এবং 5 মিনিট রিফ্রেশিং বিরতি আপনার কাজের গতি দ্বিগুণ করে দেয়।
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2">
              {[15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setCustomMinutes('');
                    handleResetTimer(mins);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    initialSeconds === mins * 60 && !customMinutes
                      ? 'bg-[#16a34a] text-white shadow-xs ring-2 ring-[#16a34a]/40 font-black'
                      : 'bg-black/25 text-white/80 hover:bg-black/40'
                  }`}
                >
                  {formatBnNumber(mins)} মিনিট
                </button>
              ))}

              {/* কাস্টম মিনিট নির্ধারণের ঘর */}
              <div className="flex items-center bg-white rounded-xl p-0.5 border border-slate-200 shadow-2xs">
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCustomMinutes();
                    }
                  }}
                  placeholder="কাস্টম মিনিট..."
                  className="w-24 px-2 py-1 text-xs font-bold bg-white text-black placeholder:text-slate-400 rounded-lg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomMinutes}
                  className="px-2.5 py-1 bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  সেট
                </button>
              </div>
            </div>
          </div>

          {/* Clock Display & Controls */}
          <div className="flex flex-col items-center bg-black/35 p-4 sm:p-6 rounded-2xl border border-white/15 w-full sm:w-80 backdrop-blur-xs">
            {/* লেখার জায়গা: ব্যাকগ্রাউন্ড সাদা এবং লেখার কালার কালো */}
            <div className="w-full bg-white rounded-xl py-3 px-4 text-center my-2 border border-slate-200 shadow-xs">
              <div className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-black">
                {formatTimer(timerSeconds)}
              </div>
            </div>
            <input
              type="text"
              value={timerTaskName}
              onChange={(e) => setTimerTaskName(e.target.value)}
              placeholder="বর্তমান কাজের নাম..."
              className="w-full text-center text-xs bg-white border border-slate-300 rounded-lg py-2 px-3 text-black placeholder:text-slate-500 mb-3 focus:outline-none focus:border-[#005B96] font-semibold"
            />
            <div className="flex items-center gap-3">
              {timerActive ? (
                <button
                  onClick={handlePauseTimer}
                  className="px-5 py-2 rounded-xl bg-[#F6A600] hover:bg-[#e09500] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Pause className="w-4 h-4" />
                  <span>বিরতি দিন</span>
                </button>
              ) : (
                <button
                  onClick={handleStartTimer}
                  className="px-6 py-2 rounded-xl bg-[#FF8C00] hover:bg-[#e07b00] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4" />
                  <span>শুরু করুন</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetButtonClick}
                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-white/25"
                title="রিসেট করুন"
              >
                <RotateCcw className="w-4 h-4" />
                <span>রিসেট</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Graphical Analysis: Donut Chart & 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Donut Chart: Productive vs Wasted */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#005B96]" />
              <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">
                আজকের সময় ব্যবহারের অনুপাত (Donut Chart)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#6d7e79]">
              মোট: {formatBnNumber((totalMins / 60).toFixed(1))} ঘণ্টা
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
            {/* SVG Donut */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-[#f3f0e8]"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Productive Segment (Primary Blue) */}
                <path
                  stroke="#005B96"
                  strokeDasharray={`${prodPercent}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Wasted Segment (Accent Orange) */}
                <path
                  stroke="#FF8C00"
                  strokeDasharray={`${wastedPercent}, 100`}
                  strokeDashoffset={`-${prodPercent}`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-[#005B96] font-mono">
                  {formatBnNumber(prodPercent)}%
                </span>
                <span className="text-[10px] text-[#6d7e79] font-bold">প্রোডাক্টিভ</span>
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="space-y-2.5 w-full sm:w-48 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#005B96]/10 border border-[#005B96]/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#005B96]"></div>
                  <span className="font-bold text-[#005B96]">প্রোডাক্টিভ সময়</span>
                </div>
                <span className="font-mono font-extrabold text-[#005B96]">
                  {formatBnNumber((prodMins / 60).toFixed(1))} ঘণ্টা
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#FF8C00]/10 border border-[#FF8C00]/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF8C00]"></div>
                  <span className="font-bold text-[#FF8C00]">সময় অপচয়</span>
                </div>
                <span className="font-mono font-extrabold text-[#FF8C00]">
                  {formatBnNumber((wastedMins / 60).toFixed(1))} ঘণ্টা
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#00A3E0]/10 border border-[#00A3E0]/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00A3E0]"></div>
                  <span className="font-bold text-[#00A3E0]">স্বাভাবিক / খাবার</span>
                </div>
                <span className="font-mono font-extrabold text-[#00A3E0]">
                  {formatBnNumber((neutralMins / 60).toFixed(1))} ঘণ্টা
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Trend Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#005B96]" />
              <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">
                বিগত 7 দিনের তুলনা গ্রাফ (ঘণ্টা)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-[#005B96]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#005B96] inline-block"></span> কাজ
              </span>
              <span className="flex items-center gap-1 text-[#FF8C00]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FF8C00] inline-block"></span> অপচয়
              </span>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="pt-4 flex items-end justify-between gap-2 h-44">
            {trendData.map((item) => {
              const maxH = 6; // scale to 6 hours
              const prodH = Math.min(100, Math.round((item.p / maxH) * 100));
              const wasteH = Math.min(100, Math.round((item.w / maxH) * 100));
              const isToday = item.date === todayStr;

              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-32 bg-[#fcfbfa] rounded-xl p-1 border border-[#eeeae2]">
                    {/* Prod Bar */}
                    <div
                      className="w-3 sm:w-4 bg-[#005B96] rounded-t-sm transition-all"
                      style={{ height: `${Math.max(4, prodH)}%` }}
                      title={`কাজের সময়: ${item.p.toFixed(1)} ঘণ্টা`}
                    ></div>
                    {/* Wasted Bar */}
                    <div
                      className="w-3 sm:w-4 bg-[#FF8C00] rounded-t-sm transition-all"
                      style={{ height: `${Math.max(4, wasteH)}%` }}
                      title={`অপচয়: ${item.w.toFixed(1)} ঘণ্টা`}
                    ></div>
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      isToday ? 'text-[#005B96] font-extrabold' : 'text-[#6d7e79]'
                    }`}
                  >
                    {item.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manual Time Entry Form & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Form: Add Time Log */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[#005B96] border-b border-[#eeeae2] pb-2.5">
            + সময় ব্যবহারের হিসাব যোগ করুন
          </h3>
          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#1a2724] mb-1">কাজের / অপচয়ের বিবরণ</label>
              <input
                type="text"
                required
                placeholder="যেমন: প্রজেক্ট কোডিং অথবা সোশ্যাল মিডিয়া"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">সময়কাল (মিনিট)</label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                >
                  <option value={15}>15 মিনিট</option>
                  <option value={30}>30 মিনিট</option>
                  <option value={45}>45 মিনিট</option>
                  <option value={60}>1 ঘণ্টা</option>
                  <option value={90}>1.5 ঘণ্টা</option>
                  <option value={120}>2 ঘণ্টা</option>
                  <option value={180}>3 ঘণ্টা</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">ক্যাটাগরি টাইপ</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-bold text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                >
                  <option value="productive">প্রোডাক্টিভ (কাজের)</option>
                  <option value="wasted">অপচয় (Wasted)</option>
                  <option value="neutral">স্বাভাবিক (খাবার/ঘুম)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1a2724] mb-1">নোট বা অনুধাবন (ঐচ্ছিক)</label>
              <textarea
                rows={2}
                placeholder="অপচয় হলে কারণ কি ছিল? পরবর্তী সতর্কতা..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-[#e6e2da] text-xs font-normal text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
            >
              হিসাবে যুক্ত করুন
            </button>
          </form>
        </div>

        {/* List: Today's Time Logs */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#eeeae2] pb-2.5">
            <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">
              আজকের সময়ের লগ তালিকা ({todayLogs.length}টি)
            </h3>
            <span className="text-xs text-[#6d7e79]">রিয়েল-টাইম হিসাব</span>
          </div>

          {todayLogs.length === 0 ? (
            <div className="text-center py-10 text-[#6d7e79] text-xs">
              আজকের কোনো সময় লগ করা হয়নি। টাইমার ব্যবহার করুন অথবা ম্যানুয়ালি যোগ করুন।
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todayLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    log.type === 'productive'
                      ? 'bg-[#005B96]/5 border-[#005B96]/20'
                      : log.type === 'wasted'
                      ? 'bg-[#FF8C00]/5 border-[#FF8C00]/20'
                      : 'bg-[#00A3E0]/5 border-[#00A3E0]/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          log.type === 'productive'
                            ? 'bg-[#005B96]/15 text-[#005B96]'
                            : log.type === 'wasted'
                            ? 'bg-[#FF8C00]/15 text-[#FF8C00]'
                            : 'bg-[#00A3E0]/15 text-[#00A3E0]'
                        }`}
                      >
                        {log.type === 'productive' ? 'প্রোডাক্টিভ' : log.type === 'wasted' ? 'অপচয়' : 'স্বাভাবিক'}
                      </span>
                      <h4 className="text-xs font-bold text-[#1a2724] break-words leading-snug">{log.activity}</h4>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-[#6d7e79] mt-0.5 line-clamp-1">{log.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-extrabold text-[#1a2724]">
                      {formatBnNumber(log.durationMinutes)} মিনিট
                    </span>
                    <button
                      onClick={() => onDeleteTimeEntry(log.id)}
                      className="p-1 text-[#869792] hover:text-[#FF8C00] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
