import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { firestoreDb } from './firebase';
import type {
  Activity,
  ActivityTypeConfig,
  BudgetItemConfig,
  Company,
  Contact,
  Opportunity,
  Organization,
  ProductLine,
  SalesTarget,
  Stage,
  StageOutcome,
  User,
} from './db';
import { getDescendantOrgIds } from './db';
import { getLocalTodayIso } from '../utils/dateUtils';

const COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  USERS: 'users',
  ALLOWLIST: 'allowlist',
  COMPANIES: 'companies',
  CONTACTS: 'contacts',
  STAGES: 'stages',
  ACTIVITY_TYPES: 'activityTypes',
  PRODUCT_LINES: 'productLines',
  BUDGET_ITEMS: 'budgetItems',
  OPPORTUNITIES: 'opportunities',
  ACTIVITIES: 'activities',
  SALES_TARGETS: 'salesTargets',
} as const;

let currentSessionUser: User | null = null;

export const setFirestoreSessionUser = (user: User | null): void => {
  currentSessionUser = user;
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = stripUndefined(val);
      }
    }
    return result as T;
  }
  return value;
};

const requireDb = (): Firestore => {
  if (!firestoreDb) {
    throw new Error('Firebase Firestore 尚未初始化');
  }
  return firestoreDb;
};

const notifyUsersChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm:users-changed'));
  }
};

const readCollection = async <T>(name: string): Promise<T[]> => {
  const db = requireDb();
  const snap = await getDocs(collection(db, name));
  return snap.docs.map(d => d.data() as T);
};

export const firestoreAdapter = {
  // Resolve Firebase Auth user against allowlist/{emailLower} -> users/{userId}
  resolveAuthorizedUser: async (
    email: string,
    authUid: string,
    photoURL?: string | null
  ): Promise<User | null> => {
    const db = requireDb();
    const emailLower = normalizeEmail(email);
    if (!emailLower) return null;

    const allowSnap = await getDoc(doc(db, COLLECTIONS.ALLOWLIST, emailLower));
    if (!allowSnap.exists()) {
      return null;
    }

    const allowData = allowSnap.data() as { userId?: string };
    if (!allowData?.userId) return null;

    const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, allowData.userId));
    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data() as User;

    try {
      await updateDoc(
        doc(db, COLLECTIONS.USERS, allowData.userId),
        stripUndefined({
          authUid,
          photoURL: photoURL || null,
          lastLoginAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.warn('Could not sync user login metadata:', err);
    }

    return {
      ...userData,
      authUid,
      photoURL: photoURL ?? userData.photoURL ?? null,
    };
  },

  // Bootstrap default stages & activity types if collections are empty (Clean Start)
  bootstrapCleanStartIfEmpty: async (
    defaultStages: Stage[],
    defaultActivityTypes: ActivityTypeConfig[]
  ): Promise<void> => {
    const db = requireDb();
    const [stagesSnap, actTypesSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.STAGES)),
      getDocs(collection(db, COLLECTIONS.ACTIVITY_TYPES)),
    ]);

    if (!stagesSnap.empty && !actTypesSnap.empty) return;

    const batch = writeBatch(db);
    if (stagesSnap.empty) {
      for (const stage of defaultStages) {
        batch.set(doc(db, COLLECTIONS.STAGES, stage.id), stripUndefined(stage));
      }
    }
    if (actTypesSnap.empty) {
      for (const actType of defaultActivityTypes) {
        batch.set(doc(db, COLLECTIONS.ACTIVITY_TYPES, actType.id), stripUndefined(actType));
      }
    }
    await batch.commit();
  },

  // Organizations
  getOrganizations: async (): Promise<Organization[]> => {
    return readCollection<Organization>(COLLECTIONS.ORGANIZATIONS);
  },

  saveOrganization: async (org: Organization): Promise<Organization> => {
    const db = requireDb();
    const list = await readCollection<Organization>(COLLECTIONS.ORGANIZATIONS);

    if (org.parentId) {
      if (org.parentId === org.id) {
        throw new Error('不可將組織的父部門設為自己');
      }
      const descendants = getDescendantOrgIds(org.id, list);
      if (descendants.includes(org.parentId)) {
        throw new Error('不可將組織的父部門設為其下層子部門（會造成循環架構）');
      }
    }

    const clean = stripUndefined(org);
    await setDoc(doc(db, COLLECTIONS.ORGANIZATIONS, org.id), clean);
    return clean;
  },

  deleteOrganization: async (id: string): Promise<boolean> => {
    const db = requireDb();
    const [orgs, users, opps] = await Promise.all([
      readCollection<Organization>(COLLECTIONS.ORGANIZATIONS),
      readCollection<User>(COLLECTIONS.USERS),
      readCollection<Opportunity>(COLLECTIONS.OPPORTUNITIES),
    ]);

    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTIONS.ORGANIZATIONS, id));

    for (const org of orgs) {
      if (org.parentId === id) {
        batch.update(doc(db, COLLECTIONS.ORGANIZATIONS, org.id), { parentId: null });
      }
    }

    const affectedUsers = users.filter(u => u.orgId === id);
    const affectedUserIds = new Set(affectedUsers.map(u => u.id));

    for (const user of affectedUsers) {
      batch.update(doc(db, COLLECTIONS.USERS, user.id), { orgId: null });
      batch.set(
        doc(db, COLLECTIONS.ALLOWLIST, normalizeEmail(user.email)),
        { orgId: null },
        { merge: true }
      );
    }

    for (const opp of opps) {
      if (affectedUserIds.has(opp.userId) && opp.orgId !== null) {
        batch.update(doc(db, COLLECTIONS.OPPORTUNITIES, opp.id), { orgId: null });
      }
    }

    await batch.commit();
    if (affectedUsers.length > 0) {
      notifyUsersChanged();
    }
    return true;
  },

  // Users (synced with allowlist/{emailLower})
  getUsers: async (): Promise<User[]> => {
    return readCollection<User>(COLLECTIONS.USERS);
  },

  saveUser: async (user: User): Promise<User> => {
    const db = requireDb();
    const normalizedEmail = normalizeEmail(user.email);
    if (!normalizedEmail) {
      throw new Error('請輸入有效的 Email');
    }

    const [allowSnap, existingUserSnap] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.ALLOWLIST, normalizedEmail)),
      getDoc(doc(db, COLLECTIONS.USERS, user.id)),
    ]);

    if (allowSnap.exists() && allowSnap.data()?.userId !== user.id) {
      throw new Error(`Email「${normalizedEmail}」已指派給其他人員帳號`);
    }

    const existingUser = existingUserSnap.exists() ? (existingUserSnap.data() as User) : null;
    const oldEmailLower = existingUser?.email ? normalizeEmail(existingUser.email) : null;

    const savedUser: User = stripUndefined({
      ...user,
      email: normalizedEmail,
    });

    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.USERS, savedUser.id), savedUser, { merge: true });

    if (oldEmailLower && oldEmailLower !== normalizedEmail) {
      batch.delete(doc(db, COLLECTIONS.ALLOWLIST, oldEmailLower));
    }

    batch.set(doc(db, COLLECTIONS.ALLOWLIST, normalizedEmail), {
      userId: savedUser.id,
      email: normalizedEmail,
      name: savedUser.name,
      role: savedUser.role,
      orgId: savedUser.orgId ?? null,
    });

    if (existingUser && existingUser.orgId !== savedUser.orgId) {
      const oppSnap = await getDocs(
        query(collection(db, COLLECTIONS.OPPORTUNITIES), where('userId', '==', savedUser.id))
      );
      oppSnap.forEach(oppDoc => {
        batch.update(oppDoc.ref, { orgId: savedUser.orgId ?? null });
      });
    }

    await batch.commit();
    notifyUsersChanged();
    return savedUser;
  },

  deleteUser: async (id: string): Promise<boolean> => {
    const db = requireDb();
    const users = await readCollection<User>(COLLECTIONS.USERS);
    const target = users.find(u => u.id === id);
    if (!target) return false;

    if (target.role === 'ADMIN' && users.filter(u => u.role === 'ADMIN').length <= 1) {
      throw new Error('系統至少必須保留一位 ADMIN 管理員帳號');
    }

    const ownedOppsSnap = await getDocs(
      query(collection(db, COLLECTIONS.OPPORTUNITIES), where('userId', '==', id))
    );
    if (!ownedOppsSnap.empty) {
      throw new Error(
        `此人員目前仍負責 ${ownedOppsSnap.size} 筆商機，請先將商機轉交其他業務後再刪除`
      );
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTIONS.USERS, id));
    if (target.email) {
      batch.delete(doc(db, COLLECTIONS.ALLOWLIST, normalizeEmail(target.email)));
    }
    await batch.commit();
    notifyUsersChanged();
    return true;
  },

  // Companies
  getCompanies: async (): Promise<Company[]> => {
    return readCollection<Company>(COLLECTIONS.COMPANIES);
  },

  saveCompany: async (comp: Company): Promise<Company> => {
    const db = requireDb();
    const clean = stripUndefined(comp);
    await setDoc(doc(db, COLLECTIONS.COMPANIES, comp.id), clean);
    return clean;
  },

  deleteCompany: async (id: string): Promise<boolean> => {
    const db = requireDb();
    const contactsQuery = query(collection(db, COLLECTIONS.CONTACTS), where('companyId', '==', id));
    const oppsQuery =
      currentSessionUser?.role === 'AM'
        ? query(
            collection(db, COLLECTIONS.OPPORTUNITIES),
            where('companyId', '==', id),
            where('userId', '==', currentSessionUser.id)
          )
        : query(collection(db, COLLECTIONS.OPPORTUNITIES), where('companyId', '==', id));
    const actsQuery =
      currentSessionUser?.role === 'AM'
        ? query(collection(db, COLLECTIONS.ACTIVITIES), where('userId', '==', currentSessionUser.id))
        : collection(db, COLLECTIONS.ACTIVITIES);

    const [contactsSnap, oppsSnap, actsSnap] = await Promise.all([
      getDocs(contactsQuery),
      getDocs(oppsQuery),
      getDocs(actsQuery),
    ]);

    const oppIds = new Set(oppsSnap.docs.map(d => d.id));
    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTIONS.COMPANIES, id));
    contactsSnap.forEach(d => batch.delete(d.ref));
    oppsSnap.forEach(d => batch.delete(d.ref));
    actsSnap.forEach(d => {
      const act = d.data() as Activity;
      if (oppIds.has(act.opportunityId)) {
        batch.delete(d.ref);
      }
    });

    await batch.commit();
    return true;
  },

  // Contacts
  getContacts: async (companyId?: string): Promise<Contact[]> => {
    const db = requireDb();
    if (companyId) {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.CONTACTS), where('companyId', '==', companyId))
      );
      return snap.docs.map(d => d.data() as Contact);
    }
    return readCollection<Contact>(COLLECTIONS.CONTACTS);
  },

  saveContact: async (contact: Contact): Promise<Contact> => {
    const db = requireDb();
    const clean = stripUndefined(contact);
    await setDoc(doc(db, COLLECTIONS.CONTACTS, contact.id), clean);
    return clean;
  },

  deleteContact: async (id: string): Promise<boolean> => {
    const db = requireDb();
    await deleteDoc(doc(db, COLLECTIONS.CONTACTS, id));
    return true;
  },

  // Stages
  getStages: async (onlyActive = false): Promise<Stage[]> => {
    let list = await readCollection<Stage>(COLLECTIONS.STAGES);
    if (onlyActive) {
      list = list.filter(s => s.isActive);
    }
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  },

  saveStage: async (stage: Stage): Promise<Stage> => {
    const db = requireDb();
    const list = await readCollection<Stage>(COLLECTIONS.STAGES);
    const existing = list.find(s => s.id === stage.id);
    const outcome: StageOutcome = existing?.outcome || stage.outcome || 'OPEN';

    const enforced: Stage = stripUndefined({
      ...stage,
      outcome,
      defaultWinProbability:
        outcome === 'WON' || outcome === 'LOST'
          ? 100
          : Math.max(1, Math.min(99, stage.defaultWinProbability)),
      isActive: outcome === 'WON' || outcome === 'LOST' ? true : stage.isActive,
    });

    if (outcome === 'OPEN' && !enforced.isActive) {
      const otherActiveOpen = list.filter(
        s => s.id !== enforced.id && s.outcome === 'OPEN' && s.isActive
      );
      if (otherActiveOpen.length === 0) {
        throw new Error('管線至少必須保留 1 個啟用的進行中階段（含 BD Won 與 BD Lost 最少 3 階段）');
      }
    }

    await setDoc(doc(db, COLLECTIONS.STAGES, enforced.id), enforced);
    return enforced;
  },

  saveStages: async (stages: Stage[]): Promise<Stage[]> => {
    const db = requireDb();
    const batch = writeBatch(db);
    const cleaned = stages.map(s => stripUndefined(s));
    for (const s of cleaned) {
      batch.set(doc(db, COLLECTIONS.STAGES, s.id), s);
    }
    await batch.commit();
    return cleaned;
  },

  deleteStage: async (id: string): Promise<boolean> => {
    const db = requireDb();
    const list = await readCollection<Stage>(COLLECTIONS.STAGES);
    const target = list.find(s => s.id === id);
    if (!target) return false;

    if (target.outcome === 'WON' || target.outcome === 'LOST') {
      throw new Error('BD Won 與 BD Lost 為必要結案階段，不可刪除');
    }

    const remainingActiveOpen = list.filter(
      s => s.id !== id && s.outcome === 'OPEN' && s.isActive
    );
    if (remainingActiveOpen.length === 0) {
      throw new Error('管線至少必須保留 1 個進行中階段（含 BD Won 與 BD Lost 最少 3 階段）');
    }

    const oppsInStage = await getDocs(
      query(collection(db, COLLECTIONS.OPPORTUNITIES), where('stageId', '==', id))
    );
    if (!oppsInStage.empty) {
      throw new Error(`此階段目前仍有 ${oppsInStage.size} 筆商機，請先移動商機後再刪除`);
    }

    await deleteDoc(doc(db, COLLECTIONS.STAGES, id));
    return true;
  },

  // Activity Types
  getActivityTypes: async (): Promise<ActivityTypeConfig[]> => {
    return readCollection<ActivityTypeConfig>(COLLECTIONS.ACTIVITY_TYPES);
  },

  saveActivityType: async (type: ActivityTypeConfig): Promise<ActivityTypeConfig> => {
    const db = requireDb();
    const clean = stripUndefined(type);
    await setDoc(doc(db, COLLECTIONS.ACTIVITY_TYPES, type.id), clean);
    return clean;
  },

  deleteActivityType: async (id: string): Promise<boolean> => {
    const db = requireDb();
    await deleteDoc(doc(db, COLLECTIONS.ACTIVITY_TYPES, id));
    return true;
  },

  // Opportunities (RBAC-aware Firestore query for AM)
  getRawOpportunities: async (): Promise<Opportunity[]> => {
    const db = requireDb();
    if (currentSessionUser?.role === 'AM') {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.OPPORTUNITIES), where('userId', '==', currentSessionUser.id))
      );
      return snap.docs.map(d => d.data() as Opportunity);
    }
    return readCollection<Opportunity>(COLLECTIONS.OPPORTUNITIES);
  },

  getOpportunityById: async (id: string): Promise<Opportunity | undefined> => {
    const db = requireDb();
    const snap = await getDoc(doc(db, COLLECTIONS.OPPORTUNITIES, id));
    return snap.exists() ? (snap.data() as Opportunity) : undefined;
  },

  saveOpportunity: async (opp: Opportunity): Promise<Opportunity> => {
    const db = requireDb();
    const [users, stagesRaw, existingSnap] = await Promise.all([
      readCollection<User>(COLLECTIONS.USERS),
      readCollection<Stage>(COLLECTIONS.STAGES),
      getDoc(doc(db, COLLECTIONS.OPPORTUNITIES, opp.id)),
    ]);

    const stages = stagesRaw
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const existing = existingSnap.exists() ? (existingSnap.data() as Opportunity) : undefined;

    const updated: Opportunity = { ...opp };
    updated.amount = (updated.monthlyQuantity || 0) * (updated.unitPrice || 0);

    const amUser = users.find(u => u.id === updated.userId);
    updated.orgId = amUser ? amUser.orgId : null;

    if (!updated.stageId && stages.length > 0) {
      const firstOpen = stages.find(s => s.outcome === 'OPEN') || stages[0];
      updated.stageId = firstOpen.id;
      updated.winProbability = firstOpen.defaultWinProbability;
    }

    const todayStr = getLocalTodayIso();
    if (!updated.createdAt) {
      updated.createdAt = existing?.createdAt || todayStr;
    }
    const targetStage = stages.find(s => s.id === updated.stageId);
    if (targetStage?.outcome === 'WON' || targetStage?.outcome === 'LOST') {
      updated.winProbability = 100;
      if (!updated.closedAt || (existing && existing.stageId !== updated.stageId)) {
        updated.closedAt =
          existing?.stageId === updated.stageId && existing.closedAt ? existing.closedAt : todayStr;
      }
    } else {
      updated.closedAt = undefined;
    }

    const clean = stripUndefined(updated);
    await setDoc(doc(db, COLLECTIONS.OPPORTUNITIES, clean.id), clean);
    return clean;
  },

  deleteOpportunity: async (id: string): Promise<boolean> => {
    const db = requireDb();
    const actsQuery =
      currentSessionUser?.role === 'AM'
        ? query(
            collection(db, COLLECTIONS.ACTIVITIES),
            where('opportunityId', '==', id),
            where('userId', '==', currentSessionUser.id)
          )
        : query(collection(db, COLLECTIONS.ACTIVITIES), where('opportunityId', '==', id));

    const actsSnap = await getDocs(actsQuery);
    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTIONS.OPPORTUNITIES, id));
    actsSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  },

  // Activities (RBAC-aware Firestore query for AM)
  getActivities: async (opportunityId?: string): Promise<Activity[]> => {
    const db = requireDb();
    const col = collection(db, COLLECTIONS.ACTIVITIES);
    let q;
    if (currentSessionUser?.role === 'AM' && opportunityId) {
      q = query(
        col,
        where('userId', '==', currentSessionUser.id),
        where('opportunityId', '==', opportunityId)
      );
    } else if (currentSessionUser?.role === 'AM') {
      q = query(col, where('userId', '==', currentSessionUser.id));
    } else if (opportunityId) {
      q = query(col, where('opportunityId', '==', opportunityId));
    } else {
      q = col;
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Activity);
  },

  saveActivity: async (act: Activity): Promise<Activity> => {
    const db = requireDb();
    const clean = stripUndefined(act);
    await setDoc(doc(db, COLLECTIONS.ACTIVITIES, clean.id), clean);
    return clean;
  },

  deleteActivity: async (id: string): Promise<boolean> => {
    const db = requireDb();
    await deleteDoc(doc(db, COLLECTIONS.ACTIVITIES, id));
    return true;
  },

  // Sales Targets
  getSalesTargets: async (): Promise<SalesTarget[]> => {
    return readCollection<SalesTarget>(COLLECTIONS.SALES_TARGETS);
  },

  saveSalesTarget: async (target: SalesTarget): Promise<SalesTarget> => {
    const db = requireDb();
    const clean = stripUndefined(target);
    await setDoc(doc(db, COLLECTIONS.SALES_TARGETS, target.month), clean);
    return clean;
  },

  // Product Lines
  getProductLines: async (): Promise<ProductLine[]> => {
    return readCollection<ProductLine>(COLLECTIONS.PRODUCT_LINES);
  },

  saveProductLine: async (item: ProductLine): Promise<ProductLine> => {
    const db = requireDb();
    const clean = stripUndefined(item);
    await setDoc(doc(db, COLLECTIONS.PRODUCT_LINES, clean.id), clean);
    return clean;
  },

  deleteProductLine: async (id: string): Promise<boolean> => {
    const db = requireDb();
    await deleteDoc(doc(db, COLLECTIONS.PRODUCT_LINES, id));
    return true;
  },

  // Budget Items
  getBudgetItems: async (): Promise<BudgetItemConfig[]> => {
    return readCollection<BudgetItemConfig>(COLLECTIONS.BUDGET_ITEMS);
  },

  saveBudgetItem: async (item: BudgetItemConfig): Promise<BudgetItemConfig> => {
    const db = requireDb();
    const clean = stripUndefined(item);
    await setDoc(doc(db, COLLECTIONS.BUDGET_ITEMS, clean.id), clean);
    return clean;
  },

  deleteBudgetItem: async (id: string): Promise<boolean> => {
    const db = requireDb();
    await deleteDoc(doc(db, COLLECTIONS.BUDGET_ITEMS, id));
    return true;
  },
};
