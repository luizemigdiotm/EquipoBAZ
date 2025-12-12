import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import ScheduleManager from '../components/ScheduleManager';

import { Position, SupervisionLog, CoachingSession, Advisor, Indicator, ReportType } from '../types';
import { Camera, Clock, MessageCircle, FileText, CheckSquare, Plus, Trash2, Trophy, AlertTriangle, Briefcase, Share2, Printer, Edit, X, Zap, Calendar } from 'lucide-react';

const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const Management = () => {
    const [activeTab, setActiveTab] = useState<'BOARD' | 'LOGBOOK' | 'COACHING' | 'QUICK_ENTRY' | 'SCHEDULE'>('BOARD');


    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center no-print">
                <div>
                    <h1 className="text-3xl font-bold text-bank-900 flex items-center">
                        <Briefcase className="mr-3 text-bank-600" /> Gestión Gerencial
                    </h1>
                    <p className="text-gray-500 mt-1">Manual de Gestión de Alto Rendimiento</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0 overflow-x-auto w-full md:w-auto">
                    <button onClick={() => setActiveTab('BOARD')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'BOARD' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Pizarra</button>
                    <button onClick={() => setActiveTab('QUICK_ENTRY')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'QUICK_ENTRY' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Captura Rápida</button>
                    <button onClick={() => setActiveTab('LOGBOOK')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'LOGBOOK' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Bitácora</button>
                    <button onClick={() => setActiveTab('COACHING')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'COACHING' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Acompañamiento</button>
                    <button onClick={() => setActiveTab('SCHEDULE')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'SCHEDULE' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Horarios</button>
                </div>
            </div>

            {activeTab === 'BOARD' && <BoardTab />}
            {activeTab === 'QUICK_ENTRY' && <QuickEntryTab />}
            {activeTab === 'LOGBOOK' && <LogbookTab />}
            {activeTab === 'COACHING' && <CoachingTab />}
            {activeTab === 'SCHEDULE' && <ScheduleManager />}

        </div>
    );
};

// --- TAB 1: PIZARRA DE RENDIMIENTO ---
const BoardTab = () => {
    const { indicators, budgets, records, advisors, branchConfig } = useData();
    const [focusOfTheDay, setFocusOfTheDay] = useState('');

    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const currentDay = today.getDay();

    const keyIndicators = useMemo(() => {
        if (branchConfig?.keyIndicatorIds && branchConfig.keyIndicatorIds.length > 0) {
            return branchConfig.keyIndicatorIds.map((id: string) => indicators.find(i => i.id === id)).filter(Boolean) as Indicator[];
        }
        return indicators.filter(i =>
            i.name.toLowerCase().includes('efectivo') ||
            i.name.toLowerCase().includes('nuevos') ||
            i.name.toLowerCase().includes('vidamax')
        ).slice(0, 3);
    }, [indicators, branchConfig]);

    const getMetric = (ind: Indicator, isBranch: boolean) => {
        if (!ind) return { target: 0, actual: 0 };

        const relevantBudgets = budgets.filter(b => b.indicatorId === ind.id && b.targetId === 'BRANCH_GLOBAL' && b.year === currentYear && b.week === currentWeek);

        let target = 0;
        const dailyB = relevantBudgets.find(b => b.periodType === 'DAILY' && b.dayOfWeek === currentDay);
        if (dailyB) {
            target = dailyB.amount;
        } else {
            const weeklyB = relevantBudgets.find(b => b.periodType === 'WEEKLY');
            if (weeklyB) target = weeklyB.amount / 7;
        }
        target = Math.ceil(target);

        // Fix: Sum ALL records for the day (Branch + Individual) to include Quick Entry data automatically
        const dailyRecs = records.filter(r => r.year === currentYear && r.week === currentWeek && r.frequency === 'DAILY' && r.dayOfWeek === currentDay);
        const actual = dailyRecs.reduce((sum, r) => sum + (r.values[ind.id] || 0), 0);

        return { target, actual: Math.ceil(actual) };
    };

    const generateWhatsAppScript = (type: 'START' | 'CUT' | 'CLOSE') => {
        let text = '';
        if (type === 'START') {
            text = `*¡Buen día equipo! ☀️*\n\n> Meta del día Sucursal:\n` +
                keyIndicators.map(ind => {
                    const m = getMetric(ind, true);
                    const unit = ind.unit === '$' ? '$' : '';
                    return `• *${unit}${m.target.toLocaleString()}* ${ind.name}`;
                }).join('\n') +
                `\n> Foco: *${focusOfTheDay || 'Sin foco definido'}*.\n> ¡A darle con todo!`;
        } else if (type === 'CUT') {
            text = `*Corte de las 2 PM:*\n\n> LÍDERES: ¡Felicidades a los que ya están en meta!\n> EN LA PELEA: Ánimo, aprovechen la fila de la tarde.\n> ALERTA: Necesito enfoque total en *${focusOfTheDay || 'el cierre'}* las próximas 2 horas.\n> ¡Vamos por el cierre!`;
        } else {
            text = `*CIERRE (Al finalizar)*\n\n> Cerramos el día con:\n` +
                keyIndicators.map(ind => {
                    const m = getMetric(ind, true);
                    const status = m.actual >= m.target ? '✅' : '⚠️';
                    const unit = ind.unit === '$' ? '$' : '';
                    return `• ${ind.name}: *${unit}${m.actual.toLocaleString()}* / ${unit}${m.target.toLocaleString()} ${status}`;
                }).join('\n') +
                `\n> Mañana ajustamos estrategia.\n> ¡Descansen!`;
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-slate-900 text-white p-4 text-center">
                    <h2 className="text-2xl font-bold tracking-wider">PIZARRA DE RENDIMIENTO</h2>
                    <p className="text-sm text-gray-400">{branchConfig?.name || 'Sucursal'} {branchConfig?.ceco || ''}</p>
                </div>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-center mb-6 uppercase tracking-widest text-bank-700 border-b pb-2">Metas de Sucursal (Hoy)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {keyIndicators.map(ind => {
                            const m = getMetric(ind, true);
                            const color = ind.name.toLowerCase().includes('efectivo') ? 'text-yellow-600' : ind.name.toLowerCase().includes('cuenta') ? 'text-blue-600' : 'text-purple-600';
                            return <MetricCard key={ind.id} label={ind.name.toUpperCase()} value={m.actual} target={m.target} unit={ind.unit} color={color} />;
                        })}
                    </div>

                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center mb-8">
                        <h4 className="text-xl font-black text-yellow-800 uppercase mb-2">FOCO DEL DÍA</h4>
                        <input
                            type="text"
                            className="w-full text-center text-xl bg-transparent border-b-2 border-yellow-400 focus:outline-none placeholder-yellow-300 font-medium text-yellow-900"
                            placeholder="Escribe aquí la prioridad única (Ej. ¡HOY ES DÍA DE PORTABILIDAD!)"
                            value={focusOfTheDay}
                            onChange={(e) => setFocusOfTheDay(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-center mb-3 bg-blue-100 py-1 rounded text-blue-800">EQUIPO PRÉSTAMOS</h4>
                            <div className="space-y-2">
                                {advisors.filter(a => a.position === Position.LOAN_ADVISOR).map(adv => (
                                    <div key={adv.id} className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                                        <span>{adv.name}</span>
                                        <span className="text-gray-400">___ / ___</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-center mb-3 bg-emerald-100 py-1 rounded text-emerald-800">EQUIPO AFILIACIÓN</h4>
                            <div className="space-y-2">
                                {advisors.filter(a => a.position === Position.AFFILIATION_ADVISOR).map(adv => (
                                    <div key={adv.id} className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                                        <span>{adv.name}</span>
                                        <span className="text-gray-400">___ / ___</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><MessageCircle className="mr-2 text-green-500" /> Estrategia de Comunicación (WhatsApp)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => generateWhatsAppScript('START')} className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 text-left transition-colors group">
                        <span className="block font-bold text-green-800 mb-1 group-hover:underline">1. ARRANQUE (9:00 AM)</span>
                        <span className="text-xs text-green-600">Grito de guerra y asignación de meta verbal.</span>
                    </button>
                    <button onClick={() => generateWhatsAppScript('CUT')} className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 text-left transition-colors group">
                        <span className="block font-bold text-orange-800 mb-1 group-hover:underline">2. CORTE (2:00 PM)</span>
                        <span className="text-xs text-orange-600">Foto de pizarra, felicitación a líderes y alerta.</span>
                    </button>
                    <button onClick={() => generateWhatsAppScript('CLOSE')} className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-left transition-colors group">
                        <span className="block font-bold text-blue-800 mb-1 group-hover:underline">3. CIERRE (Final)</span>
                        <span className="text-xs text-blue-600">Resultado final y despedida.</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, target, unit, color }: any) => {
    const pct = target > 0 ? (value / target) * 100 : 0;
    const remaining = Math.max(0, target - value);
    const remainingPct = target > 0 ? (remaining / target) * 100 : 0;

    return (
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs font-bold text-gray-500 mb-1">{label}</span>
            <div className="flex items-end gap-2">
                <span className={`text-2xl font-black ${color}`}>{unit === '$' ? `$${value.toLocaleString()}` : value}</span>
                <span className="text-sm text-gray-400 mb-1">/ {unit === '$' ? `$${target.toLocaleString()}` : target}</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 mb-2">
                <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
            </div>
            {/* Added "Falta" Display */}
            <div className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                Falta: {unit === '$' ? `$${remaining.toLocaleString()}` : remaining} ({remainingPct.toFixed(0)}%)
            </div>
        </div>
    );
};

// --- TAB 2: CAPTURA RÁPIDA ---
const QuickEntryTab = () => {
    const { advisors, indicators, branchConfig, records, saveRecord, rrhhEvents, deleteRecord } = useData();

    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const currentDay = today.getDay();
    const dateStr = today.toISOString().split('T')[0];

    // Local State for Immediate Reactivity
    const [localValues, setLocalValues] = useState<{ [key: string]: number }>({});
    const [isSaving, setIsSaving] = useState(false);

    const keyIndicators = useMemo(() => {
        if (branchConfig?.keyIndicatorIds && branchConfig.keyIndicatorIds.length > 0) {
            return branchConfig.keyIndicatorIds.map((id: string) => indicators.find(i => i.id === id)).filter(Boolean) as Indicator[];
        }
        return indicators.filter(i =>
            i.name.toLowerCase().includes('efectivo') ||
            i.name.toLowerCase().includes('nuevos') ||
            i.name.toLowerCase().includes('vidamax')
        ).slice(0, 4);
    }, [indicators, branchConfig]);

    const activeAdvisors = useMemo(() => {
        return advisors.filter(adv => {
            const absent = rrhhEvents.some(evt => {
                if (evt.advisorId !== adv.id) return false;

                // Recurring Logic (DAY_OFF)
                if (evt.recurringDay !== undefined && evt.recurringDay !== null) {
                    if (dateStr < evt.startDate) return false;
                    // currentDay (0=Sun...6=Sat) matches recurringDay
                    return evt.recurringDay === currentDay;
                }

                // Standard Range Logic
                return evt.startDate <= dateStr && evt.endDate >= dateStr &&
                    ['VACATION', 'PERMIT', 'INCAPACITY', 'ABSENCE', 'DAY_OFF'].includes(evt.type);
            });
            return !absent;
        });
    }, [advisors, rrhhEvents, dateStr]);

    // Sync from Context to Local State on Mount
    // We only set it if the key doesn't exist to avoid overwriting typed data if re-render happens
    // But we DO want to sync if records load from DB.
    useEffect(() => {
        const initial: { [key: string]: number } = {};
        records.forEach(r => {
            if (r.year === currentYear && r.week === currentWeek && r.frequency === 'DAILY' && r.dayOfWeek === currentDay) {
                Object.keys(r.values).forEach(k => {
                    initial[`${r.advisorId}-${k}`] = r.values[k];
                });
            }
        });
        setLocalValues(prev => ({ ...initial, ...prev }));
    }, [records, currentYear, currentWeek, currentDay]);

    const handleChange = (advisorId: string, indicatorId: string, valStr: string) => {
        const val = valStr === '' ? 0 : parseFloat(valStr);
        setLocalValues(prev => ({ ...prev, [`${advisorId}-${indicatorId}`]: val }));
    };

    const handleBlur = async (advisorId: string, indicatorId: string) => {
        const val = localValues[`${advisorId}-${indicatorId}`] || 0;
        setIsSaving(true);
        try {
            const existingRec = records.find(r =>
                r.year === currentYear &&
                r.week === currentWeek &&
                r.frequency === 'DAILY' &&
                r.dayOfWeek === currentDay &&
                r.advisorId === advisorId &&
                r.type === ReportType.INDIVIDUAL
            );

            const newRec = existingRec ? { ...existingRec, values: { ...existingRec.values, [indicatorId]: val } } : {
                id: '',
                year: currentYear,
                week: currentWeek,
                frequency: 'DAILY' as const,
                dayOfWeek: currentDay,
                type: ReportType.INDIVIDUAL,
                advisorId: advisorId,
                values: { [indicatorId]: val },
                agreements: {},
                date: dateStr
            };
            await saveRecord(newRec);
        } finally {
            setIsSaving(false);
        }
    };

    const getTotal = (indicatorId: string) => {
        return activeAdvisors.reduce((sum, adv) => {
            const val = localValues[`${adv.id}-${indicatorId}`] || 0;
            return sum + val;
        }, 0);
    };

    const handleCleanDay = async () => {
        if (!confirm('¿Borrar TODOS los datos capturados hoy?')) return;
        setIsSaving(true);
        try {
            const toDelete = records.filter(r =>
                r.year === currentYear &&
                r.week === currentWeek &&
                r.frequency === 'DAILY' &&
                r.dayOfWeek === currentDay
            );

            // Optimistic Clear
            setLocalValues({});

            for (const rec of toDelete) {
                await deleteRecord(rec.id);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const shareWhatsApp = () => {
        const branchName = `${branchConfig?.name || 'Sucursal'} ${branchConfig?.ceco || ''}`;
        let msg = `*${branchName}*\n-------- ${today.toLocaleDateString()} --------\n\n`;

        const groups = [
            { title: '💰 CRÉDITO', advs: activeAdvisors.filter(a => a.position === Position.LOAN_ADVISOR) },
            { title: '🤝 AFILIACIÓN', advs: activeAdvisors.filter(a => a.position === Position.AFFILIATION_ADVISOR) }
        ];

        groups.forEach(g => {
            if (g.advs.length > 0) {
                msg += `*${g.title}*\n`;
                g.advs.forEach(adv => {
                    msg += `*${adv.name.split(' ')[0]}*:\n`;
                    keyIndicators.forEach(ind => {
                        const val = localValues[`${adv.id}-${ind.id}`] || 0;
                        const display = val === 0 ? '🅾️' : (ind.unit === '$' ? `$${(val / 1000).toFixed(1)}k` : val);
                        msg += `- ${ind.name}: ${display}\n`;
                    });
                });
                msg += '\n';
            }
        });

        // Add Totals
        msg += `*🏁 TOTAL SUCURSAL*\n`;
        keyIndicators.forEach(ind => {
            const total = getTotal(ind.id);
            msg += `• ${ind.name}: *${ind.unit === '$' ? '$' + total.toLocaleString() : total}*\n`;
        });

        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
            {isSaving && <div className="absolute top-2 right-2 text-xs font-bold text-green-600 animate-pulse flex items-center bg-green-50 px-2 py-1 rounded">💾 Guardando...</div>}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Captura Rápida</h3>
                    <p className="text-sm text-gray-500">Resultados del día en tiempo real.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCleanDay} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded font-bold text-sm border border-transparent hover:border-red-200 transition-colors" title="Borrar todo lo de hoy">
                        <Trash2 size={18} />
                    </button>
                    <button onClick={shareWhatsApp} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-sm transition-colors">
                        <Share2 className="mr-2" size={18} /> Compartir
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold">
                        <tr>
                            <th className="p-3 rounded-tl-lg">Asesor</th>
                            {keyIndicators.map(ind => (
                                <th key={ind.id} className="p-2 text-center min-w-[100px]">{ind.name} ({ind.unit})</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {/* GROUP: LOAN ADVISORS */}
                        <tr className="bg-blue-50"><td colSpan={keyIndicators.length + 1} className="p-2 font-bold text-blue-800 text-xs uppercase tracking-wider">Asesores de Préstamos</td></tr>
                        {activeAdvisors.filter(a => a.position === Position.LOAN_ADVISOR).map(adv => (
                            <tr key={adv.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">{adv.name}</td>
                                {keyIndicators.map(ind => (
                                    <td key={ind.id} className="p-2">
                                        <input
                                            key={`${adv.id}-${ind.id}`}
                                            type="number"
                                            className="w-full text-center border border-gray-300 rounded-md py-1 px-2 focus:ring-2 focus:ring-bank-500 outline-none transition-shadow"
                                            placeholder="0"
                                            value={localValues[`${adv.id}-${ind.id}`] || ''}
                                            onChange={(e) => handleChange(adv.id, ind.id, e.target.value)}
                                            onBlur={() => handleBlur(adv.id, ind.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {/* GROUP: AFFILIATION ADVISORS */}
                        <tr className="bg-emerald-50"><td colSpan={keyIndicators.length + 1} className="p-2 font-bold text-emerald-800 text-xs uppercase tracking-wider">Asesores de Afiliación</td></tr>
                        {activeAdvisors.filter(a => a.position === Position.AFFILIATION_ADVISOR).map(adv => (
                            <tr key={adv.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">{adv.name}</td>
                                {keyIndicators.map(ind => (
                                    <td key={ind.id} className="p-2">
                                        <input
                                            key={`${adv.id}-${ind.id}`}
                                            type="number"
                                            className="w-full text-center border border-gray-300 rounded-md py-1 px-2 focus:ring-2 focus:ring-bank-500 outline-none transition-shadow"
                                            placeholder="0"
                                            value={localValues[`${adv.id}-${ind.id}`] || ''}
                                            onChange={(e) => handleChange(adv.id, ind.id, e.target.value)}
                                            onBlur={() => handleBlur(adv.id, ind.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {/* TOTAL ROW */}
                        <tr className="bg-gray-100 border-t-2 border-gray-200 font-bold">
                            <td className="p-3 text-gray-900 text-right uppercase">Total Sucursal:</td>
                            {keyIndicators.map(ind => (
                                <td key={ind.id} className="p-3 text-center text-bank-700">
                                    {ind.unit === '$' ? '$' : ''}{getTotal(ind.id).toLocaleString()}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
            {activeAdvisors.length === 0 && <div className="text-center p-8 text-gray-400">Todos los asesores están marcados como ausentes hoy.</div>}
        </div>
    );
};

// --- TAB 3: BITÁCORA DE SUPERVISIÓN ---
const LogbookTab = () => {
    const { advisors, supervisionLogs, addSupervisionLog, updateSupervisionLog, deleteSupervisionLog, branchConfig } = useData();

    // Add Edit State
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState<Partial<SupervisionLog>>({ type: 'FAILURE' });
    const [filterAdvisor, setFilterAdvisor] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');

    // Date Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await convertToBase64(e.target.files[0]);
            setForm({ ...form, photoUrl: base64 });
        }
    };

    const handleEdit = (log: SupervisionLog) => {
        setForm(log);
        setEditingId(log.id);
        setEditMode(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setForm({ type: 'FAILURE', photoUrl: undefined, details: '', indicatorName: '' });
        setEditMode(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.advisorId && form.details) {

            if (editMode && editingId) {
                // Correctly call UPDATE now that it exists
                await updateSupervisionLog({
                    ...form,
                    id: editingId
                } as SupervisionLog);
                alert('Registro actualizado correctamente');
            } else {
                await addSupervisionLog({
                    ...form,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString()
                } as SupervisionLog);
                alert('Hallazgo registrado');
            }

            handleCancelEdit();
        }
    };

    const filteredLogs = supervisionLogs.filter(l => {
        if (filterAdvisor !== 'ALL' && l.advisorId !== filterAdvisor) return false;
        if (filterType !== 'ALL' && l.type !== filterType) return false;
        if (dateFrom && new Date(l.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(l.date) > new Date(dateTo)) return false;
        return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const printLogs = () => {
        window.print();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 no-print">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            {editMode ? <Edit className="mr-2 text-bank-600" /> : <Camera className="mr-2 text-bank-600" />}
                            {editMode ? 'Editar Registro' : 'Registrar Hallazgo'}
                        </h3>
                        {editMode && <button onClick={handleCancelEdit}><X size={16} className="text-gray-400" /></button>}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Colaborador</label>
                            <select className="w-full border rounded p-2" value={form.advisorId || ''} onChange={e => setForm({ ...form, advisorId: e.target.value })} required>
                                <option value="">-- Seleccionar --</option>
                                {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Registro</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setForm({ ...form, type: 'FAILURE' })} className={`flex-1 py-2 rounded text-xs font-bold ${form.type === 'FAILURE' ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : 'bg-gray-100 text-gray-600'}`}>Falla</button>
                                <button type="button" onClick={() => setForm({ ...form, type: 'COACHING' })} className={`flex-1 py-2 rounded text-xs font-bold ${form.type === 'COACHING' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-gray-100 text-gray-600'}`}>Coaching</button>
                                <button type="button" onClick={() => setForm({ ...form, type: 'ACHIEVEMENT' })} className={`flex-1 py-2 rounded text-xs font-bold ${form.type === 'ACHIEVEMENT' ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-gray-100 text-gray-600'}`}>Logro</button>
                            </div>

                            {/* Dynamic Description Box */}
                            <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs transition-all">
                                {form.type === 'FAILURE' && (
                                    <>
                                        <div className="font-bold text-red-800 mb-1 flex items-center"><span className="mr-2">🔴</span> Falla / Error / Incumplimiento</div>
                                        <p className="text-gray-600">Usar para retardos, uniformes, metas no cumplidas, mal servicio.</p>
                                    </>
                                )}
                                {form.type === 'COACHING' && (
                                    <>
                                        <div className="font-bold text-blue-800 mb-1 flex items-center"><span className="mr-2">🟡</span> Coaching / Acompañamiento</div>
                                        <p className="text-gray-600">Usar cuando te sientas a enseñarles o das feedback.</p>
                                    </>
                                )}
                                {form.type === 'ACHIEVEMENT' && (
                                    <>
                                        <div className="font-bold text-green-800 mb-1 flex items-center"><span className="mr-2">🟢</span> Felicitación / Logro</div>
                                        <p className="text-gray-600">Usar cuando cumplen metas o hacen algo extraordinario.</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Indicador / Conducta</label>
                            <input type="text" placeholder="Ej. Uniforme, Efectivo" className="w-full border rounded p-2" value={form.indicatorName || ''} onChange={e => setForm({ ...form, indicatorName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Detalle (Hechos y Acciones)</label>
                            <textarea rows={3} placeholder="¿Qué pasó? ¿Qué hiciste tú?" className="w-full border rounded p-2" value={form.details || ''} onChange={e => setForm({ ...form, details: e.target.value })} required></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Evidencia (Foto)</label>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-bank-50 file:text-bank-700 hover:file:bg-bank-100" />
                        </div>
                        <button type="submit" className="w-full bg-bank-600 hover:bg-bank-700 text-white font-bold py-2 rounded-lg transition-colors">
                            {editMode ? 'Actualizar Registro' : 'Guardar en Bitácora'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="md:col-span-8">
                {/* Print Header (Visible only in Print) */}
                <div className="hidden print:block mb-8 border-b-2 border-bank-600 pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">BITÁCORA DE SUPERVISIÓN Y COACHING</h1>
                            <p className="text-sm text-gray-600">Sucursal {branchConfig?.name || 'N/A'} - {branchConfig?.ceco || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Generado el: {new Date().toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">Líder: {branchConfig?.leaderName || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none">
                    <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 justify-between items-center no-print">
                        <h3 className="font-bold text-gray-700">Historial</h3>
                        <div className="flex gap-2">
                            <input type="date" className="text-xs border rounded p-1" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            <input type="date" className="text-xs border rounded p-1" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            <select className="text-xs border rounded p-1" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="ALL">Todos Tipos</option>
                                <option value="FAILURE">Fallas</option>
                                <option value="COACHING">Coaching</option>
                                <option value="ACHIEVEMENT">Logros</option>
                                <option value="MINUTA_WHATSAPP">Minuta WhatsApp</option>
                                <option value="PMD_FORMAL">PMD Formal</option>
                            </select>
                            <select className="text-xs border rounded p-1" value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)}>
                                <option value="ALL">Todos Colab.</option>
                                {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <button onClick={printLogs} className="bg-gray-200 p-1 rounded hover:bg-gray-300 text-gray-700">
                                <Printer size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="divide-y max-h-[600px] overflow-y-auto print:max-h-none print:overflow-visible">
                        {filteredLogs.map(log => {
                            const adv = advisors.find(a => a.id === log.advisorId);
                            return (
                                <div key={log.id} className="p-4 hover:bg-gray-50 flex gap-4 print:break-inside-avoid">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden border border-gray-300 print:w-12 print:h-12">
                                        {log.photoUrl ? <img src={log.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Camera size={20} /></div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900">{adv?.name}</h4>
                                            <div className="flex gap-2 no-print">
                                                <button onClick={() => handleEdit(log)} className="text-gray-400 hover:text-blue-500"><Edit size={14} /></button>
                                                <button onClick={() => { if (confirm('¿Eliminar?')) deleteSupervisionLog(log.id) }} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${log.type === 'FAILURE' ? 'bg-red-100 text-red-700' :
                                                log.type === 'ACHIEVEMENT' ? 'bg-green-100 text-green-700' :
                                                    log.type === 'MINUTA_WHATSAPP' ? 'bg-orange-100 text-orange-700' :
                                                        log.type === 'PMD_FORMAL' ? 'bg-red-800 text-white' :
                                                            'bg-blue-100 text-blue-700'} print:border print:border-gray-200`}>
                                                {log.type === 'FAILURE' ? 'Falla' :
                                                    log.type === 'ACHIEVEMENT' ? 'Logro' :
                                                        log.type === 'MINUTA_WHATSAPP' ? 'Minuta WhatsApp' :
                                                            log.type === 'PMD_FORMAL' ? 'PMD Formal' :
                                                                'Coaching'}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded print:bg-transparent print:font-bold">{log.indicatorName}</span>
                                            <span className="text-xs text-gray-400 ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{log.details}</p>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredLogs.length === 0 && <div className="p-8 text-center text-gray-400 italic">No hay registros con los filtros seleccionados.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TAB 4: ACOMPAÑAMIENTO (unchanged but included) ---
const CoachingTab = () => {
    const { advisors, supervisionLogs, addSupervisionLog } = useData();
    const [level, setLevel] = useState<'LEVEL_2' | 'LEVEL_3'>('LEVEL_2');
    const [advisorId, setAdvisorId] = useState('');
    const [pmdType, setPmdType] = useState<'FAILURE' | 'COACHING' | 'ACHIEVEMENT'>('FAILURE');

    // Level 2 States
    const [indicator, setIndicator] = useState('');
    const [problem, setProblem] = useState('');
    const [action1, setAction1] = useState('');
    const [action2, setAction2] = useState('');
    const [support, setSupport] = useState('');
    const [reviewDate, setReviewDate] = useState('');

    // Level 3 Dynamic States
    const [deficiencies, setDeficiencies] = useState<{ id: number; indicator: string; current: string; goal: string }[]>([
        { id: 1, indicator: '', current: '', goal: '' }
    ]);
    const [managerCommitments, setManagerCommitments] = useState<{ id: number; text: string }[]>([
        { id: 1, text: '' }
    ]);

    // Level 3 Manual Text Goals
    const [quantGoal, setQuantGoal] = useState('');
    const [activityGoal, setActivityGoal] = useState('');
    const [qualGoal, setQualGoal] = useState('');

    // Auto-calculate dates
    useEffect(() => {
        if (level === 'LEVEL_3') {
            const today = new Date();
            const future = new Date();
            future.setDate(today.getDate() + 28); // 4 weeks
            setReviewDate(future.toISOString().split('T')[0]);
        }
    }, [level]);

    const handleAddDeficiency = () => {
        setDeficiencies([...deficiencies, { id: Date.now(), indicator: '', current: '', goal: '' }]);
    };

    const handleRemoveDeficiency = (id: number) => {
        if (deficiencies.length > 1) {
            setDeficiencies(deficiencies.filter(d => d.id !== id));
        }
    };

    const handleDeficiencyChange = (id: number, field: string, value: string) => {
        setDeficiencies(deficiencies.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const handleAddCommitment = () => {
        setManagerCommitments([...managerCommitments, { id: Date.now(), text: '' }]);
    };

    const handleRemoveCommitment = (id: number) => {
        if (managerCommitments.length > 1) {
            setManagerCommitments(managerCommitments.filter(c => c.id !== id));
        }
    };

    const handleCommitmentChange = (id: number, value: string) => {
        setManagerCommitments(managerCommitments.map(c => c.id === id ? { ...c, text: value } : c));
    };

    const generateAgreement = async () => {
        const adv = advisors.find(a => a.id === advisorId);
        if (!adv) return alert('Seleccione asesor');

        if (level === 'LEVEL_2') {
            // Auto-Log to Bitácora
            await addSupervisionLog({
                id: '',
                advisorId: adv.id,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                type: 'MINUTA_WHATSAPP',
                indicatorName: indicator || 'N/A',
                details: `MINUTA WHATSAPP: Problema reportado: "${problem}". Compromisos: 1. ${action1}, 2. ${action2}. Fecha Límite: ${reviewDate}`,
            });

            // Format date to DD/MM/YYYY
            const [y, m, d] = reviewDate.split('-');
            const formattedDate = reviewDate ? `${d}/${m}/${y}` : 'ASAP';

            const text = `📝 *MINUTA DE ACUERDOS Y COMPROMISOS*\n\nColaborador: *${adv.name}*\nFecha: *${new Date().toLocaleDateString()}*\n\n🛑 *EL HALLAZGO (Problema):*\nSe detecta un bajo desempeño/incumplimiento en: *${indicator}*.\n\n✅ *TU COMPROMISO (Acciones):*\n1. ${action1}\n2. ${action2}\n\n🤝 *MI COMPROMISO (Soporte):*\n${support}\n\n📅 *FECHA LÍMITE:*\nEl objetivo debe cumplirse antes del: *${formattedDate}*.\n\nFavor de confirmar de enterado. 👇`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        } else {
            // Auto-Log to Bitácora for PMD
            await addSupervisionLog({
                id: '',
                advisorId: adv.id,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                type: 'PMD_FORMAL',
                indicatorName: pmdType === 'ACHIEVEMENT' ? 'RECONOCIMIENTO' : (pmdType === 'COACHING' ? 'MINUTA COACHING' : 'PLAN DE MEJORA'),
                details: `PMD FORMAL (${pmdType}) generado con ${deficiencies.length} puntos. Revisión: ${reviewDate}.`,
            });
            window.print();
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8 no-print">
                <h2 className="text-2xl font-bold text-gray-800">Generador de Acuerdos</h2>
                <div className="flex justify-center gap-4 mt-4">
                    <button onClick={() => setLevel('LEVEL_2')} className={`px-6 py-2 rounded-full font-bold transition-all ${level === 'LEVEL_2' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'bg-gray-100 text-gray-500'}`}>Nivel 2: Minuta WhatsApp</button>
                    <button onClick={() => setLevel('LEVEL_3')} className={`px-6 py-2 rounded-full font-bold transition-all ${level === 'LEVEL_3' ? 'bg-red-100 text-red-700 ring-2 ring-red-300' : 'bg-gray-100 text-gray-500'}`}>Nivel 3: PMD Formal (Impreso)</button>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 no-print ${level === 'LEVEL_3' ? 'hidden md:grid' : ''}`}>
                {/* Form Inputs (Hidden on Print) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Colaborador</label>
                    <select className="w-full border rounded p-2" value={advisorId} onChange={e => setAdvisorId(e.target.value)}>
                        <option value="">-- Seleccionar --</option>
                        {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{level === 'LEVEL_2' ? 'Fecha Límite para Cumplir Acuerdo' : 'Fecha Inicio PMD'}</label>
                    <input type="date" className="w-full border rounded p-2" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
                </div>
            </div>

            {level === 'LEVEL_2' && (
                <div className="space-y-4 mb-8 no-print">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Indicador / Conducta</label>
                        <input type="text" className="w-full border rounded p-2" placeholder="Ej. Efectivo, Uso de Celular" value={indicator} onChange={e => setIndicator(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">El Problema (Hallazgo)</label>
                        <textarea className="w-full border rounded p-2" rows={2} placeholder="Describe qué está fallando..." value={problem} onChange={e => setProblem(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Acción Compromiso 1</label>
                            <input type="text" className="w-full border rounded p-2" placeholder="Ej. Realizar 10 abordajes diarios" value={action1} onChange={e => setAction1(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Acción Compromiso 2</label>
                            <input type="text" className="w-full border rounded p-2" placeholder="Ej. Usar guion en cada cierre" value={action2} onChange={e => setAction2(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Soporte Gerencial (Tu compromiso)</label>
                        <input type="text" className="w-full border rounded p-2" placeholder="Ej. Acompañamiento en piso Martes y Jueves" value={support} onChange={e => setSupport(e.target.value)} />
                    </div>
                </div>
            )}

            {level === 'LEVEL_3' ? (
                <div className="no-print space-y-6 mb-8">
                    {/* PMD TYPE SELECTOR */}
                    <div className="flex gap-4 justify-center bg-gray-50 p-2 rounded-lg">
                        <button onClick={() => setPmdType('FAILURE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${pmdType === 'FAILURE' ? 'bg-red-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                            <AlertTriangle size={18} /> Falla / Incumplimiento
                        </button>
                        <button onClick={() => setPmdType('COACHING')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${pmdType === 'COACHING' ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                            <MessageCircle size={18} /> Coaching / Acompañamiento
                        </button>
                        <button onClick={() => setPmdType('ACHIEVEMENT')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${pmdType === 'ACHIEVEMENT' ? 'bg-green-600 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                            <Trophy size={18} /> Felicitación / Logro
                        </button>
                    </div>

                    <div className={`${pmdType === 'ACHIEVEMENT' ? 'bg-green-50 border-green-100' : pmdType === 'COACHING' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'} p-4 rounded border space-y-4`}>
                        <h3 className={`font-bold ${pmdType === 'ACHIEVEMENT' ? 'text-green-800 border-green-200' : pmdType === 'COACHING' ? 'text-blue-800 border-blue-200' : 'text-red-800 border-red-200'} border-b pb-2`}>
                            {pmdType === 'ACHIEVEMENT' ? '1. Áreas de Desempeño Destacado' : '1. Áreas de Desempeño Deficiente'}
                        </h3>
                        {deficiencies.map((def, idx) => (
                            <div key={def.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 bg-white rounded shadow-sm relative">
                                <input type="text" placeholder="Indicador/Conducta" className="border rounded p-1 text-sm" value={def.indicator} onChange={e => handleDeficiencyChange(def.id, 'indicator', e.target.value)} />
                                <input type="text" placeholder="Desempeño Actual" className="border rounded p-1 text-sm" value={def.current} onChange={e => handleDeficiencyChange(def.id, 'current', e.target.value)} />
                                <input type="text" placeholder="Meta Requerida" className="border rounded p-1 text-sm" value={def.goal} onChange={e => handleDeficiencyChange(def.id, 'goal', e.target.value)} />
                                {idx > 0 && <button onClick={() => handleRemoveDeficiency(def.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"><Trash2 size={12}>X</Trash2></button>}
                            </div>
                        ))}
                        <button onClick={handleAddDeficiency} className="text-xs font-bold text-bank-600 hover:underline">+ Agregar Renglón</button>

                        <h3 className="font-bold text-red-800 border-b border-red-200 pb-2 pt-4">2. Plan de Acción (Metas Manuales 30 Días)</h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Meta Cuantitativa</label>
                            <textarea className="w-full border rounded p-2 text-sm" rows={2} placeholder="Escribe la meta completa aquí..." value={quantGoal} onChange={e => setQuantGoal(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Meta de Actividad</label>
                            <textarea className="w-full border rounded p-2 text-sm" rows={2} placeholder="Escribe la meta completa aquí..." value={activityGoal} onChange={e => setActivityGoal(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Meta Cualitativa</label>
                            <textarea className="w-full border rounded p-2 text-sm" rows={2} placeholder="Escribe la meta completa aquí..." value={qualGoal} onChange={e => setQualGoal(e.target.value)} />
                        </div>

                        <h3 className="font-bold text-red-800 border-b border-red-200 pb-2 pt-4">3. Compromisos del Gerente</h3>
                        {managerCommitments.map((com, idx) => (
                            <div key={com.id} className="flex gap-2">
                                <input type="text" className="w-full border rounded p-1 text-sm" placeholder={`Compromiso ${idx + 1}`} value={com.text} onChange={e => handleCommitmentChange(com.id, e.target.value)} />
                                {idx > 0 && <button onClick={() => handleRemoveCommitment(com.id)} className="text-red-500 font-bold">X</button>}
                            </div>
                        ))}
                        <button onClick={handleAddCommitment} className="text-xs font-bold text-bank-600 hover:underline">+ Agregar Compromiso</button>
                    </div>

                    <button onClick={generateAgreement} className={`w-full ${pmdType === 'ACHIEVEMENT' ? 'bg-green-600 hover:bg-green-700' : pmdType === 'COACHING' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center transition-transform hover:-translate-y-1`}>
                        <Printer className="mr-2" /> Imprimir Formato Legal
                    </button>
                </div>
            ) : (
                <button onClick={generateAgreement} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center transition-transform hover:-translate-y-1 no-print">
                    <Share2 className="mr-2" /> Generar y Enviar por WhatsApp
                </button>
            )}

            {/* Print Layout - CLEAN & FIXED */}
            <div className="hidden print:block fixed inset-0 w-screen h-screen bg-white z-[9999] overflow-y-auto p-12 text-black leading-tight">
                <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Banco_Azteca_logo.svg/2560px-Banco_Azteca_logo.svg.png" className="h-10 object-contain filter grayscale" />
                    <div className="text-right">
                        <h1 className="text-lg font-bold uppercase">
                            {pmdType === 'ACHIEVEMENT' ? 'Reconocimiento de Desempeño' :
                                pmdType === 'COACHING' ? 'Minuta de Sesión de Coaching' :
                                    'Plan de Mejora del Desempeño (P.I.P.)'}
                        </h1>
                        <p className={`text-xs font-bold ${pmdType === 'ACHIEVEMENT' ? 'text-green-600' : pmdType === 'COACHING' ? 'text-blue-600' : 'text-red-600'}`}>CONFIDENCIAL</p>
                    </div>
                </div>

                <div className="mb-4 text-xs">
                    <h3 className="font-bold bg-gray-100 p-1 mb-1 uppercase text-xs">Datos Generales</h3>
                    <div className="grid grid-cols-1 gap-1">
                        <p><span className="font-bold w-32 inline-block">Colaborador:</span> <span className="border-b border-black inline-block w-[300px] pl-1 font-medium">{advisors.find(a => a.id === advisorId)?.name}</span></p>
                        <p><span className="font-bold w-32 inline-block">Puesto:</span> <span className="border-b border-black inline-block w-[300px] pl-1">{advisors.find(a => a.id === advisorId)?.position}</span></p>
                        <p><span className="font-bold w-32 inline-block">Gerente:</span> <span className="border-b border-black inline-block w-[300px] pl-1">{useData().branchConfig?.leaderName || 'Luis Emigdio Tirado Martinez'}</span></p>
                        <div className="flex gap-8 mt-1">
                            <p><span className="font-bold">Fecha Inicio:</span> <span className="border-b border-black px-2">{new Date().toLocaleDateString()}</span></p>
                            <p><span className="font-bold">Fecha Revisión:</span> <span className="border-b border-black px-2">{reviewDate ? new Date(reviewDate + 'T00:00:00').toLocaleDateString() : '____/____/____'}</span> (4 semanas)</p>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="font-bold bg-gray-100 p-1 mb-1 uppercase text-xs">1. Antecedentes y Justificación</h3>
                    <p className="text-[10px] mb-1 italic">Acciones previas de gestión sin éxito:</p>
                    <div className="border border-black p-2 min-h-[60px] text-[10px] space-y-0.5">
                        {supervisionLogs.filter(l => l.advisorId === advisorId && l.type === pmdType).length > 0 ? (
                            supervisionLogs.filter(l => l.advisorId === advisorId && l.type === pmdType).slice(0, 5).map(log => (
                                <div key={log.id}>
                                    <span className="font-bold">{new Date(log.date).toLocaleDateString()}</span> - {log.indicatorName}
                                </div>
                            ))) : (
                            <span className="text-gray-400 italic">Sin registros previos de este tipo ({pmdType}).</span>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="font-bold bg-gray-100 p-1 mb-1 uppercase text-xs">
                        {pmdType === 'ACHIEVEMENT' ? '2. Áreas de Desempeño Destacado' : '2. Áreas de Desempeño Deficiente'}
                    </h3>
                    <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border border-black p-1 text-left w-1/3">INDICADOR / CONDUCTA</th>
                                <th className="border border-black p-1 text-left w-1/3">DESEMPEÑO ACTUAL</th>
                                <th className="border border-black p-1 text-left w-1/3">META REQUERIDA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deficiencies.map((def, i) => (
                                <tr key={i}>
                                    <td className="border border-black p-1">{def.indicator}</td>
                                    <td className="border border-black p-1">{def.current}</td>
                                    <td className="border border-black p-1">{def.goal}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mb-4">
                    <h3 className="font-bold bg-gray-100 p-1 mb-1 uppercase text-xs">3. Plan de Acción (Objetivos a 30 Días)</h3>
                    <p className="text-[10px] mb-1">El colaborador se compromete a cumplir las siguientes metas innegociables:</p>
                    <div className="border border-black p-2 text-xs space-y-2">
                        <p><strong>Meta Cuantitativa:</strong> {quantGoal}</p>
                        <p><strong>Meta de Actividad:</strong> {activityGoal}</p>
                        <p><strong>Meta Cualitativa:</strong> {qualGoal}</p>
                    </div>

                    <h4 className="font-bold mt-2 text-[10px] mb-0.5 uppercase">Compromisos del Gerente (Soporte)</h4>
                    <div className="border border-black p-2 text-xs">
                        <ul className="list-disc pl-4 space-y-0.5">
                            {managerCommitments.map(c => (
                                <li key={c.id}>{c.text}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mb-8 border border-black p-2 text-[9px] text-justify bg-gray-50">
                    <strong>CLÁUSULA DE CONSECUENCIAS:</strong> El colaborador declara entender que este Plan de Mejora tiene como objetivo regularizar su desempeño. El incumplimiento de los objetivos establecidos al término del periodo de evaluación derivará en la aplicación de medidas disciplinarias progresivas, que pueden incluir el levantamiento de Actas Administrativas y/o la rescisión de la relación laboral, conforme a la Ley Federal del Trabajo y el Reglamento Interior de Trabajo.
                </div>

                <div className="grid grid-cols-2 gap-16 mt-8 text-center text-xs">
                    <div className="pt-2 border-t border-black">
                        <p className="font-bold">{advisors.find(a => a.id === advisorId)?.name}</p>
                        <p className="text-[9px] mt-0.5">FIRMA DEL COLABORADOR</p>
                    </div>
                    <div className="pt-2 border-t border-black">
                        <p className="font-bold uppercase">{useData().branchConfig?.leaderName || 'Luis Emigdio Tirado Martinez'}</p>
                        <p className="text-[9px] mt-0.5">FIRMA DEL GERENTE</p>
                    </div>
                </div>
                <p className="text-[8px] text-gray-400 mt-8 text-center">Documento Confidencial de Uso Interno.</p>
            </div>
        </div>
    );
};

// --- TAB 5: INCENTIVOS ---
const IncentivesTab = () => {
    const { advisors, records, indicators, branchConfig } = useData();
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();

    const [branchGoalMet, setBranchGoalMet] = useState(true);
    const [selectedCriteriaMode, setSelectedCriteriaMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
    const [manualIndicatorId, setManualIndicatorId] = useState('');

    const keyIndicators = useMemo(() => {
        if (branchConfig?.keyIndicatorIds && branchConfig.keyIndicatorIds.length > 0) {
            return branchConfig.keyIndicatorIds.map((id: string) => indicators.find(i => i.id === id)).filter(Boolean) as Indicator[];
        }
        return indicators.slice(0, 3);
    }, [branchConfig, indicators]);

    const getAutoCriteria = () => {
        if (keyIndicators.length === 0) return { title: 'MVP', icon: '🏆', id: 'MVP' };
        const index = currentWeek % (keyIndicators.length + 1);

        if (index === keyIndicators.length) return { title: 'El MVP (Mejor Cumplimiento Integral)', icon: '🏆', id: 'MVP' };

        const ind = keyIndicators[index];
        return { title: `Mayor ${ind.name}`, icon: '⭐', id: ind.id };
    };

    const criteria = selectedCriteriaMode === 'AUTO' ? getAutoCriteria() : {
        title: manualIndicatorId === 'MVP' ? 'El MVP' : indicators.find(i => i.id === manualIndicatorId)?.name || 'Manual',
        icon: '🎯',
        id: manualIndicatorId
    };

    const calculateLeader = (): { leader: Advisor; score: number } | null => {
        if (!criteria.id) return null;
        if (!branchGoalMet) return null;

        let leader: Advisor | null = null;
        let maxScore = -1;

        advisors.forEach(adv => {
            const advRecs = records.filter(r => r.year === currentYear && r.week === currentWeek && r.advisorId === adv.id);
            let score = 0;

            if (criteria.id === 'MVP') {
                score = advRecs.reduce((sum, r) => {
                    return sum + Object.values(r.values).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0);
                }, 0);
            } else {
                score = advRecs.reduce((sum, r) => sum + (r.values[criteria.id] || 0), 0);
            }

            if (score > maxScore) {
                maxScore = score;
                leader = adv;
            }
        });

        if (!leader) return null;
        return { leader, score: maxScore };
    };

    const result = calculateLeader();
    const leader = result?.leader;

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-2xl text-white relative overflow-hidden">

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6 w-full max-w-lg border border-white/20 no-print">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold uppercase">Configuración:</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Selección:</span>
                        <select className="bg-black/20 border border-white/20 rounded px-2 py-1 text-xs outline-none"
                            value={selectedCriteriaMode} onChange={e => setSelectedCriteriaMode(e.target.value as any)}>
                            <option value="AUTO">Automático (Rotativo)</option>
                            <option value="MANUAL">Manual</option>
                        </select>
                    </div>
                </div>

                {selectedCriteriaMode === 'MANUAL' && (
                    <select className="w-full bg-black/20 border border-white/20 rounded px-2 py-1 text-sm outline-none mb-3"
                        value={manualIndicatorId} onChange={e => setManualIndicatorId(e.target.value)}>
                        <option value="">-- Elegir Criterio Ganador --</option>
                        <option value="MVP">🏆 El MVP (Integral)</option>
                        {indicators.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                )}

                <div className="flex items-center gap-3 bg-black/20 p-2 rounded">
                    <div onClick={() => setBranchGoalMet(!branchGoalMet)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${branchGoalMet ? 'bg-green-400' : 'bg-red-400'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${branchGoalMet ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-xs font-bold">¿Sucursal Cumplió Metas Críticas? (Regla Llave)</span>
                </div>
            </div>

            <h2 className="text-3xl font-black uppercase tracking-widest mb-2">Colaborador MEGA</h2>
            <p className="opacity-80 mb-8">Premio: Un día de descanso adicional</p>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-lg text-center border border-white/20 relative z-10">
                <p className="text-sm font-bold uppercase tracking-wider mb-4 bg-black/20 inline-block px-3 py-1 rounded">Criterio de la Semana {currentWeek}</p>
                <div className="mb-6 text-5xl animate-bounce">{criteria.icon}</div>
                <h3 className="text-2xl font-bold mb-8">{criteria.title}</h3>

                {!branchGoalMet ? (
                    <div className="py-8 bg-red-500/20 rounded-xl border border-red-400/50">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-red-300" />
                        <h4 className="text-xl font-bold text-red-100">PREMIO DESIERTO</h4>
                        <p className="text-sm text-red-200 mt-2 px-4">La sucursal no cumplió sus metas críticas. Nadie gana el descanso esta semana.</p>
                    </div>
                ) : leader ? (
                    <div className="animate-fade-in-up">
                        <div className="w-32 h-32 rounded-full border-4 border-yellow-400 mx-auto mb-4 overflow-hidden bg-white shadow-xl relative">
                            {leader.photoUrl ? <img src={leader.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Briefcase size={40} /></div>}
                            <div className="absolute inset-0 border-4 border-yellow-400 rounded-full animate-pulse"></div>
                        </div>
                        <h1 className="text-4xl font-black text-yellow-300 mb-2 drop-shadow-md">{leader.name}</h1>
                        <p className="text-xl font-medium bg-white/20 inline-block px-4 py-1 rounded-full">{result?.score.toLocaleString()} Puntos</p>
                    </div>
                ) : (
                    <div className="py-8 text-white/50 italic">Esperando datos...</div>
                )}
            </div>

            <div className="mt-8 text-center text-xs opacity-60 max-w-md">
                * Regla Llave: Para que el premio sea válido, la SUCURSAL debe haber cumplido sus metas. Si la sucursal pierde, nadie gana.
            </div>
        </div>
    );
};