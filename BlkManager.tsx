import React, { useState, useMemo } from 'react';
import {
  Shirt,
  Plus,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Tag,
  Palette,
  ChevronRight,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Buyer, BlkOrder, ProductionInput } from '../types';
import { sounds } from '../utils/soundEffects';
import { DEFAULT_SIZE_PRESETS } from './SizePresetManager';

interface BlkManagerProps {
  buyers: Buyer[];
  blkOrders: BlkOrder[];
  inputs: ProductionInput[];
  onRefresh: () => void;
  onSelectBlkForInput?: (blk: BlkOrder) => void;
}

export const BlkManager: React.FC<BlkManagerProps> = ({
  buyers,
  blkOrders,
  inputs,
  onRefresh,
  onSelectBlkForInput,
}) => {
  const { isAdmin, userProfile, currentUser, logActivity } = useAuth();

  const [activeTab, setActiveTab] = useState<'blk' | 'buyers'>('blk');
  const [searchTerm, setSearchTerm] = useState('');

  // BLK Modal
  const [isBlkModalOpen, setIsBlkModalOpen] = useState(false);
  const [editingBlk, setEditingBlk] = useState<BlkOrder | null>(null);
  const [buyerId, setBuyerId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [blkNumber, setBlkNumber] = useState('');
  const [styleName, setStyleName] = useState('');
  const [itemType, setItemType] = useState('T-Shirt');
  const [season, setSeason] = useState('Summer 2026');
  const [availableColors, setAvailableColors] = useState('Black, Navy Blue, White');
  const [availableSizes, setAvailableSizes] = useState('S, M, L, XL, XXL');
  const [totalTargetQty, setTotalTargetQty] = useState<number>(5000);
  const [status, setStatus] = useState<'running' | 'completed' | 'hold'>('running');

  // Buyer Modal
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerCode, setNewBuyerCode] = useState('');
  const [newBuyerCountry, setNewBuyerCountry] = useState('');
  const [newBuyerContact, setNewBuyerContact] = useState('');
  const [newBuyerNotes, setNewBuyerNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute total input pieces for each BLK
  const blkTotalsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inp of inputs) {
      const key = inp.blkNumber.trim().toUpperCase();
      map[key] = (map[key] || 0) + (Number(inp.totalQty) || 0);
    }
    return map;
  }, [inputs]);

  // Filtered BLK orders
  const filteredBlk = useMemo(() => {
    return blkOrders.filter((b) => {
      const q = searchTerm.toLowerCase();
      return (
        b.blkNumber.toLowerCase().includes(q) ||
        b.buyerName.toLowerCase().includes(q) ||
        b.styleName.toLowerCase().includes(q) ||
        b.availableColors.toLowerCase().includes(q)
      );
    });
  }, [blkOrders, searchTerm]);

  // Open BLK modal
  const handleOpenBlkModal = (blk?: BlkOrder) => {
    sounds.playClick();
    setError(null);
    if (blk) {
      setEditingBlk(blk);
      setBuyerId(blk.buyerId);
      setBuyerName(blk.buyerName);
      setBlkNumber(blk.blkNumber);
      setStyleName(blk.styleName);
      setItemType(blk.itemType);
      setSeason(blk.season || '');
      setAvailableColors(blk.availableColors);
      setAvailableSizes(blk.availableSizes);
      setTotalTargetQty(blk.totalTargetQty || 0);
      setStatus(blk.status);
    } else {
      setEditingBlk(null);
      setBuyerId(buyers[0]?.id || '');
      setBuyerName(buyers[0]?.name || '');
      setBlkNumber(`BLK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setStyleName('');
      setItemType('T-Shirt');
      setSeason('Summer 2026');
      setAvailableColors('Black, Navy, White');
      setAvailableSizes('92, 104, 110, 116, 122, 128, 134, 140, 146, 152, 158');
      setTotalTargetQty(2000);
      setStatus('running');
    }
    setIsBlkModalOpen(true);
  };

  // Save BLK
  const handleSaveBlk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blkNumber.trim() || !buyerName.trim()) {
      setError('বিএলকে নম্বর এবং বায়ার নাম আবশ্যক।');
      return;
    }

    setSaving(true);
    setError(null);

    const userEmail = userProfile?.email || currentUser?.email || 'admin';

    const payload: Omit<BlkOrder, 'id'> = {
      buyerId: buyerId || 'custom_buyer',
      buyerName: buyerName.trim(),
      blkNumber: blkNumber.trim(),
      styleName: styleName.trim(),
      itemType: itemType.trim(),
      season: season.trim(),
      availableColors: availableColors.trim(),
      availableSizes: availableSizes.trim(),
      totalTargetQty: Number(totalTargetQty) || 0,
      status,
      createdBy: userEmail,
      updatedAt: new Date().toISOString(),
      createdAt: editingBlk ? editingBlk.createdAt : new Date().toISOString(),
    };

    try {
      if (editingBlk) {
        await updateDoc(doc(db, 'blk_orders', editingBlk.id), payload);
        await logActivity('update_blk', `BLK অর্ডার আপডেট: ${blkNumber} (${buyerName})`, 'blk', editingBlk.id);
      } else {
        const docRef = await addDoc(collection(db, 'blk_orders'), payload);
        await logActivity('create_blk', `নতুন BLK তৈরি করা হয়েছে: ${blkNumber} (${buyerName})`, 'blk', docRef.id);
      }

      sounds.playSuccess();
      setIsBlkModalOpen(false);
      onRefresh();
    } catch (err: any) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.WRITE, 'blk_orders');
      setError('বিএলকে সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // Save Buyer
  const handleSaveBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuyerName.trim()) {
      sounds.playDelete();
      setError('বায়ারের নাম প্রদান করুন।');
      return;
    }

    setSaving(true);
    setError(null);

    const userEmail = userProfile?.email || currentUser?.email || 'admin';

    try {
      const payload: Omit<Buyer, 'id'> = {
        name: newBuyerName.trim(),
        code: newBuyerCode.trim() || `BYR-${Date.now().toString().slice(-4)}`,
        country: newBuyerCountry.trim(),
        contactPerson: newBuyerContact.trim(),
        notes: newBuyerNotes.trim(),
        createdBy: userEmail,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'buyers'), payload);
      await logActivity('create_buyer', `নতুন বায়ার যোগ করা হয়েছে: ${payload.name}`, 'blk', docRef.id);

      sounds.playSuccess();
      setIsBuyerModalOpen(false);
      setNewBuyerName('');
      setNewBuyerCode('');
      setNewBuyerContact('');
      setNewBuyerNotes('');
      onRefresh();
    } catch (err: any) {
      sounds.playDelete();
      handleFirestoreError(err, OperationType.WRITE, 'buyers');
      setError('বায়ার যোগ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Shirt className="w-6 h-6 text-emerald-400" />
            <span>বিএলকে অর্ডার ও বায়ার ম্যানেজমেন্ট (BLK & Buyers)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            নতুন বায়ার তৈরি, বিএলকে স্টাইল, কালার ও সাইজ সেট কনফিগারেশন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBuyerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>+ নতুন বায়ার</span>
          </button>
          <button
            onClick={() => handleOpenBlkModal()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ নতুন BLK অর্ডার</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('blk')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'blk'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          বিএলকে অর্ডার তালিকা ({blkOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('buyers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'buyers'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          বায়ার তালিকা ({buyers.length})
        </button>
      </div>

      {/* TAB 1: BLK ORDERS */}
      {activeTab === 'blk' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="বিএলকে নম্বর, বায়ার বা স্টাইল নাম দিয়ে খুঁজুন..."
              className="w-full sm:w-80 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBlk.map((blk) => {
              const currentInputTotal = blkTotalsMap[blk.blkNumber.trim().toUpperCase()] || 0;
              const target = blk.totalTargetQty || 0;
              const percent = target > 0 ? Math.min(100, Math.round((currentInputTotal / target) * 100)) : null;
              const balance = target > 0 ? Math.max(0, target - currentInputTotal) : null;

              return (
                <div
                  key={blk.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {blk.buyerName}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white mt-1">{blk.blkNumber}</h3>
                        <p className="text-xs text-slate-400 font-medium">{blk.styleName} ({blk.itemType})</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          blk.status === 'running'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : blk.status === 'completed'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {blk.status === 'running' ? 'চলমান' : blk.status === 'completed' ? 'সম্পন্ন' : 'হোল্ড'}
                      </span>
                    </div>

                    {/* Colors & Sizes tags */}
                    <div className="space-y-2 mb-4 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold mb-1">কালার সমূহ:</div>
                        <div className="flex flex-wrap gap-1">
                          {blk.availableColors.split(',').map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300 text-[10px] border border-pink-500/20">
                              {c.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold mb-1">সাইজ সেট:</div>
                        <div className="flex flex-wrap gap-1">
                          {blk.availableSizes.split(',').map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Production Input Progress Bar */}
                  <div className="border-t border-slate-800/80 pt-3">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-400">মাল ইনপুট অগ্রগতি:</span>
                      <span className="font-extrabold text-emerald-400">
                        {currentInputTotal.toLocaleString()} {target > 0 ? `/ ${target.toLocaleString()}` : ''} pcs
                      </span>
                    </div>

                    {percent !== null && (
                      <div className="w-full bg-slate-950 rounded-full h-2 mb-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex justify-between text-[11px] text-slate-400 mb-3">
                      <span>{percent !== null ? `${percent}% সম্পন্ন` : 'টার্গেট নেই'}</span>
                      {balance !== null && <span>বাকি: {balance.toLocaleString()} pcs</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenBlkModal(blk)}
                        className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>এডিট</span>
                      </button>

                      {onSelectBlkForInput && (
                        <button
                          onClick={() => onSelectBlkForInput(blk)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>এই BLK তে ইনপুট</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BUYERS LIST */}
      {activeTab === 'buyers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buyers.map((buyer) => {
            const count = blkOrders.filter((b) => b.buyerName === buyer.name).length;

            return (
              <div key={buyer.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    {buyer.name.charAt(0)}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {buyer.code}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{buyer.name}</h3>
                <div className="text-xs text-slate-400 mt-1 space-y-1">
                  {buyer.country && <div>দেশ: {buyer.country}</div>}
                  {buyer.contactPerson && <div>যোগাযোগ: {buyer.contactPerson}</div>}
                  {buyer.notes && <div className="text-slate-500 italic">{buyer.notes}</div>}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">মোট বিএলকে অর্ডার:</span>
                  <span className="font-bold text-emerald-400">{count} টি</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: BLK ORDER */}
      {isBlkModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingBlk ? 'BLK অর্ডার এডিট করুন' : 'নতুন BLK অর্ডার তৈরি করুন'}
              </h3>
              <button onClick={() => setIsBlkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlk} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">বায়ার নির্বাচন *</label>
                  <select
                    value={buyerName}
                    onChange={(e) => {
                      setBuyerName(e.target.value);
                      const b = buyers.find((x) => x.name === e.target.value);
                      if (b) setBuyerId(b.id);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- বায়ার নির্বাচন --</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">বিএলকে নম্বর (BLK No) *</label>
                  <input
                    type="text"
                    required
                    value={blkNumber}
                    onChange={(e) => setBlkNumber(e.target.value)}
                    placeholder="যেমন: BLK-2026-HM01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">স্টাইল নাম (Style Name)</label>
                  <input
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="যেমন: Men Basic Crewneck Tee"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">গার্মেন্ট আইটেম</label>
                  <input
                    type="text"
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    placeholder="যেমন: T-Shirt, Pant, Hoodie"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  কালার তালিকা (কমা দিয়ে আলাদা করুন) *
                </label>
                <input
                  type="text"
                  required
                  value={availableColors}
                  onChange={(e) => setAvailableColors(e.target.value)}
                  placeholder="যেমন: Black, Navy Blue, White, Melange Grey"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    সাইজ সেট (কমা দিয়ে আলাদা করুন) *
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ক্লিক করে প্রিসেট লোড করুন ↓
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={availableSizes}
                  onChange={(e) => {
                    sounds.playTap();
                    setAvailableSizes(e.target.value);
                  }}
                  placeholder="যেমন: 92, 104, 110, 116, 122, 128, 134, 140, 146, 152, 158"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />

                {/* Quick Presets Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {DEFAULT_SIZE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        sounds.playSuccess();
                        setAvailableSizes(p.sizes.join(', '));
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-[10px] font-bold transition-all active:scale-95"
                    >
                      {p.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">অর্ডার টার্গেট পরিমাণ (Pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={totalTargetQty}
                    onChange={(e) => setTotalTargetQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">অর্ডার স্ট্যাটাস</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="running">চলমান (Running)</option>
                    <option value="completed">সম্পন্ন (Completed)</option>
                    <option value="hold">হোল্ড (Hold)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'বিএলকে অর্ডার সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUYER */}
      {isBuyerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">নতুন বায়ার প্রোফাইল তৈরি করুন</h3>
              <button onClick={() => setIsBuyerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBuyer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">বায়ার / ব্র্যান্ডের নাম *</label>
                <input
                  type="text"
                  required
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  placeholder="যেমন: H&M / Zara / Target"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">বায়ার কোড</label>
                  <input
                    type="text"
                    value={newBuyerCode}
                    onChange={(e) => setNewBuyerCode(e.target.value)}
                    placeholder="যেমন: HM-EU"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">দেশ / মার্কেট</label>
                  <input
                    type="text"
                    value={newBuyerCountry}
                    onChange={(e) => setNewBuyerCountry(e.target.value)}
                    placeholder="যেমন: Sweden / USA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">যোগাযোগ ব্যক্তি / ফোন</label>
                <input
                  type="text"
                  value={newBuyerContact}
                  onChange={(e) => setNewBuyerContact(e.target.value)}
                  placeholder="যেমন: জনাব রফিকুল ইসলাম (মার্চেন্ডাইজার)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">অতিরিক্ত নোট</label>
                <textarea
                  rows={2}
                  value={newBuyerNotes}
                  onChange={(e) => setNewBuyerNotes(e.target.value)}
                  placeholder="বায়ারের বিশেষ স্পেসিফিকেশন..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuyerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'বায়ার সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
