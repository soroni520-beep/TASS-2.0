import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface SecretPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  verifyPin: (pin: string) => Promise<boolean> | boolean;
}

export const SecretPinModal: React.FC<SecretPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  verifyPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('পিন কোড প্রদান করুন');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isValid = await verifyPin(pin.trim());
      if (isValid) {
        sounds.playSuccess();
        setPin('');
        onSuccess();
        onClose();
      } else {
        sounds.playDelete();
        setError('ভুল পিন কোড! সঠিক সিক্রেট পিন দিন।');
      }
    } catch (err: any) {
      setError('যাচাইকরণে ত্রুটি হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">সিক্রেট অ্যাডমিন প্যানেল আনলক</h3>
          <p className="text-xs text-slate-400 mt-1">
            এডমিন এক্সেস পেতে আপনার গোপন ৪ সংখ্যার সিক্রেট পিন কোড দিন (ডিফল্ট: 7788)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
              সিক্রেট পিন কোড
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                maxLength={8}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="গোপন পিন টাইপ করুন"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-center text-lg tracking-[0.3em] font-mono font-bold text-amber-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {loading ? 'যাচাই হচ্ছে...' : 'আনলক করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
