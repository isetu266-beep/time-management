import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Target,
  Clock,
} from 'lucide-react';
import { Task, MonthlyGoal } from '../types';
import { formatBnNumber, getTodayStr } from '../utils/storage';

interface MonthlyPlannerViewProps {
  tasks: Task[];
  monthlyGoals: MonthlyGoal[];
  onAddMonthlyGoal: (goal: Omit<MonthlyGoal, 'id'>) => void;
  onToggleMonthlyGoal: (id: string) => void;
  onSelectDate: (dateStr: string) => void;
}

export const MonthlyPlannerView: React.FC<MonthlyPlannerViewProps> = ({
  tasks,
  monthlyGoals,
  onAddMonthlyGoal,
  onToggleMonthlyGoal,
  onSelectDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthNamesBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const yearOptions = Array.from({ length: 16 }, (_, i) => 2022 + i);
  if (!yearOptions.includes(year)) {
    yearOptions.push(year);
    yearOptions.sort((a, b) => a - b);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Week starts on Saturday (শনিবার): Saturday is 0, Sunday is 1, ..., Friday is 6
  const rawFirstDay = new Date(year, month, 1).getDay(); // 0 is Sun, 6 is Sat
  const firstDayIndex = (rawFirstDay + 1) % 7;

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Filter goals for this month
  const currentMonthGoals = monthlyGoals.filter((g) => g.month === monthStr);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    onAddMonthlyGoal({
      month: monthStr,
      title: newGoalTitle.trim(),
      completed: false,
      category: 'Work',
    });
    setNewGoalTitle('');
  };

  const todayStr = getTodayStr();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Month Navigation Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#005B96]/10 text-[#005B96] flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#005B96]">
              {monthNamesBn[month]} {formatBnNumber(year)}
            </h2>
            <p className="text-xs text-[#6d7e79]">মাসিক সময়সূচী ও প্রধান মাইলফলকসমূহ</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month & Year Select Dropdowns */}
          <div className="flex items-center gap-1.5">
            <select
              value={month}
              onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value, 10), 1))}
              className="px-2.5 py-1.5 rounded-xl border border-[#e6e2da] bg-[#faf8f5] hover:bg-white text-xs font-bold text-[#005B96] focus:outline-none focus:border-[#005B96] cursor-pointer shadow-2xs transition-colors"
              aria-label="মাস নির্বাচন করুন"
            >
              {monthNamesBn.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value, 10), month, 1))}
              className="px-2.5 py-1.5 rounded-xl border border-[#e6e2da] bg-[#faf8f5] hover:bg-white text-xs font-bold text-[#005B96] focus:outline-none focus:border-[#005B96] cursor-pointer shadow-2xs transition-colors"
              aria-label="সাল নির্বাচন করুন"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {formatBnNumber(y)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl border border-[#e6e2da] hover:bg-[#f3f0e8] text-[#1a2724] transition-colors cursor-pointer"
              title="পূর্ববর্তী মাস"
              aria-label="পূর্ববর্তী মাস"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 rounded-xl border border-[#e6e2da] hover:bg-[#f3f0e8] text-[#005B96] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              আজকের মাস
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl border border-[#e6e2da] hover:bg-[#f3f0e8] text-[#1a2724] transition-colors cursor-pointer"
              title="পরবর্তী মাস"
              aria-label="পরবর্তী মাস"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Calendar + Monthly Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Monthly Calendar View */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[#005B96] border-b border-[#eeeae2] pb-2.5">
            দিনভিত্তিক ক্যালেন্ডার গ্রিড
          </h3>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#6d7e79] py-1">
            {['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="h-16 sm:h-20 rounded-xl bg-[#fcfbf9]/50 opacity-40"></div>
            ))}

            {/* Days of Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayTasks = tasks.filter((t) => t.date === dStr);
              const isToday = dStr === todayStr;

              return (
                <div
                  key={dStr}
                  onClick={() => onSelectDate(dStr)}
                  className={`h-16 sm:h-20 p-1 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    isToday
                      ? 'border-2 border-[#16a34a] bg-[#16a34a]/10 shadow-2xs'
                      : 'border-[#e6e2da] hover:border-[#16a34a]/40 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isToday ? 'text-[#15803d] font-black' : 'text-[#1a2724]'
                      }`}
                    >
                      {formatBnNumber(dayNum)}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className={`w-4 h-4 rounded-full text-white text-[9px] font-mono font-bold flex items-center justify-center ${isToday ? 'bg-[#16a34a]' : 'bg-[#005B96]'}`}>
                        {formatBnNumber(dayTasks.length)}
                      </span>
                    )}
                  </div>

                  {/* Tiny Task Indicators */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[9px] truncate px-1 py-0.2 rounded ${
                          t.completed
                            ? 'bg-[#f3f0e8] text-[#869792] line-through'
                            : t.priority === 'P1'
                            ? 'bg-[#FF8C00]/15 text-[#b35e00] font-bold'
                            : 'bg-[#f3f0e8] text-[#1a2724]'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[8px] text-[#869792] block text-right">
                        +{formatBnNumber(dayTasks.length - 2)} আরও
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Monthly Goals Checklist */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eeeae2] pb-2.5">
            <Target className="w-4 h-4 text-[#FF8C00]" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">
              এই মাসের মূল লক্ষ্যসমূহ ({currentMonthGoals.length}টি)
            </h3>
          </div>

          <form onSubmit={handleAddGoal} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="নতুন লক্ষ্য লিখুন..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-[#e6e2da] text-xs text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-[#005B96] text-white text-xs font-bold hover:bg-[#004877] cursor-pointer shrink-0 shadow-xs"
            >
              যোগ
            </button>
          </form>

          <div className="space-y-2">
            {currentMonthGoals.length === 0 ? (
              <p className="text-xs text-[#869792] text-center py-6">
                এই মাসের কোনো বিশেষ লক্ষ্য যোগ করা হয়নি।
              </p>
            ) : (
              currentMonthGoals.map((g) => (
                <div
                  key={g.id}
                  onClick={() => onToggleMonthlyGoal(g.id)}
                  className="p-3 rounded-xl border border-[#e6e2da] hover:border-[#005B96]/30 flex items-start gap-2.5 cursor-pointer bg-[#fcfbf9]"
                >
                  {g.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#005B96] mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#b0a99f] mt-0.5 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold break-words leading-relaxed ${
                      g.completed ? 'line-through text-[#869792]' : 'text-[#1a2724]'
                    }`}
                  >
                    {g.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
