import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Target,
  Calendar,
  Layers,
  Lightbulb,
  Edit3,
  Award,
  Sparkles,
  X,
} from 'lucide-react';
import { Roadmap, RoadmapPhase, Milestone } from '../types';
import { formatBnNumber, getTodayStr } from '../utils/storage';
import { playSuccessChime } from '../utils/audio';

interface RoadmapViewProps {
  roadmaps: Roadmap[];
  activeRoadmapId: string;
  onSelectRoadmap: (id: string) => void;
  onAddRoadmap: (roadmap: Roadmap) => void;
  onUpdateRoadmap?: (roadmap: Roadmap) => void;
  onToggleMilestone: (roadmapId: string, phaseId: string, milestoneId: string) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  roadmaps,
  activeRoadmapId,
  onSelectRoadmap,
  onAddRoadmap,
  onUpdateRoadmap,
  onToggleMilestone,
}) => {
  const activeRoadmap = roadmaps.find((r) => r.id === activeRoadmapId) || roadmaps[0];

  // Roadmap Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [detailsInput, setDetailsInput] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('new_roadmap');
  const [timeframe, setTimeframe] = useState('6 মাস');
  const [customMonths, setCustomMonths] = useState('');
  const [category, setCategory] = useState('ক্যারিয়ার ও স্কিল');

  // 3-Phase Customizable Inputs for New Roadmap
  const [phase1Title, setPhase1Title] = useState('');
  const [phase2Title, setPhase2Title] = useState('');
  const [phase3Title, setPhase3Title] = useState('');

  // Phase Edit & Achievement Modal State
  const [editingPhase, setEditingPhase] = useState<RoadmapPhase | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAchievementNotes, setEditAchievementNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'in_progress' | 'completed'>('in_progress');

  // Helper to parse Bengali or English numbers to integer months
  const parseMonths = (tf: string, customVal: string): number => {
    const parseNum = (str: string) => {
      const bnToEnMap: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
      };
      const normalized = str.replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);
      const match = normalized.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    if (tf === 'কাস্টম মাস') {
      const parsed = parseNum(customVal);
      return parsed > 0 ? parsed : 6;
    }
    const parsed = parseNum(tf);
    return parsed > 0 ? parsed : 6;
  };

  const liveMonths = parseMonths(timeframe, customMonths);
  const liveDays = liveMonths * 30;
  const livePhase1M = Math.max(1, Math.floor(liveMonths / 3));
  const livePhase2M = Math.max(1, Math.floor(liveMonths / 3));
  const livePhase3M = Math.max(1, liveMonths - livePhase1M - livePhase2M);

  const handleSaveRoadmapSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;

    const totalMonths = parseMonths(timeframe, customMonths);
    const effectiveTimeframe = `${formatBnNumber(totalMonths)} মাস`;

    const skillTitle = goalInput.trim();
    const fullTitle = detailsInput.trim()
      ? `${skillTitle} — ${detailsInput.trim()}`
      : skillTitle;

    // Determine target phase
    const targetPhase = activeRoadmap?.phases.find((p) => p.id === selectedPhaseId);

    if (targetPhase && onUpdateRoadmap && selectedPhaseId !== 'new_roadmap') {
      // Add milestone to the selected phase with auto-counted days
      const newMilestone: Milestone = {
        id: `m-${Date.now()}`,
        title: fullTitle,
        targetDays: totalMonths * 30,
        completed: false,
      };

      const updatedPhases = activeRoadmap.phases.map((phase) => {
        if (phase.id === targetPhase.id) {
          return {
            ...phase,
            milestones: [...phase.milestones, newMilestone],
          };
        }
        return phase;
      });

      onUpdateRoadmap({
        ...activeRoadmap,
        phases: updatedPhases,
      });
    } else {
      // Create new structured roadmap directly with 3 sequential mastery phases
      const p1M = Math.max(1, Math.floor(totalMonths / 3));
      const p2M = Math.max(1, Math.floor(totalMonths / 3));
      const p3M = Math.max(1, totalMonths - p1M - p2M);
      const p1Days = p1M * 30;
      const p2Days = p2M * 30;
      const p3Days = p3M * 30;

      const p1TitleText = phase1Title.trim() || `${skillTitle} শেখা ও মৌলিক প্রস্তুতি`;
      const p2TitleText = phase2Title.trim() || `${skillTitle} দিয়ে ছোট ছোট কাজ ও প্রজেক্ট কমপ্লিট করা`;
      const p3TitleText = phase3Title.trim() || `${skillTitle} দিয়ে প্রফেশনাল কাজ ও ইনকাম প্রতিষ্ঠা`;

      const newRoadmap: Roadmap = {
        id: `roadmap-${Date.now()}`,
        title: skillTitle,
        category: category,
        timeframe: effectiveTimeframe,
        summary: detailsInput.trim() || `${skillTitle} অর্জনের পরিকল্পনা (${formatBnNumber(totalMonths)} মাস)`,
        createdAt: getTodayStr(),
        advice: 'প্রতিদিনের ছোট ছোট পদক্ষেপই দীর্ঘমেয়াদে বড় সফলতায় রূপান্তরিত হয়। ধারাবাহিক অনুশীলন বজায় রাখুন।',
        phases: [
          {
            id: `phase-${Date.now()}-1`,
            phaseNumber: 1,
            title: p1TitleText,
            duration: `মাস 1 – ${formatBnNumber(p1M)} (মোট ${formatBnNumber(p1Days)} দিন)`,
            description: `${skillTitle}-এর প্রয়োজনীয় সমস্ত মৌলিক বিষয়, টুলস ও ফান্ডামেন্টালস গভীরভাবে আয়ত্ত করা।`,
            status: 'in_progress',
            milestones: [
              { id: `m-${Date.now()}-1`, title: `${skillTitle}-এর মৌলিক বিষয় ও টুলস 100% শেষ করা`, targetDays: Math.max(7, Math.round(p1Days / 2)), completed: false },
              { id: `m-${Date.now()}-2`, title: 'প্রথম নির্দেশিত বেসিক অ্যাসাইনমেন্ট ও টেস্ট প্রজেক্ট সম্পন্ন করা', targetDays: p1Days, completed: false },
            ],
          },
          {
            id: `phase-${Date.now()}-2`,
            phaseNumber: 2,
            title: p2TitleText,
            duration: `মাস ${formatBnNumber(p1M + 1)} – ${formatBnNumber(p1M + p2M)} (মোট ${formatBnNumber(p2Days)} দিন)`,
            description: `শেখা জ্ঞান কাজে লাগিয়ে ছোট ছোট প্রজেক্ট ও রিয়েল-লাইফ কাজ সম্পন্ন করা এবং পোর্টফোলিও তৈরি করা।`,
            status: 'pending',
            milestones: [
              { id: `m-${Date.now()}-3`, title: `3-5টি ছোট বাস্তব প্রজেক্ট সফলভাবে কমপ্লিট করা`, targetDays: p1Days + Math.max(15, Math.round(p2Days / 2)), completed: false },
              { id: `m-${Date.now()}-4`, title: 'কাজের ভুলত্রুটি সংশোধন ও নিজস্ব পোর্টফোলিও তৈরি করা', targetDays: p1Days + p2Days, completed: false },
            ],
          },
          {
            id: `phase-${Date.now()}-3`,
            phaseNumber: 3,
            title: p3TitleText,
            duration: `মাস ${formatBnNumber(p1M + p2M + 1)} – ${formatBnNumber(totalMonths)} (মোট ${formatBnNumber(p3Days)} দিন)`,
            description: `দক্ষতাকে প্রফেশনাল মানে নিয়ে গিয়ে মার্কেটপ্লেস বা ক্লায়েন্ট ডিলিংয়ের মাধ্যমে ইনকাম নিশ্চিত করা।`,
            status: 'pending',
            milestones: [
              { id: `m-${Date.now()}-5`, title: 'প্রফেশনাল মার্কেটপ্লেস প্রোফাইল বা ক্লায়েন্ট ডিলিং শুরু করা', targetDays: p1Days + p2Days + Math.max(15, Math.round(p3Days / 2)), completed: false },
              { id: `m-${Date.now()}-6`, title: 'প্রথম পেইড কাজ ডেলিভারি ও নিয়মিত ইনকাম প্রতিষ্ঠা করা', targetDays: totalMonths * 30, completed: false },
            ],
          },
        ],
      };
      onAddRoadmap(newRoadmap);
    }

    setShowAiModal(false);
    setGoalInput('');
    setDetailsInput('');
    setCustomMonths('');
    setPhase1Title('');
    setPhase2Title('');
    setPhase3Title('');
    playSuccessChime();
  };

  // Milestone check handler
  const handleMilestoneClick = (phaseId: string, milestoneId: string) => {
    onToggleMilestone(activeRoadmap.id, phaseId, milestoneId);
    playSuccessChime();
  };

  // Current active phase
  const currentActivePhaseId =
    activeRoadmap?.currentPhaseId ||
    activeRoadmap?.phases.find((p) => p.status === 'in_progress')?.id ||
    activeRoadmap?.phases[0]?.id;

  // Switch active phase
  const handleSwitchToPhase = (phaseId: string) => {
    if (!onUpdateRoadmap) return;
    const updatedRoadmap: Roadmap = {
      ...activeRoadmap,
      currentPhaseId: phaseId,
      phases: activeRoadmap.phases.map((p) => {
        if (p.id === phaseId) {
          return { ...p, status: p.status === 'completed' ? 'completed' : 'in_progress' };
        }
        return p;
      }),
    };
    onUpdateRoadmap(updatedRoadmap);
    playSuccessChime();
  };

  // Transfer to next phase (Phase 1 -> Phase 2, Phase 2 -> Phase 3)
  const handleTransferToNextPhase = (currentPhaseIndex: number) => {
    if (!onUpdateRoadmap) return;
    const currentPhase = activeRoadmap.phases[currentPhaseIndex];
    const nextPhase = activeRoadmap.phases[currentPhaseIndex + 1];
    if (!currentPhase || !nextPhase) return;

    // Collect all milestones from current phase to transfer to next phase
    const transferredMilestones: Milestone[] = currentPhase.milestones.map((m) => ({
      ...m,
      id: m.id.startsWith('trans-') ? m.id : `trans-${m.id}`,
      title: m.title.includes('(ফেজ')
        ? m.title
        : `${m.title} (ফেজ ${formatBnNumber(currentPhase.phaseNumber)} থেকে স্থানান্তরিত)`,
      completed: true,
    }));

    // Merge into next phase's milestones without duplicate IDs
    const existingNextIds = new Set(nextPhase.milestones.map((m) => m.id));
    const mergedMilestones = [
      ...transferredMilestones.filter((m) => !existingNextIds.has(m.id)),
      ...nextPhase.milestones,
    ];

    // Combine achievement notes
    const combinedNotes = [
      nextPhase.achievementNotes,
      currentPhase.achievementNotes
        ? `[ফেজ ${formatBnNumber(currentPhase.phaseNumber)} এর অর্জিত নোট]: ${currentPhase.achievementNotes}`
        : `[ফেজ ${formatBnNumber(currentPhase.phaseNumber)} এর সমস্ত মাইলফলক ও অর্জন সফলভাবে ফেজ ${formatBnNumber(nextPhase.phaseNumber)}-এ স্থানান্তরিত করা হয়েছে]`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const updatedPhases = activeRoadmap.phases.map((p, idx) => {
      if (idx === currentPhaseIndex) {
        return {
          ...p,
          status: 'completed' as const,
          achievementNotes: p.achievementNotes
            ? `${p.achievementNotes}\n(সবকিছু ফেজ ${formatBnNumber(nextPhase.phaseNumber)}-এ স্থানান্তরিত হয়েছে)`
            : `সবকিছু ফেজ ${formatBnNumber(nextPhase.phaseNumber)}-এ সফলভাবে স্থানান্তরিত হয়েছে।`,
        };
      }
      if (idx === currentPhaseIndex + 1) {
        return {
          ...p,
          status: 'in_progress' as const,
          milestones: mergedMilestones,
          achievementNotes: combinedNotes,
        };
      }
      return p;
    });

    const updatedRoadmap: Roadmap = {
      ...activeRoadmap,
      currentPhaseId: nextPhase.id,
      phases: updatedPhases,
    };
    onUpdateRoadmap(updatedRoadmap);
    playSuccessChime();
  };

  // Open phase edit modal
  const openEditPhaseModal = (phase: RoadmapPhase) => {
    setEditingPhase(phase);
    setEditTitle(phase.title);
    setEditDuration(phase.duration);
    setEditDescription(phase.description);
    setEditAchievementNotes(phase.achievementNotes || '');
    setEditStatus(
      phase.status || (phase.id === currentActivePhaseId ? 'in_progress' : 'pending')
    );
  };

  // Save phase edit
  const handleSavePhaseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase || !onUpdateRoadmap) return;

    const updatedPhases = activeRoadmap.phases.map((p) => {
      if (p.id === editingPhase.id) {
        return {
          ...p,
          title: editTitle.trim() || p.title,
          duration: editDuration.trim() || p.duration,
          description: editDescription.trim(),
          achievementNotes: editAchievementNotes.trim(),
          status: editStatus,
        };
      }
      return p;
    });

    const updatedRoadmap: Roadmap = {
      ...activeRoadmap,
      currentPhaseId: editStatus === 'in_progress' ? editingPhase.id : activeRoadmap.currentPhaseId,
      phases: updatedPhases,
    };

    onUpdateRoadmap(updatedRoadmap);
    setEditingPhase(null);
    playSuccessChime();
  };

  if (!activeRoadmap) {
    return <div>কোনো রোডম্যাপ পাওয়া যায়নি।</div>;
  }

  // Calculate overall roadmap progress
  const allMilestones = activeRoadmap.phases.flatMap((p) => p.milestones);
  const completedMilestones = allMilestones.filter((m) => m.completed).length;
  const progressPercent = allMilestones.length > 0 ? Math.round((completedMilestones / allMilestones.length) * 100) : 0;
  const totalRoadmapDays =
    allMilestones.length > 0
      ? Math.max(...allMilestones.map((m) => m.targetDays))
      : parseMonths(activeRoadmap.timeframe, '') * 30;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Roadmap Selector Tabs if multiple */}
      {roadmaps.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-[#6d7e79] shrink-0">রোডম্যাপ সমূহ:</span>
          {roadmaps.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRoadmap(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                r.id === activeRoadmap.id
                  ? 'bg-[#005B96] text-white shadow-xs'
                  : 'bg-white text-[#55697a] hover:bg-[#f3f0e8] border border-[#e6e2da]'
              }`}
            >
              {r.title} ({r.timeframe})
            </button>
          ))}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003d66] via-[#005B96] to-[#007cb3] rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#005B96]/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            সফলতার রোডম্যাপ এর তালিকা গুলো দেখুন
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
            জীবনে সফল হতে হলে কঠোর পরিশ্রম এবং ধৈর্য্য ধরে একটু একটু করে সামনের দিকে এগিয়ে যেতে হবে।
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedPhaseId('new_roadmap');
            setShowAiModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#FF8C00] hover:bg-[#e07b00] active:scale-95 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
        >
          নতুন রোড ম্যাপ এর তালিকা লেখুন
        </button>
      </div>

      {/* Progress & Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#e6e2da] shadow-2xs">
          <span className="text-xs font-bold text-[#6d7e79]">সার্বিক অগ্রগতি</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[#005B96] font-mono">
              {formatBnNumber(progressPercent)}%
            </span>
            <span className="text-xs font-bold text-[#00A3E0]">
              ({formatBnNumber(completedMilestones)}/{formatBnNumber(allMilestones.length)} মাইলফলক)
            </span>
          </div>
          <div className="w-full bg-[#f3f0e8] rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-[#005B96] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#e6e2da] shadow-2xs">
          <span className="text-xs font-bold text-[#6d7e79]">সময়সীমা ও অটো গণনা</span>
          <div className="text-base font-extrabold text-[#1a2724] mt-1">
            {activeRoadmap.timeframe}
          </div>
          <div className="text-xs text-[#005B96] font-bold mt-1">
            মোট {formatBnNumber(totalRoadmapDays)} দিন • ক্যাটাগরি: {activeRoadmap.category}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#e6e2da] shadow-2xs">
          <span className="text-xs font-bold text-[#6d7e79]">পর্যায় সংখ্যা</span>
          <div className="text-base font-extrabold text-[#1a2724] mt-1">
            {formatBnNumber(activeRoadmap.phases.length)}টি ধাপ (Phases)
          </div>
          <div className="text-xs text-[#005B96] font-bold mt-1">ধাপে ধাপে বড় লক্ষ্য অর্জন</div>
        </div>
      </div>

      {/* Phase Switcher Navigation Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e6e2da] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#005B96]" />
            <span className="text-xs font-bold text-[#1a2724]">ফেজ সুইচ ও অগ্রগতি নেভিগেশন:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {activeRoadmap.phases.map((phase, idx) => {
              const isCurrent = phase.id === currentActivePhaseId;
              const isCompleted =
                phase.status === 'completed' ||
                (phase.milestones.length > 0 && phase.milestones.every((m) => m.completed));
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => handleSwitchToPhase(phase.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#005B96] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-[#f8f9fa] text-[#55697a] hover:bg-[#e9ecef] border border-[#e6e2da]'
                  }`}
                >
                  <span>ফেজ {formatBnNumber(phase.phaseNumber)}</span>
                  {isCurrent ? (
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black">চলমান</span>
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3-Phase Roadmap Milestone Cards */}
      <div className="space-y-4">
        {activeRoadmap.phases.map((phase, phaseIndex) => {
          const totalPhaseM = phase.milestones.length;
          const completedPhaseM = phase.milestones.filter((m) => m.completed).length;
          const phaseProgressPercent =
            totalPhaseM > 0 ? Math.round((completedPhaseM / totalPhaseM) * 100) : 0;
          const isCurrent = phase.id === currentActivePhaseId;
          const isCompleted =
            phase.status === 'completed' || (totalPhaseM > 0 && completedPhaseM === totalPhaseM);
          const nextPhase = activeRoadmap.phases[phaseIndex + 1];

          return (
            <div
              key={phase.id}
              className={`bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-2xs space-y-4 transition-all ${
                isCurrent
                  ? 'border-[#005B96] ring-1 ring-[#005B96]/20'
                  : isCompleted
                  ? 'border-emerald-200/80 bg-emerald-50/10'
                  : 'border-[#e6e2da]'
              }`}
            >
              {/* Phase Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeae2] pb-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      isCurrent
                        ? 'bg-[#005B96] text-white shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {formatBnNumber(phase.phaseNumber)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-[#005B96]">
                        ফেজ {formatBnNumber(phase.phaseNumber)}: {phase.title}
                      </h3>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-[#005B96] text-white px-2 py-0.5 rounded-md shadow-2xs">
                          <Sparkles className="w-3 h-3 text-[#F0E68C]" />
                          চলমান ফেজ
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          সমাপ্ত
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6d7e79] mt-0.5">
                      {phase.duration} — {phase.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                  {/* Switch to this Phase Button */}
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleSwitchToPhase(phase.id)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[#005B96]/40 text-[#005B96] hover:bg-[#005B96]/10 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>ফেজ {formatBnNumber(phase.phaseNumber)}-এ সুইচ করুন</span>
                    </button>
                  )}

                  {/* Transfer to Next Phase Button */}
                  {isCurrent && nextPhase && (
                    <button
                      type="button"
                      onClick={() => handleTransferToNextPhase(phaseIndex)}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#FF8C00] hover:bg-[#e07b00] active:scale-95 text-white transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      title="ফেজ সম্পন্ন করে পরবর্তী ফেজে যান"
                    >
                      <span>ফেজ {formatBnNumber(nextPhase.phaseNumber)}-এ ট্রান্সফার করুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Edit Phase Button */}
                  <button
                    type="button"
                    onClick={() => openEditPhaseModal(phase)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[#e6e2da] hover:border-[#005B96]/40 text-[#55697a] hover:text-[#005B96] hover:bg-[#f8f9fa] transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>এডিট ফেজ</span>
                  </button>

                  <div className="text-xs font-mono font-bold text-[#005B96] bg-[#005B96]/10 px-2.5 py-1.5 rounded-xl border border-[#005B96]/20">
                    সম্পন্ন: {formatBnNumber(completedPhaseM)}/{formatBnNumber(totalPhaseM)}
                  </div>
                </div>
              </div>

              {/* Phase Achievement Section */}
              <div className="p-3.5 rounded-2xl bg-[#faf8f5] border border-[#eee8df] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#FF8C00] shrink-0" />
                    <span className="text-xs font-extrabold text-[#1a2724]">
                      ফেজ {formatBnNumber(phase.phaseNumber)}-এর অর্জন ও অগ্রগতি:
                    </span>
                    <span className="text-xs font-bold text-[#005B96]">
                      {formatBnNumber(phaseProgressPercent)}% ({formatBnNumber(completedPhaseM)}/{formatBnNumber(totalPhaseM)} মাইলফলক অর্জিত)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditPhaseModal(phase)}
                    className="text-xs font-bold text-[#005B96] hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{phase.achievementNotes ? 'অর্জনের নোট পরিবর্তন' : '+ অর্জনের বিবরণ লিখুন'}</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#e6e2da] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#005B96] to-[#007cb3] h-full rounded-full transition-all duration-300"
                    style={{ width: `${phaseProgressPercent}%` }}
                  />
                </div>

                {/* Detailed Achievement Writeup */}
                {phase.achievementNotes ? (
                  <div className="pt-1 text-xs leading-relaxed text-[#1a2724] bg-white p-3 rounded-xl border border-[#e6e2da]">
                    <span className="font-extrabold text-[#005B96] block mb-0.5">অর্জনের বিস্তারিত বিবরণ:</span>
                    <p className="whitespace-pre-wrap">{phase.achievementNotes}</p>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-[#6d7e79] italic flex items-center justify-between">
                    <span>ফেজ {formatBnNumber(phase.phaseNumber)}-এ আপনি কী কী অর্জন করেছেন তা বিস্তারিত লিখে রাখতে পারেন।</span>
                    <button
                      type="button"
                      onClick={() => openEditPhaseModal(phase)}
                      className="text-xs font-bold text-[#005B96] hover:underline cursor-pointer not-italic ml-2 shrink-0"
                    >
                      + বিবরণ লিখুন
                    </button>
                  </div>
                )}
              </div>

              {/* Milestones List */}
              <div className="space-y-2.5">
                {phase.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      milestone.completed
                        ? 'bg-[#005B96]/5 border-[#005B96]/20'
                        : 'bg-white border-[#e6e2da] hover:border-[#005B96]/30'
                    }`}
                  >
                    <div
                      onClick={() => handleMilestoneClick(phase.id, milestone.id)}
                      className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#005B96] shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#b0a99f] hover:text-[#005B96] shrink-0" />
                      )}
                      <div className="flex items-center gap-2 min-w-0 flex-wrap flex-1">
                        <span
                          className={`text-xs sm:text-sm font-bold break-words leading-snug ${
                            milestone.completed ? 'line-through text-[#869792]' : 'text-[#1a2724]'
                          }`}
                        >
                          {milestone.title}
                        </span>
                        {(milestone.title.includes('স্থানান্তরিত') || milestone.id.startsWith('trans-')) && (
                          <span className="text-[10px] font-bold bg-[#005B96]/10 text-[#005B96] px-2 py-0.5 rounded-md shrink-0">
                            স্থানান্তরিত
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="text-[11px] font-mono text-[#55697a] bg-[#f8f9fa] px-2.5 py-1 rounded-lg border border-[#e6e2da]">
                        টার্গেট: {formatBnNumber(milestone.targetDays)} দিন
                        {milestone.targetDays >= 30 && ` (${formatBnNumber(Math.round(milestone.targetDays / 30))} মাস)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Skill to this Phase button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhaseId(phase.id);
                    setShowAiModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[#005B96]/40 text-[#005B96] hover:bg-[#005B96]/5 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ফেজ {formatBnNumber(phase.phaseNumber)}-এ নতুন স্কিল যোগ করুন</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Advice & Daily Habits Recommendation */}
      {activeRoadmap.advice && (
        <div className="bg-[#F0E68C]/20 border border-[#F6A600]/30 p-4 sm:p-5 rounded-2xl flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-[#F6A600] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1a2724] space-y-1">
            <span className="font-extrabold text-[#1a2724] block">মেন্টর টিপস ও বাস্তব পরামর্শ:</span>
            <p className="leading-relaxed text-[#55697a]">{activeRoadmap.advice}</p>
          </div>
        </div>
      )}

      {/* Roadmap Skill Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-[#e6e2da] overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#005B96]">
                  আপনার সফলতার রোডম্যাপ গুলো নিচে লিখুন
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg text-[#869792] hover:text-[#1a2724] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoadmapSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">
                  আপনার কাঙ্ক্ষিত চূড়ান্ত লক্ষ্য <span className="text-[#FF8C00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: আফটার ইফেক্ট এ মাস্টারি অর্জন করা"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e2da] text-sm font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                />
              </div>

              {/* 3 Sequential Phases for New Roadmap */}
              {selectedPhaseId === 'new_roadmap' && (
                <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-[#005B96]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#005B96]">
                      <Layers className="w-4 h-4 text-[#005B96]" />
                      <span>3টি ধারাবাহিক ধাপে সফলতার ফেজসমূহ:</span>
                    </div>
                    <span className="text-[11px] text-[#55697a] font-medium">প্রয়োজনে পরিবর্তন করতে পারেন</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#1a2724]">
                          1ম ধাপ (শেখা): মৌলিক ভিত্তি ও শিক্ষা
                        </label>
                        <span className="text-[10px] text-[#005B96] font-semibold">মাস 1 – {formatBnNumber(livePhase1M)}</span>
                      </div>
                      <input
                        type="text"
                        value={phase1Title}
                        onChange={(e) => setPhase1Title(e.target.value)}
                        placeholder={goalInput ? `${goalInput} শেখা ও মৌলিক প্রস্তুতি` : 'মৌলিক ভিত্তি ও ফান্ডামেন্টালস শেখা'}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#1a2724]">
                          2য় ধাপ (অনুশীলন): ছোট ছোট কাজ বা প্রজেক্ট কমপ্লিট করা
                        </label>
                        <span className="text-[10px] text-[#005B96] font-semibold">মাস {formatBnNumber(livePhase1M + 1)} – {formatBnNumber(livePhase1M + livePhase2M)}</span>
                      </div>
                      <input
                        type="text"
                        value={phase2Title}
                        onChange={(e) => setPhase2Title(e.target.value)}
                        placeholder={goalInput ? `${goalInput} দিয়ে ছোট ছোট কাজ বা প্রজেক্ট কমপ্লিট করা` : 'ছোট ছোট কাজ ও বাস্তব প্রজেক্ট কমপ্লিট করা'}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#1a2724]">
                          3য় ধাপ (ইনকাম): প্রফেশনাল কাজ ও এটা দিয়ে ইনকাম করা
                        </label>
                        <span className="text-[10px] text-[#005B96] font-semibold">মাস {formatBnNumber(livePhase1M + livePhase2M + 1)} – {formatBnNumber(liveMonths)}</span>
                      </div>
                      <input
                        type="text"
                        value={phase3Title}
                        onChange={(e) => setPhase3Title(e.target.value)}
                        placeholder={goalInput ? `${goalInput} দিয়ে প্রফেশনাল কাজ ও ইনকাম করা` : 'প্রফেশনাল কাজ ও ক্যারিয়ার/ইনকাম প্রতিষ্ঠা'}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">
                  বিস্তারিত উল্লেখ্য করুন
                </label>
                <textarea
                  rows={2}
                  placeholder="বিস্তারিত উল্লেখ্য করুন..."
                  value={detailsInput}
                  onChange={(e) => setDetailsInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">
                  কোন ফেজে যোগ করবেন? <span className="text-[#FF8C00]">*</span>
                </label>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                >
                  {activeRoadmap.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      ফেজ {formatBnNumber(phase.phaseNumber)}: {phase.title}
                    </option>
                  ))}
                  <option value="new_roadmap">নতুন সম্পূর্ণ রোডম্যাপ হিসেবে তৈরি করুন</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1a2724] mb-1">ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                  >
                    <option value="ক্যারিয়ার ও স্কিল">ক্যারিয়ার ও স্কিল</option>
                    <option value="ব্যবসা ও ইনকাম">ব্যবসা ও ইনকাম</option>
                    <option value="শিক্ষা ও পড়াশোনা">শিক্ষা ও পড়াশোনা</option>
                    <option value="স্বাস্থ্য ও ফিটনেস">স্বাস্থ্য ও ফিটনেস</option>
                    <option value="ব্যক্তিগত উন্নয়ন">ব্যক্তিগত উন্নয়ন</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a2724] mb-1">সময়সীমা</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                  >
                    <option value="1 মাস">1 মাস</option>
                    <option value="3 মাস">3 মাস</option>
                    <option value="6 মাস">6 মাস</option>
                    <option value="12 মাস">12 মাস</option>
                    <option value="কাস্টম মাস">কাস্টম মাস লিখুন</option>
                  </select>
                </div>
              </div>

              {timeframe === 'কাস্টম মাস' && (
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#005B96]/20">
                  <label className="block text-xs font-bold text-[#005B96] mb-1">
                    কাস্টম মাস লিখুন <span className="text-[#FF8C00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: 9 মাস বা 18 মাস"
                    value={customMonths}
                    onChange={(e) => setCustomMonths(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                  />
                </div>
              )}

              {/* Live Auto-Count display */}
              <div className="p-3 rounded-xl bg-[#005B96]/5 border border-[#005B96]/20 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#005B96]">স্বয়ংক্রিয় সময় গণনা (Auto Count):</span>
                  <span className="font-black text-[#1a2724] bg-white px-2 py-0.5 rounded-md border border-[#005B96]/20">
                    {formatBnNumber(liveMonths)} মাস = {formatBnNumber(liveDays)} দিন
                  </span>
                </div>
                {selectedPhaseId === 'new_roadmap' ? (
                  <div className="text-[11px] text-[#55697a] flex items-center justify-between border-t border-[#005B96]/10 pt-1.5">
                    <span>3টি ফেজে অটো বিভাজন:</span>
                    <span className="font-semibold text-[#005B96]">
                      ফেজ 1 ({formatBnNumber(livePhase1M)} মাস) • ফেজ 2 ({formatBnNumber(livePhase2M)} মাস) • ফেজ 3 ({formatBnNumber(livePhase3M)} মাস)
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#55697a] flex items-center justify-between border-t border-[#005B96]/10 pt-1.5">
                    <span>নির্বাচিত ফেজে যুক্ত হবে:</span>
                    <span className="font-semibold text-[#005B96]">
                      টার্গেট {formatBnNumber(liveDays)} দিন ({formatBnNumber(liveMonths)} মাস)
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#55697a] hover:bg-[#f3f0e8] cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  রোডম্যাপ তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Phase Modal */}
      {editingPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-[#e6e2da] overflow-hidden p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#eeeae2] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#005B96]" />
                <h3 className="text-base font-bold text-[#005B96]">
                  ফেজ {formatBnNumber(editingPhase.phaseNumber)} সম্পাদনা / মডিফাই করুন
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPhase(null)}
                className="p-1 rounded-lg text-[#869792] hover:text-[#1a2724] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhaseEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">
                  ফেজের শিরোনাম <span className="text-[#FF8C00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e2da] text-xs sm:text-sm font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1a2724] mb-1">
                    মেয়াদ ও সময়কাল
                  </label>
                  <input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="যেমন: মাস 1 – 2 (মোট 60 দিন)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a2724] mb-1">
                    ফেজের অবস্থা (স্ট্যাটাস)
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as 'pending' | 'in_progress' | 'completed')
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96]"
                  >
                    <option value="in_progress">চলমান (In Progress)</option>
                    <option value="completed">সম্পন্ন (Completed)</option>
                    <option value="pending">অপেক্ষমাণ (Pending)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1">
                  ফেজের সংক্ষিপ্ত উদ্দেশ্য ও পরিকল্পনা
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="এই ফেজের মূল উদ্দেশ্য কী..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a2724] mb-1 flex items-center justify-between">
                  <span>এই ফেজে অর্জনের বিস্তারিত বিবরণ</span>
                  <span className="text-[#005B96] font-normal text-[11px]">বিস্তারিত লিখে রাখুন</span>
                </label>
                <textarea
                  rows={4}
                  value={editAchievementNotes}
                  onChange={(e) => setEditAchievementNotes(e.target.value)}
                  placeholder="ফেজটিতে আপনি কী কী শিখলেন বা অর্জন করলেন বিস্তারিত লিখুন (যেমন: 5টি প্রজেক্ট সম্পন্ন করেছি, নির্দিষ্ট দক্ষতা অর্জন করেছি ইত্যাদি)..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#e6e2da] text-xs font-medium text-[#1a2724] bg-white focus:outline-none focus:border-[#005B96] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPhase(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#55697a] text-xs font-bold transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#005B96] hover:bg-[#004877] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  পরিবর্তন সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
