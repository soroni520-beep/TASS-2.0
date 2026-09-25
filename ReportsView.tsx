import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Mail,
  Shirt,
  Boxes,
  FileText,
  Sparkles,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { ProductionInput, BlkOrder, Accessory, AccessoryTransaction } from '../types';
import { sounds } from '../utils/soundEffects';
import {
  downloadProductionReportPdf,
  downloadChallanPdf,
  downloadAccessoriesReportPdf,
} from '../utils/pdfDownloader';

interface ReportsViewProps {
  inputs: ProductionInput[];
  blkOrders: BlkOrder[];
  accessories: Accessory[];
  transactions: AccessoryTransaction[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  inputs,
  blkOrders,
  accessories,
}) => {
  const [reportType, setReportType] = useState<'production' | 'challan' | 'accessories'>('production');
  const [selectedBlk, setSelectedBlk] = useState('all');
  const [selectedBuyer, setSelectedBuyer] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Unique buyer list
  const uniqueBuyers = useMemo(() => {
    const s = new Set<string>();
    inputs.forEach((i) => {
      if (i.buyerName) s.add(i.buyerName);
    });
    return Array.from(s);
  }, [inputs]);

  // Filtered Production Inputs
  const filteredInputs = useMemo(() => {
    return inputs.filter((inp) => {
      const matchBlk = selectedBlk === 'all' || inp.blkNumber === selectedBlk;
      const matchBuyer = selectedBuyer === 'all' || inp.buyerName === selectedBuyer;
      const matchStart = !startDate || inp.date >= startDate;
      const matchEnd = !endDate || inp.date <= endDate;
      return matchBlk && matchBuyer && matchStart && matchEnd;
    });
  }, [inputs, selectedBlk, selectedBuyer, startDate, endDate]);

  // Aggregate size by size for the report
  const reportSizeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const inp of filteredInputs) {
      if (inp.sizes) {
        for (const [sz, qty] of Object.entries(inp.sizes)) {
          totals[sz] = (totals[sz] || 0) + (Number(qty) || 0);
        }
      }
    }
    return totals;
  }, [filteredInputs]);

  const totalReportPieces = useMemo(() => {
    return filteredInputs.reduce((sum, i) => sum + (Number(i.totalQty) || 0), 0);
  }, [filteredInputs]);

  // Unique styles in report
  const uniqueStylesCount = useMemo(() => {
    const s = new Set<string>();
    filteredInputs.forEach((i) => {
      if (i.blkNumber) s.add(i.blkNumber);
    });
    return s.size;
  }, [filteredInputs]);

  // ==========================================
  // REAL PDF DOWNLOAD HANDLER
  // ==========================================
  const handleDownloadPdf = () => {
    sounds.playSuccess();
    setDownloadingPdf(true);

    try {
      if (reportType === 'production') {
        downloadProductionReportPdf({
          title: 'TASS GARMENT PRODUCTION & CUTTING REPORT',
          inputs: filteredInputs,
          sizeTotals: reportSizeTotals,
          totalPieces: totalReportPieces,
          dateRange: startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : 'All Time',
          blkFilter: selectedBlk === 'all' ? 'All BLK / Styles' : selectedBlk,
        });
      } else if (reportType === 'challan') {
        const firstItem = filteredInputs[0];
        downloadChallanPdf({
          blkNo: selectedBlk !== 'all' ? selectedBlk : firstItem?.blkNumber || 'ALL',
          buyerName: firstItem?.buyerName || 'Multiple Buyers',
          color: firstItem?.color || 'Mixed',
          items: filteredInputs,
          totalPcs: totalReportPieces,
        });
      } else if (reportType === 'accessories') {
        downloadAccessoriesReportPdf({
          accessories,
        });
      }
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('পিডিএফ তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setTimeout(() => setDownloadingPdf(false), 800);
    }
  };

  // Browser Print view
  const handlePrint = () => {
    sounds.playTap();
    window.print();
  };

  // Export Production CSV
  const handleExportCSV = () => {
    sounds.playSuccess();
    const headers = ['তারিখ', 'BLK নম্বর (Style)', 'বায়ার', 'কালার', 'SR নম্বর/কাটিং', 'বান্ডেল', 'লাইন', 'সাইজ ব্রেকডাউন', 'মোট পিস'];
    const rows = filteredInputs.map((i) => {
      const sizeStr = Object.entries(i.sizes || {})
        .map(([k, v]) => `${k}:${v}`)
        .join(' | ');
      return [
        `"${i.date}"`,
        `"${i.blkNumber}"`,
        `"${i.buyerName}"`,
        `"${i.color}"`,
        `"${i.srNumber || ''}"`,
        `"${i.bundleNo || ''}"`,
        `"${i.lineNo || ''}"`,
        `"${sizeStr}"`,
        i.totalQty,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TASS_PRODUCTION_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gmail / Email Summary Generator
  const handleShareGmail = () => {
    sounds.playToot();
    const subject = encodeURIComponent(`TASS INPUT 2.0 - প্রোডাকশন রিপোর্ট (${new Date().toLocaleDateString('bn-BD')})`);
    const sizeSummary = Object.entries(reportSizeTotals)
      .map(([s, q]) => `${s}: ${q} pcs`)
      .join(', ');

    const body = encodeURIComponent(
      `আসসালামু আলাইকুম,\n\nTASS INPUT 2.0 গার্মেন্ট প্রোডাকশন ইনপুট রিপোর্ট সারসংক্ষেপ:\n` +
        `তারিখ: ${startDate || 'শুরু'} হতে ${endDate || 'বর্তমান'}\n` +
        `ফিল্টারকৃত BLK: ${selectedBlk === 'all' ? 'সকল বিএলকে' : selectedBlk}\n` +
        `মোট ইনপুট পরিমাণ: ${totalReportPieces.toLocaleString()} পিস\n` +
        `সাইজ ব্রেকডাউন: ${sizeSummary || 'N/A'}\n` +
        `মোট কাটিং এন্ট্রি: ${filteredInputs.length} টি\n\n` +
        `ধন্যবাদ,\nTASS INPUT 2.0 সিস্টেম`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* 1. TOP HEADER & INSTANT DOWNLOAD ACTION BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>গার্মেন্ট প্রোডাকশন রিপোর্ট সেন্টার</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              সাইজ সামারি, ডেলিভারি চালান ও সরাসরি ১-ক্লিকে আসল PDF ফাইল ডাউনলোড
            </p>
          </div>
        </div>

        {/* Action Buttons: REAL PDF DOWNLOAD + EXCEL + PRINT + GMAIL */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleShareGmail}
            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-all"
          >
            <Mail className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">জিমেইল</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">প্রিন্ট</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>এক্সেল CSV</span>
          </button>

          {/* PRIMARY REAL PDF DOWNLOAD BUTTON */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-orange-500/20 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${downloadingPdf ? 'animate-bounce' : ''}`} />
            <span>{downloadingPdf ? 'ডাউনলোড হচ্ছে...' : 'PDF ডাউনলোড (PDF Download)'}</span>
          </button>
        </div>
      </div>

      {/* 2. REPORT TYPE TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 print:hidden overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            sounds.playToot();
            setReportType('production');
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            reportType === 'production'
              ? 'bg-orange-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>১. মাল ইনপুট ও সাইজ রিপোর্ট</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playToot();
            setReportType('challan');
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            reportType === 'challan'
              ? 'bg-orange-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>২. ডেলিভারি চালান স্লিপ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playToot();
            setReportType('accessories');
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            reportType === 'accessories'
              ? 'bg-orange-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>৩. স্টোর এক্সেসরিজ স্টক রিপোর্ট</span>
        </button>
      </div>

      {/* 3. CLEAN FILTER BAR */}
      {reportType !== 'accessories' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-orange-400" />
            <label className="text-xs font-bold text-slate-300">বিএলকে:</label>
            <select
              value={selectedBlk}
              onChange={(e) => {
                sounds.playToot();
                setSelectedBlk(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">সকল BLK (All)</option>
              {blkOrders.map((b) => (
                <option key={b.id} value={b.blkNumber}>
                  {b.blkNumber} ({b.buyerName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-300">বায়ার:</label>
            <select
              value={selectedBuyer}
              onChange={(e) => {
                sounds.playToot();
                setSelectedBuyer(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">সকল বায়ার</option>
              {uniqueBuyers.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-300">শুরুর তারিখ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-300">শেষ তারিখ:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-orange-500"
            />
          </div>

          {(selectedBlk !== 'all' || selectedBuyer !== 'all' || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                sounds.playToot();
                setSelectedBlk('all');
                setSelectedBuyer('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-800"
            >
              রিসেট
            </button>
          )}
        </div>
      )}

      {/* 4. REPORT CONTENT */}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PRODUCTION & SIZING SUMMARY                            */}
      {/* ------------------------------------------------------------- */}
      {reportType === 'production' && (
        <div className="space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-2xl bg-slate-900 border border-orange-500/30 shadow-sm">
              <div className="text-[10px] text-orange-300 font-bold">মোট ইনপুট পিস</div>
              <div className="text-xl sm:text-2xl font-black text-orange-400 mt-0.5 font-mono">
                {totalReportPieces.toLocaleString()}{' '}
                <span className="text-[10px] text-slate-400 font-normal">pcs</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-yellow-500/30 shadow-sm">
              <div className="text-[10px] text-yellow-300 font-bold">Style / BLK সংখ্যা</div>
              <div className="text-xl sm:text-2xl font-black text-yellow-400 mt-0.5 font-mono">
                {uniqueStylesCount}{' '}
                <span className="text-[10px] text-slate-400 font-normal">স্টাইল</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-sm">
              <div className="text-[10px] text-amber-300 font-bold">কাটিং No / এন্ট্রি</div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5 font-mono">
                {filteredInputs.length}{' '}
                <span className="text-[10px] text-slate-400 font-normal">টি</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-sm">
              <div className="text-[10px] text-slate-300 font-bold">রিপোর্ট অ্যাকশন</div>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="mt-1 w-full py-1 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Download className="w-3 h-3" />
                <span>PDF সেভ করুন</span>
              </button>
            </div>
          </div>

          {/* Sizing Breakdown Matrix Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-black text-white">
                  সার্বিক সাইজ বাই সাইজ মোট হিসাব (Size-by-Size Breakdown)
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-yellow-400">
                মোট: {totalReportPieces.toLocaleString()} pcs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(reportSizeTotals).map(([sz, qty]) => (
                <div key={sz} className="p-2.5 rounded-2xl bg-slate-950 border border-orange-500/20 text-center">
                  <div className="text-xs font-bold text-slate-400">{sz}</div>
                  <div className="text-lg font-black text-yellow-400 mt-0.5 font-mono">
                    {qty.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {totalReportPieces > 0 ? ((qty / totalReportPieces) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Input Records Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <span className="text-xs font-bold text-amber-300">
                ইনপুট ও কাটিং রেকর্ড তালিকা ({filteredInputs.length} টি)
              </span>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>PDF ডাউনলোড</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">BLK নম্বর</th>
                    <th className="p-3">বায়ার</th>
                    <th className="p-3">কালার</th>
                    <th className="p-3">কাটিং/SR NO</th>
                    <th className="p-3">লাইন</th>
                    <th className="p-3">সাইজ ব্রেকডাউন</th>
                    <th className="p-3 text-right">মোট পিস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredInputs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                        কোনো ইনপুট রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredInputs.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-850/50">
                        <td className="p-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">{i.date}</td>
                        <td className="p-3 font-mono font-black text-amber-400 whitespace-nowrap">{i.blkNumber}</td>
                        <td className="p-3 whitespace-nowrap text-white font-semibold">{i.buyerName}</td>
                        <td className="p-3 whitespace-nowrap text-orange-400 font-bold">{i.color}</td>
                        <td className="p-3 whitespace-nowrap font-mono text-yellow-300 font-bold">
                          {i.srNumber || 'SR-01'}
                        </td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">{i.lineNo || '-'}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(i.sizes || {}).map(([s, q]) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 border border-slate-800"
                              >
                                {s}:<strong className="text-yellow-400 ml-0.5">{q}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-yellow-400 whitespace-nowrap text-sm">
                          {i.totalQty.toLocaleString()} pcs
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PRINTABLE DELIVERY CHALLAN SLIP (GREEN & DEEP ORANGE) */}
      {/* ------------------------------------------------------------- */}
      {reportType === 'challan' && (
        <div className="space-y-3">
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>এই চালান স্লিপ PDF ডাউনলোড করুন</span>
            </button>
          </div>

          <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-3xl mx-auto space-y-5 print:shadow-none print:p-0 border-t-8 border-orange-600 border-x border-b border-orange-200">
            {/* Header: Green text & Deep Orange accent */}
            <div className="text-center border-b-2 border-orange-500 pb-3">
              <h2 className="text-xl sm:text-2xl font-black tracking-wide text-emerald-700 uppercase">
                TASS GARMENT PRODUCTION
              </h2>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">
                গার্মেন্ট প্রোডাকশন ডেলিভারি চালান ও কাটিং রিপোর্ট স্লিপ
              </p>
              <div className="text-xs font-bold text-orange-700 mt-2 font-mono">
                তারিখ: {new Date().toLocaleDateString('bn-BD')} | সময়: {new Date().toLocaleTimeString('bn-BD')}
              </div>
            </div>

            {/* Scope Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-orange-50/90 p-3 rounded-xl border border-orange-200">
              <div>
                <div className="text-orange-900 font-semibold text-[11px]">BLK নম্বর (Style):</div>
                <div className="text-sm font-black text-orange-700 font-mono">
                  {selectedBlk === 'all' ? 'সকল বিএলকে' : selectedBlk}
                </div>
              </div>
              <div>
                <div className="text-emerald-900 font-semibold text-[11px]">বায়ার:</div>
                <div className="text-sm font-bold text-emerald-800">
                  {selectedBuyer === 'all' ? 'সকল বায়ার' : selectedBuyer}
                </div>
              </div>
              <div className="text-right sm:text-left">
                <div className="text-emerald-900 font-semibold text-[11px]">সময়কাল:</div>
                <div className="text-sm font-bold text-emerald-800">
                  {startDate || 'শুরু'} হতে {endDate || 'বর্তমান'}
                </div>
              </div>
            </div>

            {/* Challan Records Table with Cyan numbers */}
            <div className="border border-orange-300 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-orange-600 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">কাটিং/SR NO</th>
                    <th className="p-2.5">কালার</th>
                    <th className="p-2.5">লাইন</th>
                    <th className="p-2.5">সাইজ ব্রেকডাউন</th>
                    <th className="p-2.5 text-right">মোট পিস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100 font-medium">
                  {filteredInputs.slice(0, 30).map((i) => (
                    <tr key={i.id} className="hover:bg-orange-50/50">
                      <td className="p-2.5 font-mono text-slate-700">{i.date}</td>
                      <td className="p-2.5 font-mono font-bold text-orange-700">{i.srNumber || 'SR-01'}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{i.color}</td>
                      <td className="p-2.5 text-slate-600">{i.lineNo || '-'}</td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(i.sizes || {}).map(([s, q]) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.2 rounded bg-slate-900 text-[10px] font-mono text-white"
                            >
                              {s}:<strong className="text-cyan-400 ml-0.5">{q}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-orange-700 text-xs">
                        {i.totalQty.toLocaleString()} pcs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Slip Total Box */}
            <div className="flex justify-between items-center p-3.5 bg-orange-100 rounded-xl border-2 border-orange-400 shadow-xs">
              <span className="font-black text-xs sm:text-sm uppercase text-emerald-900">
                সর্বমোট মাল ইনপুট চালান পরিমাণ:
              </span>
              <span className="font-black text-lg sm:text-xl text-orange-700 font-mono">
                {totalReportPieces.toLocaleString()} পিস
              </span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
              <div className="border-t-2 border-orange-400 pt-1.5 font-bold text-emerald-800">
                ইনপুট অপারেটর স্বাক্ষর
              </div>
              <div className="border-t-2 border-orange-400 pt-1.5 font-bold text-emerald-800">
                ফ্লোর সুপারভাইজার স্বাক্ষর
              </div>
              <div className="border-t-2 border-orange-400 pt-1.5 font-bold text-emerald-800">
                প্রোডাকশন ম্যানেজার / অ্যাডমিন
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ACCESSORIES STOCK & INVENTORY REPORT                   */}
      {/* ------------------------------------------------------------- */}
      {reportType === 'accessories' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-orange-400" />
              <h2 className="text-sm sm:text-base font-black text-white">
                স্টোর এক্সেসরিজ বর্তমান ব্যালেন্স ও ইনভেন্টরি রিপোর্ট
              </h2>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center gap-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>এক্সেসরিজ PDF</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="p-3">আইটেম কোড</th>
                  <th className="p-3">এক্সেসরিজের নাম</th>
                  <th className="p-3">ক্যাটাগরি</th>
                  <th className="p-3">স্পেসিফিকেশন</th>
                  <th className="p-3 text-right">বর্তমান ব্যালেন্স</th>
                  <th className="p-3">একক</th>
                  <th className="p-3">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {accessories.map((acc) => {
                  const isLow = acc.currentStock <= acc.minAlertStock;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-850/50">
                      <td className="p-3 font-mono text-slate-400">{acc.code || '-'}</td>
                      <td className="p-3 font-bold text-white">{acc.name}</td>
                      <td className="p-3">{acc.category}</td>
                      <td className="p-3 text-slate-400">{acc.spec || '-'}</td>
                      <td className="p-3 text-right font-mono font-black text-yellow-400 text-sm">
                        {acc.currentStock.toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-400 font-medium">{acc.unit}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLow
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {isLow ? 'লো স্টক' : 'পর্যাপ্ত'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
