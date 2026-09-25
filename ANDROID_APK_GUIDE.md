# 📱 TASS INPUT 2.0 - Android APK & App Installation Guide

এই প্রজেক্টটি একটি ফুল-ফিচার্ড **PWA (Progressive Web App) / WebAPK** হিসেবে তৈরি করা হয়েছে, যা যেকোনো অ্যান্ড্রয়েড ফোনে সরাসরি ১ ক্লিকে আসল অ্যাপ (APK) হিসেবে ইনস্টল হয়ে যায়।

---

## ১. সরাসরি অ্যান্ড্রয়েড ফোনে অ্যাপ (APK) ইনস্টল করার পদ্ধতি (সহজতম ও সেরা পদ্ধতি)

আপনার অ্যান্ড্রয়েড মোবাইলে আলাদা করে কোনো থার্ড-পার্টি ফাইল ডাউনলোডের ঝামেলা ছাড়াই গুগল অনুমোদিত নিরাপদ উপায়ে ইনস্টল করতে পারবেন:

1. **মোবাইলের Google Chrome** ব্রাউজারে আপনার অ্যাপের লাইভ লিংকটি ওপেন করুন।
2. অ্যাপের উপরে থাকা **"📱 APK / অ্যাপ ইনস্টল"** বাটনে চাপ দিন (অথবা ব্রাউজারের থ্রি ডট `⋮` মেনুতে চাপ দিন)।
3. মেনু থেকে **"Install app"** বা **"Add to Home screen"** (হোম স্ক্রিনে যুক্ত করুন) চাপুন।
4. সাথে সাথে আপনার ফোনের অ্যাপ লিস্টে **TASS INPUT 2.0** আইকনসহ অ্যাপ ইনস্টল হয়ে যাবে।
5. ওপেন করলে কোনো ব্রাউজার বার ছাড়াই একদম ১০০% ফুলস্ক্রিন নেটিভ অ্যান্ড্রয়েড অ্যাপ হিসেবে চলবে।

---

## ২. স্ট্যান্ডঅ্যালন `.apk` ফাইল তৈরি করার পদ্ধতি (Capacitor / Android Studio)

যদি আপনি সরাসরি একটি অফলাইন `.apk` বা `.aab` ফাইল তৈরি করতে চান:

### ধাপ ক: Capacitor দিয়ে প্রজেক্ট বিল্ড করা
```bash
# ১. ডিপেন্ডেন্সি ইনস্টল করুন
npm install @capacitor/core @capacitor/cli @capacitor/android

# ২. ক্যাপাসিটর কনফিগারেশন ইনিশিয়ালাইজ করুন
npx cap init "TASS INPUT 2.0" "com.tassinput.app" --web-dir "dist"

# ৩. ওয়েব অ্যাপ বিল্ড করুন
npm run build

# ৪. অ্যান্ড্রয়েড প্ল্যাটফর্ম যুক্ত করুন
npx cap add android

# ৫. বিল্ড সিঙ্ক করুন
npx cap sync android

# ৬. অ্যান্ড্রয়েড স্টুডিওতে ওপেন করে APK জেনারেট করুন
npx cap open android
```
অ্যান্ড্রয়েড স্টুডিও ওপেন হওয়ার পর **Build > Build Bundle(s) / APK(s) > Build APK(s)** এ ক্লিক করলেই আপনার রুট/অ্যান্ড্রয়েড ফোল্ডারে `app-debug.apk` অথবা `app-release.apk` তৈরি হয়ে যাবে।

---

## ৩. Bubblewrap / PWABuilder দিয়ে ১ মিনিটে APK তৈরি

1. [PWABuilder.com](https://www.pwabuilder.com/) সাইটে যান।
2. আপনার অ্যাপের পাবলিশড URL দিন।
3. **"Android"** কার্ডের নিচে **"Package"** বাটনে ক্লিক করুন।
4. সাইটটি স্বয়ংক্রিয়ভাবে একটি সাইন করা `.apk` এবং Google Play Store-এর জন্য `.aab` ফাইল ডাউনলোড করে দেবে।

---

## ৪. কনফিগারেশন বিবরণ
- **App Name:** TASS INPUT 2.0
- **Package ID:** `com.tassinput.app`
- **Theme Color:** `#0f172a` (Dark Slate / Orange Accent)
- **App Icons:** `public/icon.svg`, `public/pwa-192x192.png`, `public/pwa-512x512.png`
- **Database:** Google Cloud Firebase Firestore (Live Realtime Sync)
