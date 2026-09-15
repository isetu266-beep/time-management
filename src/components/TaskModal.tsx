import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, Bell, Tag, Check, SlidersHorizontal, Flame, Target, Coffee } from 'lucide-react';
import { Task, Priority } from '../types';
import { formatBnNumber, getTodayStr } from '../utils/storage';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task> & { id?: string }) => void;
  editingTask: Task | null;
  defaultDate: string;
}

const PRESET_DURATIONS = [15, 30, 45, 60, 90, 120, 180];

const PRIORITY_MATRIX_CONFIG = [
  {
    id: 'P1' as Priority,
    code: 'P1',
    quadrant: 'Q1 (অবিলম্বে করুন)',
    title: 'খুব জরুরি ও গুরুত্বপূর্ণ',
    actionDesc: 'আজই সবার আগে শেষ করুন',
    icon: Flame,
    color: '#ea580c',
    activeBadge: 'bg-[#ea580c] text-white',
    activeContainer: 'bg-[#fff7ed] border-[#ea580c] ring-2 ring-[#ea580c]/30 shadow-xs',
    inactiveContainer: 'border-[#e6e2da] bg-white hover:bg-[#fff7ed]/40 hover:border-[#ea580c]/40',
  },
  {
    id: 'P2' as Priority,
    code: 'P2',
    quadrant: 'Q2 (পরিকল্পনা করুন)',
    title: 'গুরুত্বপূর্ণ, জরুরি নয়',
    actionDesc: 'ক্যালেন্ডারে সময় দিয়ে করুন',
    icon: Target,
    color: '#005B96',
    activeBadge: 'bg-[#005B96] text-white',
    activeContainer: 'bg-[#f0f7fc] border-[#005B96] ring-2 ring-[#005B96]/30 shadow-xs',
    inactiveContainer: 'border-[#e6e2da] bg-white hover:bg-[#f0f7fc]/40 hover:border-[#005B96]/40',
  },
  {
    id: 'P3' as Priority,
    code: 'P3',
    quadrant: 'Q3 (রুটিন বা প্রতিনিধি)',
    title: 'জরুরি কিন্তু কম গুরুত্বপূর্ণ',
    actionDesc: 'দৈনন্দিন দায়িত্ব ও রুটিন কাজ',
    icon: Clock,
    color: '#0284c7',
    activeBadge: 'bg-[#0284c7] text-white',
    activeContainer: 'bg-[#f0f9ff] border-[#0284c7] ring-2 ring-[#0284c7]/30 shadow-xs',
    inactiveContainer: 'border-[#e6e2da] bg-white hover:bg-[#f0f9ff]/40 hover:border-[#0284c7]/40',
  },
  {
    id: 'P4' as Priority,
    code: 'P4',
    quadrant: 'Q4 (অবসরে বা বাদ দিন)',
    title: 'কম জরুরি ও ঐচ্ছিক',
    actionDesc: 'অবসর সময়ে করুন বা পরে',
    icon: Coffee,
    color: '#d97706',
    activeBadge: 'bg-[#d97706] text-white',
    activeContainer: 'bg-[#fffbeb] border-[#d97706] ring-2 ring-[#d97706]/30 shadow-xs',
    inactiveContainer: 'border-[#e6e2da] bg-white hover:bg-[#fffbeb]/40 hover:border-[#d97706]/40',
  },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  defaultDate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState('60');
  const [priority, setPriority] = useState<Priority>('P1');
  const [category, setCategory] = useState('Work');
  const [hasReminder, setHasReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTitle(editingTask.title || '');
        setDescription(editingTask.description || '');
        setDate(editingTask.date || defaultDate || getTodayStr());
        setTime(editingTask.time || '09:00');
        const dur = editingTask.durationMinutes || 60;
        setDurationMinutes(dur);
        setCustomDurationInput(String(dur));
        setIsCustomDuration(!PRESET_DURATIONS.includes(dur));
        setPriority(editingTask.priority || 'P1');
        setCategory(editingTask.category || 'Work');
        setHasReminder(Boolean(editingTask.hasReminder));
        setReminderTime(editingTask.reminderTime || editingTask.time || '09:00');
      } else {
        setTitle('');
        setDescription('');
        setDate(defaultDate || getTodayStr());
        setTime('09:00');
        setDurationMinutes(60);
        setCustomDurationInput('60');
        setIsCustomDuration(false);
        setPriority('P1');
        setCategory('Work');
        setHasReminder(true);
        setReminderTime('09:00');
      }
    }
  }, [editingTask, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const finalDuration = isCustomDuration
      ? Math.max(1, parseInt(customDurationInput, 10) || 15)
      : (durationMinutes || 60);

    const finalDate = date || defaultDate || getTodayStr();
    const finalTime = time || '09:00';

    onSave({
      ...(editingTask ? { id: editingTask.id } : {}),
      title: cleanTitle,
      description: description.trim(),
      date: finalDate,
      time: finalTime,
      durationMinutes: finalDuration,
      priority: priority || 'P1',
      category: category || 'Work',
      hasReminder: Boolean(hasReminder),
      reminderTime: hasReminder ? (reminderTime || finalTime) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#eeeae2] flex items-center justify-between bg-[#fcfbfa]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#005B96]/10 text-[#005B96] flex items-center justify-center font-bold text-sm">
              📝
            </div>
            <div>
              <h3 className="text-base font-bold text-[#005B96]">
                {editingTask ? 'কাজ সম্পাদনা করুন' : 'নতুন কাজের পরিকল্পনা যোগ করুন'}
              </h3>
              <p className="text-[11px] text-[#6d7e79]">অগ্রাধিকার ও সময় নির্ধারণ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#869792] hover:text-[#1a2724] hover:bg-[#f3f0e8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#1a2724] mb-1">
              কাজের শিরোনাম <span className="text-[#FF8C00]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="যেমন: আজকের মূল ফিচার কোডিং শেষ করা"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e2da] focus:outline-none focus:ring-2 focus:ring-[#005B96]/20 focus:border-[#005B96] text-sm font-medium text-[#1a2724] bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#1a2724] mb-1">
              বিস্তারিত বিবরণ (ঐচ্ছিক)
            </label>
            <textarea
              rows={2}
              placeholder="কাজের মূল উদ্দেশ্য বা বিশেষ নোট..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#e6e2da] focus:outline-none focus:ring-2 focus:ring-[#005B96]/20 focus:border-[#005B96] text-xs font-normal text-[#1a2724] bg-white"
            ></textarea>
          </div>

          {/* Priority Matrix Selector (Eisenhower Matrix) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1a2724] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#FF8C00]" />
                <span>অগ্রাধিকার স্তর (Eisenhower Matrix)</span>
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
                4-কোয়াড্রেন্ট ব্যবস্থা
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRIORITY_MATRIX_CONFIG.map((p) => {
                const isSelected = priority === p.id;
                const IconComponent = p.icon;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? p.activeContainer
                        : p.inactiveContainer
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black tracking-wider shadow-2xs ${p.activeBadge}`}>
                          {p.code}
                        </span>
                        <div>
                          <div className="text-xs font-extrabold text-[#1a2724] flex items-center gap-1">
                            <span>{p.title}</span>
                          </div>
                          <span className="text-[10px] text-[#64748b] font-medium">{p.quadrant}</span>
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                          isSelected
                            ? `${p.activeBadge} border-transparent`
                            : 'border-[#cbd5e1] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-[#334155] font-semibold flex items-center gap-1">
                        <IconComponent className="w-3 h-3" style={{ color: p.color }} />
                        <span>{p.actionDesc}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date, Time & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1a2724] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#00A3E0]" />
                <span>তারিখ</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-mono font-bold bg-white text-[#1a2724] focus:border-[#005B96] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1a2724] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#00A3E0]" />
                <span>শুরুর সময়</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  if (hasReminder) setReminderTime(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-mono font-bold bg-white text-[#1a2724] focus:border-[#005B96] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#1a2724]">
                  সময়সীমা (মিনিট)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextCustom = !isCustomDuration;
                    setIsCustomDuration(nextCustom);
                    if (nextCustom) {
                      setCustomDurationInput(String(durationMinutes || 60));
                    }
                  }}
                  className="text-[10px] font-bold text-[#005B96] hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  <span>{isCustomDuration ? 'প্রিসেট' : 'কাস্টম'}</span>
                </button>
              </div>

              {!isCustomDuration ? (
                <select
                  value={durationMinutes}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomDuration(true);
                      setCustomDurationInput(String(durationMinutes || 60));
                    } else {
                      const val = Number(e.target.value);
                      setDurationMinutes(val);
                      setCustomDurationInput(String(val));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium bg-white text-[#1a2724] focus:border-[#005B96] focus:outline-none cursor-pointer"
                >
                  <option value={15}>15 মিনিট</option>
                  <option value={30}>30 মিনিট</option>
                  <option value={45}>45 মিনিট</option>
                  <option value={60}>1 ঘণ্টা (60 মিনিট)</option>
                  <option value={90}>1.5 ঘণ্টা (90 মিনিট)</option>
                  <option value={120}>2 ঘণ্টা (120 মিনিট)</option>
                  <option value={180}>3 ঘণ্টা (180 মিনিট)</option>
                  <option value="custom">✏️ কাস্টম মিনিট (নিজের মতো লিখুন)...</option>
                </select>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        required
                        autoFocus
                        value={customDurationInput}
                        onChange={(e) => {
                          setCustomDurationInput(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setDurationMinutes(val);
                          }
                        }}
                        placeholder="মিনিট লিখুন..."
                        className="w-full pl-3 pr-11 py-1.5 rounded-xl border-2 border-[#005B96] text-xs font-mono font-bold bg-white text-[#1a2724] focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#64748b] pointer-events-none">
                        মিনিট
                      </span>
                    </div>
                  </div>

                  {/* Quick Increment Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {[5, 10, 15, 30].map((addMins) => (
                      <button
                        key={addMins}
                        type="button"
                        onClick={() => {
                          const current = parseInt(customDurationInput, 10) || 0;
                          const updated = current + addMins;
                          setCustomDurationInput(String(updated));
                          setDurationMinutes(updated);
                        }}
                        className="px-1.5 py-0.5 rounded-md bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-[9px] font-bold text-[#334155] cursor-pointer"
                        title={`${addMins} মিনিট বাড়ান`}
                      >
                        +{formatBnNumber(addMins)} মি.
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category & Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#1a2724] mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#00A3E0]" />
                <span>ক্যাটাগরি</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium bg-white text-[#1a2724] focus:border-[#005B96] focus:outline-none"
              >
                <option value="Work">কাজ / পেশাগত (Work)</option>
                <option value="Study">শেখা ও পড়াশোনা (Study)</option>
                <option value="Health">স্বাস্থ্য ও ব্যায়াম (Health)</option>
                <option value="Focus">ডিপ ফোকাস (Focus)</option>
                <option value="Personal">ব্যক্তিগত (Personal)</option>
                <option value="Finance">অর্থ ও বাজেট (Finance)</option>
              </select>
            </div>

            <div className="bg-[#fcfbfa] p-3 rounded-xl border border-[#e6e2da]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1a2724] flex items-center gap-1.5 cursor-pointer">
                  <Bell className="w-3.5 h-3.5 text-[#F6A600]" />
                  <span>রিমাইন্ডার ও অ্যালার্ম</span>
                </label>
                <input
                  type="checkbox"
                  checked={hasReminder}
                  onChange={(e) => setHasReminder(e.target.checked)}
                  className="w-4 h-4 rounded text-[#005B96] focus:ring-[#005B96] accent-[#005B96] cursor-pointer"
                />
              </div>
              {hasReminder && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-[#6d7e79]">সময়:</span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-[#e6e2da] text-xs font-mono font-bold bg-white text-[#1a2724] focus:border-[#005B96] focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#eeeae2] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#55697a] hover:bg-[#f3f0e8] transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#005B96] hover:bg-[#004877] active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {editingTask ? 'পরিবর্তন সংরক্ষণ করুন' : 'তালিকায় যোগ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
