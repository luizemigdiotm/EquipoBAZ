import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Advisor, Indicator, BudgetConfig, RecordData, User, AuditLogEntry, RRHHEvent, SupervisionLog, CoachingSession } from '../types';
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
    // Keys to always exclude from DB operations
    const EXCLUDED_KEYS = ['count', 'children'];

    if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            if (EXCLUDED_KEYS.includes(key)) return result;

            const newKey = toSnake(key);
            const value = obj[key];

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

    // --- 1. AUTH & DATA LOADING ---
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
                tProfiles
            ] = await Promise.all([
                safeFetch('advisors'),
                safeFetch('indicators'),
                safeFetch('budgets'),
                safeFetch('records'),
                safeFetch('rrhh_events'),
                safeFetch('supervision_logs'),
                safeFetch('coaching_sessions'),
                safeFetch('audit_logs?order=timestamp.desc'),
                safeFetch('profiles')
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
    const authenticatedFetch = async (endpoint: string, method: string, body?: any) => {
        const storedSession = localStorage.getItem('BAZ_SESSION');
        if (!storedSession) throw new Error('No hay sesión activa');

        const { access_token } = JSON.parse(storedSession);

        const headers: any = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal' // Optimisation: don't return the full object, we refresh anyway
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
    const saveBudget = async (configs: BudgetConfig[], year: number, week: number) => {
        // Upsert many
        const dbConfigs = configs.map(c => mapKeysToDB(c));
        const { error } = await supabase.from('budgets').upsert(dbConfigs);
        if (error) throw error;
        addAuditLog('Actualizar Presupuestos', `Año ${year} Sem ${week}`);
        fetchData();
    };

    // Records
    const saveRecord = async (rec: RecordData, cleanupMode?: 'DELETE_WEEKLY' | 'DELETE_DAILY') => {
        // Handle Cleanup
        if (cleanupMode === 'DELETE_WEEKLY') {
            // Delete any weekly record for this period/target
            await supabase.from('records').delete()
                .eq('year', rec.year).eq('week', rec.week)
                .eq('type', rec.type).eq('frequency', 'WEEKLY')
                .eq(rec.type === 'Individual' ? 'advisor_id' : 'id', rec.type === 'Individual' ? rec.advisorId : 'placeholder'); // Simplified check, usually by advisorId or just week/year/type
            // Better logic:
            let query = supabase.from('records').delete().eq('year', rec.year).eq('week', rec.week).eq('type', rec.type).eq('frequency', 'WEEKLY');
            if (rec.advisorId) query = query.eq('advisor_id', rec.advisorId);
            await query;
        } else if (cleanupMode === 'DELETE_DAILY') {
            let query = supabase.from('records').delete().eq('year', rec.year).eq('week', rec.week).eq('type', rec.type).eq('frequency', 'DAILY');
            if (rec.advisorId) query = query.eq('advisor_id', rec.advisorId);
            await query;
        }

        // Clean undefined fields
        const cleanRec = { ...rec };
        if (cleanRec.dayOfWeek === undefined) delete (cleanRec as any).dayOfWeek;
        if (cleanRec.advisorId === undefined) delete (cleanRec as any).advisorId;

        await genericAdd('records', cleanRec, 'Registro');
    };

    const deleteRecord = async (id: string) => genericDelete('records', id, 'Registro');

    // RRHH
    const addRRHHEvent = async (evt: RRHHEvent) => genericAdd('rrhh_events', evt, 'Evento RRHH');
    const updateRRHHEvent = async (evt: RRHHEvent) => genericUpdate('rrhh_events', evt, 'Evento RRHH');
    const deleteRRHHEvent = async (id: string) => genericDelete('rrhh_events', id, 'Evento RRHH');

    // Supervision
    const addSupervisionLog = async (log: SupervisionLog) => genericAdd('supervision_logs', log, 'Bitácora');
    const deleteSupervisionLog = async (id: string) => genericDelete('supervision_logs', id, 'Bitácora');

    // Coaching
    const addCoachingSession = async (s: CoachingSession) => genericAdd('coaching_sessions', s, 'Coaching');
    const deleteCoachingSession = async (id: string) => genericDelete('coaching_sessions', id, 'Coaching');

    const value = {
        user, allUsers, login, logout, addUser, updateUser, deleteUser, updateProfile,
        advisors, addAdvisor, updateAdvisor, deleteAdvisor,
        indicators, addIndicator, updateIndicator, deleteIndicator,
        budgets, saveBudget,
        records, saveRecord, deleteRecord,
        rrhhEvents, addRRHHEvent, updateRRHHEvent, deleteRRHHEvent,
        supervisionLogs, addSupervisionLog, deleteSupervisionLog,
        coachingSessions, addCoachingSession, deleteCoachingSession,
        auditLogs
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