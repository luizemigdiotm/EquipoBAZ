
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Advisor, RRHHEvent, RRHHEventType } from '../types';
import { Calendar, Cake, Award, HeartHandshake, Plus, X, Trash2, CheckCircle, Clock, AlertCircle, Edit2, RotateCcw } from 'lucide-react';

const EVENT_LABELS: Record<RRHHEventType, string> = {
  VACATION: 'Vacaciones',
  PERMIT: 'Permiso',
  INCAPACITY: 'Incapacidad',
  ABSENCE: 'Falta',
  DAY_OFF: 'Día de Descanso',
  RECOGNITION: 'Reconocimiento',
  ACTIVITY: 'Actividad / Reunión'
};

const DAYS_OF_WEEK = [
    { val: 1, label: 'Lunes' },
    { val: 2, label: 'Martes' },
    { val: 3, label: 'Miércoles' },
    { val: 4, label: 'Jueves' },
    { val: 5, label: 'Viernes' },
    { val: 6, label: 'Sábado' },
    { val: 0, label: 'Domingo' },
];

// HELPER: Fix Timezone issue. Creates a Date object in LOCAL time from YYYY-MM-DD string.
const parseLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Split YYYY-MM-DD
    const [y, m, d] = dateStr.split('-').map(Number);
    // Create Date (Month is 0-indexed in JS Date constructor)
    return new Date(y, m - 1, d);
};

export const RRHH = () => {
  const { advisors, rrhhEvents, addRRHHEvent, updateRRHHEvent, deleteRRHHEvent } = useData();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'INCIDENTS'>('DASHBOARD');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
           <h1 className="text-3xl font-bold text-bank-900 flex items-center">
             <HeartHandshake className="mr-3 text-pink-500" /> Recursos Humanos
           </h1>
           <p className="text-gray-500 mt-1">Gestión de personal, incidencias y reconocimientos.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('DASHBOARD')} 
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'DASHBOARD' ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Tablero
            </button>
            <button 
                onClick={() => setActiveTab('INCIDENTS')} 
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'INCIDENTS' ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Gestión de Incidencias
            </button>
        </div>
      </div>

      {activeTab === 'DASHBOARD' && <RRHHDashboard advisors={advisors} events={rrhhEvents} />}
      {activeTab === 'INCIDENTS' && <IncidentsManager advisors={advisors} events={rrhhEvents} onAdd={addRRHHEvent} onUpdate={updateRRHHEvent} onDelete={deleteRRHHEvent} />}
    </div>
  );
};

const RRHHDashboard = ({ advisors, events }: { advisors: Advisor[], events: RRHHEvent[] }) => {
    const today = new Date();
    
    // BIRTHDAYS & ANNIVERSARIES
    const celebrations = useMemo(() => {
        const currentMonth = today.getMonth();
        return advisors.filter(adv => {
            const bday = adv.birthDate ? parseLocal(adv.birthDate) : null;
            const hire = adv.hireDate ? parseLocal(adv.hireDate) : null;
            
            const isBday = bday ? bday.getMonth() === currentMonth : false;
            const isAnniv = hire ? hire.getMonth() === currentMonth : false;
            return isBday || isAnniv;
        }).map(adv => {
             const bday = adv.birthDate ? parseLocal(adv.birthDate) : null;
             const hire = adv.hireDate ? parseLocal(adv.hireDate) : null;
             return {
                 ...adv,
                 isBirthday: bday ? bday.getMonth() === currentMonth : false,
                 isAnniversary: hire ? hire.getMonth() === currentMonth : false,
                 years: hire ? today.getFullYear() - hire.getFullYear() : 0,
                 day: bday && bday.getMonth() === currentMonth ? bday.getDate() : (hire ? hire.getDate() : 0)
             };
        }).sort((a, b) => a.day - b.day);
    }, [advisors]);

    // ACTIVE INCIDENTS (Today)
    const activeIncidents = useMemo(() => {
        return events.filter(evt => {
            // RECURRING DAY_OFF LOGIC
            if (evt.type === 'DAY_OFF') {
                const todayDayIndex = new Date().getDay();
                return evt.recurringDay === todayDayIndex;
            }

            // STANDARD DATE RANGE LOGIC
            const start = parseLocal(evt.startDate);
            const end = parseLocal(evt.endDate);
            // Reset times
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            const now = new Date();
            return now >= start && now <= end && evt.type !== 'RECOGNITION';
        });
    }, [events]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* LEFT COL: STATUS */}
            <div className="md:col-span-8 space-y-6">
                
                {/* ACTIVE ABSENCES CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                     <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                         <Clock className="mr-2 text-orange-500" /> Ausencias Hoy
                     </h3>
                     {activeIncidents.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {activeIncidents.map(evt => {
                                 const adv = advisors.find(a => a.id === evt.advisorId);
                                 return (
                                     <div key={evt.id} className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-center justify-between">
                                         <div>
                                            <p className="font-bold text-gray-800">{adv?.name}</p>
                                            <span className="text-xs px-2 py-0.5 bg-white rounded-full border border-orange-200 text-orange-700 font-bold uppercase">{EVENT_LABELS[evt.type]}</span>
                                         </div>
                                         <p className="text-xs text-gray-500">
                                             {evt.type === 'DAY_OFF' 
                                                ? 'Descanso Programado' 
                                                : parseLocal(evt.endDate).toLocaleDateString()
                                             }
                                         </p>
                                     </div>
                                 )
                             })}
                         </div>
                     ) : (
                         <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                             <CheckCircle className="mx-auto text-green-400 mb-2 h-8 w-8" />
                             <p className="text-gray-500 font-medium">Todo el personal activo</p>
                         </div>
                     )}
                </div>

                {/* ACTIVITY TIMELINE (Simple List for this month) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Calendar className="mr-2 text-blue-500" /> Cronograma (Este Mes)
                    </h3>
                    <div className="space-y-3">
                         {events
                            .filter(e => {
                                // Include recurring events in timeline roughly
                                if (e.type === 'DAY_OFF') return false; 
                                const d = parseLocal(e.startDate);
                                return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && e.type !== 'RECOGNITION';
                            })
                            .sort((a,b) => parseLocal(a.startDate).getTime() - parseLocal(b.startDate).getTime())
                            .map(evt => {
                                const adv = advisors.find(a => a.id === evt.advisorId);
                                const dateObj = parseLocal(evt.startDate);
                                return (
                                    <div key={evt.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                                        <div className="w-12 text-center mr-4">
                                            <span className="block text-xs font-bold text-gray-400 uppercase">{dateObj.toLocaleString('es-ES', { month: 'short' })}</span>
                                            <span className="block text-xl font-bold text-blue-600">{dateObj.getDate()}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800">{adv?.name || 'Global'}</h4>
                                            <p className="text-sm text-gray-500">{evt.title}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                                            evt.type === 'VACATION' ? 'bg-green-100 text-green-700' : 
                                            evt.type === 'INCAPACITY' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {EVENT_LABELS[evt.type]}
                                        </span>
                                    </div>
                                )
                            })
                         }
                         {events.filter(e => e.type !== 'DAY_OFF' && parseLocal(e.startDate).getMonth() === today.getMonth()).length === 0 && (
                             <p className="text-center text-gray-400 italic py-4">Sin actividades programadas este mes.</p>
                         )}
                    </div>
                </div>

            </div>

            {/* RIGHT COL: CELEBRATIONS */}
            <div className="md:col-span-4 space-y-6">
                <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg p-6 text-white">
                    <h3 className="text-lg font-bold mb-4 flex items-center">
                        <Cake className="mr-2" /> Celebraciones
                    </h3>
                    <div className="space-y-4">
                        {celebrations.length > 0 ? celebrations.map(c => (
                            <div key={c.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white text-pink-600 flex items-center justify-center font-bold">
                                    {c.day}
                                </div>
                                <div>
                                    <p className="font-bold">{c.name}</p>
                                    <p className="text-xs text-pink-100">
                                        {c.isBirthday && `🎂 Cumpleaños`}
                                        {c.isBirthday && c.isAnniversary && ' • '}
                                        {c.isAnniversary && `🏆 ${c.years} Aniversario`}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-pink-100 italic text-center">Sin celebraciones este mes.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                     <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                         <Award className="mr-2 text-yellow-500" /> Reconocimientos
                     </h3>
                     <div className="space-y-4">
                         {events.filter(e => e.type === 'RECOGNITION').slice(0, 3).map(evt => {
                             const adv = advisors.find(a => a.id === evt.advisorId);
                             return (
                                 <div key={evt.id} className="border-l-4 border-yellow-400 pl-4 py-1">
                                     <p className="font-bold text-gray-800">{adv?.name}</p>
                                     <p className="text-sm text-gray-600 italic">"{evt.description}"</p>
                                     <p className="text-[10px] text-gray-400 mt-1">{parseLocal(evt.startDate).toLocaleDateString()}</p>
                                 </div>
                             )
                         })}
                     </div>
                </div>
            </div>
        </div>
    );
};

const IncidentsManager = ({ advisors, events, onAdd, onUpdate, onDelete }: { advisors: Advisor[], events: RRHHEvent[], onAdd: any, onUpdate: any, onDelete: any }) => {
    const [form, setForm] = useState<Partial<RRHHEvent>>({ type: 'VACATION', status: 'APPROVED' });
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const types: RRHHEventType[] = ['VACATION', 'PERMIT', 'INCAPACITY', 'ABSENCE', 'DAY_OFF', 'RECOGNITION', 'ACTIVITY'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation for standard types
        if (form.type !== 'DAY_OFF' && (!form.startDate)) {
            alert('Fecha de inicio requerida'); return;
        }
        
        // Validation for DAY_OFF
        if (form.type === 'DAY_OFF' && form.recurringDay === undefined) {
             alert('Seleccione un día de la semana'); return;
        }

        if (form.type && (form.advisorId || form.type === 'ACTIVITY')) {
            const payload = {
                ...form,
                id: editingId || crypto.randomUUID(),
                title: form.title || EVENT_LABELS[form.type], 
                // If recurring, dates are placeholders/metadata
                startDate: form.startDate || new Date().toISOString().split('T')[0],
                endDate: form.endDate || form.startDate || new Date().toISOString().split('T')[0]
            };

            if (editingId) {
                onUpdate(payload);
                alert('Incidencia actualizada');
                setEditingId(null);
            } else {
                onAdd(payload);
                alert('Incidencia registrada');
            }
            
            setForm({ type: 'VACATION', status: 'APPROVED', advisorId: '', startDate: '', endDate: '', title: '', description: '', recurringDay: undefined });
        } else {
            alert('Complete los campos obligatorios');
        }
    };

    const handleEdit = (evt: RRHHEvent) => {
        setForm(evt);
        setEditingId(evt.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">
                            {editingId ? 'Editar Evento' : 'Nueva Incidencia / Evento'}
                        </h3>
                        {editingId && (
                            <button onClick={() => { setEditingId(null); setForm({ type: 'VACATION', status: 'APPROVED' }); }} className="text-xs text-red-500 hover:underline">
                                Cancelar
                            </button>
                        )}
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Evento</label>
                            <select className="w-full border rounded p-2" value={form.type} onChange={e => setForm({...form, type: e.target.value as RRHHEventType})}>
                                {types.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
                            </select>
                        </div>
                        {form.type !== 'ACTIVITY' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Colaborador</label>
                                <select className="w-full border rounded p-2" value={form.advisorId || ''} onChange={e => setForm({...form, advisorId: e.target.value})}>
                                    <option value="">-- Seleccionar --</option>
                                    {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Título / Motivo</label>
                            <input type="text" className="w-full border rounded p-2" placeholder="ej. Vacaciones de Verano" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} required />
                        </div>

                        {/* CONDITIONAL INPUTS BASED ON TYPE */}
                        {form.type === 'DAY_OFF' ? (
                             <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Día Recurrente de Descanso</label>
                                <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-2">
                                    <p className="text-[10px] text-blue-700">Se aplicará a todas las semanas hasta que se edite.</p>
                                </div>
                                <select className="w-full border rounded p-2" value={form.recurringDay !== undefined ? form.recurringDay : ''} onChange={e => setForm({...form, recurringDay: Number(e.target.value)})}>
                                    <option value="">-- Seleccionar Día --</option>
                                    {DAYS_OF_WEEK.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                                </select>
                             </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Desde</label>
                                    <input type="date" className="w-full border rounded p-2" value={form.startDate || ''} onChange={e => setForm({...form, startDate: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Hasta</label>
                                    <input type="date" className="w-full border rounded p-2" value={form.endDate || ''} onChange={e => setForm({...form, endDate: e.target.value})} />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Descripción (Opcional)</label>
                            <textarea className="w-full border rounded p-2 text-sm" rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}></textarea>
                        </div>
                        <button type="submit" className={`w-full text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-bank-600 hover:bg-bank-700'}`}>
                            {editingId ? <><Edit2 size={18} className="mr-2"/> Actualizar</> : <><Plus size={18} className="mr-2"/> Registrar</>}
                        </button>
                    </form>
                </div>
            </div>

            <div className="md:col-span-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Historial de Incidencias</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold">
                                <tr>
                                    <th className="p-3">Fecha / Frecuencia</th>
                                    <th className="p-3">Colaborador</th>
                                    <th className="p-3">Tipo</th>
                                    <th className="p-3">Detalle</th>
                                    <th className="p-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {events.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(evt => {
                                    const adv = advisors.find(a => a.id === evt.advisorId);
                                    const startDateObj = parseLocal(evt.startDate);
                                    const endDateObj = parseLocal(evt.endDate);
                                    
                                    return (
                                        <tr key={evt.id} className="hover:bg-gray-50">
                                            <td className="p-3 whitespace-nowrap text-gray-600">
                                                {evt.type === 'DAY_OFF' 
                                                    ? <span className="flex items-center gap-1 text-blue-600 font-bold"><RotateCcw size={12}/> Todos los {DAYS_OF_WEEK.find(d=>d.val === evt.recurringDay)?.label}</span>
                                                    : <span>{startDateObj.toLocaleDateString()} {evt.startDate !== evt.endDate && ` - ${endDateObj.toLocaleDateString()}`}</span>
                                                }
                                            </td>
                                            <td className="p-3 font-medium">{adv?.name || 'Global'}</td>
                                            <td className="p-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">{EVENT_LABELS[evt.type]}</span></td>
                                            <td className="p-3 text-gray-500 max-w-xs truncate" title={evt.description}>{evt.title}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(evt)} className="text-blue-500 hover:text-blue-700 p-1"><Edit2 size={16}/></button>
                                                    <button onClick={() => { if(confirm('Eliminar?')) onDelete(evt.id) }} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {events.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sin registros</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
