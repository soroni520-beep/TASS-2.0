import React, { useState } from 'react';
import {
  Scissors,
  Mail,
  Lock,
  AlertCircle,
  LogIn,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/soundEffects';
import { SecretPinModal } from './SecretPinModal';
import { PWAInstallModal } from './PWAInstallModal';

interface LoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAdminUnlocked?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onAdminUnlocked }) => {
  const { loginWithEmailPassword, verifyAdminPin } = useAuth();

  // Auto-load remembered credentials from localStorage
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('tass_remembered_email') || '';
  });
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('tass_remembered_password') || '';
  });
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Secret 5-tap trigger for Hidden Admin PIN
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  if (isOpen === false) return null;

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 900) {
      const nextCount = tapCount + 1;
      if (nextCount >= 5) {
        setTapCount(0);
        sounds.playSuccess();
        setIsPinModalOpen(true);
      } else {
        setTapCount(nextCount);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      sounds.playDelete();
      setError('দয়া করে আপনার জিমেইল বা ইমেইল লিখুন।');
      return;
    }

    if (!cleanPass) {
      sounds.playDelete();
      setError('দয়া করে পাসওয়ার্ড লিখুন।');
      return;
    }

    // Automatically store credentials so user never has to retype
    try {
      localStorage.setItem('tass_remembered_email', cleanEmail);
      localStorage.setItem('tass_remembered_password', cleanPass);
    } catch {
      // ignore localStorage quota errors
    }

    setError(null);
    setSuccessInfo(null);
    setLoading(true);

    try {
      const res = await loginWithEmailPassword(cleanEmail, cleanPass);
      if (res.success) {
        sounds.playSuccess();
        setSuccessInfo(res.message || 'লগইন সফল হয়েছে!');
        setTimeout(() => {
          if (res.isAdminBypass && onAdminUnlocked) {
            onAdminUnlocked();
          }
          onClose?.();
        }, 350);
      } else {
        sounds.playDelete();
        setError(res.message || 'ভুল ইমেইল বা পাসওয়ার্ড!');
      }
    } catch (err: any) {
      sounds.playDelete();
      setError('লগইন করার সময় ত্রুটি হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
        {/* Ambient background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-white">
          {/* Header with 5-tap trigger for Admin */}
          <div
            onClick={handleSecretTap}
            title="WELCOME TASS INPUT 2.0"
            className="text-center mb-6 select-none cursor-pointer group active:scale-98 transition-transform"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 shadow-xl shadow-orange-500/20 ring-2 ring-white/10 mb-3 group-hover:scale-105 transition-transform">
              <Scissors className="w-7 h-7 text-slate-950 stroke-[2.5]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white">
              WELCOME TASS INPUT <span className="text-amber-400">2.0</span>
            </h1>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successInfo && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Clean Email & Password Login Form */}
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                জিমেইল / ইমেইল
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'যাচাই হচ্ছে...' : 'লগইন (Login)'}</span>
            </button>

            {/* Quick Android APK / App Install Trigger */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:underline transition-colors py-1 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>📱 অ্যান্ড্রয়েড অ্যাপ (APK) ইনস্টল করুন</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* APK / PWA Install Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Secret Admin PIN Modal */}
      <SecretPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        verifyPin={verifyAdminPin}
        onSuccess={() => {
          if (onAdminUnlocked) {
            onAdminUnlocked();
          }
          onClose?.();
        }}
      />
    </>
  );
};
