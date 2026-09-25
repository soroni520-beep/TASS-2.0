/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RotateCcw,
  Bookmark,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export interface SizePreset {
  id: string;
  name: string;
  category: string;
  sizes: string[];
}

export const DEFAULT_SIZE_PRESETS: SizePreset[] = [
  {
    id: 'nfg_kids',
    name: 'NFG Kids / European (৯২-১৫৮)',
    category: 'NFG / Kids',
    sizes: ['92', '104', '110', '116', '122', '128', '134', '140', '146', '152', '158'],
  },
  {
    id: 'adult_standard',
    name: 'Adult Standard (XS - 3XL)',
    category: 'Adult',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  },
  {
    id: 'numeric_waist',
    name: 'Pants / Numeric Waist (২৮ - ৪০)',
    category: 'Bottoms',
    sizes: ['28', '30', '32', '34', '36', '38', '40'],
  },
  {
    id: 'kids_years',
    name: 'Kids Age (২Y - ১৪Y)',
    category: 'Kids',
    sizes: ['2Y', '3Y', '4Y', '5Y', '6Y', '7Y', '8Y', '10Y', '12Y', '14Y'],
  },
  {
    id: 'infant_baby',
    name: 'Infant / Baby (০-২৪ মাস)',
    category: 'Baby',
    sizes: ['0-3M', '3-6M', '6-9M', '9-12M', '12-18M', '18-24M'],
  },
];

interface SizePresetManagerProps {
  currentSizes: string[];
  onChangeSizes: (newSizes: string[]) => void;
  onRenameSize?: (oldSize: string, newSize: string) => void;
}

export const SizePresetManager: React.FC<SizePresetManagerProps> = ({
  currentSizes,
  onChangeSizes,
  onRenameSize,
}) => {
  const [newSizeInput, setNewSizeInput] = useState('');
  const [editingSizeIndex, setEditingSizeIndex] = useState<number | null>(null);
  const [editingSizeValue, setEditingSizeValue] = useState('');
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);
  const [customPresetName, setCustomPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Load custom saved presets from localStorage
  const [savedCustomPresets, setSavedCustomPresets] = useState<SizePreset[]>(() => {
    try {
      const stored = localStorage.getItem('tass_custom_size_presets');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Handle adding new size (supports comma separated like "92, 104, 110")
  const handleAddSizes = () => {
    if (!newSizeInput.trim()) return;

    sounds.playTap();
    const parts = newSizeInput
      .split(/[,+\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    const merged = Array.from(new Set([...currentSizes, ...parts]));
    onChangeSizes(merged);
    setNewSizeInput('');
  };

  // Delete a specific size
  const handleDeleteSize = (sizeToDelete: string) => {
    sounds.playDelete();
    const updated = currentSizes.filter((s) => s !== sizeToDelete);
    onChangeSizes(updated);
  };

  // Start editing a size
  const handleStartEdit = (index: number, size: string) => {
    sounds.playClick();
    setEditingSizeIndex(index);
    setEditingSizeValue(size);
  };

  // Save the edited size
  const handleSaveEdit = (index: number) => {
    sounds.playSuccess();
    const oldSize = currentSizes[index];
    const newSize = editingSizeValue.trim().toUpperCase();

    if (!newSize || newSize === oldSize) {
      setEditingSizeIndex(null);
      return;
    }

    const updated = [...currentSizes];
    updated[index] = newSize;

    if (onRenameSize) {
      onRenameSize(oldSize, newSize);
    }
    onChangeSizes(updated);
    setEditingSizeIndex(null);
  };

  // Apply a preset
  const handleApplyPreset = (preset: SizePreset) => {
    sounds.playSuccess();
    onChangeSizes([...preset.sizes]);
    setShowPresetsDropdown(false);
  };

  // Save current sizes as custom preset
  const handleSaveCurrentAsPreset = () => {
    if (!customPresetName.trim() || currentSizes.length === 0) return;
    sounds.playSuccess();

    const newPreset: SizePreset = {
      id: `custom_${Date.now()}`,
      name: customPresetName.trim(),
      category: 'Custom',
      sizes: [...currentSizes],
    };

    const updated = [...savedCustomPresets, newPreset];
    setSavedCustomPresets(updated);
    try {
      localStorage.setItem('tass_custom_size_presets', JSON.stringify(updated));
    } catch (e) {}

    setCustomPresetName('');
    setShowSavePreset(false);
  };

  // Delete custom preset
  const handleDeleteCustomPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playDelete();
    const updated = savedCustomPresets.filter((p) => p.id !== presetId);
    setSavedCustomPresets(updated);
    try {
      localStorage.setItem('tass_custom_size_presets', JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
      {/* Header bar: Presets Selector & Custom Add */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowPresetsDropdown(!showPresetsDropdown);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>সাইজ প্রি-সেট লোড করুন</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPresetsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Presets dropdown menu */}
            {showPresetsDropdown && (
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  স্ট্যান্ডার্ড গার্মেন্ট সাইজ
                </div>
                <div className="space-y-1">
                  {DEFAULT_SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent transition-all flex flex-col group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {preset.sizes.length} sizes
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                        {preset.sizes.join(', ')}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom User Presets */}
                {savedCustomPresets.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <div className="text-[11px] font-bold text-amber-400 px-2 py-1 uppercase tracking-wider">
                      আপনার সংরক্ষিত কাস্টম সাইজ
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {savedCustomPresets.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => handleApplyPreset(preset)}
                          className="cursor-pointer p-2 rounded-xl hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all flex items-center justify-between group"
                        >
                          <div className="truncate flex-1">
                            <div className="text-xs font-bold text-white group-hover:text-amber-300">
                              {preset.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate font-mono">
                              {preset.sizes.join(', ')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                            title="মুছুন"
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowSavePreset(!showSavePreset);
            }}
            title="বর্তমান সাইজগুলো নতুন প্রি-সেট হিসেবে সেভ করুন"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 active:scale-95 transition-all"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">প্রিসেট সেভ</span>
          </button>
        </div>

        {/* Input box for new sizes */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[240px] justify-end">
          <input
            type="text"
            value={newSizeInput}
            onChange={(e) => setNewSizeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSizes();
              }
            }}
            placeholder="সাইজ লিখুন (যেমন: 92,104,116 বা 3XL)"
            className="flex-1 max-w-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
          <button
            type="button"
            onClick={handleAddSizes}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Save Custom Preset Input Bar */}
      {showSavePreset && (
        <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center gap-2 animate-in fade-in duration-150">
          <Bookmark className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <input
            type="text"
            value={customPresetName}
            onChange={(e) => setCustomPresetName(e.target.value)}
            placeholder="প্রি-সেটের নাম লিখুন (যেমন: NFG ইউরোপিয়ান ব্যাচ)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleSaveCurrentAsPreset}
            disabled={!customPresetName.trim()}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs disabled:opacity-40"
          >
            সংরক্ষণ করুন
          </button>
          <button
            type="button"
            onClick={() => setShowSavePreset(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Size Tags & In-place Editor */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>সাইজ তালিকা ({currentSizes.length}):</span>
        </span>

        {currentSizes.length === 0 ? (
          <span className="text-xs text-amber-400/80 italic">
            কোনো সাইজ সেট করা নেই। উপরের প্রি-সেট থেকে বেছে নিন অথবা নতুন সাইজ টাইপ করুন।
          </span>
        ) : (
          currentSizes.map((sz, index) => {
            const isEditing = editingSizeIndex === index;

            if (isEditing) {
              return (
                <div
                  key={`${sz}-${index}`}
                  className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-1.5 py-0.5 shadow"
                >
                  <input
                    type="text"
                    autoFocus
                    value={editingSizeValue}
                    onChange={(e) => setEditingSizeValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEdit(index);
                      } else if (e.key === 'Escape') {
                        setEditingSizeIndex(null);
                      }
                    }}
                    className="w-16 bg-slate-900 border border-emerald-500/40 rounded px-1.5 py-0.5 text-xs font-bold text-white focus:outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(index)}
                    title="সংরক্ষণ"
                    className="text-emerald-400 hover:text-emerald-300 p-0.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSizeIndex(null)}
                    title="বাতিল"
                    className="text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={`${sz}-${index}`}
                className="group inline-flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-bold text-white transition-all shadow-sm"
              >
                <span className="font-mono text-emerald-300 tracking-wide">{sz}</span>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => handleStartEdit(index, sz)}
                  title="সাইজ এডিট করুন"
                  className="text-slate-400 hover:text-amber-300 opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteSize(sz)}
                  title="সাইজ মুছে ফেলুন"
                  className="text-slate-400 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
