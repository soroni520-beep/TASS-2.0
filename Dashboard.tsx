import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  CalendarDays,
} from 'lucide-react';
import { ProductionInput, BlkOrder, Accessory, Buyer } from '../types';
import { sounds } from '../utils/soundEffects';

interface DashboardProps {
  inputs: ProductionInput[];
  blkOrders: BlkOrder[];
  accessories: Accessory[];
  buyers: Buyer[];
  onOpenNewInput: (blk?: BlkOrder) => void;
  onNavigateTab: (tab: string) => void;
}

const MONTH_NAMES_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

export const Dashboard: React.FC<DashboardProps> = ({
  inputs,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  // Calendar Modal Open State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Selected Date State: 'YYYY-MM-DD' or 'ALL_MONTH'
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);

  // Calendar Month/Year view state
  const [viewYear, setViewYear] = useState<number>(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => today.getMonth()); // 0 - 11

  // Pre-aggregate input totals by Date string (YYYY-MM-DD)
  const dateTotalsMap = useMemo(() => {
    const map: Record<string, { totalPcs: number; count: number }> = {};
    inputs.forEach((inp) => {
      if (!inp.date) return;
      const d = inp.date.trim();
      if (!map[d]) {
        map[d] = { totalPcs: 0, count: 0 };
      }
      map[d].totalPcs += Number(inp.totalQty) || 0;
      map[d].count += 1;
    });
    return map;
  }, [inputs]);

  // Open Calendar Picker Modal
  const handleOpenCalendar = () => {
    sounds.playToot();
    if (selectedDate && selectedDate !== 'ALL_MONTH') {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        setViewYear(Number(parts[0]));
        setViewMonth(Number(parts[1]) - 1);
      }
    }
    setIsCalendarOpen(true);
  };

  // Navigate Months
  const handlePrevMonth = () => {
    sounds.playToot();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    sounds.playToot();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Select a specific day
  const handleSelectDay = (dateStr: string) => {
    sounds.playTap();
    setSelectedDate(dateStr);
    setIsCalendarOpen(false);
  };

  // Select Today
  const handleSelectToday = () => {
    sounds.playTap();
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayDateStr);
    setIsCalendarOpen(false);
  };

  // Select All Month
  const handleSelectEntireMonth = () => {
    sounds.playToot();
    setSelectedDate('ALL_MONTH');
    setIsCalendarOpen(false);
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      totalPcs: number;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const data = dateTotalsMap[dateStr] || { totalPcs: 0, count: 0 };
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        totalPcs: data.totalPcs,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dateTotalsMap[dateStr] || { totalPcs: 0, count: 0 };
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        totalPcs: data.totalPcs,
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const data = dateTotalsMap[dateStr] || { totalPcs: 0, count: 0 };
      days.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        totalPcs: data.totalPcs,
      });
    }

    return days;
  }, [viewYear, viewMonth, dateTotalsMap, todayDateStr]);

  // Filter production inputs for selected date or month
  const selectedDetails = useMemo(() => {
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

    const items = inputs.filter((inp) => {
      if (!inp.date) return false;
      if (selectedDate === 'ALL_MONTH') {
        return inp.date.startsWith(monthPrefix);
      }
      return inp.date === selectedDate;
    });

    let totalPcs = 0;
    const styleSet = new Set<string>();
    const buyerSet = new Set<string>();
    const sizeSums: Record<string, number> = {};

    items.forEach((item) => {
      totalPcs += Number(item.totalQty) || 0;
      if (item.blkNumber) styleSet.add(item.blkNumber);
      if (item.buyerName) buyerSet.add(item.buyerName);
      if (item.sizes) {
        Object.entries(item.sizes).forEach(([sz, q]) => {
          sizeSums[sz] = (sizeSums[sz] || 0) + (Number(q) || 0);
        });
      }
    });

    return {
      items,
      totalPcs,
      styleCount: styleSet.size,
      buyerCount: buyerSet.size,
      entryCount: items.length,
      sizeSums,
    };
  }, [inputs, selectedDate, viewYear, viewMonth]);

  // Clean label
  const selectedDateLabel = useMemo(() => {
    if (selectedDate === 'ALL_MONTH') {
      return `${MONTH_NAMES_BN[viewMonth]} ${viewYear} (পুরো মাস)`;
    }
    if (selectedDate === todayDateStr) {
      return `আজকে (${selectedDate})`;
    }
    return `তারিখ: ${selectedDate}`;
  }, [selectedDate, viewMonth, viewYear, todayDateStr]);

  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. COMPACT DATE SELECTOR BAR (ORANGE & YELLOW THEME)                      */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-orange-500/30 rounded-2xl p-2.5 sm:p-3 shadow-md flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-orange-300 uppercase tracking-wider">
              নির্বাচিত তারিখ
            </div>
            <div className="text-sm sm:text-base font-black text-yellow-400 font-mono flex items-center gap-1.5">
              <span>{selectedDateLabel}</span>
              {selectedDate === todayDateStr && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-sans font-bold">
                  Today
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Minimal and Clean */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSelectToday}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              selectedDate === todayDateStr
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                : 'bg-slate-950 text-amber-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            আজকে
          </button>

          <button
            type="button"
            onClick={handleOpenCalendar}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>সিলেক্ট ডেট</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CALENDAR POPUP MODAL (COMPACT & CLEAN ORANGE/YELLOW THEME)             */}
      {/* ========================================================================= */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-orange-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-3.5 sm:p-4 space-y-3 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-orange-400 font-black text-sm">
                <CalendarIcon className="w-4 h-4" />
                <span>তারিখ সিলেক্ট করুন</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playToot();
                  setIsCalendarOpen(false);
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Month & Year Navigation */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="আগের মাস"
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => {
                    sounds.playToot();
                    setViewMonth(Number(e.target.value));
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white font-bold outline-none cursor-pointer"
                >
                  {MONTH_NAMES_BN.map((mName, idx) => (
                    <option key={idx} value={idx} className="bg-slate-900 text-white">
                      {mName}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => {
                    sounds.playToot();
                    setViewYear(Number(e.target.value));
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-yellow-400 font-mono font-bold outline-none cursor-pointer"
                >
                  {Array.from({ length: 8 }, (_, i) => 2023 + i).map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                title="পরের মাস"
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectToday}
                className="flex-1 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-bold hover:bg-orange-500/25 transition-all text-center"
              >
                আজকে
              </button>
              <button
                type="button"
                onClick={handleSelectEntireMonth}
                className="flex-1 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-yellow-300 text-xs font-bold hover:bg-amber-500/25 transition-all text-center"
              >
                পুরো মাস ({MONTH_NAMES_BN[viewMonth]})
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS_BN.map((wd, i) => (
                <div
                  key={i}
                  className={`py-0.5 text-[10px] font-bold ${
                    i === 5 ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedDate === day.dateStr;
                const hasData = day.totalPcs > 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDay(day.dateStr)}
                    className={`h-10 p-0.5 rounded-lg flex flex-col justify-between items-center transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                        : day.isToday
                        ? 'bg-orange-950/60 border-orange-500 text-orange-300'
                        : day.isCurrentMonth
                        ? 'bg-slate-950 border-slate-800 text-white hover:border-orange-500/50 hover:bg-slate-850'
                        : 'bg-slate-950/30 border-slate-900 text-slate-600 opacity-40'
                    }`}
                  >
                    <span className="text-[11px] font-mono font-black">{day.dayNumber}</span>
                    {hasData && (
                      <span
                        className={`text-[8px] font-mono px-0.5 rounded font-bold truncate max-w-full ${
                          isSelected
                            ? 'bg-slate-950 text-yellow-300'
                            : 'bg-amber-500/20 text-yellow-400'
                        }`}
                      >
                        {day.totalPcs}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 4 STAT MINI CARDS (ORANGE & YELLOW)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-orange-500/30 shadow-xs">
          <div className="text-[10px] text-orange-300 font-bold">মোট ইনপুট</div>
          <div className="text-lg sm:text-xl font-black text-orange-400 mt-0.5 font-mono">
            {selectedDetails.totalPcs.toLocaleString()}{' '}
            <span className="text-[10px] text-slate-400 font-normal">pcs</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-yellow-500/30 shadow-xs">
          <div className="text-[10px] text-yellow-300 font-bold">Style/Order:</div>
          <div className="text-lg sm:text-xl font-black text-yellow-400 mt-0.5 font-mono">
            {selectedDetails.styleCount}{' '}
            <span className="text-[10px] text-slate-400 font-normal">স্টাইল</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 shadow-xs">
          <div className="text-[10px] text-amber-300 font-bold">কাটিং No</div>
          <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5 font-mono">
            {selectedDetails.entryCount}{' '}
            <span className="text-[10px] text-slate-400 font-normal">টি</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-xs">
          <div className="text-[10px] text-slate-300 font-bold">বায়ার</div>
          <div className="text-lg sm:text-xl font-black text-white mt-0.5 font-mono">
            {selectedDetails.buyerCount}{' '}
            <span className="text-[10px] text-slate-400 font-normal">জন</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SIZE BREAKDOWN BAR                                                     */}
      {/* ========================================================================= */}
      {Object.keys(selectedDetails.sizeSums).length > 0 && (
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between flex-wrap gap-1.5 shadow-xs">
          <div className="text-[10px] text-orange-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>সাইজ হিসাব:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(selectedDetails.sizeSums).map(([sz, qty]) => (
              <div
                key={sz}
                className="px-2 py-0.5 rounded-lg bg-slate-950 border border-orange-500/20 text-[11px] font-mono flex items-center gap-1"
              >
                <span className="text-slate-400 font-bold">{sz}:</span>
                <strong className="text-yellow-400 font-black">{qty.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DATA TABLE (CLEAN & COMPACT)                                          */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-amber-300/90 border-b border-slate-800 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-2.5">তারিখ</th>
                <th className="p-2.5">BLK (Style)</th>
                <th className="p-2.5">বায়ার</th>
                <th className="p-2.5">কালার</th>
                <th className="p-2.5">কাটিং/SR NO</th>
                <th className="p-2.5">লাইন</th>
                <th className="p-2.5">সাইজ ব্রেকডাউন</th>
                <th className="p-2.5 text-right">মোট পিস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
              {selectedDetails.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500 text-xs">
                    কোনো রেকর্ড নেই। উপরে 'সিলেক্ট ডেট' বাটনে চাপ দিয়ে তারিখ নির্বাচন করুন।
                  </td>
                </tr>
              ) : (
                selectedDetails.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {item.date}
                    </td>
                    <td className="p-2.5 font-mono font-black text-amber-400 whitespace-nowrap">
                      {item.blkNumber}
                    </td>
                    <td className="p-2.5 text-white font-semibold whitespace-nowrap">
                      {item.buyerName || '-'}
                    </td>
                    <td className="p-2.5 text-orange-400 font-bold whitespace-nowrap flex items-center gap-1 pt-3.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                      {item.color}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-yellow-300 whitespace-nowrap">
                      {item.srNumber || '-'}
                    </td>
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">{item.lineNo || '-'}</td>
                    <td className="p-2.5">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.sizes || {}).map(([sz, q]) => (
                          <span
                            key={sz}
                            className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 border border-slate-800"
                          >
                            <span className="text-slate-400">{sz}:</span>
                            <strong className="text-yellow-400 ml-0.5">{q}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-yellow-400 whitespace-nowrap text-sm">
                      {item.totalQty.toLocaleString()} pcs
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
