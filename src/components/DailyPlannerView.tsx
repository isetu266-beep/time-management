import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Filter,
  CalendarDays,
  Flame,
  Search,
  GripVertical,
  ArrowUpDown,
  X,
  MapPin,
} from 'lucide-react';
import { Task, Priority } from '../types';
import {
  getTodayStr,
  getTomorrowStr,
  formatBnDate,
  formatBnNumber,
  toEnDigits,
} from '../utils/storage';
import { playTick } from '../utils/audio';
import { reorderArray } from '../utils/reorder';
import { useDragAutoScroll, getTouchDragTarget, getPointerDragTarget } from '../utils/dragHelper';
import { DragPositionIndicator } from './DragPositionIndicator';

interface DailyPlannerViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onOpenNewTask: (date?: string) => void;
  onMoveTaskDate: (taskId: string, newDate: string) => void;
  onReorderTasks?: (tasks: Task[]) => void;
  initialMode?: 'day' | 'upcoming';
}

export const DailyPlannerView: React.FC<DailyPlannerViewProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onOpenNewTask,
  onMoveTaskDate,
  onReorderTasks,
  initialMode = 'day',
}) => {
  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();

  const [plannerMode, setPlannerMode] = useState<'day' | 'upcoming'>(initialMode);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and drop reorder states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const taskDragRef = useRef<{
    isDragging: boolean;
    fromId: string | null;
    toId: string | null;
  }>({
    isDragging: false,
    fromId: null,
    toId: null,
  });

  // Jump reorder modal state
  const [reorderModal, setReorderModal] = useState<{
    task: Task;
    currentIndex: number;
    totalCount: number;
  } | null>(null);
  const [targetPosInput, setTargetPosInput] = useState('');

  // Auto scroll while dragging near viewport edges
  useDragAutoScroll(draggedTaskId !== null);

  const handleDropTask = (targetTaskId: string, sourceTaskId?: string) => {
    const fromId = sourceTaskId || draggedTaskId;
    if (!fromId || fromId === targetTaskId || !onReorderTasks) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }
    const fromIndex = tasks.findIndex((t) => t.id === fromId);
    const toIndex = tasks.findIndex((t) => t.id === targetTaskId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const reordered = reorderArray(tasks, fromIndex, toIndex);
      onReorderTasks(reordered);
      playTick();
    }
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  useEffect(() => {
    if (initialMode) {
      setPlannerMode(initialMode);
    }
  }, [initialMode]);

  // Helper to calculate days diff from today (safe from timezone skew)
  const getDaysDiff = (targetDateStr: string): number => {
    if (!targetDateStr) return 999;
    const [y1, m1, d1] = todayStr.split('-').map(Number);
    const [y2, m2, d2] = targetDateStr.split('-').map(Number);
    const dToday = new Date(y1, m1 - 1, d1);
    const dTarget = new Date(y2, m2 - 1, d2);
    const diffTime = dTarget.getTime() - dToday.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Day view tasks
  const dateTasks = tasks.filter((t) => {
    if (t.date !== selectedDate) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const completedCount = dateTasks.filter((t) => t.completed).length;

  // Upcoming tasks: from tomorrow onwards (diff >= 1), covering next month/future
  // Sorted chronologically: earliest date first, then by time
  const allFutureTasks = tasks
    .filter((t) => {
      const diff = getDaysDiff(t.date);
      if (diff < 1) return false; // upcoming starts tomorrow
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const diffA = getDaysDiff(a.date);
      const diffB = getDaysDiff(b.date);
      if (diffA !== diffB) return diffA - diffB;
      return (a.time || '').localeCompare(b.time || '');
    });

  // Group 1: 1-7 days (Next week - immediate focus)
  const next7DaysTasks = allFutureTasks.filter((t) => {
    const diff = getDaysDiff(t.date);
    return diff >= 1 && diff <= 7;
  });

  // Group 2: 8 days and beyond (Next 8-45 days - extended planning)
  const laterTasks = allFutureTasks.filter((t) => {
    const diff = getDaysDiff(t.date);
    return diff > 7;
  });

  const totalUpcomingCount = tasks.filter((t) => {
    const diff = getDaysDiff(t.date);
    return diff >= 1 && !t.completed;
  }).length;

  const currentVisibleTasks = plannerMode === 'day' ? dateTasks : allFutureTasks;
  const draggedTask = draggedTaskId ? tasks.find((t) => t.id === draggedTaskId) : null;
  const draggedCurrentIndex = draggedTaskId
    ? currentVisibleTasks.findIndex((t) => t.id === draggedTaskId)
    : -1;
  const draggedHoverIndex = dragOverTaskId
    ? currentVisibleTasks.findIndex((t) => t.id === dragOverTaskId)
    : -1;
  const totalVisibleCount = currentVisibleTasks.length;

  const handleJumpPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderModal || !onReorderTasks) return;
    const targetNum = parseInt(toEnDigits(targetPosInput.trim()), 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > reorderModal.totalCount) return;
    const targetIdx = targetNum - 1;

    const list = plannerMode === 'day' ? dateTasks : allFutureTasks;
    const targetTask = list[targetIdx];
    if (targetTask) {
      const fromIndex = tasks.findIndex((t) => t.id === reorderModal.task.id);
      const toIndex = tasks.findIndex((t) => t.id === targetTask.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        const reordered = reorderArray(tasks, fromIndex, toIndex);
        onReorderTasks(reordered);
        playTick();
      }
    }
    setReorderModal(null);
  };

  // Render a task card for upcoming list
  const renderUpcomingTaskCard = (task: Task, isImmediateFocus: boolean, idx?: number, totalCount?: number) => {
    const diff = getDaysDiff(task.date);
    let countdownLabel = `${formatBnNumber(diff)} দিন বাকি`;
    if (diff === 1) countdownLabel = 'আগামীকাল';
    else if (diff === 2) countdownLabel = 'পরশু (2 দিন বাকি)';

    const isTaskDragged = draggedTaskId === task.id;
    const isTaskDragOver = dragOverTaskId === task.id && draggedTaskId !== task.id;

    return (
      <div
        key={task.id}
        data-drag-item="true"
        data-drag-id={task.id}
        data-drag-index={idx}
        className="relative"
      >
        {/* Floating position indicator badge without shifting layout */}
        {isTaskDragOver && idx !== undefined && (
          <div className="absolute -top-3 left-4 bg-[#005B96] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md z-20 flex items-center gap-1.5 border border-amber-300 pointer-events-none animate-in fade-in">
            <MapPin className="w-3.5 h-3.5 text-amber-300" />
            <span>ড্রপ করলে #{formatBnNumber(idx + 1)} ({idx + 1}) পজিশনে আসবে</span>
          </div>
        )}

        <div
          onDragOver={(e) => {
            if (draggedTaskId) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              taskDragRef.current.toId = task.id;
              if (dragOverTaskId !== task.id) setDragOverTaskId(task.id);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const from = e.dataTransfer.getData('text/plain') || (taskDragRef.current.fromId ?? draggedTaskId);
            if (from && from !== task.id) {
              handleDropTask(task.id, from);
            }
          }}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            task.completed
              ? 'bg-[#f8f7f4] border-[#e7e3dc] opacity-60'
              : isImmediateFocus
              ? 'bg-white border-orange-200 hover:border-[#ea580c]/50 shadow-2xs'
              : 'bg-white border-[#e6e2da] hover:border-[#005B96]/40 shadow-2xs'
          } ${
            isTaskDragOver ? 'border-[#005B96] ring-2 ring-[#005B96] shadow-md bg-blue-50/20 scale-[1.005]' : ''
          } ${isTaskDragged ? 'opacity-35 scale-[0.99] border-dashed border-[#005B96]' : ''}`}
        >
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Notion Drag Handle + Serial Badge */}
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <div
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', task.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedTaskId(task.id);
                  taskDragRef.current = { isDragging: true, fromId: task.id, toId: task.id };
                }}
                onDragEnd={() => {
                  setDraggedTaskId(null);
                  setDragOverTaskId(null);
                  taskDragRef.current = { isDragging: false, fromId: null, toId: null };
                }}
                onTouchStart={() => {
                  taskDragRef.current = { isDragging: true, fromId: task.id, toId: task.id };
                  setDraggedTaskId(task.id);
                }}
                onTouchMove={(e) => {
                  if (e.touches && e.touches[0]) {
                    const target = getTouchDragTarget(e.touches[0]);
                    if (target.id) {
                      taskDragRef.current.toId = target.id;
                      if (target.id !== task.id) {
                        setDragOverTaskId(target.id);
                      }
                    }
                  }
                }}
                onTouchEnd={() => {
                  const from = taskDragRef.current.fromId ?? task.id;
                  const to = taskDragRef.current.toId ?? dragOverTaskId;
                  if (to && to !== from) {
                    handleDropTask(to, from);
                  } else {
                    setDraggedTaskId(null);
                    setDragOverTaskId(null);
                  }
                  taskDragRef.current = { isDragging: false, fromId: null, toId: null };
                }}
                onTouchCancel={() => {
                  taskDragRef.current = { isDragging: false, fromId: null, toId: null };
                  setDraggedTaskId(null);
                  setDragOverTaskId(null);
                }}
                className="p-2 -ml-1 text-gray-400 hover:text-[#005B96] hover:bg-black/5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none select-none"
                title="চাপ দিয়ে ধরে উপরে নিচে টানুন (Drag to move)"
              >
                <GripVertical className="w-4 h-4 pointer-events-none" />
              </div>

              {idx !== undefined && totalCount !== undefined && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReorderModal({
                      task,
                      currentIndex: idx,
                      totalCount,
                    });
                    setTargetPosInput(String(idx + 1));
                  }}
                  className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#005B96] font-mono text-[11px] font-black border border-slate-200 cursor-pointer shrink-0 transition-all hover:scale-105"
                  title={`পজিশন #${formatBnNumber(idx + 1)} (ক্লিক করে যেকোনো নম্বরে সরান)`}
                >
                  #{formatBnNumber(idx + 1)}
                </button>
              )}
            </div>

            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggleTask(task.id)}
              className="mt-1 w-4 h-4 rounded text-[#005B96] focus:ring-[#005B96] cursor-pointer shrink-0 accent-[#005B96]"
            />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Countdown Badge */}
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  isImmediateFocus
                    ? 'bg-orange-50 text-[#c2410c] border-orange-200'
                    : 'bg-blue-50 text-[#005B96] border-blue-200'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{countdownLabel}</span>
                <span className="opacity-75 font-medium">• {formatBnDate(task.date)}</span>
              </span>

              {/* Priority Badge */}
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
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

              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f2efe9] text-[#4f615c] font-medium">
                {task.category}
              </span>

              {task.hasReminder && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#F6A600] bg-[#F6A600]/10 border border-[#F6A600]/30 px-1.5 py-0.5 rounded-md">
                  <Bell className="w-3 h-3 text-[#F6A600]" />
                  <span>{task.reminderTime || task.time}</span>
                </span>
              )}
            </div>

            <h3
              className={`text-sm font-bold mt-1.5 break-words ${
                task.completed ? 'line-through text-[#8d9f9a]' : 'text-[#1a2724]'
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="text-xs text-[#6d7e79] mt-0.5 line-clamp-2 break-words">{task.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-[#869792] mt-1.5">
              <span className="flex items-center gap-1 font-mono font-medium text-[#4f615c]">
                <Clock className="w-3 h-3 text-[#869792]" />
                <span>{task.time || '--:--'}</span>
                {task.durationMinutes && (
                  <span className="text-[11px] text-[#869792]">
                    ({formatBnNumber(task.durationMinutes)} মিনিট)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#eeeae2] w-full sm:w-auto justify-end">
          <button
            onClick={() => onMoveTaskDate(task.id, todayStr)}
            className="px-2 py-1 rounded-lg border border-[#e6e2da] hover:bg-[#f3f0e8] text-[#005B96] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="আজকের তারিখে নিয়ে আসুন"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>আজকে আনুন</span>
          </button>

          {diff > 1 && (
            <button
              onClick={() => onMoveTaskDate(task.id, tomorrowStr)}
              className="px-2 py-1 rounded-lg border border-[#e6e2da] hover:bg-[#f3f0e8] text-[#556762] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="আগামীকালে স্থানান্তর করুন"
            >
              <span>আগামীকাল</span>
            </button>
          )}

          <button
            onClick={() => onEditTask(task)}
            className="p-1.5 rounded-lg text-[#6d7e79] hover:text-[#005B96] hover:bg-[#005B96]/10 transition-colors cursor-pointer"
            title="সম্পাদনা করুন"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDeleteTask(task.id)}
            className="p-1.5 rounded-lg text-[#869792] hover:text-[#FF8C00] hover:bg-[#FF8C00]/10 transition-colors cursor-pointer"
            title="মুছে ফেলুন"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Switcher Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Quick Tabs: Today / Tomorrow / Upcoming */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#f3f0e8] border border-[#e6e2d9] w-full sm:w-auto flex-wrap">
          <button
            onClick={() => {
              setSelectedDate(todayStr);
              setPlannerMode('day');
            }}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              plannerMode === 'day' && selectedDate === todayStr
                ? 'bg-[#16a34a] text-white shadow-2xs font-black'
                : 'text-[#697b76] hover:text-[#16a34a]'
            }`}
          >
            আজকে (Today)
          </button>
          <button
            onClick={() => {
              setSelectedDate(tomorrowStr);
              setPlannerMode('day');
            }}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              plannerMode === 'day' && selectedDate === tomorrowStr
                ? 'bg-[#16a34a] text-white shadow-2xs font-black'
                : 'text-[#697b76] hover:text-[#16a34a]'
            }`}
          >
            আগামীকাল (Tomorrow)
          </button>

          {/* New: Upcoming 1 Month Quick Tab */}
          <button
            onClick={() => {
              setPlannerMode('upcoming');
            }}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              plannerMode === 'upcoming'
                ? 'bg-[#16a34a] text-white shadow-2xs font-black'
                : 'text-[#697b76] hover:text-[#16a34a]'
            }`}
            title="আগামী 1 মাসের কাজের পরিকল্পনা দেখুন"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>আসন্ন 1 মাস</span>
            {totalUpcomingCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  plannerMode === 'upcoming'
                    ? 'bg-white text-[#16a34a]'
                    : 'bg-[#e5e1d7] text-[#485954]'
                }`}
              >
                {formatBnNumber(totalUpcomingCount)}
              </span>
            )}
          </button>
        </div>

        {/* Custom Date Picker & Add Task */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#00A3E0]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPlannerMode('day');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-[#e6e2da] text-xs font-mono font-bold bg-white text-[#1a2724] focus:outline-none focus:border-[#005B96]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenNewTask(plannerMode === 'upcoming' ? tomorrowStr : selectedDate)}
              className="px-3.5 py-2 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>কাজ যোগ করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: DAY PLANNER VIEW (Yesterday / Today / Tomorrow / Picked Date) */}
      {plannerMode === 'day' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeae2] pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#005B96]">
                {formatBnDate(selectedDate)}
              </h2>
              <p className="text-xs text-[#55697a]">
                মোট কাজ: {formatBnNumber(dateTasks.length)}টি | সম্পন্ন:{' '}
                <span className="text-[#005B96] font-bold">{formatBnNumber(completedCount)}টি</span>
              </p>
            </div>

            {/* Priority Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-[#00A3E0] mr-1" />
              {['ALL', 'P1', 'P2', 'P3', 'P4'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setPriorityFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    priorityFilter === lvl
                      ? 'bg-[#16a34a] text-white shadow-2xs font-black'
                      : 'bg-[#f3f0e8] text-[#55697a] hover:bg-[#e8e4db]'
                  }`}
                >
                  {lvl === 'ALL'
                    ? 'সকল অগ্রাধিকার'
                    : lvl === 'P1'
                    ? 'P1 (খুব জরুরি কাজ)'
                    : lvl === 'P2'
                    ? 'P2 (গুরুত্বপূর্ণ কাজ)'
                    : lvl === 'P3'
                    ? 'P3 (রুটিন কাজ)'
                    : 'P4 (কম জরুরি কাজ)'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar for Day View */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#869792] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="এই দিনের কাজের নাম দিয়ে খুঁজুন..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#e6e2da] text-xs bg-[#fbf9f5] focus:bg-white text-[#1a2724] focus:outline-none focus:border-[#005B96]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#869792] hover:text-[#1a2724]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Task List */}
          {dateTasks.length === 0 ? (
            <div className="text-center py-12 bg-[#faf8f4] rounded-2xl border border-dashed border-[#e3ded6]">
              <CheckCircle2 className="w-10 h-10 text-[#00A3E0] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-[#1a2724]">এই দিনের জন্য কোনো কাজ পাওয়া যায়নি</p>
              <p className="text-[11px] text-[#788984] mt-1">
                উপরের "+ কাজ যোগ করুন" বাটনে ক্লিক করে নতুন কাজের তালিকা তৈরি করুন।
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dateTasks.map((task, idx) => {
                const isTaskDragged = draggedTaskId === task.id;
                const isTaskDragOver = dragOverTaskId === task.id && draggedTaskId !== task.id;

                return (
                  <div
                    key={task.id}
                    data-drag-item="true"
                    data-drag-id={task.id}
                    data-drag-index={idx}
                    className="relative"
                  >
                    {/* Floating position indicator badge without shifting layout */}
                    {isTaskDragOver && (
                      <div className="absolute -top-3 left-4 bg-[#005B96] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md z-20 flex items-center gap-1.5 border border-amber-300 pointer-events-none animate-in fade-in">
                        <MapPin className="w-3.5 h-3.5 text-amber-300" />
                        <span>ড্রপ করলে #{formatBnNumber(idx + 1)} ({idx + 1}) পজিশনে আসবে</span>
                      </div>
                    )}

                    <div
                      onDragOver={(e) => {
                        if (draggedTaskId) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          taskDragRef.current.toId = task.id;
                          if (dragOverTaskId !== task.id) setDragOverTaskId(task.id);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = e.dataTransfer.getData('text/plain') || (taskDragRef.current.fromId ?? draggedTaskId);
                        if (from && from !== task.id) {
                          handleDropTask(task.id, from);
                        }
                      }}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        task.completed
                          ? 'bg-[#f8f7f4] border-[#e7e3dc] opacity-65'
                          : 'bg-white border-[#e6e2da] hover:border-[#005B96]/40 shadow-2xs'
                      } ${
                        isTaskDragOver ? 'border-[#005B96] ring-2 ring-[#005B96] shadow-md bg-blue-50/20 scale-[1.005]' : ''
                      } ${isTaskDragged ? 'opacity-35 scale-[0.99] border-dashed border-[#005B96]' : ''}`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        {/* Notion Drag Handle + Serial Badge */}
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <div
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', task.id);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedTaskId(task.id);
                              taskDragRef.current = { isDragging: true, fromId: task.id, toId: task.id };
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverTaskId(null);
                              taskDragRef.current = { isDragging: false, fromId: null, toId: null };
                            }}
                            onTouchStart={() => {
                              taskDragRef.current = { isDragging: true, fromId: task.id, toId: task.id };
                              setDraggedTaskId(task.id);
                            }}
                            onTouchMove={(e) => {
                              if (e.touches && e.touches[0]) {
                                const target = getTouchDragTarget(e.touches[0]);
                                if (target.id) {
                                  taskDragRef.current.toId = target.id;
                                  if (target.id !== task.id) {
                                    setDragOverTaskId(target.id);
                                  }
                                }
                              }
                            }}
                            onTouchEnd={() => {
                              const from = taskDragRef.current.fromId ?? task.id;
                              const to = taskDragRef.current.toId ?? dragOverTaskId;
                              if (to && to !== from) {
                                handleDropTask(to, from);
                              } else {
                                setDraggedTaskId(null);
                                setDragOverTaskId(null);
                              }
                              taskDragRef.current = { isDragging: false, fromId: null, toId: null };
                            }}
                            onTouchCancel={() => {
                              taskDragRef.current = { isDragging: false, fromId: null, toId: null };
                              setDraggedTaskId(null);
                              setDragOverTaskId(null);
                            }}
                            className="p-2 -ml-1 text-gray-400 hover:text-[#005B96] hover:bg-black/5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none select-none"
                            title="চাপ দিয়ে ধরে উপরে নিচে টানুন (Drag to move)"
                          >
                            <GripVertical className="w-4 h-4 pointer-events-none" />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReorderModal({
                                task,
                                currentIndex: idx,
                                totalCount: dateTasks.length,
                              });
                              setTargetPosInput(String(idx + 1));
                            }}
                            className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#005B96] font-mono text-[11px] font-black border border-slate-200 cursor-pointer shrink-0 transition-all hover:scale-105"
                            title={`পজিশন #${formatBnNumber(idx + 1)} (ক্লিক করে যেকোনো নম্বরে সরান)`}
                          >
                            #{formatBnNumber(idx + 1)}
                          </button>
                        </div>

                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => onToggleTask(task.id)}
                          className="mt-1 w-4 h-4 rounded text-[#005B96] focus:ring-[#005B96] cursor-pointer shrink-0 accent-[#005B96]"
                        />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f2efe9] text-[#4f615c] font-medium">
                          {task.category}
                        </span>
                        {task.hasReminder && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#F6A600] bg-[#F6A600]/10 border border-[#F6A600]/30 px-1.5 py-0.5 rounded-md">
                            <Bell className="w-3 h-3 text-[#F6A600]" />
                            <span>{task.reminderTime || task.time}</span>
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-sm font-bold mt-1 break-words ${
                          task.completed ? 'line-through text-[#8d9f9a]' : 'text-[#1a2724]'
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-[#6d7e79] mt-0.5 line-clamp-2 break-words">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-[#869792] mt-1.5">
                        <span className="flex items-center gap-1 font-mono font-medium text-[#4f615c]">
                          <Clock className="w-3 h-3 text-[#869792]" />
                          <span>{task.time || '--:--'}</span>
                          {task.durationMinutes && (
                            <span className="text-[11px] text-[#869792]">
                              ({formatBnNumber(task.durationMinutes)} মিনিট)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#eeeae2] w-full sm:w-auto justify-end">
                    {selectedDate === todayStr ? (
                      <button
                        onClick={() => onMoveTaskDate(task.id, tomorrowStr)}
                        className="p-1.5 rounded-lg border border-[#e6e2da] hover:bg-[#f3f0e8] text-[#556762] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="আগামীকালে স্থানান্তর করুন"
                      >
                        <span>আগামীকাল</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onMoveTaskDate(task.id, todayStr)}
                        className="p-1.5 rounded-lg border border-[#e6e2da] hover:bg-[#f3f0e8] text-[#556762] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="আজকে নিয়ে আসুন"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>আজকে আনুন</span>
                      </button>
                    )}

                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 rounded-lg text-[#6d7e79] hover:text-[#005B96] hover:bg-[#005B96]/10 transition-colors cursor-pointer"
                      title="সম্পাদনা করুন"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 rounded-lg text-[#869792] hover:text-[#FF8C00] hover:bg-[#FF8C00]/10 transition-colors cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}

            {/* Bottom drop zone for dateTasks */}
            {draggedTaskId && dateTasks.findIndex((t) => t.id === draggedTaskId) !== dateTasks.length - 1 && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  const last = dateTasks[dateTasks.length - 1];
                  if (last) setDragOverTaskId(last.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const last = dateTasks[dateTasks.length - 1];
                  if (last) handleDropTask(last.id);
                }}
                className={`py-2 px-3 rounded-xl border-2 border-dashed text-center text-xs font-bold transition-all ${
                  dragOverTaskId === dateTasks[dateTasks.length - 1]?.id
                    ? 'bg-blue-100 border-[#005B96] text-[#005B96]'
                    : 'bg-blue-50/50 border-blue-200 text-blue-600'
                }`}
              >
                ⬇ সর্বশেষ পজিশনে রাখুন (#{formatBnNumber(dateTasks.length)})
              </div>
            )}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: UPCOMING 1-MONTH VIEW (Next 1-7 Days Focus + 8-45 Days Extended) */}
      {plannerMode === 'upcoming' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Overview Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeae2] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#005B96] flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[#00A3E0]" />
                  <span>আসন্ন 1 মাসের কাজের পরিকল্পনা ও আউটলুক</span>
                </h2>
                <p className="text-xs text-[#55697a] mt-0.5">
                  আগামী 1 মাস ও দূরবর্তী সকল নির্ধারিত কাজ তারিখ অনুসারে সাজানো
                </p>
              </div>

              {/* Stats Summary Pills */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1 bg-orange-50 text-[#c2410c] border border-orange-200 px-2.5 py-1 rounded-lg font-bold font-mono">
                  <Flame className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>আগামী 1-7 দিনে: {formatBnNumber(next7DaysTasks.length)}টি</span>
                </div>
                <div className="flex items-center gap-1 bg-blue-50 text-[#005B96] border border-blue-200 px-2.5 py-1 rounded-lg font-bold font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#005B96]" />
                  <span>8 দিন ও পরবর্তী: {formatBnNumber(laterTasks.length)}টি</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#869792] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="আসন্ন কাজের নাম দিয়ে খুঁজুন..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#e6e2da] text-xs bg-[#fbf9f5] focus:bg-white text-[#1a2724] focus:outline-none focus:border-[#005B96]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#869792] hover:text-[#1a2724]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Priority Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-[#00A3E0] mr-1" />
                {['ALL', 'P1', 'P2', 'P3', 'P4'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setPriorityFilter(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      priorityFilter === lvl
                        ? 'bg-[#16a34a] text-white shadow-2xs font-black'
                        : 'bg-[#f3f0e8] text-[#55697a] hover:bg-[#e8e4db]'
                    }`}
                  >
                    {lvl === 'ALL'
                      ? 'সকল অগ্রাধিকার'
                      : lvl === 'P1'
                      ? 'P1 (খুব জরুরি)'
                      : lvl === 'P2'
                      ? 'P2 (গুরুত্বপূর্ণ)'
                      : lvl === 'P3'
                      ? 'P3 (রুটিন)'
                      : 'P4 (কম জরুরি)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 1: NEXT 1-7 DAYS (IMMEDIATE FOCUS - HIGH IMPORTANCE) */}
          <div className="bg-orange-50/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-200/80 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-200/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ea580c] animate-pulse"></div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#9a3412] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#ea580c]" />
                    <span>আগামী 1-7 দিনের অতি গুরুত্বপূর্ণ ও ফোকাসড কাজ</span>
                  </h3>
                  <p className="text-xs text-[#c2410c]/80 mt-0.5">
                    আসন্ন সপ্তাহের কাজসমূহ অগ্রাধিকার দিয়ে আগে থেকেই গুছিয়ে নিন
                  </p>
                </div>
              </div>
              <span className="text-xs font-black font-mono px-3 py-1 rounded-full bg-[#ea580c] text-white shadow-2xs self-start sm:self-auto">
                {formatBnNumber(next7DaysTasks.length)}টি কাজ
              </span>
            </div>

            {next7DaysTasks.length === 0 ? (
              <div className="text-center py-6 bg-white/60 rounded-xl border border-dashed border-orange-200">
                <p className="text-xs font-bold text-[#9a3412]">
                  আগামী 1-7 দিনের মধ্যে কোনো নির্ধারিত কাজ নেই।
                </p>
                <p className="text-[11px] text-[#c2410c]/70 mt-0.5">
                  নিচের বাটন দিয়ে যেকোনো দিনের জন্য কাজ শিডিউল করুন।
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
              {next7DaysTasks.map((task, idx) =>
                renderUpcomingTaskCard(task, true, idx, next7DaysTasks.length)
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: NEXT 8 TO 45 DAYS (EXTENDED OUTLOOK) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d8e5f0] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#005B96]"></div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#005B96] flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#005B96]" />
                  <span>পরবর্তী 8 দিন থেকে 1 মাসের পরিকল্পনা</span>
                </h3>
                <p className="text-xs text-[#55697a] mt-0.5">
                  দূরবর্তী নির্ধারিত কাজসমূহ ও দীর্ঘমেয়াদী পরিকল্পনা (যেমন: আগামী মাসের 20 তারিখের কাজ)
                </p>
              </div>
            </div>
            <span className="text-xs font-black font-mono px-3 py-1 rounded-full bg-[#005B96] text-white shadow-2xs self-start sm:self-auto">
              {formatBnNumber(laterTasks.length)}টি কাজ
            </span>
          </div>

          {laterTasks.length === 0 ? (
            <div className="text-center py-6 bg-[#faf8f4] rounded-xl border border-dashed border-[#e3ded6]">
              <p className="text-xs font-bold text-[#1a2724]">
                পরবর্তী 8 দিন থেকে 1 মাসের মধ্যে কোনো কাজ নির্ধারিত নেই।
              </p>
              <p className="text-[11px] text-[#788984] mt-0.5">
                ভবিষ্যতের কোনো তারিখে কাজ শিডিউল করতে "+ কাজ যোগ করুন" বাটনে ক্লিক করুন।
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {laterTasks.map((task, idx) =>
                renderUpcomingTaskCard(task, false, idx, laterTasks.length)
              )}
            </div>
          )}
        </div>

        {/* Empty state if both groups are completely empty */}
        {allFutureTasks.length === 0 && (
          <div className="text-center py-10 bg-[#faf8f4] rounded-2xl border border-dashed border-[#e3ded6]">
            <Calendar className="w-10 h-10 text-[#00A3E0] mx-auto mb-2 opacity-60" />
            <p className="text-xs font-bold text-[#1a2724]">
              আগামী 1 মাসের মধ্যে কোনো কাজ পাওয়া যায়নি
            </p>
            <p className="text-[11px] text-[#788984] mt-1">
              ভবিষ্যতের কাজের পরিকল্পনা করতে উপরের "+ কাজ যোগ করুন" বাটনে ক্লিক করে পছন্দমতো তারিখ দিন।
            </p>
            <button
              onClick={() => onOpenNewTask(tomorrowStr)}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#005B96] text-white text-xs font-bold hover:bg-[#004877] transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কাজ যোগ করুন</span>
            </button>
          </div>
        )}
      </div>
    )}

      {/* Floating Drag Indicator */}
      <DragPositionIndicator
        isDragging={draggedTaskId !== null}
        fromIndex={draggedCurrentIndex}
        toIndex={draggedHoverIndex}
        itemTitle={draggedTask?.title}
        totalCount={totalVisibleCount}
      />

      {/* Jump to specific position modal */}
      {reorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#e6e2da] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeae2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#005B96] flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1a2724]">কাজের অবস্থান পরিবর্তন</h3>
                  <p className="text-[11px] text-[#6d7e79]">কাঙ্ক্ষিত সিরিয়াল নম্বর বসান</p>
                </div>
              </div>
              <button
                onClick={() => setReorderModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJumpPosition} className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1 line-clamp-1">
                  &ldquo;{reorderModal.task.title}&rdquo;
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReorderModal(null)}
                  className="flex-1 py-2 rounded-xl border border-[#e6e2da] text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#005B96] hover:bg-[#004877] text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  পজিশন স্থানান্তর করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
