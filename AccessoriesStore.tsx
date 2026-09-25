import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  Layers,
  Edit2,
  Trash2,
  X,
  Calculator,
  Tag,
  Hash,
  Palette,
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Accessory, AccessoryTransaction, BlkOrder } from '../types';
import { sounds } from '../utils/soundEffects';

interface AccessoriesStoreProps {
  accessories: Accessory[];
  transactions: AccessoryTransaction[];
  blkOrders: BlkOrder[];
  onRefresh: () => void;
}

export const AccessoriesStore: React.FC<AccessoriesStoreProps> = ({
  accessories,
  transactions,
  blkOrders,
  onRefresh,
}) => {
  const { userProfile, currentUser, logActivity } = useAuth();

  // Search & Active view
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'items' | 'records' | 'calculator'>('items');

  // ELASTIC CALCULATOR STATE: (মাল ইনপুট পিস × ইঞ্চি) ÷ ৩৬ = মোট গজ
  const [elasticPcs, setElasticPcs] = useState<number>(1000);
  const [elasticInches, setElasticInches] = useState<number>(26);
  const [elasticType, setElasticType] = useState<string>('ইলাস্টিক ২.২');

  // THREAD (সুতা) CONSUMPTION CALCULATOR STATE: (ইনপুট পিস × বডি মিটার) ÷ (৪০০০ বা ৩০০০)
  const [threadPcs, setThreadPcs] = useState<number>(1000);
  const [threadMetersPerBody, setThreadMetersPerBody] = useState<number>(150);
  const [coneSizeMeters, setConeSizeMeters] = useState<number>(4000); // 4000m or 3000m
  const [calcSubTab, setCalcSubTab] = useState<'thread' | 'elastic'>('thread');

  // Modal 1: Line Entry Modal (ফ্লোর লাইনে মাল এন্ট্রি)
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<Accessory | null>(null);
  const [lineName, setLineName] = useState('Line-01');
  const [lineBlk, setLineBlk] = useState('');
  const [lineColor, setLineColor] = useState('');
  const [lineSrNo, setLineSrNo] = useState('');
  const [lineQty, setLineQty] = useState<number>(0);
  const [lineNote, setLineNote] = useState('');
  const [lineDate, setLineDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal 2: Add / Edit Accessory Item Modal
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Accessory | null>(null);
  const [accName, setAccName] = useState('');
  const [accCategory, setAccCategory] = useState<Accessory['category']>('Thread');
  const [accSpec, setAccSpec] = useState('');
  const [accUnit, setAccUnit] = useState<Accessory['unit']>('cones');

  // Modal 3: Edit Existing Line Record Modal
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccessoryTransaction | null>(null);
  const [editRecordQty, setEditRecordQty] = useState<number>(0);
  const [editRecordLine, setEditRecordLine] = useState('Line-01');
  const [editRecordBlk, setEditRecordBlk] = useState('');
  const [editRecordColor, setEditRecordColor] = useState('');
  const [editRecordSrNo, setEditRecordSrNo] = useState('');
  const [editRecordNote, setEditRecordNote] = useState('');
  const [editRecordDate, setEditRecordDate] = useState('');

  // Delete confirmation
  const [deletingTarget, setDeletingTarget] = useState<{ type: 'acc' | 'record'; id: string; name: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Elastic Yard Calculation: (Pcs × Inches) / 36
  const totalElasticYards = useMemo(() => {
    const pcs = Number(elasticPcs) || 0;
    const inch = Number(elasticInches) || 0;
    if (pcs <= 0 || inch <= 0) return 0;
    return Number(((pcs * inch) / 36).toFixed(2));
  }, [elasticPcs, elasticInches]);

  // Thread Consumption: (মাল ইনপুট পিস × প্রতি বডিতে মিটার) ÷ (৪০০০ বা ৩০০০)
  const threadCalculation = useMemo(() => {
    const pcs = Number(threadPcs) || 0;
    const mPerBody = Number(threadMetersPerBody) || 0;
    const coneSize = Number(coneSizeMeters) || 4000;
    if (pcs <= 0 || mPerBody <= 0 || coneSize <= 0) {
      return { totalMeters: 0, totalCones: 0, ceilingCones: 0 };
    }
    const totalMeters = pcs * mPerBody;
    const exactCones = totalMeters / coneSize;
    const totalCones = Number(exactCones.toFixed(2));
    const ceilingCones = Math.ceil(exactCones);
    return { totalMeters, totalCones, ceilingCones };
  }, [threadPcs, threadMetersPerBody, coneSizeMeters]);

  // Filtered items
  const filteredAccessories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return accessories;
    return accessories.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        (a.spec && a.spec.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [accessories, searchTerm]);

  // Filtered line records
  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      return (
        t.accessoryName.toLowerCase().includes(q) ||
        (t.recipientLine && t.recipientLine.toLowerCase().includes(q)) ||
        (t.blkNumber && t.blkNumber.toLowerCase().includes(q)) ||
        (t.color && t.color.toLowerCase().includes(q)) ||
        (t.srNumber && t.srNumber.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q))
      );
    });
  }, [transactions, searchTerm]);

  // 1. OPEN LINE ENTRY MODAL
  const handleOpenLineEntry = (acc: Accessory) => {
    sounds.playToot();
    setSelectedAcc(acc);
    setLineQty(0);
    setLineName('Line-01');
    setLineBlk(blkOrders[0]?.blkNumber || '');
    setLineColor('');
    setLineSrNo('SR-01');
    setLineNote('');
    setLineDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setIsLineModalOpen(true);
  };

  // SAVE LINE ENTRY (WITH LINE, BLK, COLOR, SR NO)
  const handleSaveLineEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc) return;
    if (lineQty <= 0) {
      sounds.playDelete();
      setError('পরিমাণ অবশ্যই শূন্যের বেশি দিতে হবে।');
      return;
    }

    if (!lineName.trim()) {
      sounds.playDelete();
      setError('লাইন নাম্বার প্রদান করুন।');
      return;
    }

    setSaving(true);
    setError(null);

    const userEmail = userProfile?.email || currentUser?.email || 'operator';
    const userName = userProfile?.displayName || currentUser?.displayName || userEmail;

    try {
      const txData: Omit<AccessoryTransaction, 'id'> = {
        accessoryId: selectedAcc.id,
        accessoryName: selectedAcc.name,
        type: 'issue',
        quantity: lineQty,
        unit: selectedAcc.unit,
        recipientLine: lineName.trim(),
        blkNumber: lineBlk.trim(),
        color: lineColor.trim(),
        srNumber: lineSrNo.trim(),
        note: lineNote.trim(),
        operatorEmail: userEmail,
        operatorName: userName,
        date: lineDate,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'accessories_transactions'), txData);

      await logActivity(
        'issue_accessory',
        `লাইন এন্ট্রি: ${selectedAcc.name}, লাইন: ${lineName}, BLK: ${lineBlk}, Color: ${lineColor}, SR: ${lineSrNo}, পরিমাণ: ${lineQty} ${selectedAcc.unit}`,
        'accessory',
        selectedAcc.id
      );

      sounds.playSuccess();
      setIsLineModalOpen(false);
      onRefresh();
    } catch (err: any) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.WRITE, 'accessories_transactions');
      setError('লাইন এন্ট্রি সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // 2. OPEN ACCESSORY CREATE / EDIT
  const handleOpenAccModal = (acc?: Accessory) => {
    sounds.playToot();
    setError(null);
    if (acc) {
      setEditingAcc(acc);
      setAccName(acc.name);
      setAccCategory(acc.category);
      setAccSpec(acc.spec || '');
      setAccUnit(acc.unit);
    } else {
      setEditingAcc(null);
      setAccName('');
      setAccCategory('Thread');
      setAccSpec('');
      setAccUnit('cones');
    }
    setIsAccModalOpen(true);
  };

  // SAVE ACCESSORY
  const handleSaveAccessory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      sounds.playDelete();
      setError('এক্সেসরিজের নাম প্রদান করুন।');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Omit<Accessory, 'id'> = {
      name: accName.trim(),
      category: accCategory,
      spec: accSpec.trim(),
      unit: accUnit,
      currentStock: 0,
      minAlertStock: 0,
      createdAt: editingAcc ? editingAcc.createdAt : new Date().toISOString(),
    };

    try {
      if (editingAcc) {
        await updateDoc(doc(db, 'accessories', editingAcc.id), payload);
        await logActivity('update_accessory', `এক্সেসরিজ এডিট: ${payload.name}`, 'accessory', editingAcc.id);
      } else {
        const docRef = await addDoc(collection(db, 'accessories'), payload);
        await logActivity('create_accessory', `এক্সেসরিজ যুক্ত: ${payload.name}`, 'accessory', docRef.id);
      }

      sounds.playSuccess();
      setIsAccModalOpen(false);
      onRefresh();
    } catch (err: any) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.WRITE, 'accessories');
      setError('সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // 3. EDIT EXISTING LINE RECORD
  const handleOpenEditRecord = (record: AccessoryTransaction) => {
    sounds.playToot();
    setEditingRecord(record);
    setEditRecordQty(record.quantity);
    setEditRecordLine(record.recipientLine || 'Line-01');
    setEditRecordBlk(record.blkNumber || '');
    setEditRecordColor(record.color || '');
    setEditRecordSrNo(record.srNumber || '');
    setEditRecordNote(record.note || '');
    setEditRecordDate(record.date);
    setError(null);
    setIsEditRecordModalOpen(true);
  };

  const handleSaveEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (editRecordQty <= 0) {
      sounds.playDelete();
      setError('পরিমাণ শূন্যের বেশি দিন।');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'accessories_transactions', editingRecord.id), {
        quantity: editRecordQty,
        recipientLine: editRecordLine.trim(),
        blkNumber: editRecordBlk.trim(),
        color: editRecordColor.trim(),
        srNumber: editRecordSrNo.trim(),
        note: editRecordNote.trim(),
        date: editRecordDate,
        updatedAt: new Date().toISOString(),
      });

      sounds.playSuccess();
      setIsEditRecordModalOpen(false);
      onRefresh();
    } catch (err: any) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.WRITE, 'accessories_transactions');
      setError('আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // 4. CONFIRM DELETE (ITEM OR RECORD)
  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setSaving(true);
    setError(null);

    try {
      if (deletingTarget.type === 'acc') {
        await deleteDoc(doc(db, 'accessories', deletingTarget.id));
        await logActivity('delete_accessory', `এক্সেসরিজ ডিলিট: ${deletingTarget.name}`, 'accessory', deletingTarget.id);
      } else {
        await deleteDoc(doc(db, 'accessories_transactions', deletingTarget.id));
        await logActivity('delete_transaction', `লাইন রেকর্ড ডিলিট: ${deletingTarget.name}`, 'accessory', deletingTarget.id);
      }

      sounds.playDelete();
      setDeletingTarget(null);
      onRefresh();
    } catch (err: any) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.WRITE, 'accessories');
      setError('ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                sounds.playToot();
                setActiveTab('items');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'items'
                  ? 'bg-orange-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              এক্সেসরিজ ({accessories.length})
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playToot();
                setActiveTab('records');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'records'
                  ? 'bg-orange-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              লাইন এন্ট্রি রেকর্ড ({transactions.length})
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playToot();
                setActiveTab('calculator');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-amber-300 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>ইলাস্টিক অটো হিসাব</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="খুঁজুন (লাইন, BLK, SR, কালার)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpenAccModal()}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ নতুন আইটেম</span>
          </button>
        </div>
      </div>

      {/* TAB 1: THREAD & ELASTIC CONSUMPTION AUTO CALCULATOR */}
      {(activeTab === 'calculator' || activeTab === 'items') && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3 sm:p-4 shadow-md space-y-3">
          {/* Header with Switcher Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-slate-950 font-black">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  গার্মেন্ট কনজাম্পশন অটো ক্যালকুলেটর
                </h3>
                <p className="text-[10px] text-slate-400">
                  ইনপুট মাল অনুযায়ী সুতা ও ইলাস্টিকের সঠিক প্রয়োজনীয় হিসাব বের করুন
                </p>
              </div>
            </div>

            {/* Sub Tabs: Thread vs Elastic */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setCalcSubTab('thread');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  calcSubTab === 'thread'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                সুতার কনজাম্পশন (Thread)
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setCalcSubTab('elastic');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  calcSubTab === 'elastic'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ইলাস্টিক হিসাব (Elastic)
              </button>
            </div>
          </div>

          {/* 1. THREAD CONSUMPTION SECTION */}
          {calcSubTab === 'thread' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1 text-[11px] bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-1.5">
                <span className="text-amber-300 font-bold">
                  সুতার হিসাব সূত্র: (মোট ইনপুট পিস × ১ বডিতে সুতার মিটার) ÷ {coneSizeMeters} মিটার = মোট কোণ (Cones)
                </span>
                <span className="text-[10px] font-mono text-orange-400">
                  কোণ সাইজ: {coneSizeMeters}M
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Thread Total Pieces */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    মোট মাল ইনপুট (Pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={threadPcs || ''}
                    onChange={(e) => {
                      sounds.playTap();
                      setThreadPcs(Number(e.target.value) || 0);
                    }}
                    placeholder="1000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* 2. Meters per body */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    ১ বডিতে সুতা লাগে (মিটার)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={threadMetersPerBody || ''}
                    onChange={(e) => {
                      sounds.playTap();
                      setThreadMetersPerBody(Number(e.target.value) || 0);
                    }}
                    placeholder="150"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* 3. Cone Length Selector (4000m or 3000m) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    সুতার কোণ সাইজ (মিটার ভাগ)
                  </label>
                  <select
                    value={coneSizeMeters}
                    onChange={(e) => {
                      sounds.playToot();
                      setConeSizeMeters(Number(e.target.value));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                  >
                    <option value={4000}>৪,০০০ মিটার / কোণ (4000M Cone)</option>
                    <option value={3000}>৩,০০০ মিটার / কোণ (3000M Cone)</option>
                    <option value={5000}>৫,০০০ মিটার / কোণ (5000M Cone)</option>
                    <option value={2000}>২,০০০ মিটার / কোণ (2000M Cone)</option>
                  </select>
                </div>

                {/* 4. Resulting Cones */}
                <div className="bg-orange-500/15 border border-orange-500/40 rounded-xl p-2.5 flex flex-col justify-center shadow-xs">
                  <span className="text-[10px] font-bold text-orange-300">প্রয়োজনীয় সুতা:</span>
                  <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                    {threadCalculation.totalCones.toLocaleString()}{' '}
                    <span className="text-xs text-orange-200 font-bold">কোণ ({threadCalculation.ceilingCones} Cones)</span>
                  </div>
                </div>
              </div>

              {/* Quick Meter Presets & Summary */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-400 font-bold">বডি মিটার প্রিসেট:</span>
                {[80, 100, 120, 140, 150, 180, 200, 250].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      sounds.playToot();
                      setThreadMetersPerBody(m);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      threadMetersPerBody === m
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {m}m
                  </button>
                ))}

                <span className="text-[10px] text-slate-400 font-mono ml-auto">
                  মোট মিটার: {threadCalculation.totalMeters.toLocaleString()}M ÷ {coneSizeMeters}M = <strong>{threadCalculation.totalCones} Cones</strong>
                </span>
              </div>
            </div>
          )}

          {/* 2. ELASTIC CONSUMPTION SECTION */}
          {calcSubTab === 'elastic' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1 text-[11px] bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5">
                <span className="text-amber-300 font-bold">
                  ইলাস্টিক সূত্র: (মোট ইনপুট পিস × ১ বডিতে ইঞ্চি) ÷ ৩৬ = মোট গজ (Yards)
                </span>
                <span className="text-[10px] font-mono text-amber-400">১ গজ = ৩৬ ইঞ্চি</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Input Pieces */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    মোট মাল ইনপুট (Pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={elasticPcs || ''}
                    onChange={(e) => {
                      sounds.playTap();
                      setElasticPcs(Number(e.target.value) || 0);
                    }}
                    placeholder="1000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* 2. Elastic Inch per Body */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    ১ বডিতে ইলাস্টিক (ইঞ্চি)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={elasticInches || ''}
                    onChange={(e) => {
                      sounds.playTap();
                      setElasticInches(Number(e.target.value) || 0);
                    }}
                    placeholder="26"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* 3. Elastic Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    ইলাস্টিক সাইজ / স্পেক
                  </label>
                  <select
                    value={elasticType}
                    onChange={(e) => setElasticType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ইলাস্টিক ২.২">ইলাস্টিক ২.২</option>
                    <option value="ইলাস্টিক ২.৭">ইলাস্টিক ২.৭</option>
                    <option value="ইলাস্টিক ৩.০">ইলাস্টিক ৩.০</option>
                    <option value="দোস্টিং">দোস্টিং (Drawstring)</option>
                  </select>
                </div>

                {/* 4. Resulting Yards */}
                <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-amber-300">প্রয়োজনীয় ইলাস্টিক:</span>
                  <div className="text-base sm:text-lg font-black text-yellow-400 font-mono">
                    {totalElasticYards.toLocaleString()}{' '}
                    <span className="text-xs text-amber-200 font-bold">গজ (Yards)</span>
                  </div>
                </div>
              </div>

              {/* Quick Inch Preset chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-400 font-bold">কমন ইঞ্চি:</span>
                {[20, 22, 24, 26, 28, 30, 32, 34].map((inch) => (
                  <button
                    key={inch}
                    type="button"
                    onClick={() => {
                      sounds.playToot();
                      setElasticInches(inch);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      elasticInches === inch
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {inch}"
                  </button>
                ))}
                <span className="text-[10px] text-slate-400 font-mono ml-auto">
                  হিসাব: {elasticPcs} × {elasticInches} ÷ 36 = {totalElasticYards} গজ
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACCESSORIES LIST - CLEAN, COMPACT BOXES WITH LINE ENTRY, EDIT, DELETE */}
      {activeTab === 'items' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300">এক্সেসরিজ তালিকা</h3>
            <span className="text-[11px] text-amber-400 font-bold">
              লাইন এন্ট্রি দিতে নিচের বাটনে ক্লিক করুন
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredAccessories.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2.5 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-xs font-black text-white">{acc.name}</h4>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                      {acc.unit}
                    </span>
                  </div>
                  {acc.spec && (
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      সাইজ: <span className="text-amber-300 font-bold">{acc.spec}</span>
                    </div>
                  )}
                </div>

                {/* 3 User-Requested Direct Actions: Line Entry, Edit, Delete */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenLineEntry(acc)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <Layers className="w-3 h-3 stroke-[2.5]" />
                    <span>লাইন এন্ট্রি</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAccModal(acc)}
                    title="এডিট"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold active:scale-95 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playToot();
                      setDeletingTarget({ type: 'acc', id: acc.id, name: acc.name });
                    }}
                    title="ডিলিট"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LINE ENTRY RECORDS (COMPACT TABLE WITH LINE, BLK, COLOR, SR NO, EDIT, DELETE) */}
      {(activeTab === 'records' || activeTab === 'items') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-400" />
              <span>লাইন এন্ট্রি রেকর্ড তালিকা (Line, BLK, Color, SR NO সহ)</span>
            </h3>
            <span className="text-[11px] font-mono text-amber-400 font-bold">
              মোট: {filteredRecords.length} টি এন্ট্রি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-amber-300/80 border-b border-slate-800 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5">লাইন নাম্বার</th>
                  <th className="p-2.5">BLK NO</th>
                  <th className="p-2.5">কালার (Color)</th>
                  <th className="p-2.5">SR NO</th>
                  <th className="p-2.5">এক্সেসরিজ</th>
                  <th className="p-2.5 text-right">পরিমাণ</th>
                  <th className="p-2.5">নোট</th>
                  <th className="p-2.5 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 text-xs">
                      কোনো লাইন এন্ট্রি রেকর্ড নেই। উপরে যেকোনো এক্সেসরিজের 'লাইন এন্ট্রি' বাটনে চাপ দিন।
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-2.5 whitespace-nowrap font-mono text-[11px] text-slate-400">{r.date}</td>
                      <td className="p-2.5 font-bold text-amber-400 whitespace-nowrap">
                        {r.recipientLine || 'Line-01'}
                      </td>
                      <td className="p-2.5 font-mono text-orange-400 whitespace-nowrap font-bold">
                        {r.blkNumber || '-'}
                      </td>
                      <td className="p-2.5 font-semibold text-white whitespace-nowrap">
                        {r.color || '-'}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-yellow-300 font-mono font-bold text-[10px]">
                          {r.srNumber || '-'}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-white whitespace-nowrap">{r.accessoryName}</td>
                      <td className="p-2.5 text-right font-black text-yellow-400 font-mono whitespace-nowrap">
                        {r.quantity.toLocaleString()} {r.unit}
                      </td>
                      <td className="p-2.5 text-slate-400 text-[11px] max-w-xs truncate">{r.note || '-'}</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRecord(r)}
                            title="এডিট"
                            className="p-1 rounded-lg bg-slate-850 hover:bg-slate-700 text-amber-300"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playToot();
                              setDeletingTarget({
                                type: 'record',
                                id: r.id,
                                name: `${r.accessoryName} (${r.quantity} ${r.unit} -> ${r.recipientLine})`,
                              });
                            }}
                            title="ডিলিট"
                            className="p-1 rounded-lg bg-slate-850 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
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

      {/* MODAL 1: LINE ENTRY MODAL (WITH CUSTOM LINE, BLK, COLOR, SR NO) */}
      {isLineModalOpen && selectedAcc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-4 space-y-3.5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    লাইনে মাল এন্ট্রি: <span className="text-amber-400">{selectedAcc.name}</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedAcc.spec || selectedAcc.category}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setIsLineModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveLineEntry} className="space-y-3">
              {/* Row 1: Line Number & BLK Number (Custom Input) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    লাইন নাম্বার (Line No) *
                  </label>
                  <input
                    type="text"
                    required
                    value={lineName}
                    onChange={(e) => setLineName(e.target.value)}
                    placeholder="যেমন: Line-01, Line-04..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                  />
                  {/* Quick line suggestions */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {['Line-01', 'Line-02', 'Line-03', 'Line-04'].map((ln) => (
                      <button
                        key={ln}
                        type="button"
                        onClick={() => {
                          sounds.playToot();
                          setLineName(ln);
                        }}
                        className="px-1.5 py-0.5 rounded text-[9px] bg-slate-850 hover:bg-amber-500/20 text-slate-300 font-mono"
                      >
                        {ln}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    BLK নাম্বার (BLK NO)
                  </label>
                  <input
                    type="text"
                    value={lineBlk}
                    onChange={(e) => setLineBlk(e.target.value)}
                    placeholder="যেমন: BLK-2026-01..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                  />
                  {/* Quick blk suggestions if available */}
                  {blkOrders.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 overflow-x-auto">
                      {blkOrders.slice(0, 3).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            sounds.playToot();
                            setLineBlk(b.blkNumber);
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-slate-850 hover:bg-amber-500/20 text-slate-300 font-mono whitespace-nowrap"
                        >
                          {b.blkNumber}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Color & SR NO (Custom Input) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    কালার (Color)
                  </label>
                  <input
                    type="text"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    placeholder="যেমন: Black, Navy, Olive..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    SR NO (এসআর নাম্বার)
                  </label>
                  <input
                    type="text"
                    value={lineSrNo}
                    onChange={(e) => setLineSrNo(e.target.value)}
                    placeholder="যেমন: SR-01, SR-02..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Row 3: Quantity & Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    পরিমাণ ({selectedAcc.unit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={lineQty || ''}
                    onChange={(e) => {
                      sounds.playTap();
                      setLineQty(Number(e.target.value) || 0);
                    }}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-yellow-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={lineDate}
                    onChange={(e) => setLineDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                  নোট / চালান / মন্তব্য
                </label>
                <input
                  type="text"
                  value={lineNote}
                  onChange={(e) => setLineNote(e.target.value)}
                  placeholder="যেমন: দোস্টিং লাইন ইস্যু..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playToot();
                    setIsLineModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs active:scale-95 transition-all shadow-md flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'সেভ হচ্ছে...' : 'লাইন এন্ট্রি সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT ACCESSORY ITEM */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs sm:text-sm font-black text-white">
                {editingAcc ? 'এক্সেসরিজ এডিট' : 'নতুন এক্সেসরিজ যোগ করুন'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setIsAccModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveAccessory} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-0.5">নাম *</label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="যেমন: দোস্টিং, সুতা ৫০/২, ইলাস্টিক ২.২"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">ক্যাটাগরি</label>
                  <select
                    value={accCategory}
                    onChange={(e) => setAccCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Thread">সুতা (Thread)</option>
                    <option value="Elastic">ইলাস্টিক (Elastic)</option>
                    <option value="Drawstring">দোস্টিং (Drawstring)</option>
                    <option value="Button">বোতাম (Button)</option>
                    <option value="Label">লেবেল (Label)</option>
                    <option value="Other">অন্যান্য (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">সাইজ / স্পেক</label>
                  <input
                    type="text"
                    value={accSpec}
                    onChange={(e) => setAccSpec(e.target.value)}
                    placeholder="৫০/২, ২.২ cm..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-0.5">একক (Unit)</label>
                <select
                  value={accUnit}
                  onChange={(e) => setAccUnit(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="cones">কোণ (cones)</option>
                  <option value="meters">মিটার (meters)</option>
                  <option value="yards">গজ (yards)</option>
                  <option value="kg">কেজি (kg)</option>
                  <option value="pcs">পিস (pcs)</option>
                  <option value="rolls">রোল (rolls)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playToot();
                    setIsAccModalOpen(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs active:scale-95 transition-all shadow-sm"
                >
                  {saving ? 'সেভ হচ্ছে...' : editingAcc ? 'আপডেট' : 'সেভ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT EXISTING LINE RECORD */}
      {isEditRecordModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs sm:text-sm font-black text-white">লাইন রেকর্ড এডিট</h3>
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setIsEditRecordModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveEditRecord} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">লাইন নাম্বার</label>
                  <input
                    type="text"
                    value={editRecordLine}
                    onChange={(e) => setEditRecordLine(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">BLK NO</label>
                  <input
                    type="text"
                    value={editRecordBlk}
                    onChange={(e) => setEditRecordBlk(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">কালার (Color)</label>
                  <input
                    type="text"
                    value={editRecordColor}
                    onChange={(e) => setEditRecordColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">SR NO</label>
                  <input
                    type="text"
                    value={editRecordSrNo}
                    onChange={(e) => setEditRecordSrNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                    পরিমাণ ({editingRecord.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editRecordQty}
                    onChange={(e) => setEditRecordQty(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">তারিখ</label>
                  <input
                    type="date"
                    value={editRecordDate}
                    onChange={(e) => setEditRecordDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-0.5">নোট / মন্তব্য</label>
                <input
                  type="text"
                  value={editRecordNote}
                  onChange={(e) => setEditRecordNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playToot();
                    setIsEditRecordModalOpen(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs active:scale-95 transition-all shadow-sm"
                >
                  {saving ? 'আপডেট হচ্ছে...' : 'আপডেট'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deletingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-xs p-4 space-y-3 shadow-xl text-center">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white">ডিলিট নিশ্চিত করুন</h3>
              <p className="text-[11px] text-rose-300 mt-0.5 font-semibold">{deletingTarget.name}</p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setDeletingTarget(null);
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-4 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs active:scale-95 transition-all shadow-sm"
              >
                {saving ? 'মুছে যাচ্ছে...' : 'ডিলিট'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
