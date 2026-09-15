import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  CheckCircle2,
  Edit2,
  X,
  FolderPlus,
  Tag,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Check,
  Calendar,
  AlertTriangle,
  GripVertical,
  ArrowUpDown,
  MapPin,
} from 'lucide-react';
import { ChecklistGroup, ChecklistItem } from '../types';
import { getTodayStr, formatBnDate, formatBnNumber, toEnDigits } from '../utils/storage';
import { HoverDatePicker } from './HoverDatePicker';
import { reorderArray } from '../utils/reorder';
import { playTick } from '../utils/audio';
import { useDragAutoScroll, getTouchDragTarget, getPointerDragTarget } from '../utils/dragHelper';
import { DragPositionIndicator } from './DragPositionIndicator';

interface ChecklistViewProps {
  checklists: ChecklistGroup[];
  activeChecklistId?: string;
  onUpdateChecklists: (updated: ChecklistGroup[], newActiveId?: string) => void;
}

const ITEM_CATEGORIES = [
  'সাধারণ',
  'ডকুমেন্ট',
  'গ্যাজেটস',
  'পোশাক',
  'স্বাস্থ্য',
  'প্রসাধন',
  'অফিস',
  'অন্যান্য',
];

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  checklists,
  activeChecklistId,
  onUpdateChecklists,
}) => {
  // Expansion state: which title menus are open
  // Initialize all titles as expanded (open) by default so sub-menu items are visible
  const [expandedTitles, setExpandedTitles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    checklists.forEach((c) => {
      init[c.id] = true;
    });
    return init;
  });

  // Ensure new checklists get expanded automatically
  useEffect(() => {
    setExpandedTitles((prev) => {
      let hasChange = false;
      const next = { ...prev };
      checklists.forEach((c) => {
        if (next[c.id] === undefined) {
          next[c.id] = true;
          hasChange = true;
        }
      });
      return hasChange ? next : prev;
    });
  }, [checklists]);

  // Form states for creating a new Title
  const [isCreatingTitle, setIsCreatingTitle] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleIcon, setNewTitleIcon] = useState('🎒');
  const [newTitleDate, setNewTitleDate] = useState<string>(getTodayStr());

  // Input states per title for adding sub-items
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});
  const [itemCategories, setItemCategories] = useState<Record<string, string>>({});

  // Multi-add state
  const [multiAddTitleId, setMultiAddTitleId] = useState<string | null>(null);
  const [multiAddText, setMultiAddText] = useState('');

  // Title rename inline state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [editingTitleDate, setEditingTitleDate] = useState<string>(getTodayStr());

  // Active DatePicker group card (lifts z-index so dropdown is never covered or clipped)
  const [openDateGroupCardId, setOpenDateGroupCardId] = useState<string | null>(null);

  // Item edit inline state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  // Delete Confirmation Modal State (replaces window.confirm with Yes/No dialog)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'title' | 'item' | 'clear-items';
    titleId: string;
    itemId?: string;
    titleName: string;
    itemName?: string;
  } | null>(null);

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  // Drag and Drop (Notion-style reorder)
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<{ titleId: string; index: number } | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

  const groupDragRef = useRef<{ isDragging: boolean; fromIndex: number | null; toIndex: number | null }>({
    isDragging: false,
    fromIndex: null,
    toIndex: null,
  });

  const itemDragRef = useRef<{
    isDragging: boolean;
    titleId: string | null;
    fromIndex: number | null;
    toIndex: number | null;
  }>({
    isDragging: false,
    titleId: null,
    fromIndex: null,
    toIndex: null,
  });

  // Quick jump position modal for 100+ items
  const [reorderModal, setReorderModal] = useState<{
    type: 'group' | 'item';
    titleId?: string;
    currentIndex: number;
    totalCount: number;
    name: string;
  } | null>(null);
  const [targetPosInput, setTargetPosInput] = useState('');

  // Auto-scroll when dragging near viewport edges
  useDragAutoScroll(draggedGroupIndex !== null || draggedItemIndex !== null);

  const handleDropGroup = (targetIndex: number, sourceIndex?: number) => {
    const fromIndex = sourceIndex !== undefined ? sourceIndex : draggedGroupIndex;
    if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) {
      setDraggedGroupIndex(null);
      setDragOverGroupIndex(null);
      return;
    }
    const reordered = reorderArray(checklists, fromIndex, targetIndex);
    onUpdateChecklists(reordered);
    setDraggedGroupIndex(null);
    setDragOverGroupIndex(null);
    playTick();
  };

  const handleDropSubItem = (titleId: string, targetIndex: number, sourceIndex?: number) => {
    const fromIndex =
      sourceIndex !== undefined
        ? sourceIndex
        : draggedItemIndex && draggedItemIndex.titleId === titleId
        ? draggedItemIndex.index
        : undefined;
    if (fromIndex === undefined || fromIndex === null || fromIndex === targetIndex) {
      setDraggedItemIndex(null);
      setDragOverItemIndex(null);
      return;
    }
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        const reorderedItems = reorderArray(cl.items || [], fromIndex, targetIndex);
        return { ...cl, items: reorderedItems };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
    playTick();
  };

  const handleJumpPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderModal) return;
    const targetNum = parseInt(toEnDigits(targetPosInput.trim()), 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > reorderModal.totalCount) return;
    const targetIdx = targetNum - 1;

    if (reorderModal.type === 'group') {
      const reordered = reorderArray(checklists, reorderModal.currentIndex, targetIdx);
      onUpdateChecklists(reordered);
      playTick();
    } else if (reorderModal.type === 'item' && reorderModal.titleId) {
      const updated = checklists.map((cl) => {
        if (cl.id === reorderModal.titleId) {
          const reorderedItems = reorderArray(cl.items || [], reorderModal.currentIndex, targetIdx);
          return { ...cl, items: reorderedItems };
        }
        return cl;
      });
      onUpdateChecklists(updated, reorderModal.titleId);
      playTick();
    }
    setReorderModal(null);
  };

  // Toggle single title expand/collapse
  const toggleExpand = (titleId: string) => {
    setExpandedTitles((prev) => {
      const isCurrentlyOpen = prev[titleId] ?? true;
      return {
        ...prev,
        [titleId]: !isCurrentlyOpen,
      };
    });
  };

  // Expand / Collapse all
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    checklists.forEach((c) => {
      next[c.id] = true;
    });
    setExpandedTitles(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    checklists.forEach((c) => {
      next[c.id] = false;
    });
    setExpandedTitles(next);
  };

  // Handler: Create New Title
  const handleCreateTitle = (e?: React.FormEvent, customName?: string, customIcon?: string) => {
    if (e) e.preventDefault();
    const title = (customName || newTitleName).trim();
    if (!title) return;
    const icon = customIcon || newTitleIcon || '🎒';

    const newGroup: ChecklistGroup = {
      id: `cl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      description: 'এই টাইটেলের সাব-মেনু চেকমার্ক তালিকা',
      icon,
      color: 'blue',
      createdAt: getTodayStr(),
      date: newTitleDate || getTodayStr(),
      items: [],
    };

    const updated = [newGroup, ...checklists];
    onUpdateChecklists(updated, newGroup.id);
    setExpandedTitles((prev) => ({ ...prev, [newGroup.id]: true }));
    setNewTitleName('');
    setNewTitleDate(getTodayStr());
    setIsCreatingTitle(false);
  };

  // Handler: Save Title Rename
  const handleSaveTitleRename = (titleId: string) => {
    if (!editingTitleText.trim()) return;
    const updated = checklists.map((cl) =>
      cl.id === titleId
        ? {
            ...cl,
            title: editingTitleText.trim(),
            date: editingTitleDate || cl.date || cl.createdAt || getTodayStr(),
          }
        : cl
    );
    onUpdateChecklists(updated, titleId);
    setEditingTitleId(null);
    setEditingTitleText('');
  };

  // Handler: Update Title Date directly from Calendar Picker
  const handleUpdateTitleDate = (titleId: string, newDate: string) => {
    const updated = checklists.map((cl) =>
      cl.id === titleId ? { ...cl, date: newDate } : cl
    );
    onUpdateChecklists(updated, titleId);
  };

  // Handler: Execute Delete Title (after user clicks "হ্যাঁ")
  const executeDeleteTitle = (titleId: string) => {
    const updated = checklists.filter((c) => c.id !== titleId);
    onUpdateChecklists(updated, updated[0]?.id);
  };

  // Handler: Execute Delete Sub-Item (after user clicks "হ্যাঁ")
  const executeDeleteItem = (titleId: string, itemId: string) => {
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: (cl.items || []).filter((item) => item.id !== itemId),
        };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
  };

  // Handler: Execute Clear All Items in Title (after user clicks "হ্যাঁ")
  const executeClearAllItemsInTitle = (titleId: string) => {
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: [],
        };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
  };

  // Handler: Add Sub-Item under specific Title
  const handleAddSubItem = (titleId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = (itemInputs[titleId] || '').trim();
    if (!text) return;
    const category = itemCategories[titleId] || 'সাধারণ';

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      checked: false,
      category,
      createdAt: getTodayStr(),
    };

    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: [...(cl.items || []), newItem],
        };
      }
      return cl;
    });

    onUpdateChecklists(updated, titleId);
    setItemInputs((prev) => ({ ...prev, [titleId]: '' }));
  };

  // Handler: Multi-Add Sub-Items
  const handleMultiAddSubItems = (titleId: string) => {
    if (!multiAddText.trim()) return;
    const lines = multiAddText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (lines.length === 0) return;

    const newItems: ChecklistItem[] = lines.map((text, idx) => ({
      id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      checked: false,
      category: itemCategories[titleId] || 'সাধারণ',
      createdAt: getTodayStr(),
    }));

    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: [...(cl.items || []), ...newItems],
        };
      }
      return cl;
    });

    onUpdateChecklists(updated, titleId);
    setMultiAddText('');
    setMultiAddTitleId(null);
  };

  // Handler: Toggle Checkmark of Sub-Item
  const handleToggleItem = (titleId: string, itemId: string) => {
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: (cl.items || []).map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
  };

  // Handler: Delete Sub-Item
  const handleDeleteItem = (titleId: string, itemId: string) => {
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: (cl.items || []).filter((item) => item.id !== itemId),
        };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
  };

  // Handler: Save Edit Sub-Item
  const handleSaveEditItem = (titleId: string, itemId: string) => {
    if (!editingItemText.trim()) return;
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: (cl.items || []).map((item) =>
            item.id === itemId ? { ...item, text: editingItemText.trim() } : item
          ),
        };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
    setEditingItemId(null);
    setEditingItemText('');
  };

  // Handler: Uncheck All in Title
  const handleUncheckAllInTitle = (titleId: string) => {
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: (cl.items || []).map((item) => ({ ...item, checked: false })),
        };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
  };

  // Handler: Check All in Title
  const handleCheckAllInTitle = (titleId: string) => {
    const updated = checklists.map((cl) => {
      if (cl.id === titleId) {
        return {
          ...cl,
          items: (cl.items || []).map((item) => ({ ...item, checked: true })),
        };
      }
      return cl;
    });
    onUpdateChecklists(updated, titleId);
  };


  // Global calculations
  const totalTitlesCount = checklists.length;
  const totalSubItemsCount = checklists.reduce((acc, cl) => acc + (cl.items?.length || 0), 0);
  const totalCompletedCount = checklists.reduce(
    (acc, cl) => acc + (cl.items?.filter((i) => i.checked).length || 0),
    0
  );

  // Filtered lists based on search
  const filteredChecklists = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q && filterMode === 'all') return checklists;

    return checklists
      .map((cl) => {
        const matchesTitle = cl.title.toLowerCase().includes(q);
        let items = cl.items || [];

        if (filterMode === 'pending') {
          items = items.filter((i) => !i.checked);
        } else if (filterMode === 'completed') {
          items = items.filter((i) => i.checked);
        }

        if (q) {
          items = items.filter(
            (i) =>
              matchesTitle ||
              i.text.toLowerCase().includes(q) ||
              (i.category && i.category.toLowerCase().includes(q))
          );
        }

        return {
          ...cl,
          items,
          _matched: matchesTitle || items.length > 0,
        };
      })
      .filter((cl) => cl._matched || (cl.items && cl.items.length > 0));
  }, [checklists, searchQuery, filterMode]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#005B96] via-[#004877] to-[#002f52] p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/10 text-white">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              চেক মার্ক লিস্ট (টাইটেল ও সাব-মেনু তালিকা)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-2xl leading-relaxed">
            প্রতিটি বিষয়ের জন্য আলাদা <b>টাইটেল</b> দিন এবং সেই টাইটেলের আন্ডারে সাব-মেনু আকারে আপনার প্রয়োজনীয় <b>চেকমার্ক অপশনগুলো</b> সহজে সাজিয়ে রাখুন।
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreatingTitle(true)}
            className="px-4 py-2 sm:py-2.5 rounded-xl bg-white text-[#005B96] hover:bg-white/90 active:scale-95 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#FF8C00]" />
            <span>+ নতুন টাইটেল যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* New Title Creation Drawer / Form */}
      {isCreatingTitle && (
        <form
          onSubmit={(e) => handleCreateTitle(e)}
          className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-[#005B96]/30 shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-[#005B96] flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4" />
              নতুন টাইটেলের নাম লিখুন:
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCreatingTitle(false);
                setNewTitleName('');
              }}
              className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTitleName}
              onChange={(e) => setNewTitleName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-[#005B96]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#005B96] shadow-xs"
              autoFocus
            />

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Calendar Date Picker for New Title (দিন, মাস, বছর ফরম্যাট ও হোভারে ইনস্ট্যান্ট ক্যালেন্ডার) */}
              <HoverDatePicker
                value={newTitleDate}
                onChange={(dateStr) => setNewTitleDate(dateStr)}
                label="তারিখ:"
              />

              <button
                type="submit"
                disabled={!newTitleName.trim()}
                className="px-5 py-2.5 bg-[#005B96] hover:bg-[#004877] disabled:opacity-50 text-white text-xs sm:text-sm font-black rounded-xl cursor-pointer shadow-xs transition-all whitespace-nowrap"
              >
                টাইটেল তৈরি করুন
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Overview Stats, Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#e6e2da] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Stats & Overview */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005B96]/10 text-[#005B96] text-xs font-black">
            <Layers className="w-3.5 h-3.5" />
            <span>{totalTitlesCount}টি টাইটেল</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16a34a]/10 text-[#16a34a] text-xs font-black">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              মোট অপশন: {totalCompletedCount}/{totalSubItemsCount} সম্পন্ন
            </span>
          </div>
        </div>

        {/* Right: Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#f3f0e8] p-1 rounded-xl text-xs font-bold border border-[#e6e2d9]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-[#005B96] text-white font-black shadow-2xs' : 'text-[#697b76]'
              }`}
            >
              সব
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'pending' ? 'bg-[#005B96] text-white font-black shadow-2xs' : 'text-[#697b76]'
              }`}
            >
              বাকি
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'completed' ? 'bg-[#16a34a] text-white font-black shadow-2xs' : 'text-[#697b76]'
              }`}
            >
              সম্পন্ন
            </button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#869792]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#e6e2da] text-xs bg-white text-[#1a2724] focus:outline-none focus:border-[#005B96]"
            />
          </div>
        </div>
      </div>

      {/* Main List of Title Menus (with their Sub-menu Checklists under each) */}
      <div className="space-y-4">
        {filteredChecklists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-[#d8e3df] p-6 space-y-3">
            <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-1" />
            <p className="text-sm font-bold text-gray-600">
              {searchQuery
                ? 'কোনো টাইটেল বা অপশন খুঁজে পাওয়া যায়নি।'
                : 'কোনো চেকলিস্ট টাইটেল নেই। ওপরের "+ নতুন টাইটেল যোগ করুন" বাটনে ক্লিক করে শুরু করুন।'}
            </p>
          </div>
        ) : (
          filteredChecklists.map((group) => {
            const actualGroupIdx = checklists.findIndex((c) => c.id === group.id);
            const isExpanded = expandedTitles[group.id] !== false;
            const groupItems = group.items || [];
            const doneCount = groupItems.filter((i) => i.checked).length;
            const totalCount = groupItems.length;
            const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
            const isEditingTitle = editingTitleId === group.id;
            const isTargeted = dragOverGroupIndex === actualGroupIdx && draggedGroupIndex !== null && draggedGroupIndex !== actualGroupIdx;

            return (
              <div
                key={group.id}
                data-drag-item="true"
                data-drag-group="true"
                data-drag-id={group.id}
                data-drag-index={actualGroupIdx}
                onDragOver={(e) => {
                  if (draggedGroupIndex !== null) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    groupDragRef.current.toIndex = actualGroupIdx;
                    if (dragOverGroupIndex !== actualGroupIdx) {
                      setDragOverGroupIndex(actualGroupIdx);
                    }
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dt = e.dataTransfer.getData('text/plain');
                  const parsed = dt !== '' ? parseInt(dt, 10) : null;
                  const from = (parsed !== null && !isNaN(parsed)) ? parsed : (groupDragRef.current.fromIndex ?? draggedGroupIndex);
                  if (from !== null && from !== undefined) {
                    handleDropGroup(actualGroupIdx, from);
                  }
                }}
                style={{
                  zIndex:
                    openDateGroupCardId === group.id
                      ? 999
                      : Math.max(1, (checklists.length - actualGroupIdx) * 2 + 10),
                }}
                className={`bg-white rounded-2xl sm:rounded-3xl border transition-all relative hover:z-40 focus-within:z-40 ${
                  isTargeted
                    ? 'border-[#005B96] ring-2 ring-[#005B96] shadow-lg bg-blue-50/20'
                    : 'border-[#e2ddd5] shadow-xs hover:border-[#b8c9d4]'
                } ${draggedGroupIndex === actualGroupIdx ? 'opacity-35 scale-[0.99]' : ''}`}
              >
                {/* Floating position indicator badge that does not shift the layout */}
                {isTargeted && (
                  <div className="absolute -top-3.5 left-6 bg-[#005B96] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-md z-30 flex items-center gap-1.5 border border-amber-300 pointer-events-none animate-in fade-in">
                    <MapPin className="w-3.5 h-3.5 text-amber-300" />
                    <span>ড্রপ করলে #{formatBnNumber(actualGroupIdx + 1)} ({actualGroupIdx + 1}) পজিশনে আসবে</span>
                  </div>
                )}

                {/* 1. PARENT TITLE / MENU HEADER */}
                <div
                  style={{
                    zIndex: openDateGroupCardId === group.id ? 50 : 20,
                  }}
                  className={`p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors rounded-t-2xl sm:rounded-t-3xl relative ${
                    isExpanded
                      ? 'bg-gradient-to-r from-blue-50/60 to-white'
                      : 'bg-white rounded-b-2xl sm:rounded-b-3xl'
                  }`}
                >
                  {/* Left: Notion Drag Handle + Serial Number + Expand/Collapse Arrow + Emoji Icon + Title Text */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <div
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(actualGroupIdx));
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedGroupIndex(actualGroupIdx);
                          groupDragRef.current = { isDragging: true, fromIndex: actualGroupIdx, toIndex: actualGroupIdx };
                        }}
                        onDragEnd={() => {
                          setDraggedGroupIndex(null);
                          setDragOverGroupIndex(null);
                          groupDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                        }}
                        onTouchStart={() => {
                          groupDragRef.current = { isDragging: true, fromIndex: actualGroupIdx, toIndex: actualGroupIdx };
                          setDraggedGroupIndex(actualGroupIdx);
                        }}
                        onTouchMove={(e) => {
                          if (e.touches && e.touches[0]) {
                            const target = getTouchDragTarget(e.touches[0], '[data-drag-group="true"]');
                            if (target.index !== null) {
                              groupDragRef.current.toIndex = target.index;
                              if (target.index !== actualGroupIdx) {
                                setDragOverGroupIndex(target.index);
                              }
                            }
                          }
                        }}
                        onTouchEnd={() => {
                          const from = groupDragRef.current.fromIndex ?? actualGroupIdx;
                          const to = groupDragRef.current.toIndex ?? dragOverGroupIndex;
                          if (to !== null && to !== from) {
                            handleDropGroup(to, from);
                          } else {
                            setDraggedGroupIndex(null);
                            setDragOverGroupIndex(null);
                          }
                          groupDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                        }}
                        onTouchCancel={() => {
                          groupDragRef.current = { isDragging: false, fromIndex: null, toIndex: null };
                          setDraggedGroupIndex(null);
                          setDragOverGroupIndex(null);
                        }}
                        className="p-2 -ml-1 text-gray-400 hover:text-[#005B96] hover:bg-black/5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none select-none"
                        title="চাপ দিয়ে ধরে উপরে নিচে টানুন (Drag to move)"
                      >
                        <GripVertical className="w-4 h-4 pointer-events-none" />
                      </div>

                      {/* Serial Number Badge (Clickable for direct position jump) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReorderModal({
                            type: 'group',
                            currentIndex: actualGroupIdx,
                            totalCount: checklists.length,
                            name: group.title,
                          });
                          setTargetPosInput(String(actualGroupIdx + 1));
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#005B96]/10 hover:bg-[#005B96]/25 text-[#005B96] font-mono text-xs font-black border border-[#005B96]/20 cursor-pointer shrink-0 transition-all hover:scale-105"
                        title={`পজিশন #${formatBnNumber(actualGroupIdx + 1)} (ক্লিক করে সরাসরি যেকোনো নম্বরে সরান)`}
                      >
                        #{formatBnNumber(actualGroupIdx + 1)}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(group.id)}
                      className="p-1 rounded-lg hover:bg-blue-100 text-[#005B96] transition-colors cursor-pointer shrink-0"
                      title={isExpanded ? 'সাব-মেনু বন্ধ করুন' : 'সাব-মেনু খুলুন'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[#005B96]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {isEditingTitle ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveTitleRename(group.id);
                          }}
                          className="flex items-center gap-2 flex-wrap"
                        >
                          <input
                            type="text"
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            className="px-2.5 py-1 text-sm font-bold text-[#005B96] border-2 border-[#005B96] rounded-xl focus:outline-none bg-white min-w-[200px]"
                            autoFocus
                          />
                          <div className="py-0.5">
                            <HoverDatePicker
                              value={editingTitleDate}
                              onChange={(dateStr) => setEditingTitleDate(dateStr)}
                              onOpenChange={(isOpen) => setOpenDateGroupCardId(isOpen ? group.id : null)}
                              label=""
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-3 py-1 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            সেভ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTitleId(null)}
                            className="px-2 py-1 text-xs text-gray-500 font-bold cursor-pointer"
                          >
                            বাতিল
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                          {/* Title Name - click to toggle expand */}
                          <h2
                            onClick={() => toggleExpand(group.id)}
                            className="text-base sm:text-lg font-black text-[#005B96] hover:text-[#004877] transition-colors leading-snug cursor-pointer select-none"
                            title={isExpanded ? 'সাব-মেনু সংকুচিত করতে ক্লিক করুন' : 'সাব-মেনু প্রসারিত করতে ক্লিক করুন'}
                          >
                            {group.title}
                          </h2>

                          {/* Calendar Date Picker Dropdown with comfortable padding */}
                          <div onClick={(e) => e.stopPropagation()} className="relative z-30 py-0.5">
                            <HoverDatePicker
                              value={group.date || group.createdAt || getTodayStr()}
                              onChange={(dateStr) => handleUpdateTitleDate(group.id, dateStr)}
                              onOpenChange={(isOpen) => setOpenDateGroupCardId(isOpen ? group.id : null)}
                              badgeMode={true}
                              badgeText={formatBnDate(group.date || group.createdAt || getTodayStr())}
                            />
                          </div>

                          <span
                            className={`text-[11px] sm:text-xs font-bold font-mono px-2.5 py-1 rounded-full ${
                              totalCount > 0 && percent === 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100/80 text-[#005B96]'
                            }`}
                          >
                            {doneCount}/{totalCount} সম্পন্ন ({percent}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions for this Title (Add Option, Edit, Delete) */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isExpanded) toggleExpand(group.id);
                        // Focus on input for this title
                        const el = document.getElementById(`input-title-${group.id}`);
                        if (el) el.focus();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#005B96]/10 hover:bg-[#005B96]/20 text-[#005B96] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="এই টাইটেলের আন্ডারে নতুন চেকমার্ক অপশন যোগ করুন"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ অপশন যোগ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingTitleId(group.id);
                        setEditingTitleText(group.title);
                        setEditingTitleDate(group.date || group.createdAt || getTodayStr());
                      }}
                      className="p-1.5 text-gray-400 hover:text-[#005B96] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      title="টাইটেলের নাম ও তারিখ এডিট করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          isOpen: true,
                          type: 'title',
                          titleId: group.id,
                          titleName: group.title,
                        });
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="এই টাইটেল ও এর সাব-মেনু মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. CHILD SUB-MENU: THE CHECKMARK LIST OPTIONS UNDER THIS TITLE */}
                {isExpanded && (
                  <div className="border-t border-[#f0ebe3] p-3.5 sm:p-5 bg-[#faf9f6]/60 rounded-b-2xl sm:rounded-b-3xl relative z-10">
                    {/* Visual Submenu Indent & Tree Line */}
                    <div className="border-l-3 border-[#005B96]/40 ml-1.5 sm:ml-4 pl-3 sm:pl-5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-[#55697a] pb-1">
                        <span className="flex items-center gap-1.5 text-[#005B96]">
                          <span className="w-2 h-2 rounded-full bg-[#005B96]" />
                          <span>
                            <b>{group.title}</b>-এর সাব-মেনু অপশনসমূহ ({groupItems.length}টি)
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (multiAddTitleId === group.id) {
                              setMultiAddTitleId(null);
                            } else {
                              setMultiAddTitleId(group.id);
                            }
                          }}
                          className="text-[11px] text-[#00A3E0] hover:text-[#005B96] font-bold cursor-pointer"
                        >
                          {multiAddTitleId === group.id
                            ? 'সাধারণ মোড'
                            : 'একসাথে একাধিক অপশন যোগ (+)'}
                        </button>
                      </div>

                      {/* Inline Add Option Form for THIS Title */}
                      {multiAddTitleId === group.id ? (
                        <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-2xs space-y-2">
                          <textarea
                            rows={3}
                            value={multiAddText}
                            onChange={(e) => setMultiAddText(e.target.value)}
                            className="w-full p-2.5 text-xs text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:border-[#005B96]"
                            autoFocus
                          />
                          <div className="flex items-center justify-between">
                            <select
                              value={itemCategories[group.id] || 'সাধারণ'}
                              onChange={(e) =>
                                setItemCategories((prev) => ({
                                  ...prev,
                                  [group.id]: e.target.value,
                                }))
                              }
                              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-white"
                            >
                              {ITEM_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleMultiAddSubItems(group.id)}
                              disabled={!multiAddText.trim()}
                              className="px-4 py-1.5 bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                            >
                              সবগুলো যোগ করুন
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => handleAddSubItem(group.id, e)}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                        >
                          <div className="flex-1 relative">
                            <input
                              id={`input-title-${group.id}`}
                              type="text"
                              value={itemInputs[group.id] || ''}
                              onChange={(e) =>
                                setItemInputs((prev) => ({
                                  ...prev,
                                  [group.id]: e.target.value,
                                }))
                              }
                              className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-[#d2dbdf] bg-white text-gray-800 focus:outline-none focus:border-[#005B96] shadow-2xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={itemCategories[group.id] || 'সাধারণ'}
                              onChange={(e) =>
                                setItemCategories((prev) => ({
                                  ...prev,
                                  [group.id]: e.target.value,
                                }))
                              }
                              className="px-2.5 py-2 text-xs font-medium rounded-xl border border-[#d2dbdf] bg-white text-gray-700"
                            >
                              {ITEM_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>

                            <button
                              type="submit"
                              disabled={!(itemInputs[group.id] || '').trim()}
                              className="px-4 py-2 rounded-xl bg-[#005B96] hover:bg-[#004877] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-2xs cursor-pointer transition-all whitespace-nowrap"
                            >
                              যুক্ত করুন
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Sub-menu Checkmark Items List */}
                      <div className="space-y-1.5 pt-1">
                        {groupItems.length === 0 ? null : (
                          groupItems.map((item, itemIdx) => {
                            const isEditingItem = editingItemId === item.id;
                            const isItemDragged = draggedItemIndex?.titleId === group.id && draggedItemIndex.index === itemIdx;
                            const isItemDragOver = dragOverItemIndex === itemIdx && draggedItemIndex?.titleId === group.id && draggedItemIndex.index !== itemIdx;

                            return (
                              <div
                                key={item.id}
                                data-drag-item="true"
                                data-drag-subitem="true"
                                data-drag-group-id={group.id}
                                data-drag-title-id={group.id}
                                data-drag-id={item.id}
                                data-drag-index={itemIdx}
                                onDragOver={(e) => {
                                  if (draggedItemIndex && draggedItemIndex.titleId === group.id) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.dataTransfer.dropEffect = 'move';
                                    itemDragRef.current.toIndex = itemIdx;
                                    if (dragOverItemIndex !== itemIdx) {
                                      setDragOverItemIndex(itemIdx);
                                    }
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const dt = e.dataTransfer.getData('text/plain');
                                  const parsed = dt !== '' ? parseInt(dt, 10) : null;
                                  const from = (parsed !== null && !isNaN(parsed)) ? parsed : (itemDragRef.current.fromIndex ?? draggedItemIndex?.index);
                                  if (from !== null && from !== undefined) {
                                    handleDropSubItem(group.id, itemIdx, from);
                                  }
                                }}
                                className="relative"
                              >
                                {/* Floating sub-item position badge without shifting layout */}
                                {isItemDragOver && (
                                  <div className="absolute -top-3 left-4 bg-[#005B96] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md z-20 flex items-center gap-1 border border-amber-300 pointer-events-none animate-in fade-in">
                                    <MapPin className="w-3 h-3 text-amber-300" />
                                    <span>ড্রপ করলে #{formatBnNumber(itemIdx + 1)} ({itemIdx + 1}) পজিশনে আসবে</span>
                                  </div>
                                )}

                                <div
                                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                                    isItemDragOver
                                      ? 'border-[#005B96] ring-2 ring-[#005B96] bg-blue-50/50 shadow-md scale-[1.005]'
                                      : item.checked
                                      ? 'bg-[#f4f7f6] border-[#d8e3df] text-[#71827d]'
                                      : 'bg-white border-[#e6e2da] text-gray-800 shadow-2xs hover:border-[#b8c9d4]'
                                  } ${isItemDragged ? 'opacity-35 scale-[0.99] border-dashed border-[#005B96]' : ''}`}
                                >
                                  {/* Notion Drag Handle + Serial Number + Checkbox + Text */}
                                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                    <div className="flex items-center gap-1 shrink-0">
                                      <div
                                        draggable={true}
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('text/plain', String(itemIdx));
                                          e.dataTransfer.effectAllowed = 'move';
                                          setDraggedItemIndex({ titleId: group.id, index: itemIdx });
                                          itemDragRef.current = { isDragging: true, titleId: group.id, fromIndex: itemIdx, toIndex: itemIdx };
                                        }}
                                        onDragEnd={() => {
                                          setDraggedItemIndex(null);
                                          setDragOverItemIndex(null);
                                          itemDragRef.current = { isDragging: false, titleId: null, fromIndex: null, toIndex: null };
                                        }}
                                        onTouchStart={() => {
                                          itemDragRef.current = { isDragging: true, titleId: group.id, fromIndex: itemIdx, toIndex: itemIdx };
                                          setDraggedItemIndex({ titleId: group.id, index: itemIdx });
                                        }}
                                        onTouchMove={(e) => {
                                          if (e.touches && e.touches[0]) {
                                            const target = getTouchDragTarget(e.touches[0], '[data-drag-subitem="true"]');
                                            if (target.index !== null) {
                                              itemDragRef.current.toIndex = target.index;
                                              if (target.index !== itemIdx) {
                                                setDragOverItemIndex(target.index);
                                              }
                                            }
                                          }
                                        }}
                                        onTouchEnd={() => {
                                          const from = itemDragRef.current.fromIndex ?? itemIdx;
                                          const to = itemDragRef.current.toIndex ?? dragOverItemIndex;
                                          if (to !== null && to !== from) {
                                            handleDropSubItem(group.id, to, from);
                                          } else {
                                            setDraggedItemIndex(null);
                                            setDragOverItemIndex(null);
                                          }
                                          itemDragRef.current = { isDragging: false, titleId: null, fromIndex: null, toIndex: null };
                                        }}
                                        onTouchCancel={() => {
                                          itemDragRef.current = { isDragging: false, titleId: null, fromIndex: null, toIndex: null };
                                          setDraggedItemIndex(null);
                                          setDragOverItemIndex(null);
                                        }}
                                        className="p-2 -ml-1 text-gray-400 hover:text-[#005B96] hover:bg-black/5 rounded cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none select-none"
                                        title="চাপ দিয়ে ধরে উপরে নিচে টানুন (Drag to move)"
                                      >
                                        <GripVertical className="w-4 h-4 pointer-events-none" />
                                      </div>

                                      {/* Serial Number Badge for Sub-item */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReorderModal({
                                            type: 'item',
                                            titleId: group.id,
                                            currentIndex: itemIdx,
                                            totalCount: groupItems.length,
                                            name: item.text,
                                          });
                                          setTargetPosInput(String(itemIdx + 1));
                                        }}
                                        className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#005B96] font-mono text-[11px] font-black border border-slate-200 cursor-pointer shrink-0 transition-all hover:scale-105"
                                        title={`পজিশন #${formatBnNumber(itemIdx + 1)} (ক্লিক করে যেকোনো নম্বরে সরান)`}
                                      >
                                        #{formatBnNumber(itemIdx + 1)}
                                      </button>
                                    </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleItem(group.id, item.id)}
                                    className="shrink-0 cursor-pointer focus:outline-none transition-transform active:scale-90"
                                    title={item.checked ? 'আনচেক করুন' : 'চেকমার্ক দিন'}
                                  >
                                    {item.checked ? (
                                      <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center text-white shadow-2xs">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-md border-2 border-[#a2b5be] hover:border-[#005B96] bg-white transition-colors" />
                                    )}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    {isEditingItem ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={editingItemText}
                                          onChange={(e) => setEditingItemText(e.target.value)}
                                          className="w-full px-2 py-1 text-xs border border-[#005B96] rounded-md focus:outline-none"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEditItem(group.id, item.id)}
                                          className="px-2 py-1 bg-[#005B96] text-white text-[11px] font-bold rounded-md cursor-pointer"
                                        >
                                          সেভ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingItemId(null)}
                                          className="text-[11px] text-gray-500 font-bold cursor-pointer"
                                        >
                                          বাতিল
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          onClick={() => handleToggleItem(group.id, item.id)}
                                          className={`text-xs sm:text-sm font-semibold cursor-pointer select-none break-words leading-relaxed ${
                                            item.checked
                                              ? 'line-through text-gray-400'
                                              : 'text-gray-800 hover:text-[#005B96]'
                                          }`}
                                        >
                                          {item.text}
                                        </span>

                                        {item.category && item.category !== 'সাধারণ' && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                            {item.category}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Item Action Buttons */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {!isEditingItem && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditingItemText(item.text);
                                      }}
                                      className="p-1 text-gray-400 hover:text-[#005B96] rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                                      title="সম্পাদনা"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        type: 'item',
                                        titleId: group.id,
                                        itemId: item.id,
                                        titleName: group.title,
                                        itemName: item.text,
                                      })
                                    }
                                    className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                    title="মুছে ফেলুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            );
                          })
                        )}

                        {/* Bottom drop zone for sub-items */}
                        {draggedItemIndex?.titleId === group.id && draggedItemIndex.index !== groupItems.length - 1 && (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverItemIndex(groupItems.length - 1);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDropSubItem(group.id, groupItems.length - 1);
                            }}
                            className={`py-1.5 px-3 rounded-lg border-2 border-dashed text-center text-[11px] font-bold transition-all ${
                              dragOverItemIndex === groupItems.length - 1
                                ? 'bg-blue-100 border-[#005B96] text-[#005B96]'
                                : 'bg-blue-50/50 border-blue-200 text-blue-600'
                            }`}
                          >
                            ⬇ সর্বশেষ পজিশনে রাখুন (#{formatBnNumber(groupItems.length)})
                          </div>
                        )}
                      </div>

                      {/* Sub-menu Quick Footer Controls for THIS Title */}
                      {groupItems.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs font-bold text-gray-500">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUncheckAllInTitle(group.id)}
                              className="text-[11px] font-bold text-[#005B96] hover:underline cursor-pointer flex items-center gap-1"
                              title="সব আনচেক করে আবার নতুন করে শুরু করুন"
                            >
                              <RotateCcw className="w-3 h-3 text-[#FF8C00]" />
                              <span>সব আনচেক করুন</span>
                            </button>
                            <span className="text-gray-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleCheckAllInTitle(group.id)}
                              className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>সব সম্পন্ন করুন</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'clear-items',
                                titleId: group.id,
                                titleName: group.title,
                              })
                            }
                            className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>সব অপশন মুছুন</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Bottom Drop Zone for Groups */}
        {draggedGroupIndex !== null && draggedGroupIndex !== checklists.length - 1 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverGroupIndex(checklists.length - 1);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDropGroup(checklists.length - 1);
            }}
            className={`py-2 px-4 rounded-xl border-2 border-dashed text-center text-xs font-bold transition-all ${
              dragOverGroupIndex === checklists.length - 1
                ? 'bg-blue-100 border-[#005B96] text-[#005B96] scale-[1.01]'
                : 'bg-blue-50/60 border-blue-200 text-blue-600 hover:bg-blue-50'
            }`}
          >
            ⬇ সর্বশেষ পজিশনে রাখুন (#{formatBnNumber(checklists.length)})
          </div>
        )}
      </div>

      {/* Custom Yes/No Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                  মুছে ফেলার নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  আপনি কি নিশ্চিতভাবে এটি মুছে ফেলতে চান?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Info */}
            <div className="p-3.5 bg-red-50/70 border border-red-100 rounded-xl text-xs sm:text-sm text-gray-700 leading-relaxed">
              {deleteConfirm.type === 'title' && (
                <p>
                  আপনি কি নিশ্চিত যে <b>"{deleteConfirm.titleName}"</b> টাইটেল মেনুটি এবং এর ভেতরের সমস্ত সাব-মেনু অপশন মুছে ফেলতে চান?
                </p>
              )}
              {deleteConfirm.type === 'item' && (
                <p>
                  আপনি কি নিশ্চিত যে <b>"{deleteConfirm.itemName}"</b> অপশনটি <b>"{deleteConfirm.titleName}"</b> টাইটেল থেকে মুছে ফেলতে চান?
                </p>
              )}
              {deleteConfirm.type === 'clear-items' && (
                <p>
                  আপনি কি নিশ্চিত যে <b>"{deleteConfirm.titleName}"</b> টাইটেলের সমস্ত সাব-মেনু অপশন মুছে ফেলতে চান?
                </p>
              )}
            </div>

            {/* Modal Action Buttons: Yes / No */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
              >
                না, বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'title') {
                    executeDeleteTitle(deleteConfirm.titleId);
                  } else if (deleteConfirm.type === 'item' && deleteConfirm.itemId) {
                    executeDeleteItem(deleteConfirm.titleId, deleteConfirm.itemId);
                  } else if (deleteConfirm.type === 'clear-items') {
                    executeClearAllItemsInTitle(deleteConfirm.titleId);
                  }
                  setDeleteConfirm(null);
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>হ্যাঁ, মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Live Position Feedback while dragging */}
      <DragPositionIndicator
        isDragging={draggedGroupIndex !== null}
        fromIndex={draggedGroupIndex}
        toIndex={dragOverGroupIndex}
        itemTitle={draggedGroupIndex !== null ? checklists[draggedGroupIndex]?.title : undefined}
        totalCount={checklists.length}
      />
      <DragPositionIndicator
        isDragging={draggedItemIndex !== null}
        fromIndex={draggedItemIndex?.index ?? null}
        toIndex={dragOverItemIndex}
        itemTitle={
          draggedItemIndex !== null
            ? checklists.find((c) => c.id === draggedItemIndex.titleId)?.items?.[draggedItemIndex.index]?.text
            : undefined
        }
        totalCount={
          draggedItemIndex !== null
            ? checklists.find((c) => c.id === draggedItemIndex.titleId)?.items?.length
            : undefined
        }
      />

      {/* Quick Jump Position Modal (Supports lists with 100+ items) */}
      {reorderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#005B96]/10 text-[#005B96] flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">পজিশন পরিবর্তন করুন</h3>
                  <p className="text-[11px] text-slate-500 font-medium">যেকোনো নির্দিষ্ট নম্বরে সরাসরি সরান</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReorderModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJumpPosition} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
                <p className="text-slate-500 mb-1">নির্বাচিত আইটেম:</p>
                <p className="font-bold text-slate-800 truncate mb-1">"{reorderModal.name}"</p>
                <div className="flex items-center gap-2 mt-2 font-mono">
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-700">
                    বর্তমান: #{formatBnNumber(reorderModal.currentIndex + 1)}
                  </span>
                  <span className="text-slate-400">➔</span>
                  <span className="text-[11px] text-slate-500">
                    মোট: {formatBnNumber(reorderModal.totalCount)} টি
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  নতুন পজিশন নম্বর লিখুন (1 থেকে {formatBnNumber(reorderModal.totalCount)}):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={targetPosInput}
                  onChange={(e) => setTargetPosInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#005B96] text-center font-mono font-black text-lg text-slate-800 focus:outline-none shadow-inner"
                  placeholder="যেমন: 1 বা 10"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReorderModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#005B96] hover:bg-[#004B7c] active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>স্থানান্তর করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
