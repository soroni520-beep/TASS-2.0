import { collection, getDocs, addDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Accessory, Buyer, BlkOrder } from '../types';

export const DEFAULT_ACCESSORIES: Omit<Accessory, 'id'>[] = [
  {
    name: 'দোস্টিং (Drawstring)',
    code: 'ACC-DRW-01',
    category: 'Drawstring',
    spec: 'Standard Cotton/Polyester Cord',
    unit: 'meters',
    currentStock: 12500,
    minAlertStock: 2000,
    description: 'ট্রাউজার ও হুডির কোমর বা গলার দোস্টিং',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Sewing Thread ৫০/২',
    code: 'ACC-THR-50-2',
    category: 'Thread',
    spec: '50/2 Spun Polyester',
    unit: 'cones',
    currentStock: 350,
    minAlertStock: 50,
    description: 'মেইন সিম ও ওভারলক স্টিচের সুইং সুতা ৫০/২',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Sewing Thread ১৫০/D',
    code: 'ACC-THR-150-D',
    category: 'Thread',
    spec: '150/D Textured Filament Polyester',
    unit: 'cones',
    currentStock: 420,
    minAlertStock: 60,
    description: 'লুপার ও ফ্ল্যাটলক স্টিচের সুইং সুতা ১৫০/D',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'ইলাস্টিক ২.২',
    code: 'ACC-ELS-22',
    category: 'Elastic',
    spec: '2.2 cm Woven Waistband Elastic',
    unit: 'meters',
    currentStock: 8500,
    minAlertStock: 1500,
    description: 'প্যান্ট ও বক্সার শর্টসের ২.২ সেমি ইলাস্টিক',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'ইলাস্টিক ২.৭',
    code: 'ACC-ELS-27',
    category: 'Elastic',
    spec: '2.7 cm Knitted Waistband Elastic',
    unit: 'meters',
    currentStock: 6200,
    minAlertStock: 1000,
    description: 'ট্রাউজার ও বটমের ২.৭ সেমি স্পেশাল ইলাস্টিক',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_BUYERS: Omit<Buyer, 'id'>[] = [
  {
    name: 'Zara (Inditex Group)',
    code: 'ZRA-SP',
    country: 'Spain',
    contactPerson: 'Ms. Nusrat Jahan',
    notes: 'Fashion Polo & Jogger Pants program',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Walmart Global Sourcing',
    code: 'WMT-US',
    country: 'USA',
    contactPerson: 'Mr. Tariq Ahmed',
    notes: 'Volume order shorts & activewear',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Permanently deletes any existing BLK-2026-HM01 records and H&M demo data
 */
export async function purgeDemoHMData(): Promise<number> {
  let deletedCount = 0;
  try {
    // 1. Delete any blk_orders matching BLK-2026-HM01 or H&M
    const blkSnap = await getDocs(collection(db, 'blk_orders'));
    for (const d of blkSnap.docs) {
      const data = d.data();
      const blkNo = (data.blkNumber || '').toString().trim().toUpperCase();
      const buyerName = (data.buyerName || '').toString().trim().toUpperCase();
      if (blkNo.includes('HM01') || blkNo.includes('BLK-2026-HM01') || buyerName.includes('H&M')) {
        await deleteDoc(doc(db, 'blk_orders', d.id));
        deletedCount++;
      }
    }

    // 2. Delete any production_inputs matching BLK-2026-HM01
    const inputsSnap = await getDocs(collection(db, 'production_inputs'));
    for (const d of inputsSnap.docs) {
      const data = d.data();
      const blkNo = (data.blkNumber || '').toString().trim().toUpperCase();
      const buyerName = (data.buyerName || '').toString().trim().toUpperCase();
      if (blkNo.includes('HM01') || blkNo.includes('BLK-2026-HM01') || buyerName.includes('H&M')) {
        await deleteDoc(doc(db, 'production_inputs', d.id));
        deletedCount++;
      }
    }

    // 3. Delete any buyers named H&M Hennes & Mauritz
    const buyersSnap = await getDocs(collection(db, 'buyers'));
    for (const d of buyersSnap.docs) {
      const data = d.data();
      const name = (data.name || '').toString().trim().toUpperCase();
      if (name.includes('H&M') || name.includes('HENNES')) {
        await deleteDoc(doc(db, 'buyers', d.id));
        deletedCount++;
      }
    }
  } catch (err) {
    console.warn('Error purging demo HM data:', err);
  }
  return deletedCount;
}

export async function seedInitialGarmentData() {
  try {
    // Automatically purge old BLK-2026-HM01 demo items if present
    await purgeDemoHMData();

    // 1. Check accessories
    const accSnap = await getDocs(collection(db, 'accessories'));
    if (accSnap.empty) {
      for (const item of DEFAULT_ACCESSORIES) {
        await addDoc(collection(db, 'accessories'), item);
      }
    }

    // 2. Check buyers
    const buyersSnap = await getDocs(collection(db, 'buyers'));
    if (buyersSnap.empty) {
      for (const buyer of DEFAULT_BUYERS) {
        await addDoc(collection(db, 'buyers'), buyer);
      }
    }
  } catch (err) {
    console.warn('Initial garment data seeding skipped or already present:', err);
  }
}

