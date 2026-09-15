import React, { useState, useRef } from 'react';
import { Flame, Plus, Trash2, Check, Award, Calendar, Sparkles, GripVertical, MapPin, ArrowUpDown, X } from 'lucide-react';
import { Habit } from '../types';
import { getTodayStr, formatBnNumber, toEnDigits } from '../utils/storage';
import { playSuccessChime, playTick } from '../utils/audio';
import { reorderArray } from '../utils/reorder';
import { useDragAutoScroll, getTouchDragTarget } from '../utils/dragHelper';
import { DragPositionIndicator } from './DragPositionIndicator';

interface HabitsViewProps {
  habits: Habit[];
  onToggleHabitDay: (habitId: string, dateStr: string) => void;
  onAddHabit: (habit: Omit<Habit, 'id' | 'currentStreak' | 'bestStreak' | 'createdAt' | 'history'>) => void;
  onDeleteHabit: (id: string) => void;
  onReorderHabits?: (habits: Habit[]) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  onToggleHabitDay,
  onAddHabit,
  onDeleteHabit,
  onReorderHabits,
}) => {
  const todayStr = getTodayStr();

  // Week days array starting from Saturday (শনি) to Friday (শুক্র)
  const banglaDayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToSaturday = (dayOfWeek + 1) % 7; // Days elapsed since Saturday
    const sat = new Date(today);
    sat.setDate(today.getDate() - diffToSaturday);

    const d = new Date(sat);
    d.setDate(sat.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = banglaDayNames[d.getDay()];
    const dayNumber = d.getDate();
    return { dateStr, dayName, dayNumber };
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Focus');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Drag and drop reorder states
  const [draggedHabitIndex, setDraggedHabitIndex] = useState<number | null>(null);
  const [dragOverHabitIndex, setDragOverHabitIndex] = useState<number | null>(null);
  const draggedFromRef = useRef<number | null>(null);

  // Jump to specific position modal state
  const [reorderModal, setReorderModal] = useState<{
    habit: Habit;
    currentIndex: number;
    totalCount: number;
  } | null>(null);
  const [targetPosInput, setTargetPosInput] = useState('');

  useDragAutoScroll(draggedHabitIndex !== null);

  const handleDropHabit = (targetIndex: number, sourceIndex?: number) => {
    const fromIndex = sourceIndex !== undefined ? sourceIndex : (draggedFromRef.current ?? draggedHabitIndex);
    if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex || !onReorderHabits) {
      draggedFromRef.current = null;
      setDraggedHabitIndex(null);
      setDragOverHabitIndex(null);
      return;
    }
    const reordered = reorderArray(habits, fromIndex, targetIndex);
    onReorderHabits(reordered);
    draggedFromRef.current = null;
    setDraggedHabitIndex(null);
    setDragOverHabitIndex(null);
    playTick();
  };

  const handleJumpPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderModal || !onReorderHabits) return;
    const targetNum = parseInt(toEnDigits(targetPosInput.trim()), 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > reorderModal.totalCount) return;
    const targetIdx = targetNum - 1;
    if (reorderModal.currentIndex !== targetIdx) {
      const reordered = reorderArray(habits, reorderModal.currentIndex, targetIdx);
      onReorderHabits(reordered);
      playTick();
    }
    setReorderModal(null);
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddHabit({
      title: newTitle.trim(),
      category: newCategory,
      targetDaysPerWeek: 7,
    });

    setNewTitle('');
    setShowAddForm(false);
    playSuccessChime();
  };

  const handleToggle = (habitId: string, dateStr: string) => {
    onToggleHabitDay(habitId, dateStr);
    playSuccessChime();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003d66] via-[#005B96] to-[#007cb3] rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#005B96]/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">অভ্যাসের ধারাবাহিকতা ট্র্যাকার</h1>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
            আমরা যা নিয়মিত করি তাই আমাদের ভবিষ্যৎ নির্ধারণ করে। শনি থেকে শুক্রবারের হিটম্যাপ দিয়ে স্ট্রিক বজায় রাখুন।
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2.5 rounded-xl bg-[#FF8C00] hover:bg-[#e07b00] text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#F0E68C]" />
          <span>নতুন অভ্যাস যোগ করুন</span>
        </button>
      </div>

      {/* Add Habit Modal / Inline Card */}
      {showAddForm && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3 mb-3">
            <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">
              নতুন দৈনিক অভ্যাস তৈরি করুন
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-xs font-bold text-[#869792] hover:text-[#1a2724] cursor-pointer"
            >
              ✕ বাতিল
            </button>
          </div>

          <form onSubmit={handleCreateHabit} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-[#1a2724] mb-1">অভ্যাসের নাম</label>
              <input
                type="text"
                required
                placeholder="যেমন: সকালে 30 মিনিট হাঁটা বা রাতে বই পড়া"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
              />
            </div>

            <div className="w-full sm:w-44">
              <label className="block text-xs font-bold text-[#1a2724] mb-1">ক্যাটাগরি</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
              >
                <option value="Focus">ফোকাস ও কাজ (Focus)</option>
                <option value="Body">স্বাস্থ্য ও শরীর (Body)</option>
                <option value="Mind">মন ও জ্ঞান (Mind)</option>
                <option value="Life">জীবনধারা (Life)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              সংরক্ষণ করুন
            </button>
          </form>
        </div>
      )}

      {/* 7-Day Heatmap Table / Grid */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[#005B96]">
            সাপ্তাহিক অভ্যাসের হিটম্যাপ (শনি - শুক্র)
          </h3>
          <span className="text-xs text-[#6d7e79]">প্রতিটি বৃত্তে ক্লিক করে সম্পন্ন চিহ্নিত করুন</span>
        </div>

        <div className="space-y-3">
          {habits.length === 0 ? (
            <div className="py-8 text-center text-[#6d7e79]">
              <p className="text-xs sm:text-sm">কোনো অভ্যাস যোগ করা নেই। ওপরের "+ নতুন অভ্যাস যোগ করুন" বাটনে ক্লিক করে শুরু করুন।</p>
            </div>
          ) : (
            <>
              {habits.map((habit, habitIdx) => {
              const isHabitDragged = draggedHabitIndex === habitIdx;
              const isHabitDragOver = dragOverHabitIndex === habitIdx && draggedHabitIndex !== null && draggedHabitIndex !== habitIdx;

              return (
                <div
                  key={habit.id}
                  data-drag-item="true"
                  data-drag-id={habit.id}
                  data-drag-index={habitIdx}
                  onDragOver={(e) => {
                    if (draggedHabitIndex !== null) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverHabitIndex !== habitIdx) setDragOverHabitIndex(habitIdx);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dtVal = e.dataTransfer.getData('text/plain');
                    const parsed = dtVal !== '' ? parseInt(dtVal, 10) : null;
                    const from = (parsed !== null && !isNaN(parsed)) ? parsed : (draggedFromRef.current ?? draggedHabitIndex);
                    if (from !== null && from !== undefined) {
                      handleDropHabit(habitIdx, from);
                    }
                  }}
                  className="relative"
                >
                  {/* Floating target position indicator without shifting layout */}
                  {isHabitDragOver && (
                    <div className="absolute -top-3.5 left-4 bg-[#005B96] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md z-20 flex items-center gap-1.5 border border-amber-300 pointer-events-none animate-in fade-in">
                      <MapPin className="w-3.5 h-3.5 text-amber-300" />
                      <span>ড্রপ করলে #{formatBnNumber(habitIdx + 1)} ({habitIdx + 1}) পজিশনে আসবে</span>
                    </div>
                  )}

                  <div
                    className={`p-3.5 sm:p-4 rounded-xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                      isHabitDragOver
                        ? 'border-[#005B96] ring-2 ring-[#005B96] shadow-lg bg-blue-50/50 scale-[1.005]'
                        : 'border-[#e6e2da] hover:border-[#005B96]/30'
                    } ${isHabitDragged ? 'opacity-30 scale-[0.99] border-dashed border-[#005B96]' : ''}`}
                  >
                    {/* Title & Category & Streaks */}
                    <div className="min-w-0 flex-1 pr-2 flex items-start sm:items-center gap-2">
                      {/* Notion Drag Handle */}
                      <div
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(habitIdx));
                          e.dataTransfer.effectAllowed = 'move';
                          draggedFromRef.current = habitIdx;
                          setDraggedHabitIndex(habitIdx);
                        }}
                        onDragEnd={() => {
                          draggedFromRef.current = null;
                          setDraggedHabitIndex(null);
                          setDragOverHabitIndex(null);
                        }}
                        onTouchStart={() => {
                          draggedFromRef.current = habitIdx;
                          setDraggedHabitIndex(habitIdx);
                        }}
                        onTouchMove={(e) => {
                          if (e.touches && e.touches[0]) {
                            const target = getTouchDragTarget(e.touches[0]);
                            if (target.index !== null && target.index !== habitIdx) {
                              setDragOverHabitIndex(target.index);
                            }
                          }
                        }}
                        onTouchEnd={() => {
                          const from = draggedFromRef.current ?? habitIdx;
                          if (dragOverHabitIndex !== null && dragOverHabitIndex !== from) {
                            handleDropHabit(dragOverHabitIndex, from);
                          } else {
                            setDraggedHabitIndex(null);
                            setDragOverHabitIndex(null);
                          }
                          draggedFromRef.current = null;
                        }}
                        onTouchCancel={() => {
                          draggedFromRef.current = null;
                          setDraggedHabitIndex(null);
                          setDragOverHabitIndex(null);
                        }}
                        className="p-2 -ml-1 text-gray-400 hover:text-[#005B96] hover:bg-black/5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 mt-0.5 sm:mt-0 touch-none select-none"
                        title="চাপ দিয়ে ধরে উপরে নিচে টানুন (Drag to move)"
                      >
                        <GripVertical className="w-4 h-4 pointer-events-none" />
                      </div>

                      {/* Serial badge (Click to jump to any position) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReorderModal({
                            habit,
                            currentIndex: habitIdx,
                            totalCount: habits.length,
                          });
                          setTargetPosInput(String(habitIdx + 1));
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#005B96]/10 hover:bg-[#005B96]/20 text-[#005B96] font-mono font-black text-xs shrink-0 border border-[#005B96]/20 cursor-pointer transition-all hover:scale-105"
                        title={`পজিশন #${formatBnNumber(habitIdx + 1)} (ক্লিক করে যেকোনো নম্বরে সরান)`}
                      >
                        #{formatBnNumber(habitIdx + 1)}
                      </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#005B96]/10 text-[#005B96] border border-[#005B96]/20">
                          {habit.category}
                        </span>
                        <h4 className="text-sm font-bold text-[#1a2724] break-words leading-snug">{habit.title}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#6d7e79] mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-bold text-[#FF8C00]">
                          <Flame className="w-3.5 h-3.5" />
                          <span>চলতি স্ট্রিক: {formatBnNumber(habit.currentStreak)} দিন</span>
                        </span>
                        <span className="flex items-center gap-1 text-[#869792]">
                          <Award className="w-3.5 h-3.5 text-[#869792]" />
                          <span>সেরা স্ট্রিক: {formatBnNumber(habit.bestStreak)} দিন</span>
                        </span>
                      </div>
                    </div>
                  </div>

              {/* 7-Day Interactive Boundary Box (দাগের ভেতরের বাউন্ডারী ঘর) */}
              <div className="p-1.5 sm:p-2 rounded-2xl bg-[#faf9f5] border border-[#e3ded6] flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
                {weekDays.map((day) => {
                  const done = Boolean(habit.history[day.dateStr]);
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => handleToggle(habit.id, day.dateStr)}
                      className={`w-9 h-11 sm:w-10 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer select-none shrink-0 ${
                        done
                          ? 'bg-[#16a34a] text-white shadow-xs border border-[#15803d]'
                          : 'bg-white hover:bg-gray-50 border border-[#e2ddd5] text-[#55697a]'
                      }`}
                      title={`${day.dateStr} (${day.dayName}): ${done ? 'সম্পন্ন (গ্রীন মার্ক)' : 'অসম্পন্ন (খালি)'}`}
                    >
                      <span className={`text-[9px] font-bold ${done ? 'text-white' : 'text-[#55697a]'}`}>
                        {day.dayName}
                      </span>
                      {done ? (
                        <Check className="w-4 h-4 font-black text-white" />
                      ) : (
                        <span className="text-[11px] font-mono font-bold mt-0.5 text-[#1a2724]">{day.dayNumber}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Delete Option (পরের ছোট দাগের ঘরে ডিলেট অপশন) */}
              <div className="shrink-0 flex items-center justify-end self-end md:self-auto">
                {confirmDeleteId === habit.id ? (
                  <div className="flex items-center gap-1.5 bg-[#fff1f2] border border-[#fecdd3] px-2.5 py-1.5 rounded-xl shadow-xs animate-in fade-in">
                    <span className="text-xs font-bold text-[#be123c]">মুছবেন?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteHabit(habit.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-black transition-colors cursor-pointer"
                    >
                      হ্যাঁ
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-0.5 rounded-lg bg-white hover:bg-[#f4f4f5] border border-[#e4e4e7] text-[#52525b] text-xs font-bold transition-colors cursor-pointer"
                    >
                      না
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(habit.id)}
                    className="p-2 sm:p-2.5 rounded-xl text-[#a8a196] hover:text-[#e11d48] hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors cursor-pointer"
                    title="অভ্যাস মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  )}
        </div>
      </div>

      {/* Floating Drag Indicator */}
      <DragPositionIndicator
        isDragging={draggedHabitIndex !== null}
        fromIndex={draggedHabitIndex}
        toIndex={dragOverHabitIndex}
        itemTitle={draggedHabitIndex !== null ? habits[draggedHabitIndex]?.title : undefined}
        totalCount={habits.length}
      />

      {/* Jump to specific position modal */}
      {reorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-[#005B96]" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  অভ্যাসের পজিশন পরিবর্তন
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReorderModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJumpPosition} className="space-y-4">
              <div>
                <p className="font-bold text-slate-800 text-sm truncate mb-1">
                  &ldquo;{reorderModal.habit.title}&rdquo;
                </p>
                <p className="text-[11px] text-slate-500">
                  বর্তমান পজিশন:{' '}
                  <span className="font-mono font-bold text-[#005B96]">
                    #{formatBnNumber(reorderModal.currentIndex + 1)}
                  </span>{' '}
                  (মোট: {formatBnNumber(reorderModal.totalCount)}টি)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নতুন পজিশন নম্বর লিখুন (1 থেকে {formatBnNumber(reorderModal.totalCount)}):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={targetPosInput}
                  onChange={(e) => setTargetPosInput(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 border-2 border-[#005B96] rounded-xl text-center font-mono font-bold text-lg focus:outline-none"
                  placeholder="যেমন: 1 বা 10"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReorderModal(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#005B96] text-white font-bold text-xs hover:bg-[#004877] transition-colors cursor-pointer shadow-sm"
                >
                  পজিশন পরিবর্তন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
