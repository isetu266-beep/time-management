export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  durationMinutes?: number;
  priority: Priority;
  category: string;
  completed: boolean;
  completedAt?: string;
  hasReminder: boolean;
  reminderTime?: string;
  reminderDismissed?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  category: string;
  targetDaysPerWeek: number;
  currentStreak: number;
  bestStreak: number;
  createdAt: string;
  history: Record<string, boolean>; // 'YYYY-MM-DD': true
}

export interface Milestone {
  id: string;
  title: string;
  targetDays: number;
  completed: boolean;
  completedAt?: string;
}

export interface RoadmapPhase {
  id: string;
  phaseNumber: number;
  title: string;
  duration: string;
  description: string;
  milestones: Milestone[];
  status?: 'pending' | 'in_progress' | 'completed';
  achievementNotes?: string;
}

export interface Roadmap {
  id: string;
  title: string;
  category: string;
  timeframe: string;
  summary: string;
  phases: RoadmapPhase[];
  currentPhaseId?: string;
  dailyHabits?: { title: string; category: string }[];
  advice?: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  type: 'productive' | 'wasted' | 'neutral';
  activity: string;
  category: string;
  notes?: string;
}

export interface MonthlyGoal {
  id: string;
  month: string; // YYYY-MM
  title: string;
  completed: boolean;
  category: string;
}

export interface YearlyVision {
  year: number;
  theme: string;
  coreVision: string;
  quarterGoals: {
    q1: string[];
    q2: string[];
    q3: string[];
    q4: string[];
  };
}

export interface AIProductivityAnalysis {
  score: number;
  statusTitle: string;
  keyInsight: string;
  wastedAnalysis: string;
  actionableAdvice: string[];
  motivationQuote: string;
  generatedAt?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  category?: string;
  note?: string;
  createdAt: string;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  items: ChecklistItem[];
  createdAt: string;
  date?: string;
}

export type RoutinePriority = 'mandatory' | 'less_important' | 'routine';

export interface DailyRoutineItem {
  id: string;
  title: string;
  startTime: string; // HH:mm, e.g. "06:00"
  endTime: string;   // HH:mm, e.g. "07:00"
  priority: RoutinePriority;
  completed?: boolean;
  notes?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  color?: string; // 'slate' | 'amber' | 'emerald' | 'blue' | 'rose' | 'purple'
  isPinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AppData {
  tasks: Task[];
  habits: Habit[];
  roadmaps: Roadmap[];
  activeRoadmapId: string;
  timeEntries: TimeEntry[];
  monthlyGoals: MonthlyGoal[];
  yearlyVision: YearlyVision;
  checklists: ChecklistGroup[];
  activeChecklistId?: string;
  dailyRoutine: DailyRoutineItem[];
  notes?: NoteItem[];
}
