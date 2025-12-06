import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Advisor, Indicator, BudgetConfig, RecordData, User, AuditLogEntry, RRHHEvent, SupervisionLog, CoachingSession } from '../types';
import { supabase } from '../src/supabase';

interface DataContextType {
  user: User | null;
  allUsers: User[];
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  addUser: (u: User) => Promise<void>;
  updateUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateProfile: (data: { username?: string; password?: string; photoUrl?: string }) => Promise<void>;
  
  advisors: Advisor[];
  addAdvisor: (adv: Advisor) => Promise<void>;
  updateAdvisor: (adv: Advisor) => Promise<void>;
  deleteAdvisor: (id: string) => Promise<void>;

  indicators: Indicator[];
  addIndicator: (ind: Indicator) => Promise<void>;
  updateIndicator: (ind: Indicator) => Promise<void>;
  deleteIndicator: (id: string) => Promise<void>;

  budgets: BudgetConfig[];
  saveBudget: (budgets: BudgetConfig[], year: number, week: number) => Promise<void>; 

  records: RecordData[];
  saveRecord: (rec: RecordData, cleanupMode?: 'DELETE_WEEKLY' | 'DELETE_DAILY') => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;

  rrhhEvents: RRHHEvent[];
  addRRHHEvent: (evt: RRHHEvent) => Promise<void>;
  updateRRHHEvent: (evt: RRHHEvent) => Promise<void>;
  deleteRRHHEvent: (id: string) => Promise<void>;

  supervisionLogs: SupervisionLog[];
  addSupervisionLog: (log: SupervisionLog) => Promise<void>;
  deleteSupervisionLog: (id: string) => Promise<void>;

  coachingSessions: CoachingSession[];
  addCoachingSession: (session: CoachingSession) => Promise<void>;
  deleteCoachingSession: (id: string) => Promise<void>;

  auditLogs: AuditLogEntry[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- HELPER: CamelCase <-> SnakeCase Mapper ---
// Supabase uses snake_case, App uses camelCase
const toCamel = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
const toSnake = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const mapKeysToApp = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => mapKeysToApp(v));
    if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const newKey = toCamel(key);
            // Special handling for JSON fields or known arrays if needed, but recursive covers most
            result[newKey] = mapKeysToApp(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
};

const mapKeysToDB = (obj: any): any => {
    if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const newKey = toSnake(key);
            result[newKey] = obj[key]; // No recursive for values to avoid breaking JSONB structures unless needed
            return result;
        }, {} as any);
    }
    return obj;
};

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [budgets, setBudgets] = useState<BudgetConfig[]>([]);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [rrhhEvents, setRRHHEvents] = useState<RRHHEvent[]>([]);
  const [supervisionLogs, setSupervisionLogs] = useState<SupervisionLog[]>([]);
  const [coachingSessions, setCoachingSessions] = useState<CoachingSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // --- 1. AUTH & DATA LOADING ---
  const fetchData = async () => {
      // Fetch all tables
      const { data: tAdvisors } = await supabase.from('advisors').select('*');
      if (tAdvisors) setAdvisors(mapKeysToApp(tAdvisors));

      const { data: tIndicators } = await supabase.from('indicators').select('*');
      if (tIndicators) setIndicators(mapKeysToApp(tIndicators));

      const { data: tBudgets } = await supabase.from('budgets').select('*');
      if (tBudgets) setBudgets(mapKeysToApp(tBudgets));

      const { data: tRecords } = await supabase.from('records').select('*');
      if (tRecords) setRecords(mapKeysToApp(tRecords));

      const { data: tRRHH } = await supabase.from('rrhh_events').select('*');
      if (tRRHH) setRRHHEvents(mapKeysToApp(tRRHH));

      const { data: tSup } = await supabase.from('supervision_logs').select('*');
      if (tSup) setSupervisionLogs(mapKeysToApp(tSup));

      const { data: tCoach } = await supabase.from('coaching_sessions').select('*');
      if (tCoach) setCoachingSessions(mapKeysToApp(tCoach));

      const { data: tLogs } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
      if (tLogs) setAuditLogs(mapKeysToApp(tLogs));

      const { data: tProfiles } = await supabase.from('profiles').select('*');
      if (tProfiles) setAllUsers(mapKeysToApp(tProfiles));
  };

  useEffect(() => {
    // Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profile) {
                setUser(mapKeysToApp({ ...profile, id: session.user.id }));
            } else {
                // Fallback if profile trigger hasn't run yet or failed
                setUser({ id: session.user.id, username: session.user.email || 'User', role: 'LECTOR' });
            }
        } else {
            setUser(null);
        }
    });

    // Initial Fetch
    fetchData();

    // Realtime Subscription (Listen to ALL changes on public schema)
    const channel = supabase.channel('db_changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            // Simple strategy: Refetch all on any change. 
            // For production with large data, specific optimistic updates are better.
            fetchData();
        })
        .subscribe();

    return () => {
        authListener.subscription.unsubscribe();
        supabase.removeChannel(channel);
    };
  }, []);

  const logAction = async (action: string, details: string) => {
    if (!user) return;
    await supabase.from('audit_logs').insert(mapKeysToDB({
        userId: user.id,
        username: user.username,
        action,
        details,
        timestamp: new Date().toISOString()
    }));
  };

  const login = async (email: string, pass: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
  };

  const logout = async () => {
      await supabase.auth.signOut();
  };

  // USERS (PROFILES) - Managed mostly by Auth + Triggers, but Admin can edit roles
  const addUser = async (u: User) => {
      // NOTE: Creating users via Client SDK only works if Allow Email Signups is on. 
      // Admin creation usually requires Service Role key on backend.
      // For this app, we assume users sign up or are created via Supabase Dashboard,
      // and here we just manage the profile data.
      alert('Por favor cree el usuario desde el panel de Supabase Authentication.');
  };

  const updateUser = async (u: User) => {
      const dbData = mapKeysToDB(u);
      await supabase.from('profiles').update(dbData).eq('id', u.id);
      logAction('Actualizar Usuario', `Usuario ${u.username} actualizado`);
  };

  const deleteUser = async (id: string) => {
      // Cannot delete Auth user from client easily without Edge Function
      alert('Para eliminar el acceso, borre el usuario desde el panel de Supabase Authentication.');
  };

  const updateProfile = async (data: { username?: string; password?: string; photoUrl?: string }) => {
      if (!user) return;
      
      if (data.password) {
          const { error } = await supabase.auth.updateUser({ password: data.password });
          if (error) throw error;
      }

      const updates: any = {};
      if (data.username) updates.username = data.username;
      if (data.photoUrl) updates.photo_url = data.photoUrl;

      if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', user.id);
          // Update local state immediately
          setUser(prev => prev ? ({ ...prev, ...mapKeysToApp(updates) }) : null);
      }
      logAction('Actualizar Perfil', `Usuario actualizó sus datos`);
  };

  // GENERIC CRUD HELPERS
  const addItem = async (table: string, item: any, actionName: string) => {
      const { id, ...rest } = item; // Let Supabase gen ID or use provided if necessary
      const dbItem = mapKeysToDB(rest);
      // If item has ID generated by frontend (crypto.randomUUID), use it
      if (id) dbItem.id = id;
      
      const { error } = await supabase.from(table).insert(dbItem);
      if (error) { console.error(error); throw error; }
      logAction(`Crear ${actionName}`, `Nuevo registro en ${table}`);
  };

  const updateItem = async (table: string, item: any, actionName: string) => {
      const { id, ...rest } = item;
      const dbItem = mapKeysToDB(rest);
      const { error } = await supabase.from(table).update(dbItem).eq('id', id);
      if (error) throw error;
      logAction(`Actualizar ${actionName}`, `ID ${id} actualizado`);
  };

  const deleteItem = async (table: string, id: string, actionName: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      logAction(`Eliminar ${actionName}`, `ID ${id} eliminado`);
  };

  // IMPLEMENTATIONS
  const addAdvisor = (a: Advisor) => addItem('advisors', a, 'Colaborador');
  const updateAdvisor = (a: Advisor) => updateItem('advisors', a, 'Colaborador');
  const deleteAdvisor = (id: string) => deleteItem('advisors', id, 'Colaborador');

  const addIndicator = (i: Indicator) => addItem('indicators', i, 'Indicador');
  const updateIndicator = (i: Indicator) => updateItem('indicators', i, 'Indicador');
  const deleteIndicator = (id: string) => deleteItem('indicators', id, 'Indicador');

  // BUDGETS (Batch Logic)
  const saveBudget = async (newBudgets: BudgetConfig[], year: number, week: number) => {
      // 1. Delete existing for this scope to avoid duplicates
      // Supabase doesn't have batch delete by complex filter easily in one go, 
      // but we can query IDs then delete.
      
      // Strategy: Filter locally what needs to be deleted? 
      // Better: Delete where year/week matches for the indicators involved?
      // For simplicity in migration: We insert/upsert.
      // But user logic expects cleanup.
      
      const toInsert = newBudgets.map(b => mapKeysToDB(b));
      
      // We will perform upsert based on ID if provided
      const { error } = await supabase.from('budgets').upsert(toInsert);
      if (error) throw error;
      
      logAction('Presupuesto', `Presupuestos guardados Sem ${week} ${year}`);
  };

  // RECORDS
  const saveRecord = async (rec: RecordData, cleanupMode?: 'DELETE_WEEKLY' | 'DELETE_DAILY') => {
      const dbRec = mapKeysToDB(rec);
      
      if (cleanupMode) {
          // Find records to delete
          const freqToDelete = cleanupMode === 'DELETE_WEEKLY' ? 'WEEKLY' : 'DAILY';
          await supabase.from('records').delete()
            .eq('year', rec.year)
            .eq('week', rec.week)
            .eq('frequency', freqToDelete)
            .eq('advisor_id', rec.advisorId || '') 
            .eq('type', rec.type === 'Individual' ? 'INDIVIDUAL' : 'BRANCH'); // Enum mapping check
            // Note: ReportType enum values are 'Individual'/'Sucursal'. DB might expect them.
            // Check mapKeysToDB handling of Enums? It passes strings.
      }

      // Check specific collision to overwrite
      if (rec.id) {
          const { error } = await supabase.from('records').upsert(dbRec);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('records').insert(dbRec);
          if (error) throw error;
      }
      logAction('Registro', `Registro guardado ${rec.type}`);
  };
  const deleteRecord = (id: string) => deleteItem('records', id, 'Registro');

  // RRHH
  const addRRHHEvent = (e: RRHHEvent) => addItem('rrhh_events', e, 'RRHH');
  const updateRRHHEvent = (e: RRHHEvent) => updateItem('rrhh_events', e, 'RRHH');
  const deleteRRHHEvent = (id: string) => deleteItem('rrhh_events', id, 'RRHH');

  // SUPERVISION
  const addSupervisionLog = (l: SupervisionLog) => addItem('supervision_logs', l, 'Bitácora');
  const deleteSupervisionLog = (id: string) => deleteItem('supervision_logs', id, 'Bitácora');

  // COACHING
  const addCoachingSession = (c: CoachingSession) => addItem('coaching_sessions', c, 'Coaching');
  const deleteCoachingSession = (id: string) => deleteItem('coaching_sessions', id, 'Coaching');

  return (
    <DataContext.Provider value={{
      user, allUsers, login, logout, addUser, updateUser, deleteUser, updateProfile,
      advisors, addAdvisor, updateAdvisor, deleteAdvisor,
      indicators, addIndicator, updateIndicator, deleteIndicator,
      budgets, saveBudget,
      records, saveRecord, deleteRecord,
      rrhhEvents, addRRHHEvent, updateRRHHEvent, deleteRRHHEvent,
      supervisionLogs, addSupervisionLog, deleteSupervisionLog,
      coachingSessions, addCoachingSession, deleteCoachingSession,
      auditLogs
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};