import React, { useState, useEffect } from 'react';
import { Sparkles, Target, Plus, Trash2, Edit3, Compass, CheckCircle2 } from 'lucide-react';
import { YearlyVision } from '../types';
import { formatBnNumber } from '../utils/storage';

interface YearlyPlannerViewProps {
  yearlyVision: YearlyVision;
  onUpdateYearlyVision: (vision: YearlyVision) => void;
}

export const YearlyPlannerView: React.FC<YearlyPlannerViewProps> = ({
  yearlyVision,
  onUpdateYearlyVision,
}) => {
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [yearInput, setYearInput] = useState<number | string>(yearlyVision.year || 2026);
  const [themeInput, setThemeInput] = useState(yearlyVision.theme);
  const [visionInput, setVisionInput] = useState(yearlyVision.coreVision);

  useEffect(() => {
    setYearInput(yearlyVision.year || 2026);
    setThemeInput(yearlyVision.theme);
    setVisionInput(yearlyVision.coreVision);
  }, [yearlyVision]);

  const [qInputs, setQInputs] = useState<{ [k: string]: string }>({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
  });

  const quarters = [
    { key: 'q1', label: 'কোয়ার্টার 1 (Q1)', months: 'জানুয়ারি — মার্চ', badgeBg: 'bg-[#005B96]' },
    { key: 'q2', label: 'কোয়ার্টার 2 (Q2)', months: 'এপ্রিল — জুন', badgeBg: 'bg-[#00A3E0]' },
    { key: 'q3', label: 'কোয়ার্টার 3 (Q3)', months: 'জুলাই — সেপ্টেম্বর', badgeBg: 'bg-[#FF8C00]' },
    { key: 'q4', label: 'কোয়ার্টার 4 (Q4)', months: 'অক্টোবর — ডিসেম্বর', badgeBg: 'bg-[#F6A600]' },
  ];

  const handleSaveTheme = () => {
    const parsedYear = typeof yearInput === 'string' ? parseInt(yearInput, 10) : yearInput;
    onUpdateYearlyVision({
      ...yearlyVision,
      year: isNaN(parsedYear) ? (yearlyVision.year || 2026) : parsedYear,
      theme: themeInput.trim() || yearlyVision.theme,
      coreVision: visionInput.trim() || yearlyVision.coreVision,
    });
    setIsEditingTheme(false);
  };

  const handleAddQuarterGoal = (qKey: 'q1' | 'q2' | 'q3' | 'q4') => {
    const text = qInputs[qKey]?.trim();
    if (!text) return;

    onUpdateYearlyVision({
      ...yearlyVision,
      quarterGoals: {
        ...yearlyVision.quarterGoals,
        [qKey]: [...yearlyVision.quarterGoals[qKey], text],
      },
    });

    setQInputs((prev) => ({ ...prev, [qKey]: '' }));
  };

  const handleDeleteQuarterGoal = (qKey: 'q1' | 'q2' | 'q3' | 'q4', idx: number) => {
    onUpdateYearlyVision({
      ...yearlyVision,
      quarterGoals: {
        ...yearlyVision.quarterGoals,
        [qKey]: yearlyVision.quarterGoals[qKey].filter((_, i) => i !== idx),
      },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Yearly Banner */}
      <div className="bg-gradient-to-r from-[#003d66] via-[#005B96] to-[#007cb3] rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-md space-y-3 border border-[#005B96]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#F0E68C] text-xs font-bold">
            <Sparkles className="w-4 h-4 text-[#F0E68C]" />
            <span>বাৎসরিক দীর্ঘমেয়াদি ভিশন {formatBnNumber(yearlyVision.year)}</span>
          </div>

          <div className="relative group/edit self-start sm:self-auto">
            <button
              onClick={() => setIsEditingTheme(!isEditingTheme)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 shadow-xs"
              title={isEditingTheme ? 'সম্পাদনা বাতিল' : 'এডিট করুন'}
              aria-label={isEditingTheme ? 'সম্পাদনা বাতিল' : 'এডিট করুন'}
            >
              <Edit3 className="w-3.5 h-3.5 text-[#F0E68C]" />
              {isEditingTheme ? (
                <span>সম্পাদনা বাতিল</span>
              ) : (
                <span className="hidden group-hover/edit:inline-block transition-all duration-150 whitespace-nowrap">
                  এডিট করুন
                </span>
              )}
            </button>
            {/* Hover Tooltip Popup */}
            {!isEditingTheme && (
              <div className="pointer-events-none absolute -top-8.5 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/edit:opacity-100 transition-opacity duration-150 px-2 py-1 rounded-md bg-[#1a2724] text-white text-[11px] font-bold whitespace-nowrap shadow-md">
                এডিট করুন
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a2724]"></div>
              </div>
            )}
          </div>
        </div>

        {isEditingTheme ? (
          <div className="bg-[#002b48] p-4 rounded-2xl border border-[#F0E68C]/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#F0E68C] mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#F0E68C]" />
                  <span>বাৎসরিক ভিশন বছর (সাল)</span>
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2099}
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#003d66] border border-[#005B96] text-white text-xs font-bold focus:outline-none focus:border-[#F0E68C]"
                  placeholder="যেমন: 2026 বা 2027"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#F0E68C] mb-1">বছরের মূল থিম</label>
                <input
                  type="text"
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#003d66] border border-[#005B96] text-white text-xs font-bold focus:outline-none focus:border-[#F0E68C]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F0E68C] mb-1">কোর ভিশন ও শপথ</label>
              <textarea
                rows={2}
                value={visionInput}
                onChange={(e) => setVisionInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#003d66] border border-[#005B96] text-white text-xs font-normal focus:outline-none focus:border-[#F0E68C]"
              ></textarea>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveTheme}
                className="px-4 py-2 rounded-xl bg-[#FF8C00] hover:bg-[#e07b00] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                সংরক্ষণ করুন
              </button>
              <button
                onClick={() => {
                  setYearInput(yearlyVision.year || 2026);
                  setThemeInput(yearlyVision.theme);
                  setVisionInput(yearlyVision.coreVision);
                  setIsEditingTheme(false);
                }}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                বাতিল
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{yearlyVision.theme || 'লক্ষ্য অর্জন করা'}</h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-2xl leading-relaxed">
              "{yearlyVision.coreVision || 'প্রতিটি দিনকে অর্থপূর্ণ ও লক্ষ্যমুখী করে তোলা এবং অভ্যাসের মাধ্যমে নিজের সেরা সংস্করণে পৌঁছানো।'}"
            </p>
          </div>
        )}
      </div>

      {/* 4 Quarters Breakdown (Q1 to Q4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {quarters.map((q) => {
          const qKey = q.key as 'q1' | 'q2' | 'q3' | 'q4';
          const goals = yearlyVision.quarterGoals[qKey] || [];

          return (
            <div
              key={q.key}
              className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl ${q.badgeBg} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
                    {q.key.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">{q.label}</h3>
                    <p className="text-[11px] text-[#6d7e79]">{q.months}</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#6d7e79]">
                  {formatBnNumber(goals.length)}টি লক্ষ্য
                </span>
              </div>

              {/* Add Goal to Quarter */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="কোয়ার্টারের নতুন লক্ষ্য লিখুন..."
                  value={qInputs[qKey] || ''}
                  onChange={(e) =>
                    setQInputs((prev) => ({ ...prev, [qKey]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddQuarterGoal(qKey);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#e6e2da] text-xs text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                />
                <button
                  onClick={() => handleAddQuarterGoal(qKey)}
                  className="px-3 py-2 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* List of Goals */}
              <div className="space-y-2">
                {goals.length === 0 ? (
                  <p className="text-xs text-[#869792] text-center py-4">
                    এই কোয়ার্টারের জন্য এখনও কোনো লক্ষ্য যোগ করা হয়নি।
                  </p>
                ) : (
                  goals.map((goal, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#fcfbf9] border border-[#e6e2da] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#005B96] shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-[#1a2724] break-words leading-relaxed">{goal}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteQuarterGoal(qKey, idx)}
                        className="p-1 text-[#b0a99f] hover:text-[#FF8C00] cursor-pointer shrink-0 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
