import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBnNumber } from '../utils/storage';

interface HoverDatePickerProps {
  value: string; // ISO format 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  label?: string;
  className?: string;
  badgeMode?: boolean;
  badgeText?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const WEEKDAY_NAMES_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

export const HoverDatePicker: React.FC<HoverDatePickerProps> = ({
  value,
  onChange,
  label = 'তারিখ:',
  className = '',
  badgeMode = false,
  badgeText,
  onOpenChange,
}) => {
  // Parse date into Year, Month (1-12), Day (1-31)
  const parseDateParts = (iso: string) => {
    if (!iso) {
      const now = new Date();
      return {
        y: now.getFullYear(),
        m: now.getMonth() + 1,
        d: now.getDate(),
      };
    }
    const [yearPart, monthPart, dayPart] = iso.split('-');
    const y = parseInt(yearPart, 10) || new Date().getFullYear();
    const m = parseInt(monthPart, 10) || 1;
    const d = parseInt(dayPart, 10) || 1;
    return { y, m, d };
  };

  const initialParts = parseDateParts(value);

  const [isOpen, setIsOpen] = useState(false);
  const [isClickPinned, setIsClickPinned] = useState(false);
  const [viewYear, setViewYear] = useState(initialParts.y);
  const [viewMonth, setViewMonth] = useState(initialParts.m); // 1-indexed (1 = Jan, 12 = Dec)

  // Local string inputs for Day, Month, Year (দিন, মাস, বছর)
  const [dayStr, setDayStr] = useState(String(initialParts.d).padStart(2, '0'));
  const [monthStr, setMonthStr] = useState(String(initialParts.m).padStart(2, '0'));
  const [yearStr, setYearStr] = useState(String(initialParts.y));

  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Notify parent on open state change for stacking context
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Sync state if external value changes
  useEffect(() => {
    const p = parseDateParts(value);
    setDayStr(String(p.d).padStart(2, '0'));
    setMonthStr(String(p.m).padStart(2, '0'));
    setYearStr(String(p.y));
    setViewYear(p.y);
    setViewMonth(p.m);
  }, [value]);

  const updateIsOpen = (next: boolean) => {
    setIsOpen(next);
    onOpenChange?.(next);
  };

  // Handle open on hover / focus
  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    const p = parseDateParts(value);
    setViewYear(p.y);
    setViewMonth(p.m);
    updateIsOpen(true);
  };

  // Graceful close on mouse leave (only if not pinned open by a user click)
  const handleMouseLeave = () => {
    if (isClickPinned) return; // Keep open if user explicitly clicked to open
    closeTimerRef.current = setTimeout(() => {
      updateIsOpen(false);
    }, 350);
  };

  // Toggle open by click
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    const nextState = !isOpen;
    setIsClickPinned(nextState);
    updateIsOpen(nextState);
    if (nextState) {
      const p = parseDateParts(value);
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsClickPinned(false);
        updateIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Commit valid date to parent
  const commitDate = (y: number, m: number, d: number) => {
    const maxDays = new Date(y, m, 0).getDate();
    const safeD = Math.max(1, Math.min(d, maxDays));
    const safeM = Math.max(1, Math.min(m, 12));
    const safeY = Math.max(1970, Math.min(y, 2100));

    const yStr = String(safeY);
    const mStr = String(safeM).padStart(2, '0');
    const dStr = String(safeD).padStart(2, '0');

    setYearStr(yStr);
    setMonthStr(mStr);
    setDayStr(dStr);
    setViewYear(safeY);
    setViewMonth(safeM);

    onChange(`${yStr}-${mStr}-${dStr}`);
  };

  // Input handlers for typing দিন, মাস, বছর directly
  const handleDayChange = (val: string) => {
    const num = formatBnNumber(val).replace(/\D/g, '').slice(0, 2);
    setDayStr(num);
    const parsed = parseInt(num, 10);
    if (parsed >= 1 && parsed <= 31) {
      commitDate(parseInt(yearStr, 10) || viewYear, parseInt(monthStr, 10) || viewMonth, parsed);
    }
  };

  const handleMonthChange = (val: string) => {
    const num = formatBnNumber(val).replace(/\D/g, '').slice(0, 2);
    setMonthStr(num);
    const parsed = parseInt(num, 10);
    if (parsed >= 1 && parsed <= 12) {
      commitDate(parseInt(yearStr, 10) || viewYear, parsed, parseInt(dayStr, 10) || 1);
    }
  };

  const handleYearChange = (val: string) => {
    const num = formatBnNumber(val).replace(/\D/g, '').slice(0, 4);
    setYearStr(num);
    const parsed = parseInt(num, 10);
    if (num.length === 4 && parsed >= 1970 && parsed <= 2100) {
      commitDate(parsed, parseInt(monthStr, 10) || viewMonth, parseInt(dayStr, 10) || 1);
    }
  };

  // Calendar month navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calendar grid calculation
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayWeekday = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sunday

  // Handle picking a day from calendar
  const handleSelectDay = (dayNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    commitDate(viewYear, viewMonth, dayNumber);
    setIsClickPinned(false);
    updateIsOpen(false);
  };

  // Handle Today selection
  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    commitDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    setIsClickPinned(false);
    updateIsOpen(false);
  };

  const currentSelected = parseDateParts(value);
  const isCurrentMonth = currentSelected.y === viewYear && currentSelected.m === viewMonth;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ zIndex: isOpen ? 9999 : 'auto' }}
      className={`relative inline-block select-none ${className}`}
    >
      {badgeMode ? (
        /* Badge mode trigger (15% scaled down: padding from 12px/6px -> 10px/5px, font from 12-13px -> 11-12px, icon 14px) */
        <button
          type="button"
          onClick={handleTriggerClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border-2 border-orange-300/90 text-orange-950 transition-all cursor-pointer shadow-2xs group/cal active:scale-95 whitespace-nowrap"
          title="ক্লিক করে বা মাউস নিয়ে ক্যালেন্ডার থেকে তারিখ পরিবর্তন করুন"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#FF8C00] shrink-0 group-hover/cal:scale-110 transition-transform" />
          <span className="text-[11px] sm:text-xs font-bold text-gray-800 tracking-normal leading-tight">
            {badgeText || `${dayStr}/${monthStr}/${yearStr}`}
          </span>
        </button>
      ) : (
        /* Trigger Box (15% scaled down: padding from 12px/6px -> 10px/4.5px, inputs, label, and spacing reduced 15%) */
        <div
          onClick={handleTriggerClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-gray-300 hover:border-[#005B96] bg-white hover:bg-blue-50/30 transition-all shadow-2xs cursor-pointer group/cal"
          title="ক্লিক করে বা মাউস নিয়ে ক্যালেন্ডার থেকে তারিখ পরিবর্তন করুন"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#FF8C00] shrink-0 group-hover/cal:scale-110 transition-transform" />
          
          {label && (
            <span className="text-[11px] text-gray-700 font-bold whitespace-nowrap">
              {label}
            </span>
          )}

          {/* Day / Month / Year Inputs */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] font-bold text-[#005B96]"
          >
            {/* Day */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={dayStr}
                onChange={(e) => handleDayChange(e.target.value)}
                onFocus={() => updateIsOpen(true)}
                className="w-6 text-center py-0.5 px-0.5 rounded-md bg-gray-50 hover:bg-blue-50 focus:bg-white border border-gray-300 focus:border-[#005B96] focus:outline-none text-[11px] font-black text-gray-800 transition-colors"
              />
            </div>

            <span className="text-gray-400 font-bold select-none text-[11px]">/</span>

            {/* Month */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={monthStr}
                onChange={(e) => handleMonthChange(e.target.value)}
                onFocus={() => updateIsOpen(true)}
                className="w-6 text-center py-0.5 px-0.5 rounded-md bg-gray-50 hover:bg-blue-50 focus:bg-white border border-gray-300 focus:border-[#005B96] focus:outline-none text-[11px] font-black text-gray-800 transition-colors"
              />
            </div>

            <span className="text-gray-400 font-bold select-none text-[11px]">/</span>

            {/* Year */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={yearStr}
                onChange={(e) => handleYearChange(e.target.value)}
                onFocus={() => updateIsOpen(true)}
                className="w-10 text-center py-0.5 px-0.5 rounded-md bg-gray-50 hover:bg-blue-50 focus:bg-white border border-gray-300 focus:border-[#005B96] focus:outline-none text-[11px] font-black text-gray-800 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Calendar Dropdown Popup (Opens on hover or click) */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 w-72 bg-white rounded-2xl border border-gray-200 shadow-2xl p-3.5 z-[100] animate-in fade-in zoom-in-95 duration-150 before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3"
        >
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="আগের মাস"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-xs font-black text-[#005B96]">
                {MONTH_NAMES_BN[viewMonth - 1]} {viewYear}
              </span>
              <p className="text-[10px] text-gray-400 font-medium">দিন সিলেক্ট করুন</p>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="পরের মাস"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES_BN.map((dayName, idx) => (
              <span
                key={dayName}
                className={`text-[11px] font-bold py-0.5 ${
                  idx === 5 ? 'text-[#FF8C00]' : 'text-gray-400'
                }`}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank offset tiles */}
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`blank-${i}`} className="h-7 w-7" />
            ))}

            {/* Month Day numbers */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                isCurrentMonth && currentSelected.d === dayNum;
              const isToday =
                new Date().getFullYear() === viewYear &&
                new Date().getMonth() + 1 === viewMonth &&
                new Date().getDate() === dayNum;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={(e) => handleSelectDay(dayNum, e)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF8C00] text-white shadow-xs scale-105 font-black'
                      : isToday
                      ? 'bg-blue-100 text-[#005B96] font-black border border-blue-300'
                      : 'hover:bg-blue-50 text-gray-700 hover:text-[#005B96]'
                  }`}
                  title={`${dayNum} ${MONTH_NAMES_BN[viewMonth - 1]}`}
                >
                  {formatBnNumber(dayNum)}
                </button>
              );
            })}
          </div>

          {/* Quick Helper Actions Footer */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-[10px] text-gray-500 font-medium">
              নির্বাচিত: <strong className="text-gray-800 font-bold">{dayStr}/{monthStr}/{yearStr}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  commitDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
                  setIsClickPinned(false);
                  updateIsOpen(false);
                }}
                className="text-[11px] font-bold text-gray-600 hover:text-[#005B96] px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
              >
                আগামীকাল
              </button>
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-[11px] font-black text-[#005B96] hover:text-[#004877] px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                আজকের দিন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
