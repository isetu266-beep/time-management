import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { getDeletedItemIds, mergeDeletedItemIds, isItemDeleted } from '../utils/storage';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore (with custom databaseId if configured)
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Sign in with Google (Popup or fallback)
export async function signInWithGoogle(): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    // Check if running inside an Android APK / local WebView (file:/// protocol)
    if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || !window.location.host)) {
      return {
        success: false,
        error: 'মোবাইল অ্যাপে (APK) গুগলের সিকিউরিটি পলিসির কারণে 1-ট্যাপ পপ-আপ সমর্থিত নয়। অনুগ্রহ করে নিচের বক্সে আপনার জিমেইল আইডি লিখে সরাসরি কানেক্ট করুন।',
      };
    }

    const result = await signInWithPopup(auth, googleProvider);
    if (result && result.user && result.user.email) {
      return { success: true, email: result.user.email.toLowerCase() };
    }
    return { success: false, error: 'Google অ্যাকাউন্ট পাওয়া যায়নি।' };
  } catch (err: any) {
    console.error('Google Sign-In error:', err);
    let message = 'গুগল সাইন-ইন সম্পন্ন করা যায়নি।';
    if (err?.code === 'auth/popup-blocked') {
      message = 'পপ-আপ উইন্ডো ব্লক রয়েছে। নিচে আপনার জিমেইল আইডি সরাসরি লিখে কানেক্ট করুন।';
    } else if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
      message = 'সাইন-ইন উইন্ডো বন্ধ করা হয়েছে।';
    } else if (err?.code === 'auth/unauthorized-domain') {
      message = 'ফায়ারবেস কনসোলে এই ডোমেইনটি অথরাইজ করা নেই। আপনি নিচের বক্সে সরাসরি আপনার জিমেইল আইডি (যেমন: yourname@gmail.com) লিখে "জিমেইল কানেক্ট ও ডেটা সিঙ্ক করুন" বাটনে ক্লিক করে সাথে সাথে ক্লাউড ব্যাকআপ সক্রিয় করতে পারেন!';
    } else if (
      err?.code === 'auth/invalid-action-code' ||
      err?.message?.toLowerCase().includes('action is invalid') ||
      err?.message?.toLowerCase().includes('disallowed_useragent')
    ) {
      message = 'মোবাইল অ্যাপ্লিকেশনে (APK) গুগলের সিকিউরিটি পলিসির কারণে পপ-আপ কাজ করে না। অনুগ্রহ করে নিচের বক্সে আপনার জিমেইল আইডি লিখে কানেক্ট করুন।';
    } else if (err?.message) {
      message = err.message;
    }
    return { success: false, error: message };
  }
}

// Sign out
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('Firebase sign out error:', e);
  }
}

// Clean document ID for Firestore
export function getEmailDocId(email: string): string {
  return email.trim().toLowerCase().replace(/\//g, '_');
}

/**
 * Recursively sanitize objects to remove undefined values before saving to Firestore
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

/**
 * Save user data to Firestore
 */
export async function saveUserDataToCloud(email: string, appData: any): Promise<boolean> {
  if (!email || !email.includes('@')) return false;
  try {
    const docId = getEmailDocId(email);
    const docRef = doc(db, 'user_backups', docId);

    let cleanAppData = sanitizeForFirestore(appData);

    // Sync and merge any remote deletedItemIds
    try {
      const existingSnap = await withTimeout(getDoc(docRef), 3000, 'Check existing timeout');
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        if (Array.isArray(existingData?.deletedItemIds)) {
          mergeDeletedItemIds(existingData.deletedItemIds);
        }
      }
    } catch {
      // Proceed with save if check times out
    }

    // Filter out any explicitly deleted items before sending to Firestore
    if (cleanAppData) {
      if (Array.isArray(cleanAppData.dailyRoutine)) {
        cleanAppData.dailyRoutine = cleanAppData.dailyRoutine.filter((r: any) => !isItemDeleted(r.id));
      }
      if (Array.isArray(cleanAppData.tasks)) {
        cleanAppData.tasks = cleanAppData.tasks.filter((t: any) => !isItemDeleted(t.id));
      }
      if (Array.isArray(cleanAppData.habits)) {
        cleanAppData.habits = cleanAppData.habits.filter((h: any) => !isItemDeleted(h.id));
      }
      if (Array.isArray(cleanAppData.notes)) {
        cleanAppData.notes = cleanAppData.notes.filter((n: any) => !isItemDeleted(n.id));
      }
      if (Array.isArray(cleanAppData.checklists)) {
        cleanAppData.checklists = cleanAppData.checklists.filter((c: any) => !isItemDeleted(c.id));
      }
      if (Array.isArray(cleanAppData.timeEntries)) {
        cleanAppData.timeEntries = cleanAppData.timeEntries.filter((te: any) => !isItemDeleted(te.id));
      }
    }

    const tasksCount = Array.isArray(cleanAppData?.tasks) ? cleanAppData.tasks.length : 0;
    const habitsCount = Array.isArray(cleanAppData?.habits) ? cleanAppData.habits.length : 0;
    const deletedIdsList = Array.from(getDeletedItemIds());

    await withTimeout(
      setDoc(
        docRef,
        {
          email: email.trim().toLowerCase(),
          appData: cleanAppData,
          deletedItemIds: deletedIdsList,
          tasksCount,
          habitsCount,
          updatedAt: new Date().toISOString(),
          timestamp: serverTimestamp(),
        },
        { merge: true }
      ),
      12000,
      'Save timeout'
    );
    return true;
  } catch (err) {
    console.error('Failed to save user data to Firebase:', err);
    return false;
  }
}

/**
 * Load user data from Firestore (instant retrieval with multi-layer fallback)
 */
export async function loadUserDataFromCloud(email: string): Promise<any | null> {
  if (!email || !email.includes('@')) return null;
  try {
    const docId = getEmailDocId(email);
    const docRef = doc(db, 'user_backups', docId);

    // 1. Direct fetch using getDoc (instant from cache/network, sub-100ms)
    let snap: any = null;
    try {
      snap = await withTimeout(getDoc(docRef), 3000, 'Direct fetch timeout');
    } catch {
      // 2. Server fetch fallback if direct fetch threw error
      try {
        snap = await withTimeout(getDocFromServer(docRef), 3000, 'Server fetch timeout');
      } catch {
        snap = null;
      }
    }

    if (snap && snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.deletedItemIds)) {
        mergeDeletedItemIds(data.deletedItemIds);
      }
      const payload = data?.appData || (data?.tasks || data?.habits || data?.dailyRoutine ? data : null);
      if (payload) {
        if (Array.isArray(payload.dailyRoutine)) {
          payload.dailyRoutine = payload.dailyRoutine.filter((r: any) => !isItemDeleted(r.id));
        }
        if (Array.isArray(payload.tasks)) {
          payload.tasks = payload.tasks.filter((t: any) => !isItemDeleted(t.id));
        }
        if (Array.isArray(payload.habits)) {
          payload.habits = payload.habits.filter((h: any) => !isItemDeleted(h.id));
        }
        if (Array.isArray(payload.notes)) {
          payload.notes = payload.notes.filter((n: any) => !isItemDeleted(n.id));
        }
        if (Array.isArray(payload.checklists)) {
          payload.checklists = payload.checklists.filter((c: any) => !isItemDeleted(c.id));
        }
        if (Array.isArray(payload.timeEntries)) {
          payload.timeEntries = payload.timeEntries.filter((te: any) => !isItemDeleted(te.id));
        }
        return payload;
      }
      return null;
    }
    return null;
  } catch (err) {
    console.error('Failed to load user data from Firebase:', err);
    return null;
  }
}

/**
 * Real-time listener for user data updates across devices
 */
export function subscribeToUserData(
  email: string,
  onData: (data: any, updatedAt?: string) => void
): () => void {
  if (!email || !email.includes('@')) return () => {};
  const docId = getEmailDocId(email);
  const docRef = doc(db, 'user_backups', docId);
  return onSnapshot(
    docRef,
    (snap) => {
      // Ignore local writes in flight to avoid race conditions and UI resets
      if (snap.metadata.hasPendingWrites) {
        return;
      }
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.deletedItemIds)) {
          mergeDeletedItemIds(data.deletedItemIds);
        }
        const payload = data?.appData || (data?.tasks || data?.habits || data?.dailyRoutine ? data : null);
        if (payload) {
          if (Array.isArray(payload.dailyRoutine)) {
            payload.dailyRoutine = payload.dailyRoutine.filter((r: any) => !isItemDeleted(r.id));
          }
          if (Array.isArray(payload.tasks)) {
            payload.tasks = payload.tasks.filter((t: any) => !isItemDeleted(t.id));
          }
          if (Array.isArray(payload.habits)) {
            payload.habits = payload.habits.filter((h: any) => !isItemDeleted(h.id));
          }
          if (Array.isArray(payload.notes)) {
            payload.notes = payload.notes.filter((n: any) => !isItemDeleted(n.id));
          }
          if (Array.isArray(payload.checklists)) {
            payload.checklists = payload.checklists.filter((c: any) => !isItemDeleted(c.id));
          }
          if (Array.isArray(payload.timeEntries)) {
            payload.timeEntries = payload.timeEntries.filter((te: any) => !isItemDeleted(te.id));
          }
          onData(payload, data?.updatedAt);
        }
      }
    },
    (err) => {
      console.warn('Firestore subscription error:', err);
    }
  );
}
