import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Plus,
  RefreshCw,
  Calculator,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hash,
  Palette,
  Shirt,
  Tag,
  Trash2,
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Buyer, BlkOrder, ProductionInput } from '../types';
import { sounds } from '../utils/soundEffects';
import { SizePresetManager } from './SizePresetManager';

interface ProductionInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyers?: Buyer[];
  blkOrders: BlkOrder[];
  existingInputs?: ProductionInput[];
  editingInput?: ProductionInput | null;
  prefilledBlk?: BlkOrder | null;
  onSaveSuccess?: () => void;
  onSaved?: () => void;
}

export const ProductionInputModal: React.FC<ProductionInputModalProps> = ({
  isOpen,
  onClose,
  buyers = [],
  blkOrders,
  existingInputs = [],
  editingInput,
  prefilledBlk,
  onSaveSuccess,
  onSaved,
}) => {
  const { userProfile, currentUser, logActivity } = useAuth();

  // Form states
  const [selectedBlkId, setSelectedBlkId] = useState<string>('');
  const [blkNumber, setBlkNumber] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [srNumber, setSrNumber] = useState<string>('');
  const [bundleNo, setBundleNo] = useState<string>('');
  const [lineNo, setLineNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Size list & quantities
  const [sizesList, setSizesList] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL']);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form or edit mode
  useEffect(() => {
    if (editingInput) {
      setBlkNumber(editingInput.blkNumber);
      setBuyerName(editingInput.buyerName);
      setColor(editingInput.color);
      setSrNumber(editingInput.srNumber || '');
      setBundleNo(editingInput.bundleNo || '');
      setLineNo(editingInput.lineNo || '');
      setDate(editingInput.date);
      setRemarks(editingInput.remarks || '');
      setSizeQuantities(editingInput.sizes || {});

      // Merge sizes
      const existingSizeKeys = Object.keys(editingInput.sizes || {});
      const merged = Array.from(new Set([...sizesList, ...existingSizeKeys]));
      setSizesList(merged);

      const matchedBlk = blkOrders.find((b) => b.blkNumber === editingInput.blkNumber);
      if (matchedBlk) setSelectedBlkId(matchedBlk.id);
    } else {
      // Default reset
      setBlkNumber('');
      setBuyerName('');
      setColor('');
      setBundleNo('');
      setLineNo('');
      setDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
      setSizeQuantities({});
      if (prefilledBlk) {
        handleSelectBlk(prefilledBlk.id);
      } else {
        setSelectedBlkId('');
        setSrNumber('SR-01');
      }
    }
    setError(null);
  }, [editingInput, prefilledBlk, isOpen]);

  // Handle choosing a registered BLK
  const handleSelectBlk = (blkId: string) => {
    sounds.playToot();
    setSelectedBlkId(blkId);
    const blk = blkOrders.find((b) => b.id === blkId);
    if (blk) {
      setBlkNumber(blk.blkNumber);
      setBuyerName(blk.buyerName);
      if (blk.availableColors) {
        const firstColor = blk.availableColors.split(',')[0]?.trim();
        if (firstColor && !color) setColor(firstColor);
      }
      if (blk.availableSizes) {
        const sizesArr = blk.availableSizes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (sizesArr.length > 0) setSizesList(sizesArr);
      }
    }
  };

  // Auto generate SR Number based on existing lots for this BLK
  const autoGenerateSrNumber = () => {
    sounds.playToot();
    if (!blkNumber.trim()) {
      setSrNumber('SR-01');
      return;
    }
    const matchingLots = existingInputs.filter(
      (inp) =>
        inp.blkNumber.trim().toLowerCase() === blkNumber.trim().toLowerCase() &&
        (!color.trim() || inp.color.trim().toLowerCase() === color.trim().toLowerCase())
    );
    const nextCount = matchingLots.length + 1;
    const formatted = `SR-${nextCount.toString().padStart(2, '0')}`;
    setSrNumber(formatted);
  };

  useEffect(() => {
    if (!editingInput && blkNumber && color) {
      autoGenerateSrNumber();
    }
  }, [blkNumber, color, existingInputs]);

  // Calculate PREVIOUS inputs size-by-size for this exact BLK + Color
  const previousSizeTotals = useMemo(() => {
    if (!blkNumber.trim() || !color.trim()) return {};

    const filtered = existingInputs.filter((inp) => {
      if (editingInput && inp.id === editingInput.id) return false;
      return (
        inp.blkNumber.trim().toLowerCase() === blkNumber.trim().toLowerCase() &&
        inp.color.trim().toLowerCase() === color.trim().toLowerCase()
      );
    });

    const totals: Record<string, number> = {};
    for (const item of filtered) {
      if (item.sizes) {
        for (const [sz, qty] of Object.entries(item.sizes)) {
          totals[sz] = (totals[sz] || 0) + (Number(qty) || 0);
        }
      }
    }
    return totals;
  }, [blkNumber, color, existingInputs, editingInput]);

  const previousGrandTotal = useMemo(() => {
    return Object.values(previousSizeTotals).reduce((a, b) => a + b, 0);
  }, [previousSizeTotals]);

  // Current entry total
  const currentEntryTotal = useMemo(() => {
    return Object.values(sizeQuantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
  }, [sizeQuantities]);

  // New cumulative grand total
  const newCumulativeGrandTotal = previousGrandTotal + currentEntryTotal;

  // Update quantity for a specific size
  const handleQtyChange = (size: string, val: string) => {
    sounds.playTap();
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSizeQuantities((prev) => ({
      ...prev,
      [size]: num,
    }));
  };

  const incrementQty = (size: string, amount: number) => {
    sounds.playIncrement(amount);
    setSizeQuantities((prev) => ({
      ...prev,
      [size]: (prev[size] || 0) + amount,
    }));
  };

  const handleRenameSize = (oldSize: string, newSize: string) => {
    setSizeQuantities((prev) => {
      const copy = { ...prev };
      if (copy[oldSize] !== undefined) {
        copy[newSize] = copy[oldSize];
        delete copy[oldSize];
      }
      return copy;
    });
  };

  const handleDeleteSize = (sizeToDelete: string) => {
    sounds.playDelete();
    setSizesList((prev) => prev.filter((s) => s !== sizeToDelete));
    setSizeQuantities((prev) => {
      const copy = { ...prev };
      delete copy[sizeToDelete];
      return copy;
    });
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blkNumber.trim()) {
      sounds.playDelete();
      setError('অনুগ্রহ করে বিএলকে (BLK) নম্বর দিন।');
      return;
    }
    if (!buyerName.trim()) {
      sounds.playDelete();
      setError('অনুগ্রহ করে বায়ারের নাম দিন বা নির্বাচন করুন।');
      return;
    }
    if (!color.trim()) {
      sounds.playDelete();
      setError('অনুগ্রহ করে কালার দিন।');
      return;
    }
    if (currentEntryTotal <= 0) {
      sounds.playDelete();
      setError('অন্তত একটি সাইজে মাল ইনপুটের পরিমাণ প্রদান করুন।');
      return;
    }

    setSaving(true);
    setError(null);

    const userEmail = userProfile?.email || currentUser?.email || 'operator';
    const userName = userProfile?.displayName || currentUser?.displayName || userEmail;

    const payload: Omit<ProductionInput, 'id'> = {
      blkId: selectedBlkId ? selectedBlkId.trim() : '',
      blkNumber: blkNumber.trim().toUpperCase(),
      buyerName: buyerName.trim(),
      color: color.trim(),
      srNumber: srNumber.trim() || 'SR-01',
      bundleNo: bundleNo.trim() || '',
      lineNo: lineNo.trim() || '',
      sizes: sizeQuantities || {},
      totalQty: Number(currentEntryTotal) || 0,
      date: date || new Date().toISOString().split('T')[0],
      remarks: remarks.trim() || '',
      operatorEmail: userEmail,
      operatorName: userName,
      createdAt: editingInput ? editingInput.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Strip any unexpected undefined values to guarantee 100% Firestore safety
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    try {
      if (editingInput) {
        await updateDoc(doc(db, 'production_inputs', editingInput.id), cleanPayload);
        await logActivity(
          'update_input',
          `মাল ইনপুট এডিট: BLK ${blkNumber}, কালার: ${color}, SR: ${srNumber}, পরিমাণ: ${currentEntryTotal} pcs`,
          'production_input',
          editingInput.id
        );
      } else {
        const docRef = await addDoc(collection(db, 'production_inputs'), cleanPayload);
        await logActivity(
          'create_input',
          `নতুন মাল ইনপুট: BLK ${blkNumber}, কালার: ${color}, SR: ${srNumber}, পরিমাণ: ${currentEntryTotal} pcs`,
          'production_input',
          docRef.id
        );
      }

      sounds.playSuccess();
      if (onSaveSuccess) onSaveSuccess();
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.WRITE, 'production_inputs');
      setError('ডাটাবেসে সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!editingInput) return;
    sounds.playToot();
    setConfirmDeleteOpen(true);
  };

  const executeDeleteCurrent = async () => {
    if (!editingInput) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'production_inputs', editingInput.id));
      await logActivity(
        'delete_input',
        `মাল ইনপুট ডিলিট: BLK ${editingInput.blkNumber}, কালার ${editingInput.color}, SR ${editingInput.srNumber}, পরিমাণ: ${editingInput.totalQty} pcs`,
        'production_input',
        editingInput.id
      );
      sounds.playDelete();
      setConfirmDeleteOpen(false);
      if (onSaveSuccess) onSaveSuccess();
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      sounds.playDelete();
      setError('ডিলিট করতে সমস্যা হয়েছে: ' + (err.message || 'ত্রুটি'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-3xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl text-white flex flex-col max-h-[92vh]">
        {/* Header with Dashboard amber styling */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shadow-inner">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {editingInput ? 'মাল ইনপুট এডিট করুন' : 'গার্মেন্ট মাল ইনপুট (Production Input)'}
              </h2>
              <p className="text-[10px] text-slate-400">
                সাইজ বাই সাইজ নির্ভুল হিসাব ও স্বয়ংক্রিয় যোগফল
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playToot();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-3.5 flex-grow">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: BLK & Buyer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>বিএলকে / অর্ডার (BLK No / PO) *</span>
                {blkOrders.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-normal">তালিকা বা কাস্টম</span>
                )}
              </label>
              {blkOrders.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={selectedBlkId}
                    onChange={(e) => handleSelectBlk(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- BLK নির্বাচন --</option>
                    {blkOrders.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.blkNumber} ({b.buyerName})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={blkNumber}
                    onChange={(e) => setBlkNumber(e.target.value)}
                    placeholder="অথবা BLK লিখুন"
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={blkNumber}
                  onChange={(e) => setBlkNumber(e.target.value)}
                  placeholder="যেমন: BLK-2026-HM01"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                বায়ার এর নাম (Buyer Name) *
              </label>
              {buyers.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- বায়ার নির্বাচন --</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="অথবা বায়ার লিখুন"
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="যেমন: H&M / Zara / Target"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                />
              )}
            </div>
          </div>

          {/* Row 2: Color, SR Number, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>কালার (Color) *</span>
              </label>
              <input
                type="text"
                required
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="যেমন: Black, Navy, Olive"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <span>SR নম্বর (SR NO)</span>
                </span>
                <button
                  type="button"
                  onClick={autoGenerateSrNumber}
                  title="অটো SR নম্বর"
                  className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>অটো</span>
                </button>
              </label>
              <input
                type="text"
                value={srNumber}
                onChange={(e) => setSrNumber(e.target.value)}
                placeholder="SR-01"
                className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-xs text-yellow-300 font-black font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>তারিখ (Date)</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Row 3: Bundle No & Line No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                কাটিং বান্ডেল নম্বর (Bundle No)
              </label>
              <input
                type="text"
                value={bundleNo}
                onChange={(e) => setBundleNo(e.target.value)}
                placeholder="যেমন: BND-101 to 105"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                সুইং লাইন নম্বর (Sewing Line No)
              </label>
              <input
                type="text"
                value={lineNo}
                onChange={(e) => setLineNo(e.target.value)}
                placeholder="যেমন: Line-01 / Line-04"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* SIZE-BY-SIZE INPUT MATRIX */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-3.5 space-y-3 shadow-inner">
            <div className="border-b border-slate-800 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-amber-400" />
                    <span>সাইজ বাই সাইজ মাল ইনপুট গ্রিড</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {blkNumber && color
                      ? `BLK [${blkNumber}] + কালার [${color}] এর পূর্বের ইনপুটের সাথে অটো যোগ হবে`
                      : 'বিএলকে ও কালার দিলে পূর্বের হিসাব লোড হবে'}
                  </p>
                </div>
              </div>

              {/* Advanced Size Preset & Customizer */}
              <SizePresetManager
                currentSizes={sizesList}
                onChangeSizes={setSizesList}
                onRenameSize={handleRenameSize}
              />
            </div>

            {/* Sizes list cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sizesList.map((sz) => {
                const prev = previousSizeTotals[sz] || 0;
                const current = sizeQuantities[sz] || 0;
                const nextCumulative = prev + current;

                return (
                  <div
                    key={sz}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 border border-slate-700 font-black text-xs flex items-center justify-center font-mono">
                          {sz}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSize(sz)}
                          title="সরান"
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400">পূর্বে: <span className="font-semibold text-slate-200">{prev}</span></div>
                        <div className="text-[10px] text-amber-300 font-bold">টোটাল হবে: {nextCumulative}</div>
                      </div>
                    </div>

                    {/* Numeric Input */}
                    <div className="relative mb-1.5">
                      <input
                        type="number"
                        min="0"
                        value={sizeQuantities[sz] !== undefined ? sizeQuantities[sz] : ''}
                        onChange={(e) => handleQtyChange(sz, e.target.value)}
                        placeholder="0 pcs"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-yellow-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-center"
                      />
                    </div>

                    {/* Quick increment buttons */}
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => incrementQty(sz, 10)}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 active:scale-95 transition-transform"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => incrementQty(sz, 50)}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 active:scale-95 transition-transform"
                      >
                        +50
                      </button>
                      <button
                        type="button"
                        onClick={() => incrementQty(sz, 100)}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 active:scale-95 transition-transform"
                      >
                        +100
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SUMMARY BAR */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <Calculator className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">এই এন্ট্রির মোট মাল ইনপুট</div>
                  <div className="text-base sm:text-lg font-black text-yellow-400 font-mono">
                    {currentEntryTotal.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">pcs</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-1.5 sm:pt-0">
                <div>
                  <div className="text-[9px] text-slate-400">পূর্বে ছিল</div>
                  <div className="text-xs font-bold text-slate-300 font-mono">{previousGrandTotal.toLocaleString()} pcs</div>
                </div>
                <div className="text-amber-400 text-sm font-bold">+</div>
                <div>
                  <div className="text-[9px] text-amber-300 font-bold">নতুন সর্বমোট</div>
                  <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                    {newCumulativeGrandTotal.toLocaleString()} pcs
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              মন্তব্য / চালান নোট (Remarks)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="যেমন: ফ্যাব্রিক রোল ০৭, কাটিং ঠিক আছে।"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Delete Confirmation In-Modal Banner */}
          {confirmDeleteOpen && editingInput && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-300">
                <Trash2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>
                  আপনি কি নিশ্চিত যে <strong>{editingInput.blkNumber}</strong> ({editingInput.color}, SR: {editingInput.srNumber || 'N/A'}, মোট: {editingInput.totalQty} pcs) ডিলিট করবেন?
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={executeDeleteCurrent}
                  className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black shadow-md shadow-rose-600/30"
                >
                  {saving ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <div>
              {editingInput && !confirmDeleteOpen && (
                <button
                  type="button"
                  onClick={handleDeleteCurrent}
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>এই ইনপুট ডিলিট করুন</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'সেভ হচ্ছে...' : editingInput ? 'আপডেট করুন' : 'মাল ইনপুট সেভ করুন'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
