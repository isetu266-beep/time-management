import { AppData, DailyRoutineItem } from '../types';

export const STORAGE_KEY = 'timecraft_app_data_v5_fresh';

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayStr(): string {
  return formatLocalDate(new Date());
}

export function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

export function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

export function formatBnDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const cleanStr = toEnDigits(dateStr);
    const parts = cleanStr.split('-').map(Number);
    let d: Date;
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(cleanStr);
    }
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    return toEnDigits(`${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`);
  } catch (e) {
    return toEnDigits(dateStr);
  }
}

export function toEnDigits(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return '';
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return String(str).replace(/[০-৯]/g, (w) => bnToEn[w] || w);
}

export function formatBnNumber(num: number | string): string {
  return toEnDigits(num);
}

export function getDefaultDailyRoutine(): DailyRoutineItem[] {
  return [];
}

export const initialData: AppData = {
  tasks: [],
  habits: [],
  roadmaps: [],
  activeRoadmapId: '',
  timeEntries: [],
  monthlyGoals: [],
  yearlyVision: {
    year: 2026,
    theme: 'লক্ষ্য অর্জন করা',
    coreVision: 'প্রতিটি দিনকে অর্থপূর্ণ ও লক্ষ্যমুখী করে তোলা এবং অভ্যাসের মাধ্যমে নিজের সেরা সংস্করণে পৌঁছানো।',
    quarterGoals: {
      q1: [],
      q2: [],
      q3: [],
      q4: []
    }
  },
  checklists: [],
  activeChecklistId: '',
  dailyRoutine: [],
  notes: []
};

export function loadStoredData(): AppData {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // If v5 is empty, check previous keys (timecraft_app_data_v4_clean)
    if (!raw) {
      raw = localStorage.getItem('timecraft_app_data_v4_clean');
    }
    if (!raw) return initialData;

    const parsed = JSON.parse(raw);
    const result: AppData = { ...initialData, ...parsed };

    // Ensure array types
    if (!Array.isArray(result.tasks)) {
      result.tasks = [];
    } else {
      result.tasks = result.tasks.map((t) => ({
        ...t,
        title: toEnDigits(t.title),
        date: toEnDigits(t.date),
        time: toEnDigits(t.time),
      }));
    }

    if (!Array.isArray(result.habits)) {
      result.habits = [];
    } else {
      result.habits = result.habits.map((h) => ({
        ...h,
        title: toEnDigits(h.title),
      }));
    }

    if (!Array.isArray(result.roadmaps)) result.roadmaps = [];
    if (!Array.isArray(result.timeEntries)) result.timeEntries = [];
    if (!Array.isArray(result.monthlyGoals)) result.monthlyGoals = [];

    if (!Array.isArray(result.checklists)) {
      result.checklists = [];
    } else {
      result.checklists = result.checklists.map((c) => ({
        ...c,
        title: toEnDigits(c.title),
        date: toEnDigits(c.date),
        items: Array.isArray(c.items)
          ? c.items.map((it) => ({
              ...it,
              text: toEnDigits(it.text),
            }))
          : [],
      }));
    }

    // Clean out any legacy demo yearly vision
    if (
      result.yearlyVision &&
      result.yearlyVision.theme === 'আত্মউন্নয়ন, আর্থিক শৃঙ্খলা ও চূড়ান্ত সাফল্যের বছর'
    ) {
      result.yearlyVision = {
        year: new Date().getFullYear(),
        theme: '',
        coreVision: '',
        quarterGoals: { q1: [], q2: [], q3: [], q4: [] }
      };
    }

    // Clean out any legacy demo daily routine slots (dr-1 through dr-18 only) and deleted items
    if (Array.isArray(result.dailyRoutine)) {
      result.dailyRoutine = result.dailyRoutine
        .filter((item) => !/^dr-\d{1,2}$/.test(item.id || '') && !isItemDeleted(item.id))
        .map((item) => ({
          ...item,
          title: toEnDigits(item.title),
          notes: item.notes ? toEnDigits(item.notes) : '',
        }));
    } else {
      result.dailyRoutine = [];
    }

    if (Array.isArray(result.tasks)) {
      result.tasks = result.tasks.filter((t) => !isItemDeleted(t.id));
    } else {
      result.tasks = [];
    }

    if (Array.isArray(result.habits)) {
      result.habits = result.habits.filter((h) => !isItemDeleted(h.id));
    } else {
      result.habits = [];
    }

    if (Array.isArray(result.notes)) {
      result.notes = result.notes.filter((n) => !isItemDeleted(n.id));
    } else {
      result.notes = [];
    }

    if (Array.isArray(result.checklists)) {
      result.checklists = result.checklists.filter((c) => !isItemDeleted(c.id));
    } else {
      result.checklists = [];
    }

    if (Array.isArray(result.timeEntries)) {
      result.timeEntries = result.timeEntries.filter((te) => !isItemDeleted(te.id));
    } else {
      result.timeEntries = [];
    }

    return result;
  } catch (e) {
    return initialData;
  }
}

export const DELETED_IDS_KEY = 'timecraft_deleted_ids_v1';

let memoryDeletedIds: Set<string> | null = null;

export function getDeletedItemIds(): Set<string> {
  if (memoryDeletedIds) return memoryDeletedIds;
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        memoryDeletedIds = new Set(arr);
        return memoryDeletedIds;
      }
    }
  } catch (e) {
    console.warn('Failed to parse deleted IDs from localStorage', e);
  }
  memoryDeletedIds = new Set<string>();
  return memoryDeletedIds;
}

export function recordDeletedItemIds(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  const current = getDeletedItemIds();
  let changed = false;
  ids.forEach((id) => {
    if (id && !current.has(id)) {
      current.add(id);
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Failed to save deleted IDs to localStorage', e);
    }
  }
}

export function recordDeletedItemId(id: string): void {
  if (id) recordDeletedItemIds([id]);
}

export function mergeDeletedItemIds(remoteIds: string[]): void {
  if (Array.isArray(remoteIds) && remoteIds.length > 0) {
    recordDeletedItemIds(remoteIds);
  }
}

export function isItemDeleted(id: string): boolean {
  if (!id) return false;
  return getDeletedItemIds().has(id);
}

export function saveStoredData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}
