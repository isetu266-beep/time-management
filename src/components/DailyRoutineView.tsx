import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  AlertCircle,
  RotateCcw,
  Save,
  X,
  CalendarCheck,
  Flame,
  ArrowUpDown,
  Check,
  Filter,
  Car,
  Sun,
  Zap,
  Moon,
  Sparkles,
  LayoutGrid,
  List,
  ShieldAlert,
  Pencil,
  GripVertical,
  MapPin,
} from 'lucide-react';
import { DailyRoutineItem, RoutinePriority } from '../types';
import { formatBnNumber, toEnDigits, recordDeletedItemId } from '../utils/storage';
import { playSuccessChime, playTick } from '../utils/audio';
import { reorderArray } from '../utils/reorder';
import { useDragAutoScroll, getTouchDragTarget, getPointerDragTarget } from '../utils/dragHelper';
import { DragPositionIndicator } from './DragPositionIndicator';

interface DailyRoutineViewProps {
  dailyRoutine: DailyRoutineItem[];
  onUpdateDailyRoutine: (routine: DailyRoutineItem[]) => void;
}

// Convert 24h HH:mm to Bengali formatted time with period (সকাল, দুপুর, বিকাল, সন্ধ্যা, রাত)
export function formatRoutineTimeBn(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr === '24:00' || timeStr === '00:00') return 'রাত 12:00';

  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);

  if (isNaN(h)) return timeStr;

  let period = 'সকাল';
  if (h >= 4 && h < 12) {
    period = 'সকাল';
  } else if (h >= 12 && h < 15) {
    period = 'দুপুর';
  } else if (h >= 15 && h < 18) {
    period = 'বিকাল';
  } else if (h >= 18 && h < 20) {
    period = 'সন্ধ্যা';
  } else {
    period = 'রাত';
  }

  const displayH = h % 12 === 0 ? 12 : h % 12;
  const hBn = formatBnNumber(displayH);
  const mBn = formatBnNumber(String(m).padStart(2, '0'));

  return `${period} ${hBn}:${mBn}`;
}

// Single clean display format for time range in Bengali (e.g., 'সকাল 06:00 — 07:00')
export function formatRoutineRangeBn(startTime: string, endTime: string): string {
  if (!startTime) return '';
  const [sHStr, sMStr] = startTime.split(':');
  const sH = parseInt(sHStr, 10);
  const sM = parseInt(sMStr || '0', 10);

  let period = 'সকাল';
  if (sH >= 4 && sH < 12) {
    period = 'সকাল';
  } else if (sH >= 12 && sH < 15) {
    period = 'দুপুর';
  } else if (sH >= 15 && sH < 18) {
    period = 'বিকাল';
  } else if (sH >= 18 && sH < 20) {
    period = 'সন্ধ্যা';
  } else {
    period = 'রাত';
  }

  const sDisplayH = sH % 12 === 0 ? 12 : sH % 12;
  const sHBn = formatBnNumber(sDisplayH);
  const sMBn = formatBnNumber(String(sM).padStart(2, '0'));

  if (!endTime) {
    return `${period} ${sHBn}:${sMBn}`;
  }

  const [eHStr, eMStr] = endTime.split(':');
  const eH = parseInt(eHStr, 10);
  const eM = parseInt(eMStr || '0', 10);
  const eDisplayH = eH % 12 === 0 ? 12 : eH % 12;
  const eHBn = formatBnNumber(eDisplayH);
  const eMBn = formatBnNumber(String(eM).padStart(2, '0'));

  return `${period} ${sHBn}:${sMBn} — ${eHBn}:${eMBn}`;
}

// Time Block Phase Identifier (আইডিয়া 1: টাইম ব্লকিং)
export type TimeBlockKey = 'morning' | 'core' | 'buffer' | 'evening';

export interface TimeBlockDefinition {
  key: TimeBlockKey;
  title: string;
  subtitle: string;
  timeRange: string;
  startTime?: string;
  endTime?: string;
  icon: any;
  colorClass: string;
  badgeBg: string;
  badgeBorder: string;
}

export const DEFAULT_TIME_BLOCKS: Record<TimeBlockKey, TimeBlockDefinition> = {
  morning: {
    key: 'morning',
    title: 'মর্নিং ব্লক (Morning Routine)',
    subtitle: 'ঘুম থেকে ওঠা, শরীরচর্চা/ধ্যান ও দিন শুরুর প্রস্তুতি',
    timeRange: 'সকাল 05:00 — 10:00',
    startTime: '05:00',
    endTime: '10:00',
    icon: Sun,
    colorClass: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
  },
  core: {
    key: 'core',
    title: 'কোর ফোকাস ব্লক (Deep Work)',
    subtitle: 'দিনের সবচেয়ে গুরুত্বপূর্ণ প্রধান কাজ, প্রজেক্ট ও ক্যারিয়ার লক্ষ্য',
    timeRange: 'সকাল 10:00 — বিকাল 05:00',
    startTime: '10:00',
    endTime: '17:00',
    icon: Zap,
    colorClass: 'text-indigo-600',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
  },
  buffer: {
    key: 'buffer',
    title: 'ফ্লেক্সিবল ও বাফার ব্লক (Buffer & Outing)',
    subtitle: 'আকস্মিক বাহিরে যাওয়া, জরুরি কাজ, বাজার বা অপ্রত্যাশিত সময়ের জন্য ফাঁকা বাফার',
    timeRange: 'বিকাল 05:00 — সন্ধ্যা 07:00',
    startTime: '17:00',
    endTime: '19:00',
    icon: Car,
    colorClass: 'text-emerald-700',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
  },
  evening: {
    key: 'evening',
    title: 'ইভনিং ও উইন্ড-ডাউন (Evening Wind-Down)',
    subtitle: 'পরিবার, রাতের খাবার, সারাদিনের পর্যালোচনা ও পর্যাপ্ত ঘুম',
    timeRange: 'সন্ধ্যা 07:00 — রাত 11:00+',
    startTime: '19:00',
    endTime: '23:00',
    icon: Moon,
    colorClass: 'text-purple-600',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
  },
};

export const TIME_BLOCKS = DEFAULT_TIME_BLOCKS;

const STORAGE_KEY_CUSTOM_BLOCKS = 'time_management_custom_time_blocks';

export function loadStoredBlocks(): Record<TimeBlockKey, TimeBlockDefinition> {
  if (typeof window === 'undefined') return DEFAULT_TIME_BLOCKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_BLOCKS);
    if (!raw) return DEFAULT_TIME_BLOCKS;
    const parsed = JSON.parse(raw);
    return {
      morning: { ...DEFAULT_TIME_BLOCKS.morning, ...parsed.morning, icon: Sun },
      core: { ...DEFAULT_TIME_BLOCKS.core, ...parsed.core, icon: Zap },
      buffer: { ...DEFAULT_TIME_BLOCKS.buffer, ...parsed.buffer, icon: Car },
      evening: { ...DEFAULT_TIME_BLOCKS.evening, ...parsed.evening, icon: Moon },
    };
  } catch {
    return DEFAULT_TIME_BLOCKS;
  }
}

export function saveStoredBlocks(blocks: Record<TimeBlockKey, TimeBlockDefinition>) {
  if (typeof window === 'undefined') return;
  try {
    const toSave = {
      morning: {
        title: blocks.morning.title,
        subtitle: blocks.morning.subtitle,
        timeRange: blocks.morning.timeRange,
        startTime: blocks.morning.startTime,
        endTime: blocks.morning.endTime,
      },
      core: {
        title: blocks.core.title,
        subtitle: blocks.core.subtitle,
        timeRange: blocks.core.timeRange,
        startTime: blocks.core.startTime,
        endTime: blocks.core.endTime,
      },
      buffer: {
        title: blocks.buffer.title,
        subtitle: blocks.buffer.subtitle,
        timeRange: blocks.buffer.timeRange,
        startTime: blocks.buffer.startTime,
        endTime: blocks.buffer.endTime,
      },
      evening: {
        title: blocks.evening.title,
        subtitle: blocks.evening.subtitle,
        timeRange: blocks.evening.timeRange,
        startTime: blocks.evening.startTime,
        endTime: blocks.evening.endTime,
      },
    };
    localStorage.setItem(STORAGE_KEY_CUSTOM_BLOCKS, JSON.stringify(toSave));
  } catch {}
}

// Helper to determine block from start time
export function getBlockForTime(
  startTime: string,
  customBlocks?: Record<TimeBlockKey, TimeBlockDefinition>
): TimeBlockKey {
  if (!startTime) return 'core';
  const [hStr, mStr] = startTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return 'core';
  const minutes = h * 60 + m;

  if (customBlocks) {
    const order: TimeBlockKey[] = ['buffer', 'morning', 'core', 'evening'];
    for (const key of order) {
      const b = customBlocks[key];
      if (b && b.startTime && b.endTime) {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
          const sMin = sh * 60 + (sm || 0);
          const eMin = eh * 60 + (em || 0);
          if (sMin <= eMin) {
            if (minutes >= sMin && minutes < eMin) return key;
          } else {
            if (minutes >= sMin || minutes < eMin) return key;
          }
        }
      }
    }
  }

  if (h >= 4 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'core';
  if (h >= 17 && h < 19) return 'buffer';
  return 'evening';
}

// Compact native time input with clock icon - opens browser's native picker on click
interface SimpleTimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

const SimpleTimePicker: React.FC<SimpleTimePickerProps> = ({ value, onChange }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (inputRef.current) {
      try {
        (inputRef.current as any).showPicker?.();
      } catch {}
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        ref={inputRef}
        type="time"
        step="60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className="native-time-input w-[140px] px-3 py-1.5 rounded-xl border border-[#005B96]/40 hover:border-[#005B96] bg-white hover:bg-blue-50/40 text-[#1a2724] text-xs font-mono font-bold focus:outline-none focus:border-[#005B96] cursor-pointer shadow-2xs transition-all"
        title="সময় পরিবর্তন করতে ক্লিক করুন"
      />
    </div>
  );
};

// 4 Priority Configuration (আইডিয়া 4: নন-নেগোশিয়েবল বনাম অপশনাল)
const PRIORITY_CONFIG: Record<
  RoutinePriority,
  {
    label: string;
    shortLabel: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    activeRing: string;
    cardBorder: string;
    cardBg: string;
    desc: string;
  }
> = {
  mandatory: {
    label: 'বাধ্যতামূলক (Non-Negotiable)',
    shortLabel: 'বাধ্যতামূলক',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    activeRing: 'ring-rose-500',
    cardBorder: 'hover:border-rose-300 border-rose-100',
    cardBg: 'bg-rose-50/20',
    desc: 'যাই ঘটুক না কেন, শেষ করতেই হবে (বাইরে গেলেও এসে করতে হবে)',
  },
  routine: {
    label: 'রুটিন কাজ (Routine Work)',
    shortLabel: 'রুটিন কাজ',
    badgeBg: 'bg-[#005B96]',
    badgeText: 'text-[#005B96]',
    badgeBorder: 'border-blue-200',
    activeRing: 'ring-blue-500',
    cardBorder: 'hover:border-blue-300 border-blue-100',
    cardBg: 'bg-blue-50/20',
    desc: 'দৈনন্দিন স্বাভাবিক অভ্যাস ও নিয়মিত কাজ',
  },
  less_important: {
    label: 'কম গুরুত্বপূর্ণ / ঐচ্ছিক (Flexible)',
    shortLabel: 'কম গুরুত্বপূর্ণ',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    activeRing: 'ring-amber-500',
    cardBorder: 'hover:border-amber-300 border-amber-100',
    cardBg: 'bg-amber-50/20',
    desc: 'হঠাৎ বাহিরে যেতে হলে বাদ দিলেও কোনো মানসিক চাপ নেই',
  },
};

// 1 + 4 Combination Starter Template
const IDEAL_1_AND_4_TEMPLATE: Omit<DailyRoutineItem, 'id'>[] = [
  {
    title: 'ঘুম থেকে ওঠা, ফজর/প্রার্থনা ও আধ্যাত্মিক সংযোগ',
    startTime: '05:30',
    endTime: '06:30',
    priority: 'mandatory',
    notes: 'দিনের ভিত্তিপ্রস্তর - কখনোই বাদ দেওয়া যাবে না',
    completed: false,
  },
  {
    title: 'হাঁটাহাঁটি/শরীরচর্চা ও স্বাস্থ্যকর প্রাতরাশ',
    startTime: '06:30',
    endTime: '07:30',
    priority: 'routine',
    notes: 'শরীর ও মনের সতেজতা বজায় রাখা',
    completed: false,
  },
  {
    title: 'কোর ফোকাস ডিপ ওয়ার্ক (দিনের 1 নম্বর প্রধান কাজ/স্টাডি)',
    startTime: '09:00',
    endTime: '12:30',
    priority: 'mandatory',
    notes: 'সবচেয়ে গুরুত্বপূর্ণ লক্ষ্য অর্জনের সময়',
    completed: false,
  },
  {
    title: 'নিয়মিত অফিস/ব্যবসা/অ্যাসাইনমেন্ট ও নিয়মিত কাজ',
    startTime: '13:30',
    endTime: '16:30',
    priority: 'routine',
    notes: 'দৈনন্দিন রুটিন দায়িত্বসমূহ',
    completed: false,
  },
  {
    title: 'আকস্মিক কাজ / বাহিরের কাজ ও বাফার টাইম',
    startTime: '16:30',
    endTime: '18:30',
    priority: 'less_important',
    notes: 'জরুরি দরকারে বাহিরে যাওয়া, বাজার বা কোনো কাজ না থাকলে বিশ্রাম',
    completed: false,
  },
  {
    title: 'পরিবারের সাথে সময় ও ব্যক্তিগত রিলাক্সেশন',
    startTime: '19:00',
    endTime: '20:30',
    priority: 'less_important',
    notes: 'মনকে শান্ত ও রিচার্জ করা',
    completed: false,
  },
  {
    title: 'রাতের খাবার ও সারাদিনের কাজের হিসাব-নিকাশ/পর্যালোচনা',
    startTime: '20:30',
    endTime: '21:30',
    priority: 'routine',
    notes: 'দিনের অগ্রগতি মিলিয়ে নেওয়া ও আগামীকালের প্রস্তুতি',
    completed: false,
  },
  {
    title: 'ডিজিটাল ডিভাইস বন্ধ ও পর্যাপ্ত ঘুম (7 ঘণ্টা)',
    startTime: '22:00',
    endTime: '05:00',
    priority: 'mandatory',
    notes: 'পরের দিনের জীবনীশক্তির জন্য বাধ্যতামূলক বিশ্রাম',
    completed: false,
  },
];

export const DailyRoutineView: React.FC<DailyRoutineViewProps> = ({
  dailyRoutine,
  onUpdateDailyRoutine,
}) => {
  // Current time tracker for active slot indicator
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter state: সব, বাধ্যতামূলক, কম গুরুত্বপূর্ণ, রুটিন কাজ, আজকের সম্পন্ন
  const [priorityFilter, setPriorityFilter] = useState<'all' | RoutinePriority | 'completed'>('all');

  // View Mode: 'blocks' (আইডিয়া 1 টাইম ব্লক) vs 'list' (সময় অনুযায়ী ক্রম)
  const [viewMode, setViewMode] = useState<'blocks' | 'list'>('blocks');

  // "Emergency Out / আকস্মিক বাহিরে আছি" Mode
  const [isEmergencyOutMode, setIsEmergencyOutMode] = useState(false);

  // New Slot Drawer State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('06:00');
  const [newEndTime, setNewEndTime] = useState('07:00');
  const [newPriority, setNewPriority] = useState<RoutinePriority>('routine');
  const [newNotes, setNewNotes] = useState('');

  // Editing state for an item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editPriority, setEditPriority] = useState<RoutinePriority>('routine');
  const [editNotes, setEditNotes] = useState('');

  // Title-only editing state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [inlineTitleText, setInlineTitleText] = useState('');

  // Delete confirmation warning state
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DailyRoutineItem | null>(null);

  // Drag and drop reorder states
  const [draggedRoutineIndex, setDraggedRoutineIndex] = useState<number | null>(null);
  const [dragOverRoutineIndex, setDragOverRoutineIndex] = useState<number | null>(null);

  const routineDragRef = useRef<{
    isDragging: boolean;
    fromIndex: number | null;
    toIndex: number | null;
  }>({
    isDragging: false,
    fromIndex: null,
    toIndex: null,
  });

  // Jump to specific position modal state
  const [reorderModal, setReorderModal] = useState<{
    item: DailyRoutineItem;
    currentIndex: number;
    totalCount: number;
  } | null>(null);
  const [targetPosInput, setTargetPosInput] = useState('');

  useDragAutoScroll(draggedRoutineIndex !== null);

  const handleDropRoutine = (targetIndex: number, sourceIndex?: number) => {
    const fromIndex = sourceIndex !== undefined ? sourceIndex : draggedRoutineIndex;
    if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) {
      setDraggedRoutineIndex(null);
      setDragOverRoutineIndex(null);
      return;
    }
    const reordered = reorderArray(dailyRoutine, fromIndex, targetIndex);
    onUpdateDailyRoutine(reordered);
    setDraggedRoutineIndex(null);
    setDragOverRoutineIndex(null);
    playTick();
  };

  const handleJumpPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderModal) return;
    const targetNum = parseInt(toEnDigits(targetPosInput.trim()), 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > reorderModal.totalCount) return;
    const targetIdx = targetNum - 1;
    if (reorderModal.currentIndex !== targetIdx) {
      const reordered = reorderArray(dailyRoutine, reorderModal.currentIndex, targetIdx);
      onUpdateDailyRoutine(reordered);
      playTick();
    }
    setReorderModal(null);
  };

  // Time Blocks customization state (টাইম ব্লক ও লেখা এডিট)
  const [timeBlocks, setTimeBlocks] = useState<Record<TimeBlockKey, TimeBlockDefinition>>(loadStoredBlocks);
  const [editingBlockKey, setEditingBlockKey] = useState<TimeBlockKey | null>(null);
  const [editBlockTitle, setEditBlockTitle] = useState('');
  const [editBlockSubtitle, setEditBlockSubtitle] = useState('');
  const [editBlockTimeRange, setEditBlockTimeRange] = useState('');
  const [editBlockStartTime, setEditBlockStartTime] = useState('');
  const [editBlockEndTime, setEditBlockEndTime] = useState('');

  const handleOpenEditBlock = (key: TimeBlockKey) => {
    const block = timeBlocks[key];
    setEditingBlockKey(key);
    setEditBlockTitle(block.title);
    setEditBlockSubtitle(block.subtitle);
    setEditBlockTimeRange(block.timeRange);
    setEditBlockStartTime(
      block.startTime ||
        (key === 'morning' ? '05:00' : key === 'core' ? '10:00' : key === 'buffer' ? '17:00' : '19:00')
    );
    setEditBlockEndTime(
      block.endTime ||
        (key === 'morning' ? '10:00' : key === 'core' ? '17:00' : key === 'buffer' ? '19:00' : '23:00')
    );
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlockKey) return;
    const updated: Record<TimeBlockKey, TimeBlockDefinition> = {
      ...timeBlocks,
      [editingBlockKey]: {
        ...timeBlocks[editingBlockKey],
        title: toEnDigits(editBlockTitle.trim()) || timeBlocks[editingBlockKey].title,
        subtitle: toEnDigits(editBlockSubtitle.trim()),
        timeRange: toEnDigits(editBlockTimeRange.trim()) || timeBlocks[editingBlockKey].timeRange,
        startTime: editBlockStartTime,
        endTime: editBlockEndTime,
      },
    };
    setTimeBlocks(updated);
    saveStoredBlocks(updated);
    setEditingBlockKey(null);
    playSuccessChime();
  };

  const handleResetBlockToDefault = (key: TimeBlockKey) => {
    const updated: Record<TimeBlockKey, TimeBlockDefinition> = {
      ...timeBlocks,
      [key]: { ...DEFAULT_TIME_BLOCKS[key] },
    };
    setTimeBlocks(updated);
    saveStoredBlocks(updated);
    setEditingBlockKey(null);
    playSuccessChime();
  };

  // Load 1 + 4 combination template
  const handleLoadTemplate = () => {
    const populated: DailyRoutineItem[] = IDEAL_1_AND_4_TEMPLATE.map((item, idx) => ({
      ...item,
      id: `routine-${Date.now()}-${idx}`,
    }));
    onUpdateDailyRoutine(populated);
    playSuccessChime();
  };

  // Save title-only edit
  const handleSaveTitleOnly = (id: string) => {
    if (!inlineTitleText.trim()) {
      setEditingTitleId(null);
      return;
    }
    const updated = dailyRoutine.map((item) =>
      item.id === id ? { ...item, title: toEnDigits(inlineTitleText.trim()) } : item
    );
    onUpdateDailyRoutine(updated);
    setEditingTitleId(null);
    playSuccessChime();
  };

  // Start editing a slot
  const startEdit = (item: DailyRoutineItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditStartTime(item.startTime);
    setEditEndTime(item.endTime);
    setEditPriority(item.priority);
    setEditNotes(item.notes || '');
  };

  // Save edited slot
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const updated = dailyRoutine.map((item) => {
      if (item.id === editingId) {
        return {
          ...item,
          title: editTitle.trim() || item.title,
          startTime: editStartTime || item.startTime,
          endTime: editEndTime || item.endTime,
          priority: editPriority,
          notes: editNotes.trim(),
        };
      }
      return item;
    });

    onUpdateDailyRoutine(updated);
    setEditingId(null);
    playSuccessChime();
  };

  // Quick switch priority option directly
  const handleQuickChangePriority = (id: string, newP: RoutinePriority) => {
    const updated = dailyRoutine.map((item) =>
      item.id === id ? { ...item, priority: newP } : item
    );
    onUpdateDailyRoutine(updated);
  };

  // Toggle completion
  const handleToggleCompleted = (id: string) => {
    const updated = dailyRoutine.map((item) => {
      if (item.id === id) {
        const next = !item.completed;
        if (next) playSuccessChime();
        return { ...item, completed: next };
      }
      return item;
    });
    onUpdateDailyRoutine(updated);
  };

  // Delete slot
  const handleDeleteSlot = (id: string) => {
    recordDeletedItemId(id);
    const updated = dailyRoutine.filter((item) => item.id !== id);
    onUpdateDailyRoutine(updated);
  };

  // Create new routine item
  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSlot: DailyRoutineItem = {
      id: `routine-${Date.now()}`,
      title: newTitle.trim(),
      startTime: newStartTime,
      endTime: newEndTime,
      priority: newPriority,
      notes: newNotes.trim(),
      completed: false,
    };

    // Append and sort
    const list = [...dailyRoutine, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime));
    onUpdateDailyRoutine(list);

    setNewTitle('');
    setNewNotes('');
    setIsAddingNew(false);
    playSuccessChime();
  };

  // Uncheck all items for a new day
  const handleUncheckAll = () => {
    const updated = dailyRoutine.map((item) => ({ ...item, completed: false }));
    onUpdateDailyRoutine(updated);
    playSuccessChime();
  };

  // Sort slots by start time
  const handleSortByTime = () => {
    const sorted = [...dailyRoutine].sort((a, b) => a.startTime.localeCompare(b.startTime));
    onUpdateDailyRoutine(sorted);
  };

  // Helper to determine if slot is active right now
  const isSlotActiveNow = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    const end = endTime === '00:00' ? '24:00' : endTime;
    return currentTimeStr >= startTime && currentTimeStr < end;
  };

  // Counts
  const totalCount = dailyRoutine.length;
  const mandatoryCount = dailyRoutine.filter((i) => i.priority === 'mandatory').length;
  const lessImportantCount = dailyRoutine.filter((i) => i.priority === 'less_important').length;
  const routineWorkCount = dailyRoutine.filter((i) => i.priority === 'routine').length;
  const completedCount = dailyRoutine.filter((i) => i.completed).length;

  // Filtered slots (if Emergency Out is on, it focuses strictly on mandatory tasks)
  const filteredRoutine = dailyRoutine.filter((item) => {
    if (isEmergencyOutMode) {
      return item.priority === 'mandatory';
    }
    if (priorityFilter === 'all') return true;
    if (priorityFilter === 'completed') return item.completed;
    return item.priority === priorityFilter;
  });

  // Render a routine card
  const renderRoutineCard = (item: DailyRoutineItem) => {
    const conf = PRIORITY_CONFIG[item.priority];
    const isActiveNow = isSlotActiveNow(item.startTime, item.endTime);
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <form
          key={item.id}
          onSubmit={handleSaveEdit}
          className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-[#005B96] shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#005B96] flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              <span>রুটিন কাজ সম্পাদনা করুন</span>
            </span>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">কাজের টাইটেল</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-bold text-[#1a2724] border border-[#e6e2da] rounded-xl focus:outline-none focus:border-[#005B96] bg-white"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#005B96]" />
                <span>শুরুর সময়</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <SimpleTimePicker
                  value={editStartTime}
                  onChange={(time) => setEditStartTime(time)}
                />
                <span className="text-xs text-[#005B96] font-bold">
                  {formatRoutineTimeBn(editStartTime)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#005B96]" />
                <span>শেষের সময়</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <SimpleTimePicker
                  value={editEndTime}
                  onChange={(time) => setEditEndTime(time)}
                />
                <span className="text-xs text-[#005B96] font-bold">
                  {formatRoutineTimeBn(editEndTime)}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Priority Options in Edit */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              অগ্রাধিকার অপশন পরিবর্তন:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['mandatory', 'routine', 'less_important'] as RoutinePriority[]).map((p) => {
                const pConf = PRIORITY_CONFIG[p];
                const isSel = editPriority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPriority(p)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
                      isSel
                        ? `${pConf.cardBg} ${pConf.cardBorder} ring-2 ${pConf.activeRing} text-gray-900`
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{pConf.label}</span>
                    {isSel && <Check className="w-3.5 h-3.5 text-[#005B96]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              নোট বা বিবরণ (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="অতিরিক্ত তথ্য..."
              className="w-full px-3 py-1.5 text-xs text-gray-800 border border-[#e6e2da] rounded-xl focus:outline-none focus:border-[#005B96] bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              আপডেট সংরক্ষণ
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              বাতিল
            </button>
          </div>
        </form>
      );
    }

    const routineIdx = dailyRoutine.findIndex((r) => r.id === item.id);
    const isRoutineDragged = draggedRoutineIndex === routineIdx;
    const isRoutineDragOver = dragOverRoutineIndex === routineIdx && draggedRoutineIndex !== null && draggedRoutineIndex !== routineIdx;

    return (
      <div
        key={item.id}
        data-drag-item="true"
        data-drag-id={item.id}
        data-drag-index={routineIdx}
        className="relative"
      >
        {/* Floating position indicator badge without shifting layout */}
        {isRoutineDragOver && (
          <div className="absolute -top-3 left-4 bg-[#005B96] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md z-20 flex items-center gap-1.5 border border-amber-300 pointer-events-none animate-in fade-in">
            <MapPin className="w-3.5 h-3.5 text-amber-300" />
            <span>ড্রপ করলে #{formatBnNumber(routineIdx + 1)} ({routineIdx + 1}) পজিশনে আসবে</span>
          </div>
        )}

        <div
          onDragOver={(e) => {
            if (draggedRoutineIndex !== null) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              routineDragRef.current.toIndex = routineIdx;
              if (dragOverRoutineIndex !== routineIdx) setDragOverRoutineIndex(routineIdx);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dt = e.dataTransfer.getData('text/plain');
            const parsed = dt !== '' ? parseInt(dt, 10) : null;
            const from = (parsed !== null && !isNaN(parsed)) ? parsed : (routineDragRef.current.fromIndex ?? draggedRoutineIndex);
            if (from !== null && from !== undefined && from !== routineIdx) {
              handleDropRoutine(routineIdx, from);
            }
          }}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
            item.completed
              ? 'bg-[#faf8f5] border-[#e8e4dc] opacity-70'
              : `${conf.cardBg} ${conf.cardBorder} bg-white shadow-2xs`
          } ${isActiveNow ? 'ring-2 ring-[#005B96] border-[#005B96]' : ''} ${
            isRoutineDragOver ? 'border-[#005B96] ring-2 ring-[#005B96] shadow-md bg-blue-50/20 scale-[1.005]' : ''
          } ${isRoutineDragged ? 'opacity-35 scale-[0.99] border-dashed border-[#005B96]' : ''}`}
        >
          {/* Left: Notion Drag Handle + Checkbox + Time Badge + Title */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Controls & Time Badge */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Notion Drag Handle */}
              <div
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(routineIdx));
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedRoutineIndex(routineIdx);
                  routineDragRef.current = { isDragging: true, fromIndex: routineIdx, toIndex: routineIdx };
                }}
                onDragEnd={() => {
                  setDraggedRoutineIndex(null);
                  setDragOverRoutineIndex(null);
                  routineDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                }}
                onTouchStart={() => {
                  routineDragRef.current = { isDragging: true, fromIndex: routineIdx, toIndex: routineIdx };
                  setDraggedRoutineIndex(routineIdx);
                }}
                onTouchMove={(e) => {
                  if (e.touches && e.touches[0]) {
                    const target = getTouchDragTarget(e.touches[0]);
                    if (target.index !== null) {
                      routineDragRef.current.toIndex = target.index;
                      if (target.index !== routineIdx) {
                        setDragOverRoutineIndex(target.index);
                      }
                    }
                  }
                }}
                onTouchEnd={() => {
                  const from = routineDragRef.current.fromIndex ?? routineIdx;
                  const to = routineDragRef.current.toIndex ?? dragOverRoutineIndex;
                  if (to !== null && to !== from) {
                    handleDropRoutine(to, from);
                  } else {
                    setDraggedRoutineIndex(null);
                    setDragOverRoutineIndex(null);
                  }
                  routineDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                }}
                onTouchCancel={() => {
                  routineDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                  setDraggedRoutineIndex(null);
                  setDragOverRoutineIndex(null);
                }}
                className="p-1.5 -ml-1 text-gray-400 hover:text-[#005B96] hover:bg-black/5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none select-none"
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
                    item,
                    currentIndex: routineIdx,
                    totalCount: dailyRoutine.length,
                  });
                  setTargetPosInput(String(routineIdx + 1));
                }}
                className="px-2 py-0.5 rounded-lg bg-[#005B96]/10 hover:bg-[#005B96]/20 text-[#005B96] font-mono font-black text-xs shrink-0 border border-[#005B96]/20 cursor-pointer transition-all hover:scale-105"
                title={`পজিশন #${formatBnNumber(routineIdx + 1)} (ক্লিক করে যেকোনো নম্বরে সরান)`}
              >
                #{formatBnNumber(routineIdx + 1)}
              </button>

              {/* Checkbox */}
              <button
                type="button"
                onClick={() => handleToggleCompleted(item.id)}
                className="p-1 text-[#005B96] hover:text-[#004877] cursor-pointer shrink-0"
                title={item.completed ? 'অসম্পূর্ণ হিসেবে চিহ্নিত করুন' : 'সম্পন্ন চিহ্নিত করুন'}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 hover:text-[#005B96]" />
                )}
              </button>

              {/* Time Badge (বাংলা সময়) */}
              <div className="shrink-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white border-2 border-[#005B96]/30 hover:border-[#005B96] text-[#005B96] font-bold text-xs sm:text-[13px] shadow-xs transition-colors">
                  <Clock className="w-3.5 h-3.5 text-[#005B96] shrink-0" />
                  <span className="tracking-tight font-mono">
                    {formatRoutineRangeBn(item.startTime, item.endTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Title & Active Status (মোবাইলে সময় ব্যাজের নিচের লাইনে ফাঁকা জায়গায় সুন্দরভাবে আসবে) */}
            <div className="min-w-0 flex-1 pl-1 sm:pl-0">
            {editingTitleId === item.id ? (
              <div className="flex items-center gap-1.5 flex-1 max-w-md my-0.5 animate-in fade-in duration-100">
                <input
                  type="text"
                  value={inlineTitleText}
                  onChange={(e) => setInlineTitleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitleOnly(item.id);
                    if (e.key === 'Escape') setEditingTitleId(null);
                  }}
                  autoFocus
                  placeholder="কাজের টাইটেল লিখুন..."
                  className="px-3 py-1 text-xs sm:text-sm font-bold text-[#1a2724] border-2 border-[#005B96] rounded-xl bg-white shadow-xs focus:outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => handleSaveTitleOnly(item.id)}
                  className="px-2.5 py-1 bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="টাইটেল সংরক্ষণ করুন"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>সংরক্ষণ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTitleId(null)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                  title="বাতিল"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h4
                  className={`text-sm font-bold transition-colors break-words leading-snug ${
                    item.completed ? 'line-through text-gray-500' : 'text-[#1a2724]'
                  }`}
                >
                  {toEnDigits(item.title)}
                </h4>

                {isActiveNow && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>এখন চলছে</span>
                  </span>
                )}
              </div>
            )}

            {item.notes && (
              <p className="text-[11px] text-[#6d7e79] mt-0.5 break-words">{item.notes}</p>
            )}
          </div>
        </div>

        {/* Right: Selected Priority Badge + Edit/Delete Actions */}
        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#eeeae2]">
          {/* Selected Priority Badge */}
          <button
            type="button"
            onClick={() => {
              const cycleMap: Record<RoutinePriority, RoutinePriority> = {
                routine: 'mandatory',
                mandatory: 'less_important',
                less_important: 'routine',
              };
              handleQuickChangePriority(item.id, cycleMap[item.priority]);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${conf.badgeBg} text-white hover:opacity-95 active:scale-95 flex items-center gap-1`}
            title="সিলেক্টেড অপশন (ক্লিক করে পরিবর্তন করতে পারেন)"
          >
            <span>{conf.shortLabel}</span>
          </button>

          {/* Edit & Delete Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (editingTitleId === item.id) {
                  setEditingTitleId(null);
                } else {
                  setEditingTitleId(item.id);
                  setInlineTitleText(toEnDigits(item.title));
                }
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                editingTitleId === item.id
                  ? 'bg-[#005B96] text-white border-[#005B96]'
                  : 'border-[#e2ddd5] bg-white hover:bg-blue-50 text-[#005B96]'
              }`}
              title="টাইটেল এডিট করুন"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => startEdit(item)}
              className="p-1.5 rounded-lg border border-[#e2ddd5] bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="বিস্তারিত সময় ও নোট এডিট"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setDeleteConfirmItem(item)}
              className="p-1.5 rounded-lg border border-[#e2ddd5] bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
              title="মুছে ফেলুন"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in pb-16">
      {/* Top Banner with 1 & 4 Framework Highlights */}
      <div className="bg-gradient-to-r from-[#003d66] via-[#005B96] to-[#007cb3] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-md border border-[#005B96]/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 text-white backdrop-blur-xs">
                <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#F0E68C]" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  ডেইলি রুটিন (সকাল থেকে রাত পর্যন্ত কমপ্লিট শিডিউল)
                </h1>
                <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                  বাধ্যতামূলক, কম গুরুত্বপূর্ণ ও রুটিন কাজের সমন্বয়ে গঠিত বাস্তবসম্মত দৈনিক পরিকল্পনা।
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Emergency Out Toggle Button */}
            <button
              onClick={() => setIsEmergencyOutMode(!isEmergencyOutMode)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 border ${
                isEmergencyOutMode
                  ? 'bg-amber-400 text-slate-900 border-amber-300 ring-2 ring-white font-black'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
              }`}
              title="জরুরি কাজে বাহিরে যাওয়ার জন্য ফ্লেক্সিবল মোড"
            >
              <Car className="w-4 h-4" />
              <span>
                {isEmergencyOutMode ? '🏡 ফিরে এসেছি (সাধারণ মোড)' : '🚗 আকস্মিক বাহিরে আছি'}
              </span>
            </button>

            <button
              onClick={() => setIsAddingNew(true)}
              className="px-3.5 py-2 rounded-xl bg-[#FF8C00] hover:bg-[#e07b00] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ নতুন রুটিন স্লট</span>
            </button>

            <button
              onClick={handleUncheckAll}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer border border-white/20 whitespace-nowrap"
              title="নতুন দিনের জন্য সমস্ত কাজ আনচেক করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>রিসেট চেকমার্ক</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Out Active Banner */}
      {isEmergencyOutMode && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-900 flex items-center gap-2">
                  <span>জরুরি দরকারে বাহিরে আছেন? কোনো মানসিক চাপ নেবেন না!</span>
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  পরিস্থিতির কারণে রুটিন বিঘ্নিত হওয়া স্বাভাবিক। এখন কেবল আপনার{' '}
                  <span className="font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                    বাধ্যতামূলক ({formatBnNumber(mandatoryCount)}টি)
                  </span>{' '}
                  কাজে নজর দিন। বাকি{' '}
                  <span className="font-bold text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded">
                    কম গুরুত্বপূর্ণ ({formatBnNumber(lessImportantCount)}টি)
                  </span>{' '}
                  কাজ আজ বাদ দিলেও কোনো সমস্যা নেই। কাজ শেষে বাড়ি ফিরে "ফিরে এসেছি" বাটনে ক্লিক করুন।
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEmergencyOutMode(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              🏡 সাধারণ রুটিনে ফিরুন
            </button>
          </div>
        </div>
      )}

      {/* Filter, View Switcher and Sorting Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#e6e2da] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* 4 Essential Function Filter Buttons (বাধ্যতামূলক, কম গুরুত্বপূর্ণ, রুটিন কাজ, আজকের সম্পন্ন) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#55697a] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#005B96]" />
              <span>ফিল্টার:</span>
            </span>

            <button
              onClick={() => {
                setPriorityFilter('all');
                setIsEmergencyOutMode(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                priorityFilter === 'all' && !isEmergencyOutMode
                  ? 'bg-[#005B96] text-white shadow-xs'
                  : 'text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              সব রুটিন ({formatBnNumber(totalCount)})
            </button>

            <button
              onClick={() => {
                setPriorityFilter('mandatory');
                setIsEmergencyOutMode(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                priorityFilter === 'mandatory' || isEmergencyOutMode
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              বাধ্যতামূলক ({formatBnNumber(mandatoryCount)})
            </button>

            <button
              onClick={() => {
                setPriorityFilter('routine');
                setIsEmergencyOutMode(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                priorityFilter === 'routine' && !isEmergencyOutMode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              রুটিন কাজ ({formatBnNumber(routineWorkCount)})
            </button>

            <button
              onClick={() => {
                setPriorityFilter('less_important');
                setIsEmergencyOutMode(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                priorityFilter === 'less_important' && !isEmergencyOutMode
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 bg-amber-50/70 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              কম গুরুত্বপূর্ণ ({formatBnNumber(lessImportantCount)})
            </button>

            <button
              onClick={() => {
                setPriorityFilter('completed');
                setIsEmergencyOutMode(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                priorityFilter === 'completed' && !isEmergencyOutMode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>আজকের সম্পন্ন ({formatBnNumber(completedCount)})</span>
            </button>
          </div>

          {/* View Mode & Sort Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Blocks vs List Mode Toggle */}
            <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode('blocks')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'blocks'
                    ? 'bg-white text-[#005B96] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="টাইম ব্লক অনুসারে 4 ভাগে দেখুন"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>টাইম ব্লক</span>
              </button>

              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#005B96] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="সময়ের সাধারণ ক্রমিক তালিকা দেখুন"
              >
                <List className="w-3.5 h-3.5" />
                <span>তালিকা</span>
              </button>
            </div>

            <button
              onClick={handleSortByTime}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#55697a] hover:text-[#005B96] hover:bg-blue-50 border border-[#e6e2da] transition-all flex items-center gap-1 cursor-pointer"
              title="সময় অনুযায়ী ক্রমানুসারে সাজান"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>সময় সাজান</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add New Routine Drawer/Form */}
      {isAddingNew && (
        <form
          onSubmit={handleCreateSlot}
          className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-[#005B96]/30 shadow-md space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
            <h3 className="text-sm sm:text-base font-extrabold text-[#005B96] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#FF8C00]" />
              <span>নতুন রুটিন কাজ যোগ করুন</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1a2724] mb-1">
              কাজের নাম / বিষয় <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="যেমন: সকালে কোর ফোকাস স্টাডি অথবা অপ্রত্যাশিত বাহিরের কাজ"
              className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
              autoFocus
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1a2724] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#005B96]" />
                <span>শুরুর সময় (Start Time)</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <SimpleTimePicker
                  value={newStartTime}
                  onChange={(time) => setNewStartTime(time)}
                />
                <span className="text-xs text-[#005B96] font-bold">
                  {formatRoutineTimeBn(newStartTime)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1a2724] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#005B96]" />
                <span>শেষের সময় (End Time)</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <SimpleTimePicker
                  value={newEndTime}
                  onChange={(time) => setNewEndTime(time)}
                />
                <span className="text-xs text-[#005B96] font-bold">
                  {formatRoutineTimeBn(newEndTime)}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Priority Options Selection */}
          <div>
            <label className="block text-xs font-bold text-[#1a2724] mb-2">
              কাজের অগ্রাধিকার ক্যাটাগরি (নন-নেগোশিয়েবল বনাম অপশনাল):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['mandatory', 'routine', 'less_important'] as RoutinePriority[]).map((p) => {
                const conf = PRIORITY_CONFIG[p];
                const isSelected = newPriority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between gap-1 cursor-pointer ${
                      isSelected
                        ? `${conf.cardBg} ${conf.cardBorder} ring-2 ${conf.activeRing} text-[#1a2724]`
                        : 'bg-white border-[#e6e2da] text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{conf.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#005B96]" />}
                    </div>
                    <span className="text-[10px] font-normal text-gray-500 line-clamp-1">
                      {conf.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-bold text-[#1a2724] mb-1">
              নোট বা বিস্তারিত (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="প্রয়োজনীয় নির্দেশনা বা স্থান..."
              className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              সংরক্ষণ করুন
            </button>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              বাতিল
            </button>
          </div>
        </form>
      )}

      {/* Routine Content: MODE 1 - Phase Blocks (আইডিয়া 1) */}
      {viewMode === 'blocks' && (
        <div className="space-y-5">
          {(['morning', 'core', 'buffer', 'evening'] as TimeBlockKey[]).map((blockKey) => {
            const blockDef = timeBlocks[blockKey];
            const IconComp = blockDef.icon;
            const blockItems = filteredRoutine.filter(
              (item) => getBlockForTime(item.startTime, timeBlocks) === blockKey
            );

            return (
              <div
                key={blockKey}
                className="group bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs space-y-3"
              >
                {/* Block Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eeeae2] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl ${blockDef.badgeBg} border ${blockDef.badgeBorder} flex items-center justify-center ${blockDef.colorClass} shrink-0`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-[#1a2724]">
                          {blockDef.title}
                        </h3>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                          {blockDef.timeRange}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{blockDef.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEditBlock(blockKey)}
                      className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus:opacity-100 focus:pointer-events-auto transition-opacity duration-150 inline-flex items-center gap-1 text-[11px] font-bold text-[#005B96] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer shadow-2xs"
                      title="টাইম ও লেখা এডিট করুন"
                    >
                      <Pencil className="w-3 h-3 text-[#005B96]" />
                      <span>এডিট করুন</span>
                    </button>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-mono">
                      {formatBnNumber(blockItems.length)}টি কাজ
                    </span>
                  </div>
                </div>

                {/* Block Items */}
                {blockItems.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-400 italic">
                    এই ব্লকে কোনো কাজ নির্ধারিত নেই।
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {blockItems.map((item) => renderRoutineCard(item))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Routine Content: MODE 2 - Simple Chronological List */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredRoutine.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-[#d8e3df] p-6 space-y-3">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-1" />
              <p className="text-sm font-bold text-gray-700">কোনো রুটিন কাজ পাওয়া যায়নি</p>
              <p className="text-xs text-gray-500">
                উপরের ফিল্টার পরিবর্তন করুন অথবা নতুন রুটিন স্লট যোগ করুন।
              </p>
            </div>
          ) : (
            filteredRoutine.map((item) => renderRoutineCard(item))
          )}
        </div>
      )}

      {/* Edit Time Block Modal (টাইম ব্লক ও লেখা এডিট) */}
      {editingBlockKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-[#005B96]/30 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-[#005B96]">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#005B96]">
                    ব্লকের টাইম ও লেখা এডিট করুন
                  </h3>
                  <p className="text-xs text-gray-500">
                    ব্লকের নাম, সময়সীমা এবং বিবরণী আপনার পছন্দমতো পরিবর্তন করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBlockKey(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-3.5">
              {/* Block Title */}
              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">
                  ব্লকের নাম / শিরোনাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editBlockTitle}
                  onChange={(e) => setEditBlockTitle(e.target.value)}
                  placeholder="যেমন: ফ্লেক্সিবল ও বাফার ব্লক (Buffer & Outing)"
                  className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs sm:text-sm font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                  required
                />
              </div>

              {/* Time Range and Start/End Time Selectors */}
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2.5">
                <label className="block text-xs font-bold text-[#005B96]">
                  সময় ও টাইম রেঞ্জ নির্ধারণ
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-gray-600 mb-1 font-semibold">শুরুর সময়:</span>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-lg border border-[#e6e2da]">
                      <Clock className="w-3.5 h-3.5 text-[#005B96] shrink-0" />
                      <input
                        type="time"
                        value={editBlockStartTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditBlockStartTime(val);
                          if (val && editBlockEndTime) {
                            setEditBlockTimeRange(formatRoutineRangeBn(val, editBlockEndTime));
                          }
                        }}
                        className="w-full text-xs font-mono font-bold text-gray-800 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-600 mb-1 font-semibold">শেষের সময়:</span>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-lg border border-[#e6e2da]">
                      <Clock className="w-3.5 h-3.5 text-[#005B96] shrink-0" />
                      <input
                        type="time"
                        value={editBlockEndTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditBlockEndTime(val);
                          if (editBlockStartTime && val) {
                            setEditBlockTimeRange(formatRoutineRangeBn(editBlockStartTime, val));
                          }
                        }}
                        className="w-full text-xs font-mono font-bold text-gray-800 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-600 font-semibold">প্রদর্শিত টাইম রেঞ্জ লেখা:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (editBlockStartTime && editBlockEndTime) {
                          setEditBlockTimeRange(formatRoutineRangeBn(editBlockStartTime, editBlockEndTime));
                        }
                      }}
                      className="text-[10px] text-[#005B96] hover:underline cursor-pointer font-bold"
                    >
                      অটো জেনারেট করুন
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editBlockTimeRange}
                    onChange={(e) => setEditBlockTimeRange(toEnDigits(e.target.value))}
                    placeholder="যেমন: বিকাল 05:00 — সন্ধ্যা 07:00"
                    className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-mono font-bold text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                    required
                  />
                </div>
              </div>

              {/* Subtitle / Description */}
              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">
                  ব্লকের বিবরণী / কাজের বিস্তারিত
                </label>
                <textarea
                  value={editBlockSubtitle}
                  onChange={(e) => setEditBlockSubtitle(e.target.value)}
                  rows={2}
                  placeholder="যেমন: আকস্মিক বাহিরে যাওয়া, জরুরি কাজ, বাজার বা অপ্রত্যাশিত সময়ের জন্য ফাঁকা বাফার"
                  className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#eeeae2]">
                <button
                  type="button"
                  onClick={() => handleResetBlockToDefault(editingBlockKey)}
                  className="text-xs text-rose-600 hover:text-rose-800 hover:underline cursor-pointer font-semibold"
                >
                  ডিফল্টে রিসেট করুন
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBlockKey(null)}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>সংরক্ষণ করুন</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Warning Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  রুটিন স্লট মুছে ফেলতে চান?
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-bold text-gray-800">"{deleteConfirmItem.title}"</span> (
                  {formatRoutineRangeBn(deleteConfirmItem.startTime, deleteConfirmItem.endTime)})
                </p>
              </div>
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-xs text-rose-900 font-medium">
              আপনি কি নিশ্চিতভাবে এই রুটিন কাজটি মুছে ফেলতে চান?
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                না
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = deleteConfirmItem.id;
                  setDeleteConfirmItem(null);
                  handleDeleteSlot(id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>হ্যাঁ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Drag Indicator */}
      <DragPositionIndicator
        isDragging={draggedRoutineIndex !== null}
        fromIndex={draggedRoutineIndex}
        toIndex={dragOverRoutineIndex}
        itemTitle={draggedRoutineIndex !== null ? dailyRoutine[draggedRoutineIndex]?.title : undefined}
        totalCount={dailyRoutine.length}
      />

      {/* Jump to specific position modal */}
      {reorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-[#005B96]" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  রুটিনের পজিশন পরিবর্তন
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
                  &ldquo;{reorderModal.item.title}&rdquo;
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
