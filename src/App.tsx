import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadStoredData,
  saveStoredData,
  getTodayStr,
  getTomorrowStr,
  getDeletedItemIds,
  recordDeletedItemId,
  recordDeletedItemIds,
  isItemDeleted,
} from './utils/storage';
import { AppData, Task, Habit, Roadmap, TimeEntry, MonthlyGoal, YearlyVision, Milestone } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DailyPlannerView } from './components/DailyPlannerView';
import { TimeAnalysisView } from './components/TimeAnalysisView';
import { HabitsView } from './components/HabitsView';
import { MonthlyPlannerView } from './components/MonthlyPlannerView';
import { YearlyPlannerView } from './components/YearlyPlannerView';
import { ReportsView } from './components/ReportsView';
import { ChecklistView } from './components/ChecklistView';
import { DailyRoutineView } from './components/DailyRoutineView';
import { NotesView } from './components/NotesView';
import { TaskModal } from './components/TaskModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { RemindersModal } from './components/RemindersModal';
import { playAlertChime, playSuccessChime } from './utils/audio';
import { fireConfetti } from './utils/confetti';
import { ChecklistGroup, ChecklistItem, DailyRoutineItem, NoteItem } from './types';
import {
  saveUserDataToCloud,
  loadUserDataFromCloud,
  subscribeToUserData,
  signOutUser,
} from './lib/firebase';

// Smart Data Merge function to ensure zero data loss on reconnect/reinstall/sync while respecting manual deletions
export function mergeAppData(cloud: Partial<AppData>, local: AppData): AppData {
  const deletedIds = getDeletedItemIds();

  const notDeleted = <T extends { id: string }>(item: T | null | undefined): boolean => {
    return Boolean(item && item.id && !deletedIds.has(item.id) && !isItemDeleted(item.id));
  };

  const cloudTasks = (cloud.tasks || []).filter(notDeleted);
  const cloudHabits = (cloud.habits || []).filter(notDeleted);
  const cloudRoutines = (cloud.dailyRoutine || []).filter(notDeleted);
  const cloudNotes = (cloud.notes || []).filter(notDeleted);
  const cloudChecklists = (cloud.checklists || []).filter(notDeleted);
  const cloudRoadmaps = (cloud.roadmaps || []).filter(notDeleted);
  const cloudTimeEntries = (cloud.timeEntries || []).filter(notDeleted);
  const cloudMonthlyGoals = (cloud.monthlyGoals || []).filter(notDeleted);

  const localTasks = (local.tasks || []).filter(notDeleted);
  const localHabits = (local.habits || []).filter(notDeleted);
  const localRoutines = (local.dailyRoutine || []).filter(notDeleted);
  const localNotes = (local.notes || []).filter(notDeleted);
  const localChecklists = (local.checklists || []).filter(notDeleted);
  const localRoadmaps = (local.roadmaps || []).filter(notDeleted);
  const localTimeEntries = (local.timeEntries || []).filter(notDeleted);
  const localMonthlyGoals = (local.monthlyGoals || []).filter(notDeleted);

  const localHasContent =
    localTasks.length > 0 ||
    localHabits.length > 0 ||
    localRoutines.length > 0 ||
    localNotes.length > 0 ||
    localChecklists.length > 0;

  // If local has no user data (fresh install / crash recovery), return cloud data directly
  if (!localHasContent) {
    return {
      tasks: cloudTasks,
      habits: cloudHabits,
      roadmaps: cloudRoadmaps,
      activeRoadmapId: cloud.activeRoadmapId || (cloudRoadmaps[0] ? cloudRoadmaps[0].id : ''),
      timeEntries: cloudTimeEntries,
      monthlyGoals: cloudMonthlyGoals,
      yearlyVision: cloud.yearlyVision || local.yearlyVision,
      checklists: cloudChecklists,
      activeChecklistId: cloud.activeChecklistId || (cloudChecklists[0] ? cloudChecklists[0].id : ''),
      dailyRoutine: cloudRoutines,
      notes: cloudNotes,
    };
  }

  // Merge tasks by id without duplicating
  const taskMap = new Map<string, Task>();
  cloudTasks.forEach((t) => taskMap.set(t.id, t));
  localTasks.forEach((t) => taskMap.set(t.id, t));

  // Merge habits by id
  const habitMap = new Map<string, Habit>();
  cloudHabits.forEach((h) => habitMap.set(h.id, h));
  localHabits.forEach((h) => habitMap.set(h.id, h));

  // Merge checklists by id
  const checklistMap = new Map<string, ChecklistGroup>();
  cloudChecklists.forEach((c) => checklistMap.set(c.id, c));
  localChecklists.forEach((c) => checklistMap.set(c.id, c));

  // Merge notes by id
  const noteMap = new Map<string, NoteItem>();
  cloudNotes.forEach((n) => noteMap.set(n.id, n));
  localNotes.forEach((n) => noteMap.set(n.id, n));

  // Merge roadmaps by id
  const roadmapMap = new Map<string, Roadmap>();
  cloudRoadmaps.forEach((r) => roadmapMap.set(r.id, r));
  localRoadmaps.forEach((r) => roadmapMap.set(r.id, r));

  // Merge daily routines by id (deleted slots are already filtered out via notDeleted)
  const routineMap = new Map<string, DailyRoutineItem>();
  cloudRoutines.forEach((r) => routineMap.set(r.id, r));
  localRoutines.forEach((r) => routineMap.set(r.id, r));
  const finalDailyRoutine = Array.from(routineMap.values());

  return {
    ...cloud,
    tasks: Array.from(taskMap.values()),
    habits: Array.from(habitMap.values()),
    checklists: Array.from(checklistMap.values()),
    notes: Array.from(noteMap.values()),
    roadmaps: Array.from(roadmapMap.values()),
    activeRoadmapId:
      local.activeRoadmapId ||
      cloud.activeRoadmapId ||
      (roadmapMap.size > 0 ? Array.from(roadmapMap.keys())[0] : ''),
    activeChecklistId: local.activeChecklistId || cloud.activeChecklistId,
    dailyRoutine: finalDailyRoutine,
    timeEntries: [...cloudTimeEntries, ...localTimeEntries].filter(
      (entry, index, self) => index === self.findIndex((e) => e.id === entry.id)
    ),
    monthlyGoals: [...cloudMonthlyGoals, ...localMonthlyGoals].filter(
      (g, index, self) => index === self.findIndex((item) => item.id === g.id)
    ),
    yearlyVision:
      cloud.yearlyVision?.coreVision || cloud.yearlyVision?.theme
        ? cloud.yearlyVision
        : local.yearlyVision,
  };
}

export const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => loadStoredData());
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Gmail Cloud Sync State
  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('timecraft_user_gmail') || '';
    } catch {
      return '';
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDefaultDate, setTaskDefaultDate] = useState(getTodayStr());

  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [dailyPlannerMode, setDailyPlannerMode] = useState<'day' | 'upcoming'>('day');

  // Timestamp of the user's latest local action to prevent stale remote overwrites
  const lastLocalActionTimeRef = useRef<number>(0);

  // Auto-save on data change: LocalStorage + Debounced Firebase Cloud Sync
  useEffect(() => {
    // 1. Always save immediately to LocalStorage (100% offline-ready)
    saveStoredData(data);

    // 2. If user is logged in with Gmail, debounced auto-sync to Firebase Firestore
    if (!userEmail) return;

    // Safety guard: do not overwrite cloud if local state has 0 items (protects against blank overwrite on startup/reinstall)
    const localHasContent =
      (data.tasks && data.tasks.length > 0) ||
      (data.habits && data.habits.length > 0) ||
      (data.dailyRoutine && data.dailyRoutine.length > 0) ||
      (data.notes && data.notes.length > 0) ||
      (data.checklists && data.checklists.length > 0);

    if (!localHasContent) return;

    const timeoutId = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const success = await saveUserDataToCloud(userEmail, data);
        if (success) {
          setLastSyncTime(new Date());
        }
      } catch (e) {
        console.warn('Auto cloud sync failed:', e);
      } finally {
        setIsSyncing(false);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [data, userEmail]);

  // Real-time listener & instant proactive restore for incoming remote updates if logged in
  useEffect(() => {
    if (!userEmail) return;

    let isCancelled = false;

    // Instant proactive restore on app startup or email change (sub-millisecond trigger)
    loadUserDataFromCloud(userEmail).then((cloudData) => {
      if (isCancelled || !cloudData) return;
      setData((prev) => {
        const merged = mergeAppData(cloudData, prev);
        saveStoredData(merged);
        return merged;
      });
      setLastSyncTime(new Date());
    }).catch(() => {});

    const unsubscribe = subscribeToUserData(userEmail, (cloudData) => {
      if (isCancelled || !cloudData) return;

      // If user modified local data within 5 seconds, protect local edits from being overwritten
      if (Date.now() - lastLocalActionTimeRef.current < 5000) {
        return;
      }

      setData((prev) => {
        const merged = mergeAppData(cloudData, prev);
        saveStoredData(merged);
        return merged;
      });
      setLastSyncTime(new Date());
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [userEmail]);

  // Periodic Reminder checker (runs every 30 seconds)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;
      const todayStr = getTodayStr();

      data.tasks.forEach((t) => {
        if (
          t.hasReminder &&
          !t.completed &&
          !t.reminderDismissed &&
          t.date === todayStr &&
          (t.reminderTime === currentTimeStr || t.time === currentTimeStr)
        ) {
          playAlertChime();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`আমার টাইম ম্যানেজমেন্ট রিমাইন্ডার: ${t.title}`, {
              body: `অগ্রাধিকার: ${t.priority} | সময়: ${t.time || currentTimeStr}`,
            });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [data.tasks]);

  // Active reminders count
  const activeRemindersCount = data.tasks.filter(
    (t) => t.hasReminder && !t.completed && !t.reminderDismissed && t.date >= getTodayStr()
  ).length;

  // Task Actions
  const handleToggleTask = (taskId: string) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => {
      const updated = prev.tasks.map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          if (nextCompleted) {
            playSuccessChime();
            fireConfetti();
          }
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      });
      const nextData = { ...prev, tasks: updated };
      saveStoredData(nextData);
      if (userEmail) {
        saveUserDataToCloud(userEmail, nextData).then((ok) => {
          if (ok) setLastSyncTime(new Date());
        });
      }
      return nextData;
    });
  };

  const handleSaveTask = (taskData: Partial<Task> & { id?: string }) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => {
      let updatedTasks: Task[];
      if (taskData.id) {
        // Edit
        updatedTasks = prev.tasks.map((t) => (t.id === taskData.id ? ({ ...t, ...taskData } as Task) : t));
      } else {
        // Add
        const newTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: (taskData.title || '').trim(),
          description: taskData.description ? taskData.description.trim() : '',
          date: taskData.date || getTodayStr(),
          time: taskData.time || '09:00',
          durationMinutes: taskData.durationMinutes || 60,
          priority: taskData.priority || 'P1',
          category: taskData.category || 'Work',
          completed: false,
          hasReminder: Boolean(taskData.hasReminder),
          reminderTime: taskData.reminderTime,
        };
        updatedTasks = [newTask, ...prev.tasks];
      }
      playSuccessChime();
      const nextData = { ...prev, tasks: updatedTasks };
      saveStoredData(nextData);
      if (userEmail) {
        saveUserDataToCloud(userEmail, nextData).then((ok) => {
          if (ok) setLastSyncTime(new Date());
        });
      }
      return nextData;
    });
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // Checklist Actions
  const handleUpdateChecklists = (updated: ChecklistGroup[], newActiveId?: string) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => {
      const prevIds = new Set<string>((prev.checklists || []).map((c) => c.id));
      const newIds = new Set<string>(updated.map((c) => c.id));
      const removedIds: string[] = [];
      prevIds.forEach((id) => {
        if (!newIds.has(id)) removedIds.push(id);
      });
      if (removedIds.length > 0) {
        recordDeletedItemIds(removedIds);
      }
      return {
        ...prev,
        checklists: updated,
        activeChecklistId:
          updated.length > 0
            ? newActiveId || (updated.some((c) => c.id === prev.activeChecklistId) ? prev.activeChecklistId : updated[0]?.id)
            : undefined,
      };
    });
  };

  const handleToggleChecklistItem = (checklistId: string, itemId: string) => {
    setData((prev) => {
      let isNowDone = false;
      const updated = (prev.checklists || []).map((cl) => {
        if (cl.id === checklistId) {
          return {
            ...cl,
            items: cl.items.map((item) => {
              if (item.id === itemId) {
                const nextChecked = !item.checked;
                if (nextChecked) isNowDone = true;
                return { ...item, checked: nextChecked };
              }
              return item;
            }),
          };
        }
        return cl;
      });

      if (isNowDone) {
        playSuccessChime();
        fireConfetti();
      }

      return { ...prev, checklists: updated };
    });
  };

  const handleAddChecklistItem = (checklistId: string, text: string) => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text,
      checked: false,
      category: 'সাধারণ',
      createdAt: getTodayStr(),
    };
    setData((prev) => {
      const updated = (prev.checklists || []).map((cl) => {
        if (cl.id === checklistId) {
          return {
            ...cl,
            items: [newItem, ...(cl.items || [])],
          };
        }
        return cl;
      });
      return { ...prev, checklists: updated };
    });
    playSuccessChime();
  };

  const handleUpdateDailyRoutine = (updatedRoutine: DailyRoutineItem[]) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => {
      const prevIds = new Set<string>((prev.dailyRoutine || []).map((r) => r.id));
      const newIds = new Set<string>(updatedRoutine.map((r) => r.id));
      const removedIds: string[] = [];
      prevIds.forEach((id) => {
        if (!newIds.has(id)) removedIds.push(id);
      });
      if (removedIds.length > 0) {
        recordDeletedItemIds(removedIds);
      }
      return {
        ...prev,
        dailyRoutine: updatedRoutine,
      };
    });
  };

  const handleUpdateNotes = (updatedNotes: NoteItem[]) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => {
      const prevIds = new Set<string>((prev.notes || []).map((n) => n.id));
      const newIds = new Set<string>(updatedNotes.map((n) => n.id));
      const removedIds: string[] = [];
      prevIds.forEach((id) => {
        if (!newIds.has(id)) removedIds.push(id);
      });
      if (removedIds.length > 0) {
        recordDeletedItemIds(removedIds);
      }
      return {
        ...prev,
        notes: updatedNotes,
      };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    lastLocalActionTimeRef.current = Date.now();
    recordDeletedItemId(taskId);
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleMoveTaskDate = (taskId: string, newDate: string) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, date: newDate } : t)),
    }));
  };

  const handleReorderTasks = (newTasks: Task[]) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => ({
      ...prev,
      tasks: newTasks,
    }));
  };

  const handleDismissReminder = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, reminderDismissed: true } : t)),
    }));
  };

  // Habit Actions
  const handleToggleHabitDay = (habitId: string, dateStr: string) => {
    setData((prev) => {
      const updated = prev.habits.map((h) => {
        if (h.id === habitId) {
          const wasDone = Boolean(h.history[dateStr]);
          const newHistory = { ...h.history };
          if (wasDone) {
            delete newHistory[dateStr];
          } else {
            newHistory[dateStr] = true;
          }
          const currentStreak = wasDone ? Math.max(0, h.currentStreak - 1) : h.currentStreak + 1;
          const bestStreak = Math.max(h.bestStreak, currentStreak);
          return {
            ...h,
            history: newHistory,
            currentStreak,
            bestStreak,
          };
        }
        return h;
      });
      return { ...prev, habits: updated };
    });
  };

  const handleAddHabit = (newHabitData: Omit<Habit, 'id' | 'currentStreak' | 'bestStreak' | 'createdAt' | 'history'>) => {
    const newHabit: Habit = {
      ...newHabitData,
      id: `habit-${Date.now()}`,
      currentStreak: 1,
      bestStreak: 1,
      createdAt: getTodayStr(),
      history: { [getTodayStr()]: true },
    };
    setData((prev) => ({
      ...prev,
      habits: [newHabit, ...prev.habits],
    }));
  };

  const handleDeleteHabit = (id: string) => {
    lastLocalActionTimeRef.current = Date.now();
    recordDeletedItemId(id);
    setData((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
    }));
  };

  const handleReorderHabits = (newHabits: Habit[]) => {
    lastLocalActionTimeRef.current = Date.now();
    setData((prev) => ({
      ...prev,
      habits: newHabits,
    }));
  };

  // Roadmap Actions
  const handleAddRoadmap = (roadmap: Roadmap) => {
    setData((prev) => ({
      ...prev,
      roadmaps: [roadmap, ...prev.roadmaps],
      activeRoadmapId: roadmap.id,
    }));
  };

  const handleUpdateRoadmap = (updatedRoadmap: Roadmap) => {
    setData((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.map((r) => (r.id === updatedRoadmap.id ? updatedRoadmap : r)),
    }));
  };

  const handleToggleMilestone = (roadmapId: string, phaseId: string, milestoneId: string) => {
    setData((prev) => {
      let isNowCompleted = false;
      const updatedRoadmaps = prev.roadmaps.map((r) => {
        if (r.id === roadmapId) {
          const updatedPhases = r.phases.map((p) => {
            if (p.id === phaseId) {
              const updatedMilestones = p.milestones.map((m) => {
                if (m.id === milestoneId) {
                  const nextState = !m.completed;
                  if (nextState) isNowCompleted = true;
                  return { ...m, completed: nextState };
                }
                return m;
              });
              return { ...p, milestones: updatedMilestones };
            }
            return p;
          });
          return { ...r, phases: updatedPhases };
        }
        return r;
      });

      if (isNowCompleted) {
        playSuccessChime();
        fireConfetti();
      }

      return { ...prev, roadmaps: updatedRoadmaps };
    });
  };

  // Time Entry Actions
  const handleAddTimeEntry = useCallback((entry: Omit<TimeEntry, 'id'>) => {
    const newEntry: TimeEntry = {
      ...entry,
      id: `te-${Date.now()}`,
    };
    setData((prev) => ({
      ...prev,
      timeEntries: [newEntry, ...prev.timeEntries],
    }));
    playSuccessChime();
  }, []);

  const handleDeleteTimeEntry = useCallback((id: string) => {
    lastLocalActionTimeRef.current = Date.now();
    recordDeletedItemId(id);
    setData((prev) => ({
      ...prev,
      timeEntries: prev.timeEntries.filter((e) => e.id !== id),
    }));
  }, []);

  // Monthly & Yearly Actions
  const handleAddMonthlyGoal = (goal: Omit<MonthlyGoal, 'id'>) => {
    const newGoal: MonthlyGoal = {
      ...goal,
      id: `mg-${Date.now()}`,
    };
    setData((prev) => ({
      ...prev,
      monthlyGoals: [...prev.monthlyGoals, newGoal],
    }));
  };

  const handleToggleMonthlyGoal = (id: string) => {
    setData((prev) => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)),
    }));
  };

  const handleUpdateYearlyVision = (vision: YearlyVision) => {
    setData((prev) => ({
      ...prev,
      yearlyVision: vision,
    }));
  };

  const activeRoadmap = data.roadmaps.find((r) => r.id === data.activeRoadmapId) || data.roadmaps[0];

  // Gmail Sync Handlers
  const handleConnectEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setIsSyncing(true);

    // Save immediately so state & listeners start right away
    setUserEmail(cleanEmail);
    try {
      localStorage.setItem('timecraft_user_gmail', cleanEmail);
      localStorage.setItem('timecraft_last_input_email', cleanEmail);
    } catch {}

    try {
      // 1. Fetch existing data in cloud with instant direct access
      const cloudData = await loadUserDataFromCloud(cleanEmail);
      const hasCloudData =
        cloudData &&
        typeof cloudData === 'object' &&
        (
          (Array.isArray(cloudData.tasks) && cloudData.tasks.length > 0) ||
          (Array.isArray(cloudData.habits) && cloudData.habits.length > 0) ||
          (Array.isArray(cloudData.dailyRoutine) && cloudData.dailyRoutine.length > 0) ||
          (Array.isArray(cloudData.notes) && cloudData.notes.length > 0) ||
          (Array.isArray(cloudData.checklists) && cloudData.checklists.length > 0) ||
          (Array.isArray(cloudData.roadmaps) && cloudData.roadmaps.length > 0) ||
          (Array.isArray(cloudData.monthlyGoals) && cloudData.monthlyGoals.length > 0) ||
          (Array.isArray(cloudData.timeEntries) && cloudData.timeEntries.length > 0) ||
          Boolean(cloudData.yearlyVision?.theme || cloudData.yearlyVision?.coreVision)
        );

      if (hasCloudData) {
        // Restore cloud data & merge with local session immediately (zero delay, instant restore)
        const mergedData = mergeAppData(cloudData, data);
        setData(mergedData);
        saveStoredData(mergedData);
        setLastSyncTime(new Date());
        playSuccessChime();
        fireConfetti();

        // Non-blocking background sync
        saveUserDataToCloud(cleanEmail, mergedData).catch(() => {});

        const taskCount = mergedData.tasks?.length || 0;
        const habitCount = mergedData.habits?.length || 0;
        const routineCount = mergedData.dailyRoutine?.length || 0;
        return {
          success: true,
          isNew: false,
          message: `স্বাগতম! আপনার জিমেইল (${cleanEmail}) থেকে ${habitCount}টি অভ্যাস, ${taskCount}টি কাজ ও সম্পূর্ণ ডাটা সফলভাবে অটো রিস্টোর করা হয়েছে।`,
        };
      } else {
        // If no cloud data found or empty, initialize with current data
        const initialToSave = cloudData ? mergeAppData(cloudData, data) : data;
        setData(initialToSave);
        saveStoredData(initialToSave);

        saveUserDataToCloud(cleanEmail, initialToSave).catch(() => {});
        setLastSyncTime(new Date());
        playSuccessChime();
        return {
          success: true,
          isNew: true,
          message: `জিমেইল (${cleanEmail}) সফলভাবে কানেক্ট হয়েছে এবং ক্লাউড ব্যাকআপ সক্রিয় রয়েছে।`,
        };
      }
    } catch (err: any) {
      console.error('Error connecting email:', err);
      return {
        success: true,
        message: `জিমেইল (${cleanEmail}) কানেক্ট করা হয়েছে। ক্লাউড ডাটা রিস্টোর হচ্ছে...`,
      };
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectEmail = async () => {
    await signOutUser();
    setUserEmail('');
    try {
      localStorage.removeItem('timecraft_user_gmail');
    } catch {}
    setLastSyncTime(null);
  };

  const handleRestoreFromCloud = async (): Promise<{ success: boolean; message: string }> => {
    if (!userEmail) {
      return { success: false, message: 'প্রথমে আপনার জিমেইল কানেক্ট করুন।' };
    }
    setIsSyncing(true);
    try {
      const cloudData = await loadUserDataFromCloud(userEmail);
      if (cloudData && typeof cloudData === 'object') {
        const merged = mergeAppData(cloudData, data);
        setData(merged);
        saveStoredData(merged);
        await saveUserDataToCloud(userEmail, merged);
        setLastSyncTime(new Date());
        playSuccessChime();
        fireConfetti();
        const taskCount = merged.tasks?.length || 0;
        const habitCount = merged.habits?.length || 0;
        const routineCount = merged.dailyRoutine?.length || 0;
        return {
          success: true,
          message: `ক্লাউড থেকে সফলভাবে ${habitCount}টি অভ্যাস, ${taskCount}টি কাজ ও সকল ডেটা রিস্টোর করা হয়েছে!`,
        };
      } else {
        return {
          success: false,
          message: 'এই জিমেইলে ক্লাউডে কোনো পূর্বের ব্যাকআপ ডাটা পাওয়া যায়নি।',
        };
      }
    } catch (err: any) {
      console.error('Error restoring from cloud:', err);
      return { success: false, message: 'ক্লাউড থেকে ডাটা লোড করতে সমস্যা হয়েছে। ইন্টারনেট চেক করুন।' };
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSyncNow = async () => {
    if (!userEmail) return false;
    setIsSyncing(true);
    try {
      const ok = await saveUserDataToCloud(userEmail, data);
      if (ok) setLastSyncTime(new Date());
      return ok;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f4] text-[#1a2724] pb-20 md:pb-8 selection:bg-[#005B96]/20 selection:text-[#005B96]">
      {/* Top Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTask={() => {
          setEditingTask(null);
          setTaskDefaultDate(getTodayStr());
          setIsTaskModalOpen(true);
        }}
        onOpenReminders={() => setIsRemindersOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        activeRemindersCount={activeRemindersCount}
        userEmail={userEmail}
        isSyncing={isSyncing}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-8 md:pb-10">
        {activeTab === 'dashboard' && (
          <DashboardView
            tasks={data.tasks}
            habits={data.habits}
            activeRoadmap={activeRoadmap}
            timeEntries={data.timeEntries}
            yearlyVision={data.yearlyVision}
            dailyRoutine={data.dailyRoutine || []}
            onToggleTask={handleToggleTask}
            onNavigateTab={(tab) => {
              if (tab === 'daily') {
                setDailyPlannerMode('day');
              }
              setActiveTab(tab);
            }}
            onOpenUpcoming={() => {
              setDailyPlannerMode('upcoming');
              setActiveTab('daily');
            }}
            onOpenNewTask={() => {
              setEditingTask(null);
              setTaskDefaultDate(getTodayStr());
              setIsTaskModalOpen(true);
            }}
          />
        )}

        {activeTab === 'daily-routine' && (
          <DailyRoutineView
            dailyRoutine={data.dailyRoutine || []}
            onUpdateDailyRoutine={handleUpdateDailyRoutine}
          />
        )}

        {activeTab === 'checklists' && (
          <ChecklistView
            checklists={data.checklists || []}
            activeChecklistId={data.activeChecklistId}
            onUpdateChecklists={handleUpdateChecklists}
          />
        )}

        {activeTab === 'notes' && (
          <NotesView
            notes={data.notes || []}
            onUpdateNotes={handleUpdateNotes}
          />
        )}

        {activeTab === 'daily' && (
          <DailyPlannerView
            tasks={data.tasks}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onOpenNewTask={(customDate?: string) => {
              setEditingTask(null);
              setTaskDefaultDate(customDate || getTodayStr());
              setIsTaskModalOpen(true);
            }}
            onMoveTaskDate={handleMoveTaskDate}
            onReorderTasks={handleReorderTasks}
            initialMode={dailyPlannerMode}
          />
        )}

        {activeTab === 'time-analysis' && (
          <TimeAnalysisView
            timeEntries={data.timeEntries}
            onAddTimeEntry={handleAddTimeEntry}
            onDeleteTimeEntry={handleDeleteTimeEntry}
          />
        )}

        {(activeTab === 'yearly' || activeTab === 'roadmap') && (
          <YearlyPlannerView
            yearlyVision={data.yearlyVision}
            onUpdateYearlyVision={handleUpdateYearlyVision}
          />
        )}

        {activeTab === 'habits' && (
          <HabitsView
            habits={data.habits}
            onToggleHabitDay={handleToggleHabitDay}
            onAddHabit={handleAddHabit}
            onDeleteHabit={handleDeleteHabit}
            onReorderHabits={handleReorderHabits}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyPlannerView
            tasks={data.tasks}
            monthlyGoals={data.monthlyGoals}
            onAddMonthlyGoal={handleAddMonthlyGoal}
            onToggleMonthlyGoal={handleToggleMonthlyGoal}
            onSelectDate={(dateStr) => {
              setActiveTab('daily');
            }}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            tasks={data.tasks}
            habits={data.habits}
            activeRoadmap={activeRoadmap}
            timeEntries={data.timeEntries}
          />
        )}
      </main>

      {/* Global Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        defaultDate={taskDefaultDate}
      />

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        appData={data}
        onRestoreData={(restored) => setData(restored)}
        userEmail={userEmail}
        onConnectEmail={handleConnectEmail}
        onDisconnectEmail={handleDisconnectEmail}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onManualSyncNow={handleManualSyncNow}
        onRestoreFromCloud={handleRestoreFromCloud}
      />

      <RemindersModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        tasks={data.tasks}
        onDismissReminder={handleDismissReminder}
      />
    </div>
  );
};

export default App;
