import React from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  Award,
  TrendingUp,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { Task, Habit, Roadmap, TimeEntry } from '../types';
import { getTodayStr, formatBnNumber, formatBnDate } from '../utils/storage';

interface ReportsViewProps {
  tasks: Task[];
  habits: Habit[];
  activeRoadmap?: Roadmap;
  timeEntries: TimeEntry[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  tasks,
  habits,
  activeRoadmap,
  timeEntries,
}) => {

  // Overall calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalProdMinutes = timeEntries
    .filter((e) => e.type === 'productive')
    .reduce((a, b) => a + b.durationMinutes, 0);
  const totalWastedMinutes = timeEntries
    .filter((e) => e.type === 'wasted')
    .reduce((a, b) => a + b.durationMinutes, 0);
  const totalTrackedMinutes = totalProdMinutes + totalWastedMinutes;

  const prodPercentage = totalTrackedMinutes > 0
    ? Math.round((totalProdMinutes / totalTrackedMinutes) * 100)
    : 0;

  // Grade calculation
  let grade = 'B';
  let gradeColor = 'text-[#FF8C00]';
  if (prodPercentage >= 80 && taskCompletionRate >= 70) {
    grade = 'A+';
    gradeColor = 'text-[#005B96]';
  } else if (prodPercentage >= 65 || taskCompletionRate >= 60) {
    grade = 'A';
    gradeColor = 'text-[#00A3E0]';
  } else if (prodPercentage >= 50) {
    grade = 'B';
    gradeColor = 'text-[#FF8C00]';
  } else {
    grade = 'C';
    gradeColor = 'text-[#e05252]';
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003d66] via-[#005B96] to-[#007cb3] rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-md border border-[#005B96]/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            পারফরম্যান্স ও প্রোডাক্টিভিটি স্কোরকার্ড
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
            আপনার কাজের অগ্রগতি, সময় অপচয়ের কারণ এবং সময় বাঁচিয়ে সফল হওয়ার দিকনির্দেশনা।
          </p>
        </div>
      </div>

      {/* Scorecards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Productivity Grade */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs text-center flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-[#6d7e79]">সামগ্রিক গ্রেড</span>
          <div className={`text-4xl sm:text-5xl font-black my-1 font-mono ${gradeColor}`}>
            {grade}
          </div>
          <span className="text-[11px] text-[#1a2724] font-semibold">
            {grade === 'A+' ? 'অসাধারণ ও বিশ্বমানের' : grade === 'A' ? 'চমৎকার পারফরম্যান্স' : 'উন্নতির সুযোগ আছে'}
          </span>
        </div>

        {/* Task Completion Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6d7e79]">
            <span className="text-xs font-bold">কাজের সম্পন্নতার হার</span>
            <CheckCircle2 className="w-4 h-4 text-[#005B96]" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-[#1a2724] font-mono">
              {formatBnNumber(taskCompletionRate)}%
            </span>
            <span className="text-xs text-[#6d7e79] block mt-0.5">
              {formatBnNumber(completedTasks)}/{formatBnNumber(totalTasks)} সম্পন্ন
            </span>
          </div>
          <div className="w-full bg-[#f3f0e8] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#005B96] h-full rounded-full"
              style={{ width: `${taskCompletionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Productive Hours */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6d7e79]">
            <span className="text-xs font-bold">মোট কার্যকর সময়</span>
            <Clock className="w-4 h-4 text-[#00A3E0]" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-[#1a2724] font-mono">
              {formatBnNumber((totalProdMinutes / 60).toFixed(1))} ঘণ্টা
            </span>
            <span className="text-xs text-[#005B96] font-bold block mt-0.5">
              অনুপাত: {formatBnNumber(prodPercentage)}%
            </span>
          </div>
          <div className="w-full bg-[#f3f0e8] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#00A3E0] h-full rounded-full"
              style={{ width: `${prodPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Wasted Time */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e6e2da] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6d7e79]">
            <span className="text-xs font-bold">মোট অপচয় সময়</span>
            <AlertCircle className="w-4 h-4 text-[#FF8C00]" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-[#FF8C00] font-mono">
              {formatBnNumber((totalWastedMinutes / 60).toFixed(1))} ঘণ্টা
            </span>
            <span className="text-xs text-[#FF8C00] block mt-0.5">
              সোশ্যাল মিডিয়া ও অলস সময়
            </span>
          </div>
          <div className="w-full bg-[#f3f0e8] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#FF8C00] h-full rounded-full"
              style={{ width: `${Math.min(100, 100 - prodPercentage)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Printable Executive Report Breakdown */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">
              এক্সিকিউটিভ সামারি ও পারফরম্যান্স লক
            </h3>
            <p className="text-xs text-[#6d7e79]">তারিখ: {formatBnDate(getTodayStr())}</p>
          </div>
          <span className="text-xs font-bold text-[#005B96] font-mono">আমার টাইম ম্যানেজমেন্ট</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#e6e2da]">
            <span className="text-[#6d7e79] block mb-1">কাজের অগ্রাধিকার সূচক:</span>
            <p className="font-bold text-[#1a2724]">
              P1 ও P2 জরুরি কাজের {formatBnNumber(Math.round(taskCompletionRate))}% সম্পন্ন হয়েছে।
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#e6e2da]">
            <span className="text-[#6d7e79] block mb-1">অভ্যাসের স্থায়িত্ব:</span>
            <p className="font-bold text-[#1a2724]">
              মোট {formatBnNumber(habits.length)}টি সক্রিয় অভ্যাসের স্ট্রিক সচল রয়েছে।
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#e6e2da]">
            <span className="text-[#6d7e79] block mb-1">সফলতার রোডম্যাপ স্থিতি:</span>
            <p className="font-bold text-[#1a2724]">
              {activeRoadmap ? activeRoadmap.title : 'রোডম্যাপ সক্রিয় রয়েছে'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
