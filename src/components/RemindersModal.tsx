import React from 'react';
import { X, Bell, Volume2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { Task } from '../types';
import { playAlertChime } from '../utils/audio';
import { formatBnDate } from '../utils/storage';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onDismissReminder: (taskId: string) => void;
}

export const RemindersModal: React.FC<RemindersModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onDismissReminder,
}) => {
  if (!isOpen) return null;

  const reminderTasks = tasks.filter(
    (t) => t.hasReminder && !t.completed && !t.reminderDismissed
  );

  const requestBrowserNotification = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('আমার টাইম ম্যানেজমেন্ট রিমাইন্ডার সক্রিয়!', {
            body: 'আপনার কাজের সঠিক সময়ে অ্যালার্ট নোটিফিকেশন আসবে।',
          });
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#eeeae2] flex items-center justify-between bg-[#fcfbfa]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F6A600]/15 text-[#F6A600] flex items-center justify-center font-bold text-sm">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#005B96]">রিমাইন্ডার ও অ্যালার্ট সেন্টার</h3>
              <p className="text-[11px] text-[#6d7e79]">আপনার সময়মতো কাজের সংকেত</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#869792] hover:text-[#1a2724] hover:bg-[#f3f0e8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F0E68C]/25 border border-[#F6A600]/30">
            <button
              onClick={() => playAlertChime()}
              className="px-3 py-1.5 rounded-lg bg-[#FF8C00] hover:bg-[#e07b00] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>সাউন্ড টেস্ট করুন</span>
            </button>

            <button
              onClick={requestBrowserNotification}
              className="px-3 py-1.5 rounded-lg border border-[#F6A600]/40 bg-white hover:bg-[#F0E68C]/30 text-[#1a2724] text-xs font-semibold transition-colors cursor-pointer"
            >
              ব্রাউজার নোটিফিকেশন
            </button>
          </div>

          {/* List of Reminders */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#1a2724]">
              সক্রিয় রিমাইন্ডার তালিকা ({reminderTasks.length}টি)
            </div>

            {reminderTasks.length === 0 ? (
              <div className="text-center py-8 bg-[#fcfbfa] rounded-2xl border border-dashed border-[#e6e2da]">
                <CheckCircle2 className="w-8 h-8 text-[#005B96] mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-[#1a2724]">কোনো মুলতুবি রিমাইন্ডার নেই!</p>
                <p className="text-[11px] text-[#6d7e79] mt-0.5">সব কাজ সময়মতো সম্পন্ন হয়েছে।</p>
              </div>
            ) : (
              reminderTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl border border-[#e6e2da] hover:border-[#005B96]/30 bg-white shadow-2xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#FF8C00]/10 text-[#FF8C00]">
                        {task.priority}
                      </span>
                      <h4 className="text-xs font-bold text-[#1a2724] truncate">{task.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#6d7e79] mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#00A3E0]" />
                        <span className="font-mono font-bold text-[#1a2724]">
                          {task.reminderTime || task.time || '--:--'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3 text-[#00A3E0]" />
                        <span>{formatBnDate(task.date)}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDismissReminder(task.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#e6e2da] hover:bg-[#f3f0e8] text-[11px] font-bold text-[#55697a] transition-colors shrink-0 cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#eeeae2] bg-[#fcfbfa] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#e6e2da] hover:bg-[#d8d3c8] text-[#1a2724] text-xs font-bold transition-colors cursor-pointer"
          >
            সম্পন্ন
          </button>
        </div>
      </div>
    </div>
  );
};
