/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { seedInitialGarmentData } from './utils/initialData';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './components/Dashboard';
import { ProductionInputView } from './components/ProductionInputView';
import { ProductionInputModal } from './components/ProductionInputModal';
import { AccessoriesStore } from './components/AccessoriesStore';
import { BlkManager } from './components/BlkManager';
import { ReportsView } from './components/ReportsView';
import { AdminPanel } from './components/AdminPanel';
import { ProductionInput, BlkOrder, Accessory, AccessoryTransaction, Buyer } from './types';
import { ShieldAlert, Sparkles, LogIn, ArrowRight } from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, isAdmin, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'input' | 'blk' | 'accessories' | 'reports' | 'admin'>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [editingInput, setEditingInput] = useState<ProductionInput | null>(null);
  const [prefilledBlk, setPrefilledBlk] = useState<BlkOrder | null>(null);
  const [guestPreviewMode, setGuestPreviewMode] = useState(false);

  // Core Data States
  const [inputs, setInputs] = useState<ProductionInput[]>([]);
  const [blkOrders, setBlkOrders] = useState<BlkOrder[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [transactions, setTransactions] = useState<AccessoryTransaction[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Initialize and seed demo data on first startup
  useEffect(() => {
    seedInitialGarmentData().catch((err) => console.warn('Seed initial data note:', err));
  }, []);

  // Real-time Firestore Subscriptions with safe error fallbacks
  useEffect(() => {
    // 1. Production Inputs
    const unsubInputs = onSnapshot(
      collection(db, 'production_inputs'),
      (snap) => {
        const list: ProductionInput[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as ProductionInput));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInputs(list);
      },
      (err) => console.warn('production_inputs subscription:', err.message)
    );

    // 2. BLK Orders
    const unsubBlk = onSnapshot(
      collection(db, 'blk_orders'),
      (snap) => {
        const list: BlkOrder[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as BlkOrder));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBlkOrders(list);
      },
      (err) => console.warn('blk_orders subscription:', err.message)
    );

    // 3. Accessories
    const unsubAcc = onSnapshot(
      collection(db, 'accessories'),
      (snap) => {
        const list: Accessory[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Accessory));
        setAccessories(list);
      },
      (err) => console.warn('accessories subscription:', err.message)
    );

    // 4. Accessory Transactions
    const unsubTx = onSnapshot(
      collection(db, 'accessories_transactions'),
      (snap) => {
        const list: AccessoryTransaction[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as AccessoryTransaction));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(list);
      },
      (err) => console.warn('accessories_transactions subscription:', err.message)
    );

    // 5. Buyers
    const unsubBuyers = onSnapshot(
      collection(db, 'buyers'),
      (snap) => {
        const list: Buyer[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Buyer));
        setBuyers(list);
        setDataLoaded(true);
      },
      (err) => console.warn('buyers subscription:', err.message)
    );

    return () => {
      unsubInputs();
      unsubBlk();
      unsubAcc();
      unsubTx();
      unsubBuyers();
    };
  }, []);

  // Handlers for modal interactions
  const handleOpenNewInput = useCallback((blk?: BlkOrder) => {
    setEditingInput(null);
    setPrefilledBlk(blk || null);
    setIsInputModalOpen(true);
  }, []);

  const handleEditInput = useCallback((input: ProductionInput) => {
    setEditingInput(input);
    setPrefilledBlk(null);
    setIsInputModalOpen(true);
  }, []);

  const handleSelectBlkForInput = useCallback((blk: BlkOrder) => {
    handleOpenNewInput(blk);
  }, [handleOpenNewInput]);

  const isAuthenticated = Boolean(currentUser || userProfile);

  // If initial load and user not logged in:
  // Show clean login screen directly as requested:
  // "Loging interface শুধু লেখা থাকবে WELCOME TASS INPUT 2.0, পরে নিচে লগিং এর অপসন আসবে"
  if (!authLoading && !isAuthenticated && !guestPreviewMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          onAdminUnlocked={() => setActiveTab('admin')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-20 sm:pb-8">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(t: any) => setActiveTab(t)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenNewInputModal={() => handleOpenNewInput()}
        onLogout={() => setGuestPreviewMode(false)}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Guest Preview Notice if not logged in */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white text-sm">TASS INPUT 2.0 প্রোডাকশন সিস্টেম সক্রিয়</span>
                <p className="text-slate-400">
                  অ্যাডমিন তার গুগল জিমেইল দিয়ে এবং অপারেটররা অ্যাডমিনের নির্ধারিত ইমেইল/পাসওয়ার্ড দিয়ে লগইন করে কাজ করতে পারবেন।
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-600/30 whitespace-nowrap active:scale-95 transition-transform flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>লগইন করুন</span>
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <Dashboard
            inputs={inputs}
            blkOrders={blkOrders}
            accessories={accessories}
            buyers={buyers}
            onOpenNewInput={(blk?: BlkOrder) => handleOpenNewInput(blk)}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {/* Tab 2: Production Inputs & Sizing Calculation */}
        {activeTab === 'input' && (
          <ProductionInputView
            inputs={inputs}
            blkOrders={blkOrders}
            onOpenNewInput={() => handleOpenNewInput()}
            onEditInput={handleEditInput}
            onRefresh={() => {}}
          />
        )}

        {/* Tab 3: BLK Orders & Buyers */}
        {activeTab === 'blk' && (
          <BlkManager
            buyers={buyers}
            blkOrders={blkOrders}
            inputs={inputs}
            onRefresh={() => {}}
            onSelectBlkForInput={handleSelectBlkForInput}
          />
        )}

        {/* Tab 4: Store Accessories & Transactions */}
        {activeTab === 'accessories' && (
          <AccessoriesStore
            accessories={accessories}
            transactions={transactions}
            blkOrders={blkOrders}
            onRefresh={() => {}}
          />
        )}

        {/* Tab 5: Reports & Daily Challan */}
        {activeTab === 'reports' && (
          <ReportsView
            inputs={inputs}
            blkOrders={blkOrders}
            accessories={accessories}
            transactions={transactions}
          />
        )}

        {/* Tab 6: Admin Security & User Activity Panel */}
        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminPanel onRefreshAllData={() => {}} />
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
              <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
              <h2 className="text-xl font-bold text-white">শুধুমাত্র অ্যাডমিন এক্সেস সংরক্ষিত</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                এই প্যানেলটি শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত। আপনার অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন।
              </p>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                অ্যাডমিন লগইন
              </button>
            </div>
          )
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(t: any) => setActiveTab(t)}
        onOpenQuickInput={() => handleOpenNewInput()}
      />

      {/* Auth / Login Modal (when triggered via button) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAdminUnlocked={() => setActiveTab('admin')}
      />

      {/* Production Input Modal (with automatic SR increment and cumulative calculation) */}
      <ProductionInputModal
        isOpen={isInputModalOpen}
        onClose={() => {
          setIsInputModalOpen(false);
          setEditingInput(null);
          setPrefilledBlk(null);
        }}
        blkOrders={blkOrders}
        existingInputs={inputs}
        editingInput={editingInput}
        prefilledBlk={prefilledBlk}
        onSaved={() => {}}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
