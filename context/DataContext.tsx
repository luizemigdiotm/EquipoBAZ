import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Advisor, Indicator, BudgetConfig, RecordData, User, AuditLogEntry, RRHHEvent, SupervisionLog, CoachingSession, BranchConfig, ScheduleActivity, ScheduleAssignment, BranchScheduleConfig, FenixCompliance } from '../types';
import { supabase, supabaseUrl, supabaseKey } from '../src/supabase';

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
    updateSupervisionLog: (log: SupervisionLog) => Promise<void>;
    deleteSupervisionLog: (id: string) => Promise<void>;

    coachingSessions: CoachingSession[];
    addCoachingSession: (session: CoachingSession) => Promise<void>;
    deleteCoachingSession: (id: string) => Promise<void>;

    branchConfig: BranchConfig | null;
    updateBranchConfig: (config: BranchConfig) => Promise<void>;

    auditLogs: AuditLogEntry[];

    // --- SCHEDULE MANAGEMENT ---
    scheduleActivities: ScheduleActivity[];
    addScheduleActivity: (act: ScheduleActivity) => Promise<void>;
    updateScheduleActivity: (act: ScheduleActivity) => Promise<void>;
    deleteScheduleActivity: (id: string) => Promise<void>;

    scheduleAssignments: ScheduleAssignment[];
    saveScheduleAssignments: (assigns: ScheduleAssignment[]) => Promise<void>;
    deleteScheduleAssignment: (id: string) => Promise<void>;

    branchScheduleConfig: BranchScheduleConfig | null;
    updateBranchScheduleConfig: (config: BranchScheduleConfig) => Promise<void>;

    fenixCompliances: FenixCompliance[];
    toggleFenixCompliance: (advisorId: string, date: string, timeSlot: string, isCompliant: boolean) => Promise<void>;
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

            // CRITICAL FIX: Do not transform keys inside 'values' (JSONB with UUIDs).
            // 'toCamel' strips dashes from UUIDs (e.g. 123-456 -> 123456), breaking lookups.
            if (newKey === 'values' || newKey === 'agreements') {
                result[newKey] = obj[key];
            } else {
                result[newKey] = mapKeysToApp(obj[key]);
            }
            return result;
        }, {} as any);
    }
    return obj;
};

const mapKeysToDB = (obj: any): any => {
    // Keys to always exclude from DB operations
    const EXCLUDED_KEYS = ['count', 'children'];

    if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            if (EXCLUDED_KEYS.includes(key)) return result;

            const newKey = toSnake(key);
            const value = obj[key];

            // SPECIAL CASE: Never send 'id' as null or empty. Let DB generate default.
            if (newKey === 'id' && !value) return result;

            // Fix 22007: Empty strings from UI inputs must be null for Date/Number DB columns
            result[newKey] = value === "" ? null : value;

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
    const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);

    // Schedule States
    const [scheduleActivities, setScheduleActivities] = useState<ScheduleActivity[]>([]);
    const [scheduleAssignments, setScheduleAssignments] = useState<ScheduleAssignment[]>([]);
    const [branchScheduleConfig, setBranchScheduleConfig] = useState<BranchScheduleConfig | null>(null);
    const [fenixCompliances, setFenixCompliances] = useState<FenixCompliance[]>([]);

    // --- 1. AUTH & DATA LOADING ---
    const fetchData = async () => {
        try {
            console.log('[FetchData] Starting manual fetch...');

            // Helper to safe fetch and map
            const safeFetch = async (endpoint: string) => {
                try {
                    const res = await authenticatedFetch(endpoint, 'GET');
                    const json = await res.json();
                    return mapKeysToApp(json) || [];
                } catch (e) {
                    console.warn(`[FetchData] Error fetching ${endpoint}`, e);
                    return [];
                }
            };

            const [
                tAdvisors,
                tIndicators,
                tBudgets,
                tRecords,
                tRRHH,
                tSup,
                tCoach,
                tLogs,
                tProfiles,
                tBranchConfig,
                tScheduleActivities,
                tScheduleAssignments,
                tBranchScheduleConfig,
                tFenixCompliances
            ] = await Promise.all([
                safeFetch('advisors'),
                safeFetch('indicators'),
                safeFetch('budgets'),
                safeFetch('records'),
                safeFetch('rrhh_events'),
                safeFetch('supervision_logs'),
                safeFetch('coaching_sessions'),
                safeFetch('audit_logs?order=timestamp.desc'),
                safeFetch('profiles'),
                safeFetch('branch_config'),
                safeFetch('schedule_activities'),
                safeFetch('schedule_assignments'),
                safeFetch('branch_schedule_config'),
                safeFetch('fenix_compliance')
            ]);

            setAdvisors(tAdvisors);
            setIndicators(tIndicators);
            setBudgets(tBudgets);
            setRecords(tRecords);
            setRRHHEvents(tRRHH);
            setSupervisionLogs(tSup);
            setCoachingSessions(tCoach);
            setAuditLogs(tLogs);
            setAllUsers(tProfiles);

            // Branch Config (singleton)
            if (tBranchConfig && tBranchConfig.length > 0) {
                setBranchConfig(tBranchConfig[0]);
            } else {
                // Fallback attempt from LocalStorage if DB fails or is empty
                const storedConf = localStorage.getItem('BRANCH_CONFIG_FALLBACK');
                if (storedConf) setBranchConfig(JSON.parse(storedConf));
            }

            // Schedule Data
            setScheduleActivities(tScheduleActivities);
            setScheduleAssignments(tScheduleAssignments);
            if (tBranchScheduleConfig && tBranchScheduleConfig.length > 0) {
                setBranchScheduleConfig(tBranchScheduleConfig[0]);
            }
            setFenixCompliances(tFenixCompliances);

            console.log('[FetchData] Completed successfully');

        } catch (globalErr) {
            console.error('[FetchData] Critical error', globalErr);
        }
    };

    useEffect(() => {
        // Manual Session Restoration
        const restoreSession = async () => {
            const storedSession = localStorage.getItem('BAZ_SESSION');
            if (storedSession) {
                try {
                    const sessionData = JSON.parse(storedSession);
                    await supabase.auth.setSession({
                        access_token: sessionData.access_token,
                        refresh_token: sessionData.refresh_token
                    });
                } catch (e) {
                    console.error('Failed to restore session', e);
                    localStorage.removeItem('BAZ_SESSION');
                }
            }
        };
        restoreSession();

        // Auth Listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                try {
                    // Try to get extended profile
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (error || !profile) {
                        // Fallback if profile table not set up or RLS error
                        console.warn('Could not fetch profile, using fallback', error);
                        setUser({
                            id: session.user.id,
                            username: session.user.email?.split('@')[0] || 'User',
                            role: 'LECTOR' // Default safe role
                        });
                    } else {
                        setUser(mapKeysToApp(profile));
                    }

                    // Load data
                    fetchData();
                } catch (e) {
                    console.error("Auth Error:", e);
                    // Last resort fallback to allow login
                    setUser({
                        id: session.user.id,
                        username: session.user.email?.split('@')[0] || 'User',
                        role: 'LECTOR'
                    });
                }
            } else {
                setUser(null);
                setAdvisors([]);
                setRecords([]);
                setIndicators([]);
                setBudgets([]);
                setRRHHEvents([]);
                setSupervisionLogs([]);
                setCoachingSessions([]);
                setAuditLogs([]);
                setBranchConfig(null);
                setScheduleActivities([]);
                setScheduleAssignments([]);
                setBranchScheduleConfig(null);
                setFenixCompliances([]);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, pass: string) => {
        let currentStage = 'Iniciando';
        try {
            // Bypass Supabase Client - Manual Fetch Login
            currentStage = 'Conectando (POST)';
            const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password: pass })
            });

            currentStage = 'Procesando respuesta';
            const data = await res.json();

            if (!res.ok) {
                // Map Supabase error format to simple error object expected by UI
                throw new Error(data.error_description || data.msg || 'Error al iniciar sesión');
            }

            // 1. Manual Persistence
            currentStage = 'Persistiendo sesión (Manual)';
            localStorage.setItem('BAZ_SESSION', JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token
            }));

            // 2. Memory Hydration (Non-Blocking Attempt)
            currentStage = 'Hidratando cliente en memoria';

            // We use a short timeout for setSession so we don't block the user if the lib hangs
            const hydratePromise = supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token
            });

            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 2000));

            const result = await Promise.race([hydratePromise, timeoutPromise]);

            if (result === 'TIMEOUT') {
                console.warn('[Login] setSession timed out - proceeding with manual hydration');
            } else if ((result as any).error) {
                console.warn('[Login] setSession failed', (result as any).error);
            }

            // 3. Force State Update (Resilient Fallback)
            if (data.user) {
                console.log('[Login] Manually setting user state');
                let userRole = 'LECTOR';
                let userData = { ...data.user, username: data.user.email?.split('@')[0] || 'User' };

                // 3.1 Try to fetch Profile Manually
                try {
                    currentStage = 'Obteniendo Perfil (Manual)';
                    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${data.user.id}&select=*`, {
                        method: 'GET',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${data.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (profileRes.ok) {
                        const profiles = await profileRes.json();
                        if (profiles && profiles.length > 0) {
                            const profile = mapKeysToApp(profiles[0]);
                            userData = { ...userData, ...profile }; // Merge profile data
                        }
                    }
                } catch (profileErr) {
                    console.warn('[Login] Failed to fetch manual profile', profileErr);
                }

                setUser(userData as User);

                // Trigger data fetch manually since onAuthStateChange might not calculate
                fetchData();
            }

            currentStage = 'Completado';

        } catch (e) {
            console.error(`[Login] Error en etapa ${currentStage}:`, e);
            throw e;
        }
    };

    const logout = async () => {
        localStorage.removeItem('BAZ_SESSION');
        await supabase.auth.signOut();
        setUser(null);
    };

    // --- CRUD WRAPPERS ---
    const addAuditLog = async (action: string, details: string) => {
        if (!user) return;
        const newLog = {
            user_id: user.id,
            username: user.username,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        await supabase.from('audit_logs').insert(newLog);
        fetchData(); // Refresh
    };

    // GENERIC HELPERS (Manual Fetch Bypass)
    const authenticatedFetch = async (endpoint: string, method: string, body?: any, customHeaders?: any) => {
        const storedSession = localStorage.getItem('BAZ_SESSION');
        if (!storedSession) throw new Error('No hay sesión activa');

        const { access_token } = JSON.parse(storedSession);

        const headers: any = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal', // Optimisation default
            ...customHeaders
        };

        const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Error ${res.status}: ${errText}`);
        }
        return res;
    };

    const genericAdd = async (table: string, item: any, logAction: string) => {
        const dbItem = mapKeysToDB(item);
        // Manual POST
        await authenticatedFetch(table, 'POST', dbItem);
        addAuditLog(`Agregar ${logAction}`, `ID: ${item.id}`);
        fetchData();
    };

    const genericUpdate = async (table: string, item: any, logAction: string) => {
        const dbItem = mapKeysToDB(item);
        // Manual PATCH
        await authenticatedFetch(`${table}?id=eq.${item.id}`, 'PATCH', dbItem);
        addAuditLog(`Editar ${logAction}`, `ID: ${item.id}`);
        fetchData();
    };

    const genericDelete = async (table: string, id: string, logAction: string) => {
        // Manual DELETE
        await authenticatedFetch(`${table}?id=eq.${id}`, 'DELETE');
        addAuditLog(`Eliminar ${logAction}`, `ID: ${id}`);
        fetchData();
    };

    const updateBranchConfig = async (config: BranchConfig) => {
        try {
            const dbItem = mapKeysToDB(config);

            // SINGLETON STRATEGY: "Delete Previous and Leave New" (as requested)
            // 1. Fetch ALL existing configs
            const res = await authenticatedFetch('branch_config?select=id', 'GET');
            const existingItems = await res.json();

            // 2. Delete ALL existing (to ensure clean slate as requested)
            if (Array.isArray(existingItems) && existingItems.length > 0) {
                // Iterate and delete (Supabase bulk delete by ID list is safer if filter syntax allows, 
                // but simple loop is fine for 1-2 rows)
                for (const item of existingItems) {
                    await authenticatedFetch(`branch_config?id=eq.${item.id}`, 'DELETE');
                }
            }

            // 3. Insert NEW (Clean ID)
            // Remove ID if present to let DB generate new one (or use provided if valid UUID)
            delete dbItem.id;

            await authenticatedFetch('branch_config', 'POST', dbItem);

            setBranchConfig(config);
            addAuditLog('Configuración', 'Actualización Sucursal (Reemplazo)');
            fetchData();
        } catch (error) {
            console.error('Failed to save branch config to DB', error);
            // LocalStorage Fallback
            localStorage.setItem('BRANCH_CONFIG_FALLBACK', JSON.stringify(config));
            setBranchConfig(config);
            alert('Aviso: No se pudo guardar en la nube (tabla branch_config inexistente?), se guardó localmente.');
        }
    };

    // --- EXPORTED FUNCTIONS ---

    // Users (Managed via Profiles table mostly, Auth is handled by Supabase)
    const addUser = async (u: User) => genericAdd('profiles', u, 'Usuario');
    const updateUser = async (u: User) => genericUpdate('profiles', u, 'Usuario');
    const deleteUser = async (id: string) => genericDelete('profiles', id, 'Usuario');

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
            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
            if (error) throw error;
            setUser(prev => prev ? { ...prev, ...mapKeysToApp(updates) } : null);
        }
    };

    // Advisors
    const addAdvisor = async (adv: Advisor) => genericAdd('advisors', adv, 'Asesor');
    const updateAdvisor = async (adv: Advisor) => genericUpdate('advisors', adv, 'Asesor');
    const deleteAdvisor = async (id: string) => genericDelete('advisors', id, 'Asesor');

    // Indicators
    const addIndicator = async (ind: Indicator) => genericAdd('indicators', ind, 'Indicador');
    const updateIndicator = async (ind: Indicator) => genericUpdate('indicators', ind, 'Indicador');
    const deleteIndicator = async (id: string) => genericDelete('indicators', id, 'Indicador');

    // Budgets (Batch Save)
    // Budgets (Batch Save)
    const saveBudget = async (configs: BudgetConfig[], year: number, week: number) => {
        console.log('[saveBudget] Attempting to save', configs.length, 'records');

        // Fix PGRST102: Split into Inserts (No ID) vs Updates (ID) to ensure consistent object keys in each batch.
        // Also ensure optional keys like 'dayOfWeek' are consistently present (as null if undefined).
        const inserts: any[] = [];
        const updates: any[] = [];

        configs.forEach(c => {
            // Normalization: Explicitly set optional fields to null if undefined to ensure key exists
            const normalized = {
                ...c,
                dayOfWeek: c.dayOfWeek !== undefined ? c.dayOfWeek : null,
            };

            if (c.id) {
                updates.push(normalized);
            } else {
                inserts.push(normalized);
            }
        });

        const promises = [];

        // Batch 1: Inserts (No ID key in payload will be generated by mapKeysToDB because ID is empty)
        if (inserts.length > 0) {
            const dbInserts = inserts.map(mapKeysToDB);
            promises.push(authenticatedFetch('budgets', 'POST', dbInserts, {
                'Prefer': 'resolution=merge-duplicates, return=minimal'
            }));
        }

        // Batch 2: Updates (Has ID key)
        if (updates.length > 0) {
            const dbUpdates = updates.map(mapKeysToDB);
            promises.push(authenticatedFetch('budgets', 'POST', dbUpdates, {
                'Prefer': 'resolution=merge-duplicates, return=minimal'
            }));
        }

        await Promise.all(promises);

        addAuditLog('Actualizar Presupuestos', `Año ${year} Sem ${week}`);
        fetchData();
    };

    // Records
    const saveRecord = async (rec: RecordData, cleanupMode?: 'DELETE_WEEKLY' | 'DELETE_DAILY') => {
        // Clean undefined fields
        const cleanRec = { ...rec };
        if (cleanRec.dayOfWeek === undefined) delete (cleanRec as any).dayOfWeek;
        if (cleanRec.advisorId === undefined) delete (cleanRec as any).advisorId;

        // OPTIMISTIC UPDATE: Update local state immediately so UI feels instant and data persists in context
        // regardless of network latency.
        const tempId = cleanRec.id || `temp-${Date.now()}`;
        const optimisticRec = { ...cleanRec, id: tempId };

        setRecords(prev => {
            const index = prev.findIndex(r => r.id === tempId || (cleanRec.id && r.id === cleanRec.id));
            if (index >= 0) {
                const newArr = [...prev];
                newArr[index] = optimisticRec;
                return newArr;
            } else {
                // Check if we should replace a matching record by logical key (to avoid dups in UI before partial refresh)
                // This is complex, but for QuickEntry we mostly rely on ID. 
                // If ID is empty, it's new.
                return [...prev, optimisticRec];
            }
        });

        // CRITICAL FIX: If we have an ID that is not temp, use PATCH (Update), do NOT delete/insert
        if (cleanRec.id && !cleanRec.id.startsWith('temp-')) {
            const dbItem = mapKeysToDB(cleanRec);
            await authenticatedFetch(`records?id=eq.${cleanRec.id}`, 'PATCH', dbItem);
            addAuditLog('Editar Registro', `ID: ${cleanRec.id}`);
            fetchData();
            return;
        }

        // Handle Cleanup Manual
        if (cleanupMode) {
            const params = new URLSearchParams();
            params.append('year', `eq.${rec.year}`);
            params.append('week', `eq.${rec.week}`);
            params.append('type', `eq.${rec.type}`);

            if (cleanupMode === 'DELETE_WEEKLY') {
                params.append('frequency', 'eq.WEEKLY');
            } else {
                params.append('frequency', 'eq.DAILY');
            }

            if (rec.advisorId) {
                params.append('advisor_id', `eq.${rec.advisorId}`);
            }

            try {
                await authenticatedFetch(`records?${params.toString()}`, 'DELETE');
            } catch (e) {
                console.warn('Cleanup failed or nothing to delete', e);
            }
        }

        // Reuse Manual Add
        await genericAdd('records', cleanRec, 'Registro');
    };

    const deleteRecord = async (id: string) => genericDelete('records', id, 'Registro');

    // RRHH
    const addRRHHEvent = async (evt: RRHHEvent) => genericAdd('rrhh_events', evt, 'Evento RRHH');
    const updateRRHHEvent = async (evt: RRHHEvent) => genericUpdate('rrhh_events', evt, 'Evento RRHH');
    const deleteRRHHEvent = async (id: string) => genericDelete('rrhh_events', id, 'Evento RRHH');

    // Supervision
    const addSupervisionLog = async (log: SupervisionLog) => genericAdd('supervision_logs', log, 'Bitácora');
    const updateSupervisionLog = async (log: SupervisionLog) => genericUpdate('supervision_logs', log, 'Bitácora');
    const deleteSupervisionLog = async (id: string) => genericDelete('supervision_logs', id, 'Bitácora');

    // Coaching
    const addCoachingSession = async (s: CoachingSession) => genericAdd('coaching_sessions', s, 'Coaching');
    const deleteCoachingSession = async (id: string) => genericDelete('coaching_sessions', id, 'Coaching');

    // --- SCHEDULE METHODS ---
    const addScheduleActivity = async (act: ScheduleActivity) => {
        const dbAct = mapKeysToDB(act);
        console.log('[addScheduleActivity] Payload:', dbAct);

        // Manual FETCH to bypass client timeout
        const res = await authenticatedFetch('schedule_activities', 'POST', dbAct, { 'Prefer': 'return=representation' });
        const data = await res.json();

        console.log('[addScheduleActivity] Success:', data[0]);
        setScheduleActivities(prev => [...prev, mapKeysToApp(data[0])]);
    };

    const updateScheduleActivity = async (act: ScheduleActivity) => {
        const dbAct = mapKeysToDB(act);
        await authenticatedFetch(`schedule_activities?id=eq.${act.id}`, 'PATCH', dbAct);
        setScheduleActivities(scheduleActivities.map(a => a.id === act.id ? act : a));
    };

    const deleteScheduleActivity = async (id: string) => {
        await authenticatedFetch(`schedule_activities?id=eq.${id}`, 'DELETE');
        setScheduleActivities(scheduleActivities.filter(a => a.id !== id));
    };

    const saveScheduleAssignments = async (assigns: ScheduleAssignment[]) => {
        const dbAssigns = assigns.map(mapKeysToDB);
        console.log('[saveScheduleAssignments] Payload:', dbAssigns);

        const res = await authenticatedFetch('schedule_assignments', 'POST', dbAssigns, {
            'Prefer': 'resolution=merge-duplicates, return=representation'
        });
        const data = await res.json();

        // Optimistic update (or reload)
        const updated = mapKeysToApp(data);
        const ids = updated.map((u: any) => u.id);
        const others = scheduleAssignments.filter(s => !ids.includes(s.id));
        setScheduleAssignments([...others, ...updated]);
    };

    const deleteScheduleAssignment = async (id: string) => {
        await authenticatedFetch(`schedule_assignments?id=eq.${id}`, 'DELETE');
        setScheduleAssignments(scheduleAssignments.filter(a => a.id !== id));
    };

    const updateBranchScheduleConfig = async (config: BranchScheduleConfig) => {
        const dbConfig = mapKeysToDB(config);
        console.log('[updateBranchScheduleConfig] Payload:', dbConfig);

        const res = await authenticatedFetch('branch_schedule_config', 'POST', dbConfig, {
            'Prefer': 'resolution=merge-duplicates, return=representation'
        });
        const data = await res.json();
        setBranchScheduleConfig(mapKeysToApp(data[0]));
    };

    const toggleFenixCompliance = async (advisorId: string, date: string, timeSlot: string, isCompliant: boolean) => {
        // Optimistic update
        const tempId = crypto.randomUUID();
        const existing = fenixCompliances.find(f => f.advisorId === advisorId && f.date === date && f.timeSlot === timeSlot);

        // Prepare item for DB
        const newItem: FenixCompliance = {
            id: existing ? existing.id : tempId,
            advisorId,
            date,
            timeSlot,
            isCompliant
        };
        const dbItem = mapKeysToDB(newItem);
        if (!existing) delete dbItem.id; // Allow wrapping generation if new

        // 1. Optimistic State Update
        if (existing) {
            setFenixCompliances(fenixCompliances.map(f => f.id === existing.id ? newItem : f));
        } else {
            setFenixCompliances([...fenixCompliances, newItem]);
        }

        try {
            // 2. UPSERT Request (Handles both Insert and Update robustly)
            // Using on_conflict to merge if unique key (advisor_id, date, time_slot) exists
            const res = await authenticatedFetch(
                'fenix_compliance?on_conflict=advisor_id,date,time_slot',
                'POST',
                dbItem,
                { 'Prefer': 'resolution=merge-duplicates, return=representation' }
            );

            // 3. Update with real ID from server
            const data = await res.json();
            if (data && data.length > 0) {
                const finalItem = mapKeysToApp(data[0]);
                setFenixCompliances(prev => prev.map(f =>
                    (f.id === tempId || f.id === existing?.id) ? finalItem : f
                ));
            }
        } catch (error) {
            console.error('[toggleFenixCompliance] Error:', error);
            // 4. Rollback
            if (existing) {
                setFenixCompliances(fenixCompliances.map(f => f.id === existing.id ? existing : f));
            } else {
                setFenixCompliances(fenixCompliances.filter(f => f.id !== tempId));
            }
            throw error;
        }
    };

    const value = {
        user, allUsers, login, logout, addUser, updateUser, deleteUser, updateProfile,
        advisors, addAdvisor, updateAdvisor, deleteAdvisor,
        indicators, addIndicator, updateIndicator, deleteIndicator,
        budgets, saveBudget,
        records, saveRecord, deleteRecord,
        branchConfig, updateBranchConfig,
        rrhhEvents, addRRHHEvent, updateRRHHEvent, deleteRRHHEvent,
        supervisionLogs, addSupervisionLog, updateSupervisionLog, deleteSupervisionLog,
        coachingSessions, addCoachingSession, deleteCoachingSession,
        auditLogs,
        // Schedule
        scheduleActivities, addScheduleActivity, updateScheduleActivity, deleteScheduleActivity,
        scheduleAssignments, saveScheduleAssignments, deleteScheduleAssignment,
        branchScheduleConfig, updateBranchScheduleConfig,
        fenixCompliances, toggleFenixCompliance
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};