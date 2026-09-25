import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  PlusSquare,
  ShieldCheck,
  Zap,
  Layers,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with App Logo */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-200 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 p-1 shadow-lg border border-orange-400/40 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img src="/icon.svg" alt="TASS INPUT 2.0" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/30 text-orange-200 border border-orange-400/30 uppercase tracking-wide">
                  Android APK & PWA
                </span>
                <span className="text-xs text-amber-200/90 font-mono">v2.0 PRO</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide mt-1">
                TASS INPUT 2.0
              </h2>
              <p className="text-xs text-amber-100/80">
                গার্মেন্ট প্রোডাকশন ও স্টক কন্ট্রোল অ্যান্ড্রয়েড অ্যাপ
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Message if Already Installed */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">অ্যাপটি ইতিমধ্যে আপনার ডিভাইসে ইনস্টল করা আছে!</p>
                <p className="text-xs text-emerald-400/80">আপনার হোম স্ক্রিন বা অ্যাপ ড্রয়ার থেকে এটি সরাসরি চালু করতে পারবেন।</p>
              </div>
            </div>
          ) : installSuccess ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">অ্যাপ ইনস্টলেশন সফল হয়েছে!</p>
                <p className="text-xs text-emerald-400/80">আপনার হোম স্ক্রিনে অ্যাপ আইকনটি যুক্ত করা হয়েছে।</p>
              </div>
            </div>
          ) : (
            <>
              {/* Main One-Click Install Button for Android/Chromium */}
              {isInstallable && (
                <div className="bg-slate-800/80 p-4 rounded-xl border border-orange-500/30 text-center space-y-3">
                  <p className="text-sm font-medium text-slate-200">
                    নিচের বাটনে চাপ দিয়ে সরাসরি আপনার অ্যান্ড্রয়েড ফোনে অ্যাপ ইনস্টল করে নিন:
                  </p>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-bold text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    📱 ১-ক্লিকে অ্যান্ড্রয়েড অ্যাপ ইনস্টল করুন
                  </button>
                  <p className="text-[11px] text-slate-400">
                    কোনো এক্সটার্নাল আনভেরিফাইড ডাউনলোডের ঝুঁকি নেই, সরাসরি ফোনের হোম স্ক্রিনে ইনস্টল হবে।
                  </p>
                </div>
              )}

              {/* Direct APK File Download Box */}
              <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Download className="w-4 h-4" />
                    <span>সরাসরি .apk ফাইল ডাউনলোড:</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    v2.0.apk
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  যদি প্যাকেজ ফাইলটি সরাসরি ডাউনলোড করতে চান, তবে নিচের বোতামে ক্লিক করুন:
                </p>
                <a
                  href="/tass-input-v2.0.apk"
                  download="tass-input-v2.0.apk"
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 font-medium text-xs text-amber-300 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  ⬇️ tass-input-v2.0.apk প্যাকেজ ডাউনলোড করুন
                </a>
              </div>

              {/* Step by Step Manual Guide for Android Users */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>অ্যান্ড্রয়েড ফোন থেকে ইনস্টল করার সহজ নিয়ম:</span>
                </div>
                <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                  <li>
                    ফোনের <strong>Google Chrome</strong> ব্রাউজারে এই লিংকটি ওপেন করুন।
                  </li>
                  <li>
                    উপরে বা নিচে ব্রাউজারের <strong>থ্রি-ডট মেনুতে (⋮)</strong> ক্লিক করুন।
                  </li>
                  <li>
                    মেনু থেকে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> (হোম স্ক্রিনে যোগ করুন) সিলেক্ট করুন।
                  </li>
                  <li>
                    <strong>"Install"</strong> চাপলেই কয়েক সেকেন্ডে আপনার ফোনে অরিজিনাল অ্যাপ আইকনসহ ইনস্টল হয়ে যাবে!
                  </li>
                </ol>
              </div>

              {/* iOS Guide */}
              {isIOS && (
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Share2 className="w-4 h-4" />
                    <span>iPhone / iPad এ ইনস্টল করার নিয়ম:</span>
                  </div>
                  <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>Safari ব্রাউজারে নিচের <strong>Share (শেয়ার)</strong> আইকনে চাপ দিন।</li>
                    <li>নিচের দিকে স্ক্রোল করে <strong>"Add to Home Screen"</strong> চাপুন।</li>
                    <li>উপরে ডানপাশে <strong>"Add"</strong> বাটনে ক্লিক করলেই ইনস্টল হয়ে যাবে।</li>
                  </ol>
                </div>
              )}

              {/* Key Features Pill grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>সুপার ফাস্ট ফুলস্ক্রিন স্পিড</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>১০০% ফায়ারবেস ক্লাউড সুরক্ষিত</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>কোনো ব্রাউজার বার থাকবে না</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>অটোমেটিক আপডেট সুবিধা</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            TASS INPUT 2.0 • Cutting & Store Manager
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
