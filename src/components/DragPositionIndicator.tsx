import React, { useEffect, useRef } from 'react';
import { formatBnNumber } from '../utils/storage';
import { ArrowUp, ArrowDown, Move, MapPin, CheckCircle2 } from 'lucide-react';
import { playTick } from '../utils/audio';

export interface DragPositionIndicatorProps {
  isDragging?: boolean;
  fromIndex?: number | null;
  toIndex?: number | null;
  currentIndex?: number | null;
  hoverIndex?: number | null;
  itemTitle?: string;
  title?: string;
  totalCount?: number;
}

export const DragPositionIndicator: React.FC<DragPositionIndicatorProps> = ({
  isDragging,
  fromIndex,
  toIndex,
  currentIndex,
  hoverIndex,
  itemTitle,
  title,
  totalCount,
}) => {
  // Resolve unified values
  const activeFrom = fromIndex !== undefined && fromIndex !== null ? fromIndex : (currentIndex ?? null);
  const activeTo = toIndex !== undefined && toIndex !== null ? toIndex : (hoverIndex ?? null);
  const activeIsDragging = isDragging !== undefined ? isDragging : activeFrom !== null;
  const activeTitle = itemTitle || title || '';

  const currentPos = activeFrom !== null ? activeFrom + 1 : null;
  const targetPos = activeTo !== null ? activeTo + 1 : null;
  const isMovingUp = targetPos !== null && currentPos !== null && targetPos < currentPos;
  const isMovingDown = targetPos !== null && currentPos !== null && targetPos > currentPos;
  const stepDiff = targetPos !== null && currentPos !== null ? Math.abs(targetPos - currentPos) : 0;

  // Sound feedback on step changes (19 -> 18 -> 17...)
  const prevTargetRef = useRef<number | null>(null);
  useEffect(() => {
    if (targetPos !== null && targetPos !== prevTargetRef.current) {
      prevTargetRef.current = targetPos;
      playTick();
    }
  }, [targetPos]);

  if (!activeIsDragging || currentPos === null) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-150">
      <div className="bg-slate-900/95 text-white px-4 sm:px-6 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 sm:gap-4 max-w-[96vw] backdrop-blur-md">
        {/* Dragged item info (Source Position) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Move className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
              মূল পজিশন
            </span>
            <span className="text-xs sm:text-sm font-mono font-black text-amber-300">
              #{formatBnNumber(currentPos)} <span className="text-[11px] text-blue-200">({currentPos})</span>
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-7 w-px bg-white/20 shrink-0" />

        {/* Live target position */}
        <div className="flex items-center gap-2.5 min-w-0">
          {targetPos !== null && targetPos !== currentPos ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              {/* Direction Indicator */}
              <div className="flex items-center gap-1 text-xs sm:text-sm font-extrabold text-amber-300 shrink-0">
                {isMovingUp ? (
                  <>
                    <ArrowUp className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>উপরে নিচ্ছেন ➔</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>নিচে নামাচ্ছেন ➔</span>
                  </>
                )}
              </div>

              {/* Dynamic Target Number Badge (e.g. #19, #18, #17) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-mono font-black text-sm sm:text-base shadow-md flex items-center gap-1 border border-amber-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                  <span>#{formatBnNumber(targetPos)}</span>
                  <span className="text-[11px] text-slate-800 font-extrabold">({targetPos})</span>
                </span>
                <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
                  নম্বরে ড্রপ হবে
                </span>
              </div>

              {/* Steps moved */}
              {stepDiff > 0 && (
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30 whitespace-nowrap hidden xs:inline">
                  {formatBnNumber(stepDiff)} ধাপ {isMovingUp ? 'উপরে' : 'নিচে'}
                </span>
              )}

              {totalCount && (
                <span className="text-[11px] text-blue-200 hidden md:inline whitespace-nowrap">
                  (মোট {formatBnNumber(totalCount)}টির মধ্যে)
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-blue-100">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                {activeTitle ? `"${activeTitle}" ` : 'ব্লকটি '}উপরে বা নিচে টেনে অন্য নম্বরে ড্রপ করুন
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

