export type UserRole = 'admin' | 'operator' | 'supervisor' | 'store_keeper';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'disabled';
  assignedPassword?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Buyer {
  id: string;
  name: string;
  code?: string;
  country?: string;
  contactPerson?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BlkOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  blkNumber: string;
  styleName: string;
  itemType: string;
  season?: string;
  availableColors: string; // comma separated: e.g. "Black, Navy, White"
  availableSizes: string; // comma separated: e.g. "S, M, L, XL, XXL"
  totalTargetQty?: number;
  status: 'running' | 'completed' | 'hold';
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductionInput {
  id: string;
  blkId?: string;
  blkNumber: string;
  buyerName: string;
  color: string;
  srNumber?: string;
  bundleNo?: string;
  lineNo?: string;
  sizes: Record<string, number>; // e.g. { "S": 50, "M": 100 }
  totalQty: number;
  date: string;
  remarks?: string;
  operatorEmail: string;
  operatorName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Accessory {
  id: string;
  name: string;
  code?: string;
  category: 'Thread' | 'Elastic' | 'Drawstring' | 'Button' | 'Label' | 'Poly' | 'Other';
  spec?: string; // e.g. "50/2", "150/D", "2.2 cm", "2.7 cm"
  unit: 'cones' | 'meters' | 'yards' | 'pcs' | 'kg' | 'gross' | 'rolls';
  currentStock: number;
  minAlertStock: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccessoryTransaction {
  id: string;
  accessoryId: string;
  accessoryName: string;
  type: 'receive' | 'issue';
  quantity: number;
  unit: string;
  blkNumber?: string;
  recipientLine?: string;
  color?: string;
  srNumber?: string;
  challanNo?: string;
  note?: string;
  operatorEmail: string;
  operatorName?: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  action: string;
  details: string;
  entityType?: 'production_input' | 'blk' | 'accessory' | 'user' | 'auth';
  entityId?: string;
  createdAt: string;
}

export interface AuthorizedUser {
  id: string;
  email: string;
  password?: string;
  displayName?: string;
  role: UserRole;
  status: 'active' | 'blocked';
  addedBy?: string;
  createdAt: string;
  updatedAt?: string;
}
