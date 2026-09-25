import React, { useState } from 'react';
import {
  Scissors,
  Layers,
  ShieldCheck,
  LogOut,
  User,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/soundEffects';
import { SecretPinModal } from './SecretPinModal';
import { PWAInstallModal } from './PWAInstallModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickInput?: () => void;
  onOpenLoginModal?: () => void;
  onOpenNewInputModal?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickInput,
  onOpenLoginModal,
  onOpenNewInputModal,
  onLogout,
}) => {
  const { isAdmin, userProfile, logout, verifyAdminPin } = useAuth();

  // Secret 5-tap trigger for Hidden Admin PIN
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 900) {
      const next = tapCount + 1;
      if (next >= 5) {
        setTapCount(0);
        sounds.playSuccess();
        setIsPinModalOpen(true);
      } else {
        setTapCount(next);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  const handleTabChange = (tab: string) => {
    sounds.playSectionSwitch();
    setActiveTab(tab);
  };

  const handleInputClick = () => {
    sounds.playToot();
    if (onOpenNewInputModal) {
      onOpenNewInputModal();
    } else if (onOpenQuickInput) {
      onOpenQuickInput();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand Identity with Secret 5-Tap Hidden Admin Action */}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none active:scale-95 transition-transform"
              onClick={() => {
                handleLogoTap();
                if (tapCount < 4) {
                  handleTabChange('dashboard');
                }
              }}
              title="TASS INPUT 2.0"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 shadow-md shadow-orange-500/20 ring-1 ring-white/20">
                <Scissors className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-black text-base tracking-wide text-white">
                  TASS INPUT <span className="text-amber-400">2.0</span>
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                ড্যাশবোর্ড
              </button>
              <button
                onClick={() => handleTabChange('input')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'input'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                মাল ইনপুট
              </button>
              <button
                onClick={() => handleTabChange('blk')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'blk'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                বিএলকে ও বায়ার
              </button>
              <button
                onClick={() => handleTabChange('accessories')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'accessories'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                এক্সেসরিজ
              </button>
              <button
                onClick={() => handleTabChange('reports')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'reports'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                রিপোর্ট
              </button>

              {/* Hidden Admin Tab - Only visible if Admin is unlocked or logged in */}
              {isAdmin && (
                <button
                  onClick={() => handleTabChange('admin')}
                  className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    activeTab === 'admin'
                      ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                      : 'text-amber-300 hover:text-white hover:bg-amber-600/20'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  অ্যাডমিন প্যানেল
                </button>
              )}
            </nav>

            {/* Quick Action Button & User Info */}
            <div className="flex items-center gap-2">
              {/* APK / App Install Button */}
              <button
                onClick={() => setIsInstallModalOpen(true)}
                title="অ্যান্ড্রয়েড অ্যাপ (APK) ইনস্টল করুন"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">অ্যাপ ইনস্টল</span>
                <span className="sm:hidden">APK</span>
              </button>

              <button
                onClick={handleInputClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-orange-500/20 transition-transform active:scale-95"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>নতুন ইনপুট</span>
              </button>

              {userProfile && (
                <button
                  onClick={() => {
                    sounds.playDelete();
                    logout();
                    onLogout?.();
                  }}
                  title={`লগআউট (${userProfile.email})`}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* APK / PWA Install Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Secret PIN Modal for Hidden Admin Access */}
      <SecretPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        verifyPin={verifyAdminPin}
        onSuccess={() => {
          setActiveTab('admin');
        }}
      />
    </>
  );
};
