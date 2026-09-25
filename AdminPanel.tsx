import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Activity,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Database,
  Lock,
  Mail,
  UserCheck,
  Download,
  AlertCircle,
  X,
  Trash2,
  UserX,
  Sparkles,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { collection, onSnapshot, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, SUPER_ADMIN_EMAIL } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { AuthorizedUser, UserRole, ActivityLog } from '../types';
import { purgeDemoHMData } from '../utils/initialData';
import { sounds } from '../utils/soundEffects';

interface AdminPanelProps {
  onRefreshAllData: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefreshAllData }) => {
  const {
    userProfile,
    addAuthorizedUser,
    updateUserPassword,
    deleteAuthorizedUser,
    toggleAuthorizedUserStatus,
    updateAdminPin,
    secretPin,
    logActivity,
  } = useAuth();

  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // New Authorized User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [savingUser, setSavingUser] = useState(false);

  // Quick Password Change Modal / State
  const [selectedUserForPass, setSelectedUserForPass] = useState<AuthorizedUser | null>(null);
  const [editPassInput, setEditPassInput] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Secret PIN management state
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  // Demo purge state
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  // Activity search & filter
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Real-time listener for authorized_users collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'authorized_users'),
      (snap) => {
        const list: AuthorizedUser[] = [];
        snap.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as AuthorizedUser);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAuthorizedUsers(list);
        setLoadingUsers(false);
      },
      (err) => {
        console.warn('authorized_users listener note:', err);
        setLoadingUsers(false);
      }
    );

    return () => unsub();
  }, []);

  // Fetch activity logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(150));
      const snap = await getDocs(q);
      const list: ActivityLog[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as ActivityLog);
      });
      setActivityLogs(list);
    } catch (err) {
      try {
        const snap = await getDocs(collection(db, 'activity_logs'));
        const list: ActivityLog[] = [];
        snap.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as ActivityLog);
        });
        setActivityLogs(list.reverse().slice(0, 100));
      } catch (e) {
        console.warn('Fallback log fetch note:', e);
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Handle Add New Authorized User (Email & Password authorization)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      sounds.playDelete();
      setErrorMsg('দয়া করে একটি সঠিক ইমেইল বা Gmail অ্যাড্রেস দিন।');
      return;
    }

    const cleanPass = newPassword.trim() || '123456';

    setSavingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await addAuthorizedUser(newEmail.trim(), cleanPass, newDisplayName.trim(), newRole);
      if (res.success) {
        sounds.playSuccess();
        setSuccessMsg(res.message || 'ইউজার অ্যাকাউন্ট ও পাসওয়ার্ড তৈরি হয়েছে!');
        setNewEmail('');
        setNewPassword('');
        setNewDisplayName('');
        setNewRole('operator');
        fetchLogs();
      } else {
        sounds.playDelete();
        setErrorMsg(res.message || 'অনুমোদন যোগ করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      sounds.playDelete();
      setErrorMsg(err?.message || 'ত্রুটি হয়েছে।');
    } finally {
      setSavingUser(false);
    }
  };

  // Handle Quick User Password Change by Admin
  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPass || !editPassInput.trim()) return;

    setUpdatingPass(true);
    try {
      const res = await updateUserPassword(selectedUserForPass.id, selectedUserForPass.email, editPassInput.trim());
      if (res.success) {
        sounds.playSuccess();
        setSuccessMsg(`ইউজার ${selectedUserForPass.email} এর পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!`);
        setSelectedUserForPass(null);
        setEditPassInput('');
        fetchLogs();
      } else {
        sounds.playDelete();
        alert(res.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      sounds.playDelete();
      alert('ত্রুটি: ' + err.message);
    } finally {
      setUpdatingPass(false);
    }
  };

  // Toggle user active / blocked status
  const handleToggleStatus = async (user: AuthorizedUser) => {
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert('সুপার অ্যাডমিন অ্যাকাউন্ট ব্লক করা যাবে না।');
      return;
    }

    sounds.playToot();
    await toggleAuthorizedUserStatus(user.id, user.email, user.status);
    fetchLogs();
  };

  // Delete user from authorized list
  const handleDeleteUser = async (user: AuthorizedUser) => {
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert('সুপার অ্যাডমিন অ্যাকাউন্ট ডিলিট করা যাবে না।');
      return;
    }

    if (!window.confirm(`আপনি কি নিশ্চিত যে "${user.email}" এর অনুমতি মুছে ফেলতে চান?`)) {
      return;
    }

    sounds.playDelete();
    const res = await deleteAuthorizedUser(user.id, user.email);
    if (res.success) {
      setSuccessMsg(`ইউজার ${user.email} মুছে ফেলা হয়েছে।`);
      fetchLogs();
    }
  };

  // Handle change Secret PIN
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      alert('পিন কমপক্ষে ৪ সংখ্যার হতে হবে।');
      return;
    }

    const success = await updateAdminPin(newPinInput.trim());
    if (success) {
      sounds.playSuccess();
      setPinChangeSuccess(true);
      setNewPinInput('');
      setTimeout(() => setPinChangeSuccess(false), 3000);
    } else {
      sounds.playDelete();
      alert('পিন আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  // Permanently Purge BLK-2026-HM01 and demo data
  const handlePurgeDemoData = async () => {
    if (
      !window.confirm(
        'আপনি কি BLK-2026-HM01 এবং সকল ডেমো H&M ডাটা ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?'
      )
    ) {
      return;
    }

    setPurging(true);
    setPurgeResult(null);
    try {
      const count = await purgeDemoHMData();
      sounds.playSuccess();
      setPurgeResult(`সফলভাবে ${count} টি BLK-2026-HM01 ও ডেমো রেকর্ড ডাটাবেস থেকে মুছে ফেলা হয়েছে!`);
      onRefreshAllData();
      fetchLogs();
    } catch (err: any) {
      sounds.playDelete();
      setPurgeResult('ডাটা মুছতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setPurging(false);
    }
  };

  // Export audit logs CSV
  const handleExportLogsCSV = () => {
    if (activityLogs.length === 0) return;
    const headers = ['তারিখ ও সময়', 'ইউজার ইমেইল', 'ইউজার নাম', 'অ্যাকশন টাইপ', 'বিবরণ'];
    const rows = activityLogs.map((l) => [
      `"${new Date(l.createdAt).toLocaleString('bn-BD')}"`,
      `"${l.userEmail}"`,
      `"${l.userName || ''}"`,
      `"${l.action}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TASS_AUDIT_LOGS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered activity logs
  const filteredLogs = activityLogs.filter((log) => {
    const q = logSearch.toLowerCase();
    const matchSearch =
      q === '' ||
      log.userEmail.toLowerCase().includes(q) ||
      (log.userName && log.userName.toLowerCase().includes(q)) ||
      log.details.toLowerCase().includes(q);

    const matchAction = logActionFilter === 'all' || log.action === logActionFilter;

    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* 1. ADMIN HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">হিডেন অ্যাডমিন প্যানেল</h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-black">
                MASTER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              অনুমোদিত জিমেইল ইউজার ম্যানেজমেন্ট, সিক্রেট পিন ও ডাটা নিরাপত্তা কন্ট্রোল
            </p>
          </div>
        </div>

        {/* 1-Click HM01 Demo Purge Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePurgeDemoData}
            disabled={purging}
            className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            title="BLK-2026-HM01 এবং সকল ডেমো ডাটা ডাটাবেস থেকে মুছে ফেলুন"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{purging ? 'মুছে ফেলা হচ্ছে...' : 'BLK-2026-HM01 ডিলিট করুন'}</span>
          </button>
        </div>
      </div>

      {purgeResult && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{purgeResult}</span>
        </div>
      )}

      {/* 2. USER MANAGEMENT SECTION (Add User & Authorized List) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Add Authorized User Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white">নতুন অ্যাকাউন্ট যোগ করুন (Add User)</h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            ইউজারের Gmail এবং পছন্দের পাসওয়ার্ড নির্ধারণ করে দিন। ইউজার এই ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি অ্যাপে লগইন করতে পারবেন।
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                জিমেইল / ইমেইল অ্যাড্রেস <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="operator@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                লগইন পাসওয়ার্ড <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন (যেমন: 123456)"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ইউজারের নাম / ডিপার্টমেন্ট (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="যেমন: লাইন ১ অপারেটর / রফিকুল ইসলাম"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">রোল ও পারমিশন</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="operator">অপারেটর (ইনপুট ও স্টোর এন্ট্রি)</option>
                <option value="supervisor">সুপারভাইজার (রিপোর্ট ও মনিটরিং)</option>
                <option value="store_keeper">স্টোর কিপার (এক্সেসরিজ ম্যানেজমেন্ট)</option>
                <option value="admin">অ্যাডমিন (সকল এক্সেস)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingUser}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{savingUser ? 'সংরক্ষণ হচ্ছে...' : '+ অনুমতি দিন (Add User)'}</span>
            </button>
          </form>

          {/* Secret PIN settings card */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                সিক্রেট পিন কোড
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                বর্তমান: {secretPin || '7788'}
              </span>
            </div>
            <form onSubmit={handleUpdatePin} className="flex gap-2">
              <input
                type="text"
                maxLength={8}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="নতুন পিন (যেমন: 7788)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-center font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 active:scale-95"
              >
                পিন বদলান
              </button>
            </form>
            {pinChangeSuccess && (
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                ✓ সিক্রেট পিন সফলভাবে আপডেট করা হয়েছে!
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-1.5">
              লোগোতে পরপর ৫ বার ক্লিক করলে এই পিন কোডটি দিয়ে এডমিন প্যানেলে সরাসরি ঢোকা যাবে।
            </p>
          </div>
        </div>

        {/* Right Column: User List & Management (2 Columns wide) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-black text-white">অনুমোদিত ইউজারের তালিকা (User List)</h2>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono font-bold border border-slate-700">
              মোট: {authorizedUsers.length + 1}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            যে কোনো সময় অনুমোদিত ইমেইলের তালিকা দেখতে পারবেন এবং প্রয়োজন অনুযায়ী কাউকে অ্যাপ থেকে ব্লক বা ডিলিট করে দিতে পারবেন।
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">জিমেইল / ইমেইল</th>
                  <th className="p-3">পাসওয়ার্ড</th>
                  <th className="p-3">নাম ও ডিপার্টমেন্ট</th>
                  <th className="p-3">রোল</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {/* Master Super Admin Row (Permanent) */}
                <tr className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                  <td className="p-3 font-mono font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{SUPER_ADMIN_EMAIL}</span>
                  </td>
                  <td className="p-3 font-mono text-amber-300/80">
                    মাস্টার পিন ({secretPin || '7788'})
                  </td>
                  <td className="p-3 text-slate-300">মাস্টার সুপার অ্যাডমিন</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Super Admin
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      সক্রিয়
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-500 text-[11px]">
                    স্থায়ী এক্সেস
                  </td>
                </tr>

                {/* List of Custom Authorized Users */}
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      ইউজার তালিকা লোড হচ্ছে...
                    </td>
                  </tr>
                ) : authorizedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      কোনো অতিরিক্ত ইউজার এখনো যোগ করা হয়নি। বামপাশের ফর্ম থেকে নতুন Gmail ও পাসওয়ার্ড যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  authorizedUsers.map((u) => {
                    const isBlocked = u.status === 'blocked';
                    const isPassRevealed = Boolean(revealedPasswords[u.id]);
                    const displayPass = u.password || '123456';
                    return (
                      <tr key={u.id} className="hover:bg-slate-850 transition-colors">
                        <td className="p-3 font-mono text-white font-semibold">
                          {u.email}
                        </td>
                        <td className="p-3">
                          <div className="inline-flex items-center gap-1.5 font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                            <span>{isPassRevealed ? displayPass : '••••••'}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedPasswords((prev) => ({
                                  ...prev,
                                  [u.id]: !prev[u.id],
                                }))
                              }
                              className="text-slate-400 hover:text-white p-0.5"
                              title={isPassRevealed ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                            >
                              {isPassRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {u.displayName || 'অপারেটর'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              ব্লকড
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              সক্রিয়
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Change Password Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForPass(u);
                                setEditPassInput(u.password || '123456');
                              }}
                              title="পাসওয়ার্ড পরিবর্তন করুন"
                              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle block/active */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              title={isBlocked ? 'আনব্লক করুন' : 'ব্লক করুন'}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                isBlocked
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                              }`}
                            >
                              {isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              title="ইউজার ডিলিট করুন"
                              className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. AUDIT ACTIVITY LOGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white">সিস্টেম অডিট ও ইউজার অ্যাক্টিভিটি লগ</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="রিফ্রেশ লগ"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportLogsCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="ইউজার ইমেইল বা অ্যাকশন সার্চ করুন..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={logActionFilter}
            onChange={(e) => setLogActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">সকল অ্যাকশন</option>
            <option value="authorized_login">লগইন (Login)</option>
            <option value="create_input">মাল ইনপুট এন্ট্রি</option>
            <option value="delete_input">মাল ইনপুট ডিলিট</option>
            <option value="add_authorized_user">ইউজার অনুমোদন</option>
            <option value="secret_pin_unlock">পিন আনলক</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-2.5">তারিখ ও সময়</th>
                <th className="p-2.5">ইউজার</th>
                <th className="p-2.5">অ্যাকশন</th>
                <th className="p-2.5">বিবরণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {loadingLogs ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    লগ লোড হচ্ছে...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    কোনো অ্যাক্টিভিটি পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString('bn-BD', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-2.5 text-amber-300 font-semibold">{l.userEmail}</td>
                    <td className="p-2.5 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-200 font-sans">{l.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Password Edit Modal */}
      {selectedUserForPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">পাসওয়ার্ড পরিবর্তন করুন</h3>
              </div>
              <button
                onClick={() => setSelectedUserForPass(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              ইউজার: <span className="font-mono text-amber-300 font-bold">{selectedUserForPass.email}</span>
            </div>

            <form onSubmit={handleSaveUserPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  নতুন পাসওয়ার্ড লিখুন
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editPassInput}
                  onChange={(e) => setEditPassInput(e.target.value)}
                  placeholder="যেমন: 123456"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPass(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={updatingPass}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                >
                  {updatingPass ? 'সেভ হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
