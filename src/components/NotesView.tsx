import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  NotebookPen,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Copy,
  Check,
  X,
  FileText,
  Tag,
  Clock,
  Sparkles,
  Filter,
  GripVertical,
  MapPin,
  ArrowUpDown,
} from 'lucide-react';
import { NoteItem } from '../types';
import { formatBnDate, formatBnNumber, getTodayStr, toEnDigits } from '../utils/storage';
import { playSuccessChime, playTick } from '../utils/audio';
import { reorderArray } from '../utils/reorder';
import { useDragAutoScroll, getTouchDragTarget, getPointerDragTarget } from '../utils/dragHelper';
import { DragPositionIndicator } from './DragPositionIndicator';

interface NotesViewProps {
  notes: NoteItem[];
  onUpdateNotes: (notes: NoteItem[]) => void;
}

const CATEGORY_PRESETS = [
  'ব্যক্তিগত',
  'কাজ / অফিস',
  'জরুরি',
  'আইডিয়া',
  'পড়াশোনা',
  'হিসাব',
  'অন্যান্য',
];

const COLOR_OPTIONS: { id: string; label: string; bg: string; border: string; badgeBg: string }[] = [
  { id: 'slate', label: 'সাদা / স্লেট', bg: 'bg-white', border: 'border-[#e6e2da]', badgeBg: 'bg-slate-100 text-slate-700' },
  { id: 'amber', label: 'উষ্ণ আম্বার', bg: 'bg-[#fffbeb]', border: 'border-amber-200', badgeBg: 'bg-amber-100 text-amber-800' },
  { id: 'emerald', label: 'পান্না সবুজ', bg: 'bg-[#f0fdf4]', border: 'border-emerald-200', badgeBg: 'bg-emerald-100 text-emerald-800' },
  { id: 'blue', label: 'আকাশি নীল', bg: 'bg-[#f0f9ff]', border: 'border-sky-200', badgeBg: 'bg-sky-100 text-sky-800' },
  { id: 'rose', label: 'গোলাপি', bg: 'bg-[#fff1f2]', border: 'border-rose-200', badgeBg: 'bg-rose-100 text-rose-800' },
  { id: 'purple', label: 'বেগুনি', bg: 'bg-[#faf5ff]', border: 'border-purple-200', badgeBg: 'bg-purple-100 text-purple-800' },
];

export const NotesView: React.FC<NotesViewProps> = ({ notes, onUpdateNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('ব্যক্তিগত');
  const [color, setColor] = useState('slate');
  const [isPinned, setIsPinned] = useState(false);

  // Interaction feedback states
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Drag and drop reorder states
  const [draggedNoteIndex, setDraggedNoteIndex] = useState<number | null>(null);
  const [dragOverNoteIndex, setDragOverNoteIndex] = useState<number | null>(null);

  const noteDragRef = useRef<{
    isDragging: boolean;
    fromIndex: number | null;
    toIndex: number | null;
  }>({
    isDragging: false,
    fromIndex: null,
    toIndex: null,
  });

  // Quick jump position modal for 100+ notes
  const [reorderModal, setReorderModal] = useState<{
    note: NoteItem;
    currentIndex: number;
    totalCount: number;
  } | null>(null);
  const [targetPosInput, setTargetPosInput] = useState('');

  useDragAutoScroll(draggedNoteIndex !== null);

  // Categories present in notes
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    notes.forEach((n) => {
      if (n.category && n.category.trim()) cats.add(n.category.trim());
    });
    return Array.from(cats);
  }, [notes]);

  // Open modal for new note
  const handleOpenNewNote = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('ব্যক্তিগত');
    setColor('slate');
    setIsPinned(false);
    setIsModalOpen(true);
  };

  // Open modal for editing note
  const handleOpenEditNote = (note: NoteItem) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'ব্যক্তিগত');
    setColor(note.color || 'slate');
    setIsPinned(!!note.isPinned);
    setIsModalOpen(true);
  };

  // Save (Create / Edit) note
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const nowStr = new Date().toISOString();
    const finalTitle = title.trim() || 'শিরোনামহীন নোট';

    if (editingNote) {
      // Update existing
      const updated = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: finalTitle,
              content: content.trim(),
              category: category.trim() || 'সাধারণ',
              color,
              isPinned,
              updatedAt: nowStr,
            }
          : n
      );
      // Pinned notes are always placed at top
      const pinned = updated.filter((n) => n.isPinned);
      const unpinned = updated.filter((n) => !n.isPinned);
      onUpdateNotes([...pinned, ...unpinned]);
    } else {
      // Create new
      const newNote: NoteItem = {
        id: `note-${Date.now()}`,
        title: finalTitle,
        content: content.trim(),
        category: category.trim() || 'সাধারণ',
        color,
        isPinned,
        createdAt: nowStr,
      };
      const pinned = notes.filter((n) => n.isPinned);
      const unpinned = notes.filter((n) => !n.isPinned);
      if (isPinned) {
        onUpdateNotes([newNote, ...pinned, ...unpinned]);
      } else {
        onUpdateNotes([...pinned, newNote, ...unpinned]);
      }
      playSuccessChime();
    }

    setIsModalOpen(false);
  };

  // Toggle Pin - moving pinned items to the top group and unpinned to the subsequent group
  const handleTogglePin = (noteId: string) => {
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote) return;
    const willBePinned = !targetNote.isPinned;

    const otherNotes = notes.filter((n) => n.id !== noteId);
    const pinnedOthers = otherNotes.filter((n) => n.isPinned);
    const unpinnedOthers = otherNotes.filter((n) => !n.isPinned);

    let updatedNotes: NoteItem[];
    if (willBePinned) {
      // Placed at end of pinned list at the top
      updatedNotes = [...pinnedOthers, { ...targetNote, isPinned: true }, ...unpinnedOthers];
    } else {
      // Placed at beginning of unpinned list immediately after pinned items
      updatedNotes = [...pinnedOthers, { ...targetNote, isPinned: false }, ...unpinnedOthers];
    }
    onUpdateNotes(updatedNotes);
    playTick();
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    onUpdateNotes(updated);
    setDeleteConfirmId(null);
  };

  // Copy note content
  const handleCopyNote = async (note: NoteItem) => {
    const textToCopy = `${note.title}\n\n${note.content}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    } catch {
      // Fallback
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    }
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        !searchQuery.trim() ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.category && note.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' || note.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [notes, searchQuery, selectedCategory]);

  // Separate pinned and unpinned notes
  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);
  const displayNotes = useMemo<NoteItem[]>(() => [...pinnedNotes, ...unpinnedNotes], [pinnedNotes, unpinnedNotes]);

  // Ensure pinned notes are always organized at the top
  useEffect(() => {
    let seenUnpinned = false;
    let needsSort = false;
    for (const n of notes) {
      if (!n.isPinned) {
        seenUnpinned = true;
      } else if (seenUnpinned) {
        needsSort = true;
        break;
      }
    }
    if (needsSort) {
      const pinned = notes.filter((n) => n.isPinned);
      const unpinned = notes.filter((n) => !n.isPinned);
      onUpdateNotes([...pinned, ...unpinned]);
    }
  }, [notes, onUpdateNotes]);

  // Execute note reordering with live pin-state synchronization
  const executeNoteReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || toIdx >= displayNotes.length) return;
    const reorderedDisplay = reorderArray<NoteItem>(displayNotes, fromIdx, toIdx);

    const pinnedCount = pinnedNotes.length;
    const fromNote = displayNotes[fromIdx];
    const newPinnedCount = fromNote.isPinned
      ? (toIdx >= pinnedCount ? pinnedCount - 1 : pinnedCount)
      : (toIdx < pinnedCount ? pinnedCount + 1 : pinnedCount);

    const updatedDisplay = reorderedDisplay.map((n, idx) => ({
      ...n,
      isPinned: idx < newPinnedCount,
    }));

    const displayIds = new Set(updatedDisplay.map((n) => n.id));
    const remainingNotes = notes.filter((n) => !displayIds.has(n.id));
    onUpdateNotes([...updatedDisplay, ...remainingNotes]);
    playTick();
  };

  const handleDropNote = (targetIndex: number, sourceIndex?: number) => {
    const fromIndex = sourceIndex !== undefined ? sourceIndex : draggedNoteIndex;
    if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) {
      setDraggedNoteIndex(null);
      setDragOverNoteIndex(null);
      return;
    }
    executeNoteReorder(fromIndex, targetIndex);
    setDraggedNoteIndex(null);
    setDragOverNoteIndex(null);
  };

  const handleJumpPosition = () => {
    if (!reorderModal) return;
    const targetNum = parseInt(toEnDigits(targetPosInput.trim()), 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > reorderModal.totalCount) {
      return;
    }
    const targetIndex = targetNum - 1;
    const fromIndex = reorderModal.currentIndex;
    if (fromIndex !== targetIndex) {
      executeNoteReorder(fromIndex, targetIndex);
    }
    setReorderModal(null);
  };

  // Helper to format date display
  const formatNoteDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const datePart = d.toISOString().split('T')[0];
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const hBn = formatBnNumber(hours % 12 === 0 ? 12 : hours % 12);
      const mBn = formatBnNumber(String(minutes).padStart(2, '0'));
      const period = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
      return `${formatBnDate(datePart)} • ${hBn}:${mBn} ${period}`;
    } catch {
      return formatBnDate(getTodayStr());
    }
  };

  const getColorConfig = (colorId?: string) => {
    return COLOR_OPTIONS.find((c) => c.id === colorId) || COLOR_OPTIONS[0];
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white border border-[#e6e2da] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#005B96]/10 text-[#005B96] flex items-center justify-center shrink-0 border border-[#005B96]/20">
            <NotebookPen className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1a2724]">
                নোট খাতা ও মেমো
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#005B96]/10 text-[#005B96]">
                {formatBnNumber(notes.length)}টি নোট
              </span>
            </div>
            <p className="text-xs text-[#55697a] mt-0.5">
              প্রয়োজনীয় তথ্য, আইডিয়া, ব্যক্তিগত হিসাব বা কাজের নোট সহজে লিখে রাখুন
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNewNote}
          className="py-2.5 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:scale-98 text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন নোট লিখুন</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="নোট খুঁজুন (শিরোনাম বা লেখার ভেতর)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-white border border-[#e6e2da] focus:border-[#005B96] focus:ring-2 focus:ring-[#005B96]/10 text-xs sm:text-sm outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filters Pill Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#005B96] text-white shadow-xs'
                : 'bg-white border border-[#e6e2da] text-slate-600 hover:bg-slate-50'
            }`}
          >
            সকল নোট ({formatBnNumber(notes.length)})
          </button>

          {CATEGORY_PRESETS.map((cat) => {
            const count = notes.filter((n) => n.category === cat).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#005B96] text-white shadow-xs'
                    : 'bg-white border border-[#e6e2da] text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat} {count > 0 && `(${formatBnNumber(count)})`}
              </button>
            );
          })}

          {/* Any other custom categories from notes */}
          {activeCategories
            .filter((cat) => !CATEGORY_PRESETS.includes(cat))
            .map((cat) => {
              const count = notes.filter((n) => n.category === cat).length;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#005B96] text-white shadow-xs'
                      : 'bg-white border border-[#e6e2da] text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat} ({formatBnNumber(count)})
                </button>
              );
            })}
        </div>
      </div>

      {/* Main Notes Content */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-[#e6e2da] bg-white p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {searchQuery || selectedCategory !== 'all'
                ? 'কোনো নোট খুঁজে পাওয়া যায়নি'
                : 'এখনো কোনো নোট যোগ করা হয়নি'}
            </h3>
            {searchQuery || selectedCategory !== 'all' && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                সার্চ কিওয়ার্ড বা ক্যাটাগরি ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।
              </p>
            )}
          </div>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>ফিল্টার মুছুন</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>পিন করা গুরুত্বপূর্ণ নোট ({formatBnNumber(pinnedNotes.length)}টি)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {pinnedNotes.map((note, pIdx) => renderNoteCard(note, pIdx + 1, pIdx))}
              </div>
            </div>
          )}

          {/* Other Notes Section */}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <NotebookPen className="w-3.5 h-3.5 text-slate-500" />
                  <span>অন্যান্য নোট ({formatBnNumber(unpinnedNotes.length)}টি)</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {unpinnedNotes.map((note, uIdx) =>
                  renderNoteCard(
                    note,
                    pinnedNotes.length + uIdx + 1,
                    pinnedNotes.length + uIdx
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#005B96]/10 text-[#005B96] flex items-center justify-center">
                  <NotebookPen className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  {editingNote ? 'নোট সম্পাদনা করুন' : 'নতুন নোট লিখুন'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveNote} className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নোটের শিরোনাম:
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: আজকের জরুরি কাজের তালিকা, ক্লায়েন্টের ঠিকানা..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#005B96] focus:ring-2 focus:ring-[#005B96]/10 text-xs sm:text-sm outline-none font-bold text-slate-800 placeholder:text-slate-400 transition-all"
                  autoFocus
                />
              </div>

              {/* Category Selector + Custom Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ক্যাটাগরি:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CATEGORY_PRESETS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        category === cat
                          ? 'bg-[#005B96] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="বা অন্য কোনো ক্যাটাগরি লিখুন..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#005B96]"
                />
              </div>

              {/* Color Scheme Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  কার্ডের রঙ:
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        c.bg
                      } ${
                        color === c.id
                          ? 'border-[#005B96] scale-110 shadow-xs ring-2 ring-[#005B96]/20'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      title={c.label}
                    >
                      {color === c.id && <Check className="w-3.5 h-3.5 text-[#005B96]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নোটের বিস্তারিত তথ্য / লেখা:
                </label>
                <textarea
                  rows={6}
                  placeholder="এখানে আপনার নোট, আইডিয়া, ফোন নম্বর, তালিকা বা প্রয়োজনীয় যেকোনো বিবরণ লিখুন..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#005B96] focus:ring-2 focus:ring-[#005B96]/10 text-xs sm:text-sm outline-none text-slate-800 placeholder:text-slate-400 transition-all resize-y leading-relaxed font-normal"
                />
              </div>

              {/* Pin to Top Checkbox */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>এই নোটটি ওপরে পিন করে রাখুন</span>
                </div>
              </label>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingNote ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Drag Indicator */}
      <DragPositionIndicator
        isDragging={draggedNoteIndex !== null}
        fromIndex={draggedNoteIndex}
        toIndex={dragOverNoteIndex}
        itemTitle={draggedNoteIndex !== null ? displayNotes[draggedNoteIndex]?.title : undefined}
        totalCount={displayNotes.length}
      />

      {/* Quick Jump Position Modal */}
      {reorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-[#005B96]" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  নোটের পজিশন পরিবর্তন
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReorderModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                নোট: <b className="text-slate-800 font-bold">"{reorderModal.note.title}"</b>
              </p>
              <p>
                বর্তমান পজিশন: <span className="font-mono font-bold text-[#005B96]">#{formatBnNumber(reorderModal.currentIndex + 1)}</span> (মোট {formatBnNumber(reorderModal.totalCount)}টি)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                নতুন পজিশন নম্বর লিখুন (1 থেকে {formatBnNumber(reorderModal.totalCount)}):
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={targetPosInput}
                onChange={(e) => setTargetPosInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJumpPosition();
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-[#005B96] focus:outline-none focus:border-[#005B96] focus:ring-2 focus:ring-[#005B96]/20 font-mono text-center text-lg"
                placeholder="যেমন: 1 বা 10"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReorderModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleJumpPosition}
                className="px-4 py-2 rounded-xl bg-[#005B96] text-white text-xs font-bold hover:bg-[#004877] cursor-pointer shadow-xs"
              >
                পজিশন নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper renderer for each Note Card
  function renderNoteCard(note: NoteItem, serialNumber: number, displayIdx: number) {
    const colorCfg = getColorConfig(note.color);
    const isCopied = copiedNoteId === note.id;
    const isConfirmingDelete = deleteConfirmId === note.id;
    const isNoteDragged = draggedNoteIndex === displayIdx;
    const isNoteDragOver = dragOverNoteIndex === displayIdx && draggedNoteIndex !== null && draggedNoteIndex !== displayIdx;

    return (
      <div
        key={note.id}
        data-drag-item="true"
        data-drag-id={note.id}
        data-drag-index={displayIdx}
        className="relative"
      >
        {/* Floating position indicator badge without shifting layout */}
        {isNoteDragOver && (
          <div className="absolute -top-3 left-4 bg-[#005B96] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md z-20 flex items-center gap-1.5 border border-amber-300 pointer-events-none animate-in fade-in">
            <MapPin className="w-3.5 h-3.5 text-amber-300" />
            <span>ড্রপ করলে #{formatBnNumber(serialNumber)} ({serialNumber}) পজিশনে আসবে</span>
          </div>
        )}

        <div
          onDragOver={(e) => {
            if (draggedNoteIndex !== null) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              noteDragRef.current.toIndex = displayIdx;
              if (dragOverNoteIndex !== displayIdx) setDragOverNoteIndex(displayIdx);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dt = e.dataTransfer.getData('text/plain');
            const parsed = dt !== '' ? parseInt(dt, 10) : null;
            const from = (parsed !== null && !isNaN(parsed)) ? parsed : (noteDragRef.current.fromIndex ?? draggedNoteIndex);
            if (from !== null && from !== undefined && from !== displayIdx) {
              handleDropNote(displayIdx, from);
            }
          }}
          className={`rounded-2xl border p-4 sm:p-4.5 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between group ${
            colorCfg.bg
          } ${
            isNoteDragOver
              ? 'border-[#005B96] ring-2 ring-[#005B96] shadow-md bg-blue-50/20 scale-[1.005]'
              : colorCfg.border
          } ${
            note.isPinned ? 'ring-2 ring-amber-300/80 shadow-xs' : ''
          } ${isNoteDragged ? 'opacity-35 scale-[0.99] border-dashed border-[#005B96]' : ''}`}
        >
          <div>
            {/* Card Top Row: Notion Drag Handle, Category, Pin Badge, Date */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(displayIdx));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedNoteIndex(displayIdx);
                    noteDragRef.current = { isDragging: true, fromIndex: displayIdx, toIndex: displayIdx };
                  }}
                  onDragEnd={() => {
                    setDraggedNoteIndex(null);
                    setDragOverNoteIndex(null);
                    noteDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                  }}
                  onTouchStart={() => {
                    noteDragRef.current = { isDragging: true, fromIndex: displayIdx, toIndex: displayIdx };
                    setDraggedNoteIndex(displayIdx);
                  }}
                  onTouchMove={(e) => {
                    if (e.touches && e.touches[0]) {
                      const target = getTouchDragTarget(e.touches[0]);
                      if (target.index !== null) {
                        noteDragRef.current.toIndex = target.index;
                        if (target.index !== displayIdx) {
                          setDragOverNoteIndex(target.index);
                        }
                      }
                    }
                  }}
                  onTouchEnd={() => {
                    const from = noteDragRef.current.fromIndex ?? displayIdx;
                    const to = noteDragRef.current.toIndex ?? dragOverNoteIndex;
                    if (to !== null && to !== from) {
                      handleDropNote(to, from);
                    } else {
                      setDraggedNoteIndex(null);
                      setDragOverNoteIndex(null);
                    }
                    noteDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                  }}
                  onTouchCancel={() => {
                    noteDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                    setDraggedNoteIndex(null);
                    setDragOverNoteIndex(null);
                  }}
                  className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-black/5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none select-none"
                  title="চাপ দিয়ে ধরে উপরে নিচে টানুন (Drag to move)"
                >
                  <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
                </div>

                {/* Serial badge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReorderModal({
                      note,
                      currentIndex: displayIdx,
                      totalCount: displayNotes.length,
                    });
                    setTargetPosInput(String(serialNumber));
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#005B96]/10 text-[#005B96] hover:bg-[#005B96]/20 font-mono font-black text-xs shrink-0 border border-[#005B96]/20 cursor-pointer transition-colors"
                  title="পজিশন নম্বর পরিবর্তন করতে ক্লিক করুন"
                >
                  #{formatBnNumber(serialNumber)}
                </button>

                <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border border-black/5 truncate ${colorCfg.badgeBg}`}>
                  {note.category || 'সাধারণ'}
                </span>
              </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleTogglePin(note.id)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  note.isPinned
                    ? 'text-amber-600 hover:bg-amber-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={note.isPinned ? 'আনপিন করুন' : 'উপরে পিন করুন'}
              >
                <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm sm:text-base font-extrabold text-[#1a2724] mb-1.5 leading-snug break-words">
            {note.title}
          </h4>

          {/* Content Body */}
          <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
            {note.content || <span className="italic text-slate-400">কোনো বিস্তারিত বিবরণ নেই</span>}
          </div>
        </div>

        {/* Card Footer: Date + Actions */}
        <div className="pt-3 mt-3 border-t border-black/5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1 truncate text-slate-400 text-[10.5px]">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{formatNoteDate(note.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Copy Button */}
            <button
              type="button"
              onClick={() => handleCopyNote(note)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#005B96] hover:bg-black/5 transition-colors cursor-pointer"
              title="লেখা কপি করুন"
            >
              {isCopied ? (
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                  <Check className="w-3 h-3" />
                  <span>কপি</span>
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => handleOpenEditNote(note)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#005B96] hover:bg-black/5 transition-colors cursor-pointer"
              title="সম্পাদনা করুন"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button */}
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  মুছুন
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px] hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  না
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteConfirmId(note.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="নোট মুছে ফেলুন"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  }
};
