
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Position, SupervisionLog, CoachingSession, Advisor, Indicator } from '../types';
import { Camera, Clock, MessageCircle, FileText, CheckSquare, Plus, Trash2, Trophy, AlertTriangle, Briefcase, Share2, Printer } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'BOARD' | 'LOGBOOK' | 'COACHING' | 'INCENTIVES'>('BOARD');

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-bank-900 flex items-center">
                    <Briefcase className="mr-3 text-bank-600" /> Gestión Gerencial
                </h1>
                <p className="text-gray-500 mt-1">Manual de Gestión de Alto Rendimiento (Seguimiento, Supervisión, Acompañamiento)</p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0 overflow-x-auto w-full md:w-auto">
                <button onClick={() => setActiveTab('BOARD')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'BOARD' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Pizarra (Seguimiento)</button>
                <button onClick={() => setActiveTab('LOGBOOK')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'LOGBOOK' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Bitácora (Supervisión)</button>
                <button onClick={() => setActiveTab('COACHING')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'COACHING' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Acompañamiento</button>
                <button onClick={() => setActiveTab('INCENTIVES')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeTab === 'INCENTIVES' ? 'bg-bank-100 text-bank-700' : 'text-gray-500 hover:bg-gray-50'}`}>Incentivos</button>
            </div>
        </div>

        {activeTab === 'BOARD' && <BoardTab />}
        {activeTab === 'LOGBOOK' && <LogbookTab />}
        {activeTab === 'COACHING' && <CoachingTab />}
        {activeTab === 'INCENTIVES' && <IncentivesTab />}
    </div>
  );
};

// --- TAB 1: PIZARRA DE RENDIMIENTO (SEGUIMIENTO) ---
const BoardTab = () => {
    const { indicators, budgets, records, advisors } = useData();
    const [focusOfTheDay, setFocusOfTheDay] = useState('');
    
    // Calculate Current Metrics
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const currentDay = today.getDay();

    const getMetric = (indName: string, isBranch: boolean) => {
        const ind = indicators.find(i => i.name.toLowerCase().includes(indName.toLowerCase()));
        if (!ind) return { target: 0, actual: 0 };

        // Target (Daily if available, else Weekly)
        const relevantBudgets = budgets.filter(b => b.indicatorId === ind.id && b.targetId === 'BRANCH_GLOBAL' && b.year === currentYear && b.week === currentWeek);
        const dailyB = relevantBudgets.find(b => b.periodType === 'DAILY' && b.dayOfWeek === currentDay);
        const weeklyB = relevantBudgets.find(b => b.periodType === 'WEEKLY');
        
        let target = dailyB ? dailyB.amount : (weeklyB ? weeklyB.amount / 7 : 0);
        target = Math.ceil(target);

        // Actual (Today)
        const dailyRecs = records.filter(r => r.year === currentYear && r.week === currentWeek && r.frequency === 'DAILY' && r.dayOfWeek === currentDay && (isBranch ? r.type === 'Sucursal' : true));
        const actual = dailyRecs.reduce((sum, r) => sum + (r.values[ind.id] || 0), 0);

        return { target, actual: Math.ceil(actual) };
    };

    const cashMetric = getMetric('Efectivo', true);
    const newAccountsMetric = getMetric('Nuevos', true);
    const insuranceMetric = getMetric('Vidamax', true);

    const generateWhatsAppScript = (type: 'START' | 'CUT' | 'CLOSE') => {
        let text = '';
        if (type === 'START') {
            text = `*¡Buen día equipo! ☀️*\n\n> Meta del día Sucursal: *$${cashMetric.target.toLocaleString()}* en colocación y *${newAccountsMetric.target}* Cuentas Nuevas.\n> Foco: *${focusOfTheDay || 'Sin foco definido'}*.\n> ¡A darle con todo!`;
        } else if (type === 'CUT') {
            text = `*Corte de las 2 PM:*\n\n> LÍDERES: ¡Felicidades a los que ya están en meta!\n> EN LA PELEA: Ánimo, aprovechen la fila de la tarde.\n> ALERTA: Necesito enfoque total en *${focusOfTheDay || 'el cierre'}* las próximas 2 horas.\n> ¡Vamos por el cierre!`;
        } else {
            text = `*CIERRE (Al finalizar)*\n\n> Cerramos el día con *$${cashMetric.actual.toLocaleString()}*.\n> ${cashMetric.actual >= cashMetric.target ? '¡Excelente trabajo, meta cumplida! 🎉' : 'Nos faltó un poco para la meta.'}\n> Mañana ajustamos estrategia.\n> ¡Descansen!`;
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-slate-900 text-white p-4 text-center">
                    <h2 className="text-2xl font-bold tracking-wider">PIZARRA DE RENDIMIENTO</h2>
                    <p className="text-sm text-gray-400">Sucursal Mega Salvatierra</p>
                </div>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-center mb-6 uppercase tracking-widest text-bank-700 border-b pb-2">Metas de Sucursal (Hoy)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <MetricCard label="EFECTIVO TOTAL" value={cashMetric.actual} target={cashMetric.target} unit="$" color="text-yellow-600" />
                        <MetricCard label="CUENTAS NUEVAS" value={newAccountsMetric.actual} target={newAccountsMetric.target} unit="#" color="text-blue-600" />
                        <MetricCard label="VIDAMAX" value={insuranceMetric.actual} target={insuranceMetric.target} unit="$" color="text-purple-600" />
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
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><MessageCircle className="mr-2 text-green-500"/> Estrategia de Comunicación (WhatsApp)</h3>
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
    return (
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs font-bold text-gray-500 mb-1">{label}</span>
            <div className="flex items-end gap-2">
                <span className={`text-2xl font-black ${color}`}>{unit === '$' ? `$${value.toLocaleString()}` : value}</span>
                <span className="text-sm text-gray-400 mb-1">/ {unit === '$' ? `$${target.toLocaleString()}` : target}</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
                <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
            </div>
        </div>
    );
};

// --- TAB 2: BITÁCORA DE SUPERVISIÓN ---
const LogbookTab = () => {
    const { advisors, supervisionLogs, addSupervisionLog, deleteSupervisionLog } = useData();
    const [form, setForm] = useState<Partial<SupervisionLog>>({ type: 'FAILURE' });
    const [filter, setFilter] = useState('ALL');

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await convertToBase64(e.target.files[0]);
            setForm({ ...form, photoUrl: base64 });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.advisorId && form.details) {
            addSupervisionLog({
                ...form,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString()
            } as SupervisionLog);
            setForm({ type: 'FAILURE', photoUrl: undefined, details: '', indicatorName: '' });
            alert('Hallazgo registrado');
        }
    };

    const filteredLogs = supervisionLogs.filter(l => filter === 'ALL' || l.advisorId === filter).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Camera className="mr-2 text-bank-600"/> Registrar Hallazgo</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Colaborador</label>
                            <select className="w-full border rounded p-2" value={form.advisorId || ''} onChange={e => setForm({...form, advisorId: e.target.value})} required>
                                <option value="">-- Seleccionar --</option>
                                {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Registro</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setForm({...form, type: 'FAILURE'})} className={`flex-1 py-2 rounded text-xs font-bold ${form.type === 'FAILURE' ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : 'bg-gray-100 text-gray-600'}`}>Falla / Error</button>
                                <button type="button" onClick={() => setForm({...form, type: 'COACHING'})} className={`flex-1 py-2 rounded text-xs font-bold ${form.type === 'COACHING' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-gray-100 text-gray-600'}`}>Coaching</button>
                                <button type="button" onClick={() => setForm({...form, type: 'ACHIEVEMENT'})} className={`flex-1 py-2 rounded text-xs font-bold ${form.type === 'ACHIEVEMENT' ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-gray-100 text-gray-600'}`}>Logro</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Indicador / Conducta Afectada</label>
                            <input type="text" placeholder="Ej. Uniforme, Efectivo, Saludo" className="w-full border rounded p-2" value={form.indicatorName || ''} onChange={e => setForm({...form, indicatorName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Detalle (Hechos y Acciones)</label>
                            <textarea rows={3} placeholder="¿Qué pasó? ¿Qué hiciste tú?" className="w-full border rounded p-2" value={form.details || ''} onChange={e => setForm({...form, details: e.target.value})} required></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Evidencia (Foto)</label>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-bank-50 file:text-bank-700 hover:file:bg-bank-100"/>
                        </div>
                        <button type="submit" className="w-full bg-bank-600 hover:bg-bank-700 text-white font-bold py-2 rounded-lg transition-colors">Guardar en Bitácora</button>
                    </form>
                </div>
            </div>
            
            <div className="md:col-span-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Historial de Supervisión</h3>
                        <select className="text-xs border rounded p-1" value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="ALL">Todos</option>
                            {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div className="divide-y max-h-[600px] overflow-y-auto">
                        {filteredLogs.map(log => {
                            const adv = advisors.find(a => a.id === log.advisorId);
                            return (
                                <div key={log.id} className="p-4 hover:bg-gray-50 flex gap-4">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden border border-gray-300">
                                        {log.photoUrl ? <img src={log.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Camera size={20}/></div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900">{adv?.name}</h4>
                                            <button onClick={() => {if(confirm('¿Eliminar?')) deleteSupervisionLog(log.id)}} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${log.type === 'FAILURE' ? 'bg-red-100 text-red-700' : log.type === 'ACHIEVEMENT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {log.type === 'FAILURE' ? 'Falla' : log.type === 'ACHIEVEMENT' ? 'Logro' : 'Coaching'}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded">{log.indicatorName}</span>
                                            <span className="text-xs text-gray-400 ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{log.details}</p>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredLogs.length === 0 && <div className="p-8 text-center text-gray-400 italic">No hay registros</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TAB 3: ACOMPAÑAMIENTO (NIVEL 2 & 3) ---
const CoachingTab = () => {
    const { advisors } = useData();
    const [level, setLevel] = useState<'LEVEL_2' | 'LEVEL_3'>('LEVEL_2');
    const [advisorId, setAdvisorId] = useState('');
    const [indicator, setIndicator] = useState('');
    const [problem, setProblem] = useState('');
    const [action1, setAction1] = useState('');
    const [action2, setAction2] = useState('');
    const [support, setSupport] = useState('');
    const [reviewDate, setReviewDate] = useState('');

    const generateAgreement = () => {
        const adv = advisors.find(a => a.id === advisorId);
        if (!adv) return alert('Seleccione asesor');

        if (level === 'LEVEL_2') {
            const text = `📝 *MINUTA DE ACUERDOS Y COMPROMISOS*\n\nColaborador: *${adv.name}*\nFecha: *${new Date().toLocaleDateString()}*\n\n🛑 *EL HALLAZGO (Problema):*\nSe detecta un bajo desempeño/incumplimiento en: *${indicator}*.\n\n✅ *TU COMPROMISO (Acciones):*\n1. ${action1}\n2. ${action2}\n\n🤝 *MI COMPROMISO (Soporte):*\n${support}\n\n⚠️ *IMPORTANTE:*\nEl objetivo es regularizar esto antes del: *${reviewDate}*.\n\nFavor de confirmar de enterado. 👇`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        } else {
            // Level 3 Print Logic would go here (simplified for this view)
            window.print();
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Generador de Acuerdos</h2>
                <div className="flex justify-center gap-4 mt-4">
                    <button onClick={() => setLevel('LEVEL_2')} className={`px-6 py-2 rounded-full font-bold transition-all ${level === 'LEVEL_2' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'bg-gray-100 text-gray-500'}`}>Nivel 2: Minuta WhatsApp</button>
                    <button onClick={() => setLevel('LEVEL_3')} className={`px-6 py-2 rounded-full font-bold transition-all ${level === 'LEVEL_3' ? 'bg-red-100 text-red-700 ring-2 ring-red-300' : 'bg-gray-100 text-gray-500'}`}>Nivel 3: PMD Formal (Impreso)</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Colaborador</label>
                    <select className="w-full border rounded p-2" value={advisorId} onChange={e => setAdvisorId(e.target.value)}>
                        <option value="">-- Seleccionar --</option>
                        {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{level === 'LEVEL_2' ? 'Fecha de Revisión' : 'Fecha Inicio PMD'}</label>
                    <input type="date" className="w-full border rounded p-2" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
                </div>
            </div>

            <div className="space-y-4 mb-8">
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

            {level === 'LEVEL_2' ? (
                <button onClick={generateAgreement} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center transition-transform hover:-translate-y-1">
                    <Share2 className="mr-2" /> Generar y Enviar por WhatsApp
                </button>
            ) : (
                <div className="bg-red-50 border border-red-200 p-4 rounded text-center">
                    <p className="text-red-800 font-bold mb-2">Formato Legal PMD</p>
                    <p className="text-sm text-red-600 mb-4">Este documento debe imprimirse y firmarse. Al dar clic se abrirá la vista de impresión.</p>
                    <button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded flex items-center justify-center mx-auto">
                        <Printer className="mr-2" /> Imprimir Formato
                    </button>
                    {/* Printable area would be hidden by CSS normally, simplified here */}
                    <div className="hidden print:block text-left mt-8 p-8 border border-black text-black">
                        <h1 className="text-2xl font-bold text-center mb-8">PLAN DE MEJORA DEL DESEMPEÑO (P.I.P.)</h1>
                        <p><strong>Colaborador:</strong> {advisors.find(a=>a.id===advisorId)?.name}</p>
                        <p><strong>Fecha Inicio:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Fecha Revisión:</strong> {reviewDate}</p>
                        <hr className="my-4 border-black"/>
                        <h3 className="font-bold mt-4">1. ANTECEDENTES</h3>
                        <p>{problem}</p>
                        <h3 className="font-bold mt-4">2. PLAN DE ACCIÓN (30 DÍAS)</h3>
                        <ul className="list-disc ml-5">
                            <li>{action1}</li>
                            <li>{action2}</li>
                        </ul>
                        <h3 className="font-bold mt-4">3. SOPORTE GERENCIAL</h3>
                        <p>{support}</p>
                        <h3 className="font-bold mt-4">4. FIRMAS</h3>
                        <div className="flex justify-between mt-16">
                            <div className="border-t border-black w-1/3 text-center pt-2">Colaborador</div>
                            <div className="border-t border-black w-1/3 text-center pt-2">Gerente</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- TAB 4: INCENTIVOS (COLABORADOR MEGA) ---
const IncentivesTab = () => {
    const { advisors, records, indicators } = useData();
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();

    // Rotate criteria based on week number
    // Week 1: Cash, Week 2: New Accounts, Week 3: Insurance, Week 0 (4): MVP
    const criteriaIndex = currentWeek % 4; 
    let criteriaTitle = '';
    let criteriaIcon = null;
    let relevantIndicatorId = '';

    if (criteriaIndex === 1) {
        criteriaTitle = 'Mayor Monto de Efectivo';
        criteriaIcon = <span className="text-4xl">💰</span>;
        relevantIndicatorId = indicators.find(i => i.name.toLowerCase().includes('efectivo') && !i.name.toLowerCase().includes('app'))?.id || '';
    } else if (criteriaIndex === 2) {
        criteriaTitle = 'Mayor Número de Cuentas Nuevas';
        criteriaIcon = <span className="text-4xl">💳</span>;
        relevantIndicatorId = indicators.find(i => i.name.toLowerCase().includes('nuevos'))?.id || '';
    } else if (criteriaIndex === 3) {
        criteriaTitle = 'Mayor Número de Seguros Vidamax';
        criteriaIcon = <span className="text-4xl">🛡️</span>;
        relevantIndicatorId = indicators.find(i => i.name.toLowerCase().includes('vidamax'))?.id || '';
    } else {
        criteriaTitle = 'El MVP (Mejor Cumplimiento Integral)';
        criteriaIcon = <span className="text-4xl">🏆</span>;
        relevantIndicatorId = 'MVP';
    }

    const calculateLeader = (): { leader: Advisor; score: number } | null => {
        if (!relevantIndicatorId) return null;
        
        let leader: Advisor | null = null;
        let maxScore = -1;

        advisors.forEach(adv => {
            const advRecs = records.filter(r => r.year === currentYear && r.week === currentWeek && r.advisorId === adv.id);
            
            let score = 0;
            if (relevantIndicatorId === 'MVP') {
                // Simplified MVP logic: Sum of % compliance across all indicators
                // In real app, reuse Dashboard logic
                score = Math.random() * 100; // Placeholder for complexity, user needs to implement full calculation or import
            } else {
                score = advRecs.reduce((sum, r) => sum + (r.values[relevantIndicatorId] || 0), 0);
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
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-2xl text-white">
            <h2 className="text-3xl font-black uppercase tracking-widest mb-2">Colaborador MEGA</h2>
            <p className="opacity-80 mb-8">Premio: Un día de descanso adicional</p>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-lg text-center border border-white/20">
                <p className="text-sm font-bold uppercase tracking-wider mb-4 bg-black/20 inline-block px-3 py-1 rounded">Criterio de la Semana {currentWeek}</p>
                <div className="mb-6">{criteriaIcon}</div>
                <h3 className="text-2xl font-bold mb-8">{criteriaTitle}</h3>

                {leader ? (
                    <div className="animate-fade-in-up">
                        <div className="w-24 h-24 rounded-full border-4 border-yellow-400 mx-auto mb-4 overflow-hidden bg-white">
                            {leader.photoUrl ? <img src={leader.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Briefcase/></div>}
                        </div>
                        <h1 className="text-4xl font-black text-yellow-300 mb-2">{leader.name}</h1>
                        <p className="text-xl font-medium">Resultado: {result?.score.toLocaleString()}</p>
                    </div>
                ) : (
                    <div className="py-8 text-white/50 italic">Esperando datos de la semana...</div>
                )}
            </div>
            
            <div className="mt-8 text-center text-xs opacity-60 max-w-md">
                * Regla Llave: Para que el premio sea válido, la SUCURSAL debe haber cumplido sus metas críticas (Efectivo y Cuentas) esta semana.
            </div>
        </div>
    );
};