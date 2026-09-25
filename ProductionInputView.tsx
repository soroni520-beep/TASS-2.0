import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Calendar,
  Tag,
  Hash,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  Printer,
  FileText,
  Eye,
  Download,
  CheckCircle2,
  X,
  Palette,
  Clock,
  Shirt,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ProductionInput, BlkOrder } from '../types';
import { sounds } from '../utils/soundEffects';
import { downloadChallanPdf, downloadProductionReportPdf } from '../utils/pdfDownloader';

export interface BlkColorAggregate {
  key: string;
  blkNumber: string;
  buyerName: string;
  color: string;
  totalQty: number;
  entriesCount: number;
  sizeTotals: Record<string, number>;
  entries: ProductionInput[];
  targetQty?: number;
}

interface ProductionInputViewProps {
  inputs: ProductionInput[];
  blkOrders: BlkOrder[];
  onOpenNewInput: () => void;
  onEditInput: (input: ProductionInput) => void;
  onRefresh: () => void;
}

export const ProductionInputView: React.FC<ProductionInputViewProps> = ({
  inputs,
  blkOrders,
  onOpenNewInput,
  onEditInput,
  onRefresh,
}) => {
  const { isAdmin, logActivity } = useAuth();

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColor, setSelectedColor] = useState('all');
  const [viewMode, setViewMode] = useState<'cumulative' | 'records'>('cumulative');
  const [expandedBlkKeys, setExpandedBlkKeys] = useState<Record<string, boolean>>({});

  // PDF Preview Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfReportTitle, setPdfReportTitle] = useState('');
  const [pdfSelectedBlk, setPdfSelectedBlk] = useState<string>('');
  const [pdfItems, setPdfItems] = useState<ProductionInput[]>([]);
  const [pdfZoomScale, setPdfZoomScale] = useState<number>(1); // 1 = 100%, 0.85, 0.75

  // In-App Delete Confirmation State (Bypasses window.confirm which fails in iframes)
  const [deleteTargetInput, setDeleteTargetInput] = useState<ProductionInput | null>(null);
  const [deleteTargetGroup, setDeleteTargetGroup] = useState<BlkColorAggregate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle accordion
  const toggleExpand = (key: string) => {
    sounds.playToot();
    setExpandedBlkKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filtered Inputs: Instant search matching BLK, Buyer, Color, SR NO, Line, Bundle, Date
  const filteredInputs = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase();

    return inputs.filter((inp) => {
      // 1. Color filter
      if (selectedColor !== 'all' && inp.color.toLowerCase() !== selectedColor.toLowerCase()) {
        return false;
      }

      // 2. Text search
      if (!rawSearch) return true;

      const blkMatch = inp.blkNumber.toLowerCase().includes(rawSearch);
      const buyerMatch = inp.buyerName.toLowerCase().includes(rawSearch);
      const colorMatch = inp.color.toLowerCase().includes(rawSearch);
      const srMatch = inp.srNumber && inp.srNumber.toLowerCase().includes(rawSearch);
      const lineMatch = inp.lineNo && inp.lineNo.toLowerCase().includes(rawSearch);
      const dateMatch = inp.date && inp.date.toLowerCase().includes(rawSearch);
      const remarksMatch = inp.remarks && inp.remarks.toLowerCase().includes(rawSearch);

      return Boolean(blkMatch || buyerMatch || colorMatch || srMatch || lineMatch || dateMatch || remarksMatch);
    });
  }, [inputs, searchTerm, selectedColor]);

  // Aggregate by BLK + Color for cumulative view
  const blkColorAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        blkNumber: string;
        buyerName: string;
        color: string;
        totalQty: number;
        entriesCount: number;
        sizeTotals: Record<string, number>;
        entries: ProductionInput[];
        targetQty?: number;
      }
    >();

    for (const inp of filteredInputs) {
      const groupKey = `${inp.blkNumber.trim().toUpperCase()}__${inp.color.trim().toUpperCase()}`;

      if (!map.has(groupKey)) {
        const blkObj = blkOrders.find(
          (b) => b.blkNumber.trim().toUpperCase() === inp.blkNumber.trim().toUpperCase()
        );
        map.set(groupKey, {
          key: groupKey,
          blkNumber: inp.blkNumber,
          buyerName: inp.buyerName,
          color: inp.color,
          totalQty: 0,
          entriesCount: 0,
          sizeTotals: {},
          entries: [],
          targetQty: blkObj?.totalTargetQty,
        });
      }

      const item = map.get(groupKey)!;
      item.totalQty += Number(inp.totalQty) || 0;
      item.entriesCount += 1;
      item.entries.push(inp);

      if (inp.sizes) {
        for (const [sz, qty] of Object.entries(inp.sizes)) {
          item.sizeTotals[sz] = (item.sizeTotals[sz] || 0) + (Number(qty) || 0);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredInputs, blkOrders]);

  // Unique colors for dropdown filter
  const allColors = useMemo(() => {
    const set = new Set<string>();
    inputs.forEach((i) => {
      if (i.color) set.add(i.color);
    });
    return Array.from(set);
  }, [inputs]);

  // Today's total
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTotal = useMemo(() => {
    return inputs
      .filter((i) => i.date === todayStr)
      .reduce((sum, i) => sum + (Number(i.totalQty) || 0), 0);
  }, [inputs, todayStr]);

  const grandTotal = useMemo(() => {
    return filteredInputs.reduce((sum, i) => sum + (Number(i.totalQty) || 0), 0);
  }, [filteredInputs]);

  // Trigger in-app delete confirmation for a single input record
  const handleDeleteInput = (inp: ProductionInput) => {
    sounds.playToot();
    setDeleteTargetInput(inp);
  };

  // Execute deletion of a single record
  const executeDeleteInput = async () => {
    if (!deleteTargetInput) return;
    const inp = deleteTargetInput;
    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, 'production_inputs', inp.id));
      await logActivity(
        'delete_input',
        `মাল ইনপুট ডিলিট: BLK ${inp.blkNumber}, কালার ${inp.color}, SR ${inp.srNumber}, পরিমাণ: ${inp.totalQty} pcs`,
        'production_input',
        inp.id
      );
      sounds.playDelete();
      setDeleteTargetInput(null);
      onRefresh();
    } catch (err) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.DELETE, `production_inputs/${inp.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Trigger in-app delete confirmation for an entire BLK group
  const handleDeleteBlkGroup = (group: BlkColorAggregate) => {
    sounds.playToot();
    setDeleteTargetGroup(group);
  };

  // Execute deletion of an entire BLK group
  const executeDeleteBlkGroup = async () => {
    if (!deleteTargetGroup) return;
    const group = deleteTargetGroup;
    setIsDeleting(true);

    try {
      for (const entry of group.entries) {
        await deleteDoc(doc(db, 'production_inputs', entry.id));
      }
      await logActivity(
        'delete_input_group',
        `পুরো BLK ইনপুট ডিলিট: BLK ${group.blkNumber}, কালার ${group.color}, মোট ${group.entries.length} টি লট (${group.totalQty} pcs)`,
        'production_input'
      );
      sounds.playDelete();
      setDeleteTargetGroup(null);
      onRefresh();
    } catch (err) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.DELETE, `production_inputs`);
    } finally {
      setIsDeleting(false);
    }
  };

  // OPEN PDF MODAL FOR A SINGLE RECORD
  const handleOpenSingleRecordPdf = (inp: ProductionInput) => {
    sounds.playToot();
    setPdfReportTitle(`মাল ইনপুট চালান / রিপোর্ট - ${inp.blkNumber} (SR: ${inp.srNumber || 'N/A'})`);
    setPdfSelectedBlk(inp.blkNumber);
    setPdfItems([inp]);
    setPdfZoomScale(1);
    setIsPdfModalOpen(true);
  };

  // OPEN PDF MODAL FOR AN ENTIRE BLK
  const handleOpenBlkPdf = (blkNo: string, itemsList: ProductionInput[]) => {
    sounds.playToot();
    setPdfReportTitle(`সম্পূর্ণ BLK মাল ইনপুট রিপোর্ট - ${blkNo}`);
    setPdfSelectedBlk(blkNo);
    setPdfItems(itemsList);
    setPdfZoomScale(1);
    setIsPdfModalOpen(true);
  };

  // OPEN PDF MODAL FOR ALL CURRENTLY FILTERED RECORDS
  const handleOpenAllFilteredPdf = () => {
    sounds.playToot();
    if (filteredInputs.length === 0) {
      alert('পিডিএফ তৈরির জন্য কোনো রেকর্ড নেই।');
      return;
    }
    setPdfReportTitle(`ফিল্টারকৃত মাল ইনপুট সারসংক্ষেপ রিপোর্ট`);
    setPdfSelectedBlk(filteredInputs[0]?.blkNumber || 'ALL');
    setPdfItems(filteredInputs);
    setPdfZoomScale(1);
    setIsPdfModalOpen(true);
  };

  // REAL PDF DOWNLOAD ACTION
  const handleDownloadPdf = () => {
    sounds.playSuccess();
    try {
      const firstItem = pdfItems[0];
      downloadChallanPdf({
        blkNo: pdfCalculatedTotals.blkNo,
        buyerName: pdfCalculatedTotals.buyerName,
        color: pdfCalculatedTotals.color,
        items: pdfItems,
        totalPcs: pdfCalculatedTotals.totalPcs,
      });
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback
      window.print();
    }
  };

  // PRINT ACTION
  const handlePrintPdf = () => {
    sounds.playTap();
    window.print();
  };

  // Calculate totals for PDF view
  const pdfCalculatedTotals = useMemo(() => {
    let totalPcs = 0;
    const sizeSums: Record<string, number> = {};

    pdfItems.forEach((item) => {
      totalPcs += Number(item.totalQty) || 0;
      if (item.sizes) {
        Object.entries(item.sizes).forEach(([sz, q]) => {
          sizeSums[sz] = (sizeSums[sz] || 0) + (Number(q) || 0);
        });
      }
    });

    const buyerName = pdfItems[0]?.buyerName || 'N/A';
    const blkNo = pdfItems[0]?.blkNumber || pdfSelectedBlk || 'N/A';
    const color = pdfItems[0]?.color || 'Mixed';

    return { totalPcs, sizeSums, buyerName, blkNo, color };
  }, [pdfItems, pdfSelectedBlk]);

  return (
    <div className="space-y-3">
      {/* 1. STATS MINI-BOXES - VIBRANT CYAN & EMERALD HIGHLIGHT THEME */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-sm shadow-emerald-500/5">
          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            আজকের মোট ইনপুট
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 font-mono">
            {todayTotal.toLocaleString()}{' '}
            <span className="text-[10px] text-slate-400 font-normal">pcs</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-sm shadow-cyan-500/5">
          <div className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            ফিল্টারকৃত মোট ইনপুট
          </div>
          <div className="text-lg sm:text-xl font-black text-cyan-300 mt-0.5 font-mono">
            {grandTotal.toLocaleString()}{' '}
            <span className="text-[10px] text-slate-400 font-normal">pcs</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-teal-500/40 shadow-sm shadow-teal-500/5">
          <div className="text-[10px] text-teal-300 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            Style/Order:
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-300 mt-0.5 font-mono">
            {blkColorAggregates.length}{' '}
            <span className="text-[10px] text-slate-400 font-normal">স্টাইল</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-sm shadow-cyan-500/5">
          <div className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            কাটিং No
          </div>
          <div className="text-lg sm:text-xl font-black text-white mt-0.5 font-mono">
            {filteredInputs.length}{' '}
            <span className="text-[10px] text-slate-400 font-normal">টি</span>
          </div>
        </div>
      </div>

      {/* 2. SMART SEARCH & CONTROLS WITH COMPACT ACTION BUTTONS */}
      <div className="bg-slate-900 border border-cyan-500/30 p-2.5 rounded-2xl space-y-2 shadow-sm">
        {/* Search Input, Quick Actions and View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Main search box with instant text matching */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BLK, বায়ার, কালার, SR NO, লাইন বা তারিখ খুঁজুন..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setSearchTerm('');
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            {/* Color Filter Dropdown */}
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bold"
            >
              <option value="all">সব কালার</option>
              {allColors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* View Mode Toggle (Cyan / Emerald Style) */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setViewMode('cumulative');
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  viewMode === 'cumulative'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                সাইজ হিসাব
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setViewMode('records');
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  viewMode === 'records'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                রেকর্ড তালিকা
              </button>
            </div>

            {/* PDF Challan Action */}
            <button
              type="button"
              onClick={handleOpenAllFilteredPdf}
              title="পিডিএফ চালান বা রিপোর্ট প্রিভিউ দেখুন"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black border border-emerald-400/40 flex items-center gap-1 transition-all active:scale-95 shadow-sm whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">পিডিএফ চালান</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: CUMULATIVE BLK + COLOR VIEW (CYAN & EMERALD GREEN HIGHLIGHTS) */}
      {viewMode === 'cumulative' && (
        <div className="space-y-2.5">
          {blkColorAggregates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
              কোনো মাল ইনপুট রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            blkColorAggregates.map((group) => {
              const isExpanded = expandedBlkKeys[group.key];
              return (
                <div
                  key={group.key}
                  className="rounded-2xl bg-slate-900 border border-cyan-500/20 hover:border-cyan-400/50 transition-all overflow-hidden shadow-sm"
                >
                  {/* Card Header */}
                  <div className="p-3 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-cyan-300 text-sm px-2.5 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 shadow-xs">
                        {group.blkNumber}
                      </span>
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                        বায়ার: {group.buyerName}
                      </span>
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-xs shadow-cyan-400" />
                        {group.color}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({group.entriesCount} টি কাটিং এন্ট্রি)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400 font-bold">মোট ইনপুট</div>
                        <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                          {group.totalQty.toLocaleString()}{' '}
                          <span className="text-[10px] text-cyan-200/70 font-normal">pcs</span>
                        </div>
                      </div>

                      {/* DEDICATED PDF REPORT BUTTON FOR THIS BLK */}
                      <button
                        type="button"
                        onClick={() => handleOpenBlkPdf(group.blkNumber, group.entries)}
                        className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>পিডিএফ চালান</span>
                      </button>

                      {/* DELETE ENTIRE BLK GROUP */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBlkGroup(group)}
                        title="এই BLK এর সকল ইনপুট রেকর্ড মুছে ফেলুন"
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-bold active:scale-95 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(group.key)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold active:scale-95 transition-all flex items-center gap-1 border border-slate-700"
                      >
                        <span className="text-[10px] hidden sm:inline">
                          {isExpanded ? 'লুকান' : 'কাটিং No দেখুন'}
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Size-by-Size Cumulative Summary Bar */}
                  <div className="p-2.5 bg-slate-900 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>সাইজ বাই সাইজ নির্ভুল মোট যোগফল:</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Object.entries(group.sizeTotals).map(([sz, qty]) => (
                        <div
                          key={sz}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 border border-cyan-500/30 text-[11px] font-mono flex items-center gap-1 shadow-2xs"
                        >
                          <span className="text-cyan-300 font-bold">{sz}:</span>
                          <strong className="text-emerald-400 font-black">{qty.toLocaleString()}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accordion: Individual Lots */}
                  {isExpanded && (
                    <div className="p-2.5 bg-slate-950 border-t border-cyan-500/20 space-y-1">
                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                        কাটিং ইনপুট ইতিহাস (তারিখ, কাটিং/SR NO ও সাইজ):
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-[10px] text-cyan-300 uppercase border-b border-slate-800 font-bold bg-slate-900/80">
                            <tr>
                              <th className="p-1.5">তারিখ</th>
                              <th className="p-1.5">SR NO</th>
                              <th className="p-1.5">লাইন</th>
                              <th className="p-1.5">সাইজ ব্রেকডাউন</th>
                              <th className="p-1.5 text-right">মোট পিস</th>
                              <th className="p-1.5 text-center">পিডিএফ / একশন</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-300">
                            {group.entries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-slate-900/60 transition-colors">
                                <td className="p-1.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                  {entry.date}
                                </td>
                                <td className="p-1.5 font-mono font-bold text-cyan-300 whitespace-nowrap">
                                  {entry.srNumber || '-'}
                                </td>
                                <td className="p-1.5 text-slate-300 font-semibold whitespace-nowrap">
                                  {entry.lineNo || '-'}
                                </td>
                                <td className="p-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(entry.sizes || {}).map(([sz, q]) => (
                                      <span
                                        key={sz}
                                        className="px-1.5 py-0.5 rounded bg-cyan-950/70 text-[10px] font-mono text-cyan-200 border border-cyan-500/30"
                                      >
                                        <span className="text-cyan-300">{sz}:</span>
                                        <strong className="text-emerald-400 ml-0.5">{q}</strong>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-1.5 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                                  {entry.totalQty.toLocaleString()} pcs
                                </td>
                                <td className="p-1.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSingleRecordPdf(entry)}
                                      title="চালান / পিডিএফ দেখুন"
                                      className="p-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300"
                                    >
                                      <Printer className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onEditInput(entry)}
                                      title="এডিট"
                                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInput(entry)}
                                      title="ডিলিট"
                                      className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: FLAT RECORDS TABLE (CYAN & EMERALD GREEN HIGHLIGHTS) */}
      {viewMode === 'records' && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-cyan-300 border-b border-cyan-500/30 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-2.5">তারিখ (Date)</th>
                  <th className="p-2.5">SR NO</th>
                  <th className="p-2.5">BLK NO</th>
                  <th className="p-2.5">বায়ার</th>
                  <th className="p-2.5">কালার</th>
                  <th className="p-2.5">লাইন</th>
                  <th className="p-2.5">সাইজ ও পিস</th>
                  <th className="p-2.5 text-right">মোট পিস</th>
                  <th className="p-2.5 text-center">পিডিএফ</th>
                  <th className="p-2.5 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredInputs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500 text-xs">
                      কোনো ইনপুট রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredInputs.map((inp) => (
                    <tr key={inp.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-2.5 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {inp.date}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-500/40">
                          {inp.srNumber || '-'}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-black text-cyan-300 whitespace-nowrap">
                        {inp.blkNumber}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-300 whitespace-nowrap">
                        {inp.buyerName}
                      </td>
                      <td className="p-2.5 text-cyan-300 whitespace-nowrap font-bold flex items-center gap-1 pt-3.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                        {inp.color}
                      </td>
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">{inp.lineNo || '-'}</td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Object.entries(inp.sizes || {}).map(([sz, q]) => (
                            <span
                              key={sz}
                              className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-[10px] font-mono text-cyan-200 border border-cyan-500/30"
                            >
                              <span className="text-cyan-300">{sz}:</span>
                              <strong className="text-emerald-400 ml-0.5">{q}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-400 whitespace-nowrap text-sm">
                        {inp.totalQty.toLocaleString()} pcs
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenSingleRecordPdf(inp)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[10px] font-bold flex items-center justify-center gap-1 mx-auto active:scale-95 transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          <span>প্রিভিউ</span>
                        </button>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditInput(inp)}
                            title="এডিট"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInput(inp)}
                            title="ডিলিট"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FULLY VISIBLE & RESPONSIVE PDF REPORT PREVIEW MODAL                    */}
      {/* ========================================================================= */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-4xl h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Top Toolbar (Sticky, Always visible) */}
            <div className="p-2.5 sm:p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-2xl flex-shrink-0 print:hidden">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black text-white truncate">
                  {pdfReportTitle}
                </h3>
              </div>

              {/* Controls: Zoom & Print */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Zoom buttons */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-850 px-2 py-1 rounded-xl border border-slate-700 text-[11px] text-slate-300 font-bold">
                  <button
                    type="button"
                    onClick={() => setPdfZoomScale((s) => Math.max(0.7, s - 0.1))}
                    title="ছোট করুন"
                    className="hover:text-white"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[10px] w-10 text-center">
                    {Math.round(pdfZoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPdfZoomScale((s) => Math.min(1.3, s + 0.1))}
                    title="বড় করুন"
                    className="hover:text-white"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfZoomScale(1)}
                    title="স্বাভাবিক মাপ"
                    className="ml-1 text-[10px] text-amber-400 hover:underline"
                  >
                    ১০০%
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF ডাউনলোড</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all hidden sm:flex"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playToot();
                    setIsPdfModalOpen(false);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Area (Ensures 100% of the document is scrollable and readable) */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-950 flex justify-center items-start">
              <div
                id="printable-pdf-document"
                style={{ transform: `scale(${pdfZoomScale})`, transformOrigin: 'top center' }}
                className="w-full max-w-3xl bg-white text-slate-900 p-5 sm:p-8 rounded-2xl shadow-2xl border-t-8 border-orange-600 border-x border-b border-orange-200 space-y-4 font-sans transition-transform duration-200"
              >
                {/* Header (Green text & Deep Orange accent) */}
                <div className="border-b-2 border-orange-500 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-emerald-700 uppercase">
                      TASS GARMENT PRODUCTION
                    </h1>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">
                      গার্মেন্ট মাল ইনপুট ও ডেলিভারি চালান / রিপোর্ট
                    </p>
                  </div>

                  <div className="text-right text-[11px] font-mono">
                    <div className="text-emerald-800 font-bold">তারিখ: {new Date().toLocaleDateString('bn-BD')}</div>
                    <div className="text-orange-600 font-semibold">সময়: {new Date().toLocaleTimeString('bn-BD')}</div>
                  </div>
                </div>

                {/* Metadata Cards (Deep Orange & Green Accents) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-orange-50/80 border border-orange-200 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-orange-900 block font-semibold text-[11px]">BLK নম্বর:</span>
                    <span className="font-mono font-black text-orange-700 text-sm">
                      {pdfCalculatedTotals.blkNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-900 block font-semibold text-[11px]">বায়ার (Buyer):</span>
                    <span className="font-bold text-emerald-800 text-sm">{pdfCalculatedTotals.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-orange-900 block font-semibold text-[11px]">কালার (Color):</span>
                    <span className="font-bold text-slate-900">{pdfCalculatedTotals.color}</span>
                  </div>
                  <div>
                    <span className="text-emerald-900 block font-semibold text-[11px]">মোট লট:</span>
                    <span className="font-black text-emerald-700">{pdfItems.length} টি লট</span>
                  </div>
                </div>

                {/* Table with Date, SR NO, Line, Sizes (Cyan Numbers), Total */}
                <div className="border-2 border-orange-300 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white uppercase font-black text-[10px] border-b border-orange-400">
                      <tr>
                        <th className="p-2.5 border-r border-orange-400/60 whitespace-nowrap">তারিখ (Date)</th>
                        <th className="p-2.5 border-r border-orange-400/60 whitespace-nowrap">SR NO</th>
                        <th className="p-2.5 border-r border-orange-400/60 whitespace-nowrap">লাইন / বান্ডেল</th>
                        <th className="p-2.5 border-r border-orange-400/60">সাইজভিত্তিক সংখ্যা (Size Breakdown)</th>
                        <th className="p-2.5 text-right whitespace-nowrap">মোট পিস (Total)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100 text-slate-800">
                      {pdfItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-orange-50/40">
                          <td className="p-2.5 border-r border-orange-200 font-mono text-[11px] whitespace-nowrap text-slate-700">
                            {item.date}
                          </td>
                          <td className="p-2.5 border-r border-orange-200 font-mono font-black whitespace-nowrap text-orange-600">
                            {item.srNumber || '-'}
                          </td>
                          <td className="p-2.5 border-r border-orange-200 whitespace-nowrap text-slate-700 font-medium">
                            {item.lineNo || '-'} {item.bundleNo ? `(B: ${item.bundleNo})` : ''}
                          </td>
                          <td className="p-2.5 border-r border-orange-200">
                            <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                              {Object.entries(item.sizes || {}).map(([sz, q]) => (
                                <span
                                  key={sz}
                                  className="px-2 py-0.5 bg-cyan-50/90 rounded border border-cyan-300 flex items-center gap-1 shadow-2xs"
                                >
                                  <strong className="text-slate-700">{sz}:</strong>
                                  <span className="font-black text-cyan-600 text-xs">{q}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap text-xs">
                            {item.totalQty.toLocaleString()} pcs
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Grand Totals Footer (Size breakdown summary removed as requested) */}
                    <tfoot className="bg-orange-50 font-black border-t-2 border-orange-400">
                      <tr>
                        <td colSpan={4} className="p-3 text-right uppercase text-emerald-800 font-black text-xs border-r border-orange-200">
                          সর্বমোট পরিমাণ (GRAND TOTAL):
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-orange-700 bg-orange-100 whitespace-nowrap">
                          {pdfCalculatedTotals.totalPcs.toLocaleString()} pcs
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures for formal garment memo (Green and Orange accents) */}
                <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs text-slate-700">
                  <div className="border-t-2 border-orange-400 pt-1.5">
                    <strong className="text-emerald-800 block font-black">ইনপুট প্রদানকারী</strong>
                    <div className="text-[10px] text-slate-500 font-semibold">Prepared By</div>
                  </div>
                  <div className="border-t-2 border-orange-400 pt-1.5">
                    <strong className="text-emerald-800 block font-black">লাইন ইনচার্জ / সুপারভাইজার</strong>
                    <div className="text-[10px] text-slate-500 font-semibold">Checked By</div>
                  </div>
                  <div className="border-t-2 border-orange-400 pt-1.5">
                    <strong className="text-emerald-800 block font-black">ফ্লোর ম্যানেজার / অনুমোদনকারী</strong>
                    <div className="text-[10px] text-slate-500 font-semibold">Authorized Signature</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. IN-APP DELETE CONFIRMATION MODAL (100% ROBUST ACROSS ALL BROWSERS)     */}
      {/* ========================================================================= */}
      {(deleteTargetInput || deleteTargetGroup) && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">ডিলিট নিশ্চিতকরণ</h3>
                <p className="text-[11px] text-slate-400">আপনি কি রেকর্ডটি ডাটাবেস থেকে মুছে ফেলতে চান?</p>
              </div>
            </div>

            {deleteTargetInput && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">বিএলকে (BLK):</span>
                  <span className="font-mono font-bold text-amber-300">{deleteTargetInput.blkNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">কালার ও SR NO:</span>
                  <span className="text-slate-200">{deleteTargetInput.color} ({deleteTargetInput.srNumber || 'N/A'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">তারিখ ও লাইন:</span>
                  <span className="text-slate-300">{deleteTargetInput.date} (লাইন: {deleteTargetInput.lineNo || '-'})</span>
                </div>
                <div className="flex justify-between border-t border-slate-850 pt-1.5 mt-1 font-bold">
                  <span className="text-rose-400">মোট পরিমাণ:</span>
                  <span className="font-mono text-yellow-400">{deleteTargetInput.totalQty.toLocaleString()} pcs</span>
                </div>
              </div>
            )}

            {deleteTargetGroup && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">বিএলকে (BLK):</span>
                  <span className="font-mono font-bold text-amber-300">{deleteTargetGroup.blkNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">কালার:</span>
                  <span className="text-slate-200">{deleteTargetGroup.color}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">মোট লট সংখ্যা:</span>
                  <span className="text-slate-300">{deleteTargetGroup.entries.length} টি লট</span>
                </div>
                <div className="flex justify-between border-t border-slate-850 pt-1.5 mt-1 font-bold">
                  <span className="text-rose-400">সর্বমোট পরিমাণ:</span>
                  <span className="font-mono text-yellow-400">{deleteTargetGroup.totalQty.toLocaleString()} pcs</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTargetInput(null);
                  setDeleteTargetGroup(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all active:scale-95"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (deleteTargetInput) executeDeleteInput();
                  else if (deleteTargetGroup) executeDeleteBlkGroup();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
