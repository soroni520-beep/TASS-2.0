import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Boxes,
  BarChart3,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/soundEffects';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickInput?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickInput,
}) => {
  const { isAdmin } = useAuth();

  const handleTab = (tab: string) => {
    sounds.playSectionSwitch();
    setActiveTab(tab);
  };

  const handleQuick = () => {
    sounds.playToot();
    if (onOpenQuickInput) onOpenQuickInput();
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-amber-500/20 text-slate-400 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        <button
          onClick={() => handleTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">ড্যাশবোর্ড</span>
        </button>

        <button
          onClick={() => handleTab('input')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'input' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">মাল ইনপুট</span>
        </button>

        {/* Center Prominent Quick Input Button */}
        <button
          onClick={handleQuick}
          className="flex flex-col items-center justify-center -mt-5"
          title="নতুন ইনপুট যোগ করুন"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-orange-500/40 ring-4 ring-slate-950 active:scale-95 transition-transform">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black text-amber-400 mt-1">ইনপুট +</span>
        </button>

        <button
          onClick={() => handleTab('accessories')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'accessories' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">স্টোর</span>
        </button>

        <button
          onClick={() => handleTab('reports')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'reports' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">রিপোর্ট</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => handleTab('admin')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'admin' ? 'text-yellow-400 font-bold scale-105' : 'text-amber-300/70 hover:text-amber-300'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5 text-yellow-400" />
            <span className="text-[10px] tracking-tight text-amber-300 font-bold">অ্যাডমিন</span>
          </button>
        )}
      </div>
    </div>
  );
};
