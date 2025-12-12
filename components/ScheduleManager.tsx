import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Settings, Calendar, Layout, ListChecks, Plus, Trash2, Save, Clock, Check, User as UserIcon, Eraser, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleAssignment, Position, Advisor } from '../types';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const generateTimeSlots = (start: string, end: string) => {
    const slots = [];
    let current = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);

    while (current <= endTime) {
        if (current >= endTime) break;
        const timeString = current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        slots.push(timeString);
        current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
};

const add30Minutes = (time: string) => {
    const d = new Date(`2000-01-01T${time}`);
    d.setMinutes(d.getMinutes() + 30);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const getContrastColor = (hexcolor: string) => {
    // If invalid or empty, return white
    if (!hexcolor || hexcolor.length < 7) return '#ffffff';
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
};

const ScheduleManager = () => {
    const {
        advisors,
        updateAdvisor,
        scheduleActivities,
        addScheduleActivity,
        deleteScheduleActivity,
        scheduleAssignments,
        saveScheduleAssignments,
        deleteScheduleAssignment,
        branchScheduleConfig,
        updateBranchScheduleConfig,
        fenixCompliances,
        toggleFenixCompliance,
        rrhhEvents
    } = useData();

    const [activeTab, setActiveTab] = useState<'CONFIG' | 'EDITOR' | 'VIEW' | 'FENIX'>('CONFIG');

    // --- CONFIG TAB STATES ---
    const [newActivityName, setNewActivityName] = useState('');
    const [newActivityShortName, setNewActivityShortName] = useState('');
    const [newActivityColor, setNewActivityColor] = useState('#EF4444');
    const [newActivityProtected, setNewActivityProtected] = useState(false);

    // Initial Daily Config State (Derived from branchConfig or Defaults)
    const [dailyConfig, setDailyConfig] = useState<any[]>([]);

    const PRESET_COLORS = [
        '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#6366F1', '#A855F7', '#D946EF', '#1F2937', '#000000',
    ];
    const [openTime, setOpenTime] = useState(branchScheduleConfig?.openTime || '08:30');
    const [closeTime, setCloseTime] = useState(branchScheduleConfig?.closeTime || '21:00');

    // --- EDITOR TAB STATES ---
    const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [isEraserMode, setIsEraserMode] = useState(false);
    const [editorDayIndex, setEditorDayIndex] = useState(0); // 0 = Lunes

    // --- FENIX TAB STATES ---
    const [fenixDate, setFenixDate] = useState(new Date().toISOString().split('T')[0]);
    const [fenixViewMode, setFenixViewMode] = useState<'CHECKLIST' | 'REPORT' | 'METRICS'>('CHECKLIST');

    // --- VIEW TAB STATES ---
    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);

    // Sync state
    useEffect(() => {
        if (branchScheduleConfig) {
            setOpenTime(branchScheduleConfig.openTime);
            setCloseTime(branchScheduleConfig.closeTime);
            // Initialize Daily Config if present, otherwise default
            if (branchScheduleConfig.days && branchScheduleConfig.days.length > 0) {
                setDailyConfig(branchScheduleConfig.days);
            } else {
                setDailyConfig(DAYS.map((_, i) => ({
                    dayOfWeek: i + 1,
                    openTime: branchScheduleConfig.openTime || '08:30',
                    closeTime: branchScheduleConfig.closeTime || '21:00',
                    isOpen: true
                })));
            }
        } else {
            // No config at all exists
            setDailyConfig(DAYS.map((_, i) => ({
                dayOfWeek: i + 1,
                openTime: '08:30',
                closeTime: '21:00',
                isOpen: true
            })));
        }
    }, [branchScheduleConfig]);

    const handleAddActivity = async () => {
        if (!newActivityName.trim()) return;
        try {
            await addScheduleActivity({
                id: '',
                name: newActivityName,
                // shortName removed
                color: newActivityColor,
                isProtected: newActivityProtected
            });
            setNewActivityName('');
            setNewActivityName('');
            // setNewActivityShortName('');
            setNewActivityColor('#EF4444');
            setNewActivityProtected(false);
            alert('Actividad creada exitosamente.');
        } catch (error: any) {
            console.error('Error creating activity:', error);
            alert(`Error al crear actividad: ${error.message || JSON.stringify(error)}`);
        }
    };

    const handleSaveConfig = async () => {
        // Calculate global min/max based on ACTIVE days
        let minOpen = '23:59';
        let maxClose = '00:00';
        let hasOpenDays = false;

        dailyConfig.forEach(d => {
            if (d.isOpen) {
                hasOpenDays = true;
                if (d.openTime < minOpen) minOpen = d.openTime;
                if (d.closeTime > maxClose) maxClose = d.closeTime;
            }
        });

        if (!hasOpenDays || minOpen === '23:59') minOpen = '09:00'; // Default fallback
        if (!hasOpenDays || maxClose === '00:00') maxClose = '18:00'; // Default fallback

        setOpenTime(minOpen);
        setCloseTime(maxClose);

        await updateBranchScheduleConfig({
            id: branchScheduleConfig?.id,
            openTime: minOpen,
            closeTime: maxClose,
            days: dailyConfig
        });
        alert('Configuración y Horarios guardados correctamente.');
    };

    // Helper to get Week Number (ISO 8601ish)
    const getWeekNumber = (d: Date) => {
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const handleAssignSlot = (dayIndex: number, time: string, advisorId?: string) => {
        const targetAdvisorId = advisorId || selectedAdvisorId;
        if (!targetAdvisorId) return;
        const dayOfWeek = dayIndex + 1;

        console.log(`[handleAssignSlot] Click detected. DayIndex: ${dayIndex}, DayOfWeek: ${dayOfWeek}, Time: ${time}`);

        // Find existing
        const existing = scheduleAssignments.find(a =>
            a.advisorId === targetAdvisorId &&
            a.dayOfWeek === dayOfWeek &&
            a.startTime === time
        );

        if (isEraserMode) {
            if (existing) {
                console.log('Deleting assignment:', existing.id);
                deleteScheduleAssignment(existing.id);
            }
            return;
        }

        if (!selectedActivityId) return;

        // Prevent duplicates or ensure update
        if (existing && existing.activityId === selectedActivityId) return;

        const newAssign: ScheduleAssignment = {
            id: existing?.id || crypto.randomUUID(),
            advisorId: targetAdvisorId,
            dayOfWeek,
            startTime: time,
            endTime: add30Minutes(time),
            activityId: selectedActivityId
        };
        console.log('Saving new assignment:', newAssign);
        saveScheduleAssignments([newAssign]);
    };

    const updateDayConfig = (index: number, field: string, value: any) => {
        const newDays = [...dailyConfig];
        newDays[index] = { ...newDays[index], [field]: value };
        setDailyConfig(newDays);
    };

    const renderConfigTab = () => (
        <div className="no-print max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: Activity Management */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 border-l-4 border-orange-500 pl-3">
                        <h3 className="font-bold text-gray-800 text-xl">Gestión de Actividades</h3>
                    </div>

                    {/* Creation Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Nombre Actividad</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition-all placeholder-gray-300 font-bold text-gray-700"
                                    placeholder="EJ: COMIDA"
                                    value={newActivityName}
                                    onChange={(e) => setNewActivityName(e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Color Visual</label>
                            <div className="flex flex-wrap gap-3">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setNewActivityColor(c)}
                                        className={`w-10 h-10 rounded-full transition-transform hover:scale-110 shadow-sm border-2 ${newActivityColor === c ? 'border-orange-500 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-6 cursor-pointer bg-gray-50 p-3 rounded-lg border border-gray-100" onClick={() => setNewActivityProtected(!newActivityProtected)}>
                            <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${newActivityProtected ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                                {newActivityProtected && <Check size={16} className="text-white" />}
                            </div>
                            <div>
                                <span className="block text-sm font-bold text-gray-700">Horario Protegido (Fenix)</span>
                                <span className="text-[10px] text-gray-500">Cuenta para métricas de cumplimiento</span>
                            </div>
                        </div>

                        <button
                            onClick={handleAddActivity}
                            disabled={!newActivityName}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-md active:scale-95"
                        >
                            <Plus size={20} /> Crear Nueva Actividad
                        </button>
                    </div>

                    {/* List */}
                    <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {scheduleActivities.map(act => (
                            <div key={act.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between group hover:border-orange-300 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0 border border-gray-100" style={{ backgroundColor: act.color }}></div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm leading-tight">{act.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {/* <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded font-mono">{act.shortName || '---'}</span> */}
                                            {act.isProtected && (
                                                <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 rounded font-bold flex items-center gap-0.5">
                                                    <Check size={8} /> FENIX
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { if (confirm('¿Eliminar actividad?')) deleteScheduleActivity(act.id) }}
                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT COLUMN: Schedule Configuration */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-l-4 border-gray-800 pl-3">
                        <h3 className="font-bold text-gray-800 text-xl">Configuración de Horarios</h3>
                        <button
                            onClick={handleSaveConfig}
                            className="bg-gray-800 hover:bg-black text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                        >
                            <Save size={18} /> Guardar Cambios
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock size={120} />
                        </div>

                        <p className="text-sm text-gray-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <span className="font-bold text-blue-600">Nota:</span> Define el horario de operación para cada día. El sistema ajustará automáticamente el "Cronograma Maestro" para cubrir desde la hora más temprana hasta la más tardía.
                        </p>

                        <div className="space-y-1">
                            <div className="grid grid-cols-[100px_1fr_1fr_80px] gap-4 mb-2 px-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">Día</span>
                                <span className="text-xs font-bold text-gray-400 uppercase">Apertura</span>
                                <span className="text-xs font-bold text-gray-400 uppercase">Cierre</span>
                                <span className="text-xs font-bold text-gray-400 uppercase text-center">Estado</span>
                            </div>

                            {dailyConfig.map((dayConfig, idx) => (
                                <div key={idx} className={`grid grid-cols-[100px_1fr_1fr_80px] gap-4 items-center p-3 rounded-lg border transition-all ${dayConfig.isOpen ? 'bg-white border-gray-200 hover:border-orange-300' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                                    <div className="font-bold text-gray-700 capitalize">
                                        {DAYS[idx]}
                                    </div>

                                    <input
                                        type="time"
                                        disabled={!dayConfig.isOpen}
                                        value={dayConfig.openTime}
                                        onChange={(e) => updateDayConfig(idx, 'openTime', e.target.value)}
                                        className="border border-gray-200 rounded p-2 text-sm font-mono focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                    />

                                    <input
                                        type="time"
                                        disabled={!dayConfig.isOpen}
                                        value={dayConfig.closeTime}
                                        onChange={(e) => updateDayConfig(idx, 'closeTime', e.target.value)}
                                        className="border border-gray-200 rounded p-2 text-sm font-mono focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                    />

                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => updateDayConfig(idx, 'isOpen', !dayConfig.isOpen)}
                                            className={`w-12 h-6 rounded-full flex items-center transition-all p-1 ${dayConfig.isOpen ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- EDITOR TAB RENDERER ---
    const renderEditorTab = () => {
        const timeSlots = generateTimeSlots(openTime, closeTime);
        const loans = advisors.filter(a => a.position === Position.LOAN_ADVISOR);
        const affiliations = advisors.filter(a => a.position === Position.AFFILIATION_ADVISOR);

        return (
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                {/* Control Bar */}
                <div className="flex flex-col gap-6 mb-6">
                    {/* Activity Tools */}
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-400 uppercase mr-2">Herramientas:</span>
                        {/* Activity Selector */}
                        {scheduleActivities.map(act => (
                            <button
                                key={act.id}
                                onClick={() => { setIsEraserMode(false); setSelectedActivityId(act.id); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${!isEraserMode && selectedActivityId === act.id
                                    ? 'bg-gray-800 text-white border-black scale-105 shadow-md'
                                    : 'bg-white border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                <div className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: act.color }}></div>
                                <span className="text-xs font-bold uppercase">{act.name}</span>
                            </button>
                        ))}

                        {/* Eraser */}
                        <button
                            onClick={() => setIsEraserMode(!isEraserMode)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ml-auto ${isEraserMode
                                ? 'bg-red-100 text-red-600 border-red-300 ring-2 ring-red-200'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                        >
                            <Eraser size={16} />
                            <span className="text-xs font-bold uppercase">Borrador</span>
                        </button>
                    </div>

                    {/* Day Selector */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase mr-2 flex-shrink-0">Día a Editar:</span>
                        {DAYS.map((day, idx) => (
                            <button
                                key={day}
                                onClick={() => setEditorDayIndex(idx)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap flex-shrink-0 ${editorDayIndex === idx
                                    ? 'bg-orange-500 text-white shadow-md transform scale-105'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor Hint */}
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4 text-xs text-blue-700 flex items-center gap-2">
                    <div className="bg-blue-100 p-1 rounded-full"><Layout size={14} /></div>
                    <span>
                        <span className="font-bold">Modo Editor ({DAYS[editorDayIndex]}):</span> Haz clic en las celdas para asignar la actividad seleccionada.
                    </span>
                </div>

                {/* Main Editor Grid (Scrollable) */}
                <div className="overflow-x-auto border border-gray-300 rounded-lg max-h-[65vh] relative shadow-inner">
                    {/* Sticky Header */}
                    <div className="min-w-max">
                        <div className="flex sticky top-0 z-20 bg-gray-100 border-b border-gray-300 shadow-sm">
                            <div className="w-56 sticky left-0 z-30 bg-gray-200 border-r border-gray-300 p-3 font-bold text-center text-xs uppercase text-gray-700 flex items-center justify-center shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]">
                                Asesor / Horario
                            </div>
                            {/* Single Day Time Slots */}
                            <div className="flex-1 flex bg-white">
                                {timeSlots.map((t, tIdx) => (
                                    <div key={t} className="flex-1 min-w-[50px] border-r border-gray-200 last:border-r-0">
                                        <div className="bg-gray-800 text-white text-center py-1.5 text-[10px] font-bold border-b border-gray-600">
                                            {t}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-200 bg-white">
                            {/* Group Loans */}
                            <div className="sticky left-0 z-10 bg-gray-50 p-2 font-bold text-xs text-gray-500 uppercase border-b border-gray-200 pl-4">
                                Asesores de Crédito
                            </div>
                            {loans.map(adv => (
                                <div key={adv.id}
                                    onClick={() => setSelectedAdvisorId(adv.id)}
                                    className={`flex hover:bg-gray-50 transition-colors cursor-pointer group ${selectedAdvisorId === adv.id ? 'bg-orange-50 ring-1 ring-inset ring-orange-200' : ''}`}
                                >
                                    <div className="w-56 sticky left-0 z-10 bg-white border-r border-gray-200 p-2 flex items-center gap-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] group-hover:bg-gray-50 transition-colors">
                                        <div className={`w-1.5 h-full absolute left-0 top-0 transition-colors ${selectedAdvisorId === adv.id ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                                        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                                            {adv.name.substr(0, 2)}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold text-sm truncate text-gray-800">{adv.name}</span>
                                            <span className="text-[10px] text-gray-400 truncate font-mono">{adv.id}</span>
                                        </div>
                                    </div>

                                    {/* Time Slots for Current Day Only */}
                                    <div className="flex-1 flex">
                                        {timeSlots.map(time => {
                                            const assign = scheduleAssignments.find(a =>
                                                a.advisorId === adv.id &&
                                                a.dayOfWeek === editorDayIndex + 1 &&
                                                a.startTime === time
                                            );
                                            const act = assign ? scheduleActivities.find(ac => ac.id === assign.activityId) : null;

                                            return (
                                                <div
                                                    key={time}
                                                    onMouseDown={(e) => { e.preventDefault(); handleAssignSlot(editorDayIndex, time, adv.id); }}
                                                    onMouseEnter={(e) => {
                                                        if (e.buttons === 1) handleAssignSlot(editorDayIndex, time, adv.id);
                                                    }}
                                                    className="flex-1 min-w-[50px] border-r border-gray-100 last:border-r-0 h-14 transition-all border-b border-b-gray-50 hover:brightness-95 hover:z-10 hover:shadow-inner relative"
                                                    style={{
                                                        backgroundColor: act ? act.color : 'transparent'
                                                    }}
                                                    title={`${act ? act.name : 'Vacio'} (${time})`}
                                                >
                                                    {act && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                                                            <span className="text-[8px] font-bold text-white bg-black/50 px-1 rounded truncate max-w-full">
                                                                {act.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Group Affiliations */}
                            <div className="sticky left-0 z-10 bg-gray-50 p-2 font-bold text-xs text-gray-500 uppercase border-b border-gray-200 mt-0 pl-4">
                                Asesores de Afiliación
                            </div>
                            {affiliations.map(adv => (
                                <div key={adv.id}
                                    onClick={() => setSelectedAdvisorId(adv.id)}
                                    className={`flex hover:bg-gray-50 transition-colors cursor-pointer group ${selectedAdvisorId === adv.id ? 'bg-orange-50 ring-1 ring-inset ring-orange-200' : ''}`}
                                >
                                    <div className="w-56 sticky left-0 z-10 bg-white border-r border-gray-200 p-2 flex items-center gap-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] group-hover:bg-gray-50 transition-colors">
                                        <div className={`w-1.5 h-full absolute left-0 top-0 transition-colors ${selectedAdvisorId === adv.id ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                                        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                                            {adv.name.substr(0, 2)}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold text-sm truncate text-gray-800">{adv.name}</span>
                                            <span className="text-[10px] text-gray-400 truncate font-mono">{adv.id}</span>
                                        </div>
                                    </div>

                                    {/* Time Slots for Current Day Only */}
                                    <div className="flex-1 flex">
                                        {timeSlots.map(time => {
                                            const assign = scheduleAssignments.find(a =>
                                                a.advisorId === adv.id &&
                                                a.dayOfWeek === editorDayIndex + 1 &&
                                                a.startTime === time
                                            );
                                            const act = assign ? scheduleActivities.find(ac => ac.id === assign.activityId) : null;

                                            return (
                                                <div
                                                    key={time}
                                                    onMouseDown={(e) => { e.preventDefault(); handleAssignSlot(editorDayIndex, time, adv.id); }}
                                                    onMouseEnter={(e) => {
                                                        if (e.buttons === 1) handleAssignSlot(editorDayIndex, time, adv.id);
                                                    }}
                                                    className="flex-1 min-w-[50px] border-r border-gray-100 last:border-r-0 h-14 transition-all border-b border-b-gray-50 hover:brightness-95 hover:z-10 hover:shadow-inner relative"
                                                    style={{
                                                        backgroundColor: act ? act.color : 'transparent'
                                                    }}
                                                    title={`${act ? act.name : 'Vacio'} (${time})`}
                                                >
                                                    {act && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                                                            <span className="text-[8px] font-bold text-white bg-black/50 px-1 rounded truncate max-w-full">
                                                                {act.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- VIEW TAB RENDERER ---
    const renderViewTab = () => {
        const timeSlots = generateTimeSlots(openTime, closeTime);
        const loans = advisors.filter(a => a.position === Position.LOAN_ADVISOR);
        const affiliations = advisors.filter(a => a.position === Position.AFFILIATION_ADVISOR);

        // Helper to get Monday of the selected week (LOCAL TIME SAFE)
        const getMonday = (d: Date) => {
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.getFullYear(), d.getMonth(), diff);
        };

        // Parse viewDate as Local Date (YYYY-MM-DD -> Local 00:00)
        const [vdY, vdM, vdD] = viewDate.split('-').map(Number);
        const viewDateObj = new Date(vdY, vdM - 1, vdD);

        const currentMonday = getMonday(viewDateObj);


        const weekNumber = getWeekNumber(currentMonday);

        const formatDateLabel = (d: Date) => d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();

        const renderDayTable = (dayIndex: number) => {
            // Calculate specific date for this page
            const currentDayDate = new Date(currentMonday);
            currentDayDate.setDate(currentMonday.getDate() + dayIndex);

            // Format as YYYY-MM-DD manually to avoid UTC shift
            const year = currentDayDate.getFullYear();
            const month = String(currentDayDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDayDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // SORT LOGIC
            const getAdvisorPriority = (adv: Advisor) => {
                // Check blocking event same way as renderAdvisorRow
                const isBlocked = rrhhEvents.some(e => {
                    if (e.advisorId !== adv.id) return false;

                    const inRange = dateStr >= e.startDate && dateStr <= e.endDate;
                    const isRecurring = e.recurringDay !== undefined && e.recurringDay !== null;

                    if (!isRecurring) {
                        if (!inRange) return false;
                    } else {
                        // For recurring, only check startDate
                        if (dateStr < e.startDate) return false;
                    }

                    if (isRecurring) {
                        const currentDayOfWeek = (dayIndex + 1) % 7;
                        if (e.recurringDay !== currentDayOfWeek) return false;
                    }

                    return ['VACATION', 'INCAPACITY', 'ABSENCE', 'PERMIT', 'DAY_OFF'].includes(e.type);
                });

                if (isBlocked) return 0; // Top
                if (adv.shiftPreference === 'OPENING') return 1; // Morning
                if (adv.shiftPreference === 'CLOSING') return 2; // Evening
                return 3; // Default
            };

            const sortedLoans = [...loans].sort((a, b) => getAdvisorPriority(a) - getAdvisorPriority(b));
            const sortedAffils = [...affiliations].sort((a, b) => getAdvisorPriority(a) - getAdvisorPriority(b));

            const renderAdvisorRow = (adv: Advisor) => {
                // Check for RRHH Blocking Event
                const blockingEvent = rrhhEvents.find(e => {
                    if (e.advisorId !== adv.id) return false;

                    // Basic range check
                    const inRange = dateStr >= e.startDate && dateStr <= e.endDate;

                    const isRecurring = e.recurringDay !== undefined && e.recurringDay !== null;

                    if (!isRecurring) {
                        if (!inRange) return false;
                    } else {
                        // For recurring, only check startDate
                        if (dateStr < e.startDate) return false;
                    }

                    // If it has recurrence, check day of week
                    if (isRecurring) {
                        // dayIndex is 0=Mon, 1=Tue... 6=Sun
                        // recurringDay is 0=Sun, 1=Mon... 6=Sat
                        const currentDayOfWeek = (dayIndex + 1) % 7;
                        if (e.recurringDay !== currentDayOfWeek) return false;
                    }

                    return ['VACATION', 'INCAPACITY', 'ABSENCE', 'PERMIT', 'DAY_OFF'].includes(e.type);
                });

                return (
                    <div key={adv.id} className="flex border-b border-gray-400 last:border-b-0 h-8">
                        {/* Advisor Info */}
                        <div className="w-24 flex-shrink-0 bg-gray-100 border-r-2 border-black flex flex-col justify-center px-1 border-l-2 border-l-black">
                            <span className="font-bold text-[9px] truncate text-gray-800">{adv.id.substring(0, 6)}</span>
                            <span className="uppercase font-bold text-[8px] truncate leading-none overflow-hidden">{adv.name.split(' ')[0]} {adv.name.split(' ')[1]?.substring(0, 1)}.</span>
                        </div>

                        {blockingEvent ? (
                            <div className="flex-1 bg-black text-white flex items-center justify-center font-bold text-xs uppercase tracking-widest border-r-2 border-black">
                                {blockingEvent.type === 'VACATION' ? 'VACACIONES' :
                                    blockingEvent.type === 'DAY_OFF' ? 'DESCANSO' :
                                        blockingEvent.type === 'INCAPACITY' ? 'INCAPACIDAD' :
                                            blockingEvent.title || blockingEvent.type}
                            </div>
                        ) : (
                            // Schedule Grid
                            (() => {
                                const cells = [];
                                let skipCount = 0;
                                for (let i = 0; i < timeSlots.length; i++) {
                                    if (skipCount > 0) {
                                        skipCount--;
                                        continue;
                                    }
                                    const time = timeSlots[i];
                                    const assign = scheduleAssignments.find(a => a.advisorId === adv.id && a.dayOfWeek === dayIndex + 1 && a.startTime === time);
                                    const activity = assign ? scheduleActivities.find(ac => ac.id === assign.activityId) : null;

                                    let span = 1;
                                    for (let j = i + 1; j < timeSlots.length; j++) {
                                        const nextTime = timeSlots[j];
                                        const nextAssign = scheduleAssignments.find(a => a.advisorId === adv.id && a.dayOfWeek === dayIndex + 1 && a.startTime === nextTime);
                                        if (assign && nextAssign && assign.activityId === nextAssign.activityId) {
                                            span++;
                                        } else if (!assign && !nextAssign) {
                                            span++;
                                        } else {
                                            break;
                                        }
                                    }
                                    skipCount = span - 1;

                                    cells.push(
                                        <div
                                            key={time}
                                            className="flex items-center justify-center text-[9px] font-bold text-white text-center border-r border-white last:border-r-2 last:border-black overflow-hidden"
                                            style={{
                                                flex: span,
                                                backgroundColor: activity ? activity.color : '#000000',
                                                color: activity ? getContrastColor(activity.color) : 'transparent',
                                            }}
                                        >
                                            {activity ? (
                                                <span className="px-0.5 whitespace-nowrap overflow-hidden text-ellipsis leading-none">
                                                    {activity.name}
                                                </span>
                                            ) : ''}
                                        </div>
                                    );
                                }
                                return cells;
                            })()
                        )}
                    </div>
                );
            };

            return (
                <div className="mb-4 break-inside-avoid" style={{ breakAfter: (dayIndex + 1) % 4 === 0 ? 'page' : 'auto' }}>
                    {/* Header for Day */}
                    <div className="bg-white border-2 border-black border-b-0 text-center py-1">
                        <span className="font-bold uppercase text-xs sm:text-sm">{formatDateLabel(currentDayDate)}</span>
                    </div>

                    {/* Table Header */}
                    <div className="flex bg-gray-200 border-b-2 border-black">
                        {/* Advisor Column */}
                        <div className="w-24 flex-shrink-0 p-1 font-bold border-r border-black flex items-center justify-center bg-gray-300 text-[9px] uppercase">
                            AF / HORARIO
                        </div>
                        {/* Time Slots */}
                        {timeSlots.map(t => {
                            const h = parseInt(t.split(':')[0]);
                            const m = t.split(':')[1];
                            const label = m === '00' ? h : t;
                            return (
                                <div key={t} className="flex-1 font-bold text-center border-r border-gray-400 last:border-r-0 flex items-center justify-center text-[9px]">
                                    {label}
                                </div>
                            )
                        })}
                    </div>

                    {/* Loans Group */}
                    <div className="bg-gray-800 text-white font-bold text-[10px] uppercase py-0.5 px-2 border-t border-black border-b border-black text-center">
                        ASESORES DE CRÉDITO
                    </div>
                    {sortedLoans.map(renderAdvisorRow)}

                    {/* Affiliation Group */}
                    <div className="bg-gray-800 text-white font-bold text-[10px] uppercase py-0.5 px-2 border-t-2 border-black border-b border-black text-center">
                        ASESORES DE AFILIACIÓN
                    </div>
                    {sortedAffils.map(renderAdvisorRow)}
                </div>
            );
        };

        const weekEnd = new Date(currentMonday);
        weekEnd.setDate(weekEnd.getDate() + 6);

        return (
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                <style>{`
                    @media print {
                        @page {
                            size: letter landscape;
                            margin: 0.5cm;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #schedule-print-container, #schedule-print-container * {
                            visibility: visible;
                        }
                        #schedule-print-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background-color: white;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                        }
                        .print-hidden {
                            display: none !important;
                        }
                        .print-content {
                            width: 100%;
                            zoom: 0.95;
                        }
                    }
                `}</style>
                <div className="flex justify-between items-center mb-6 no-print">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="font-bold text-gray-700 text-lg">Cronograma General</h2>
                            <span className="text-xs text-gray-500">Vista optimizada para impresión horizontal</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full px-3">
                            <button
                                onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setDate(d.getDate() - 7);
                                    setViewDate(d.toISOString().split('T')[0]);
                                }}
                                className="p-1 hover:bg-gray-200 rounded-full"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="text-center">
                                <span className="block text-sm font-bold text-gray-800">Semana {weekNumber}</span>
                                <span className="text-[10px] text-gray-500">{currentMonday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            <button
                                onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setDate(d.getDate() + 7);
                                    setViewDate(d.toISOString().split('T')[0]);
                                }}
                                className="p-1 hover:bg-gray-200 rounded-full"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-700 print:hidden"
                    >
                        <Printer size={18} /> Imprimir (4 Días/Hoja)
                    </button>
                </div>
                <div id="schedule-print-container" className="print-content font-sans">
                    <div className="hidden print:block text-center mb-4">
                        <div className="flex justify-between items-end border-b-2 border-red-600 pb-2 mb-2">
                            <div className="text-left">
                                <h1 className="text-2xl font-black text-red-600 leading-none">grupo<br />elektra</h1>
                            </div>
                            <div className="text-center flex-1">
                                <h1 className="text-3xl font-black uppercase tracking-wide">MEGA SALVATIERRA</h1>
                                <p className="text-[10px] font-bold tracking-widest uppercase mt-1">Cronograma de Actividades / Asesores de Préstamos y Servicios Financieros</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">SEMANA {weekNumber}</div>
                            </div>
                        </div>
                    </div>
                    {DAYS.map((_, i) => renderDayTable(i))}
                </div>
            </div>
        );
    };

    const renderFenixTab = () => {
        return (
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-center mb-6 no-print">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setFenixViewMode('CHECKLIST')}
                                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${fenixViewMode === 'CHECKLIST' ? 'bg-white shadow text-bank-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Checklist Diario
                            </button>
                            <button
                                onClick={() => setFenixViewMode('REPORT')}
                                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${fenixViewMode === 'REPORT' ? 'bg-white shadow text-bank-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Reporte Semanal
                            </button>
                            <button
                                onClick={() => setFenixViewMode('METRICS')}
                                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${fenixViewMode === 'METRICS' ? 'bg-white shadow text-bank-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Reporte Cumplimiento
                            </button>
                        </div>
                    </div>
                </div>
                {fenixViewMode === 'CHECKLIST' ? renderFenixChecklist() :
                    fenixViewMode === 'METRICS' ? renderFenixMetrics() : renderFenixReport()}
            </div>
        );
    };

    const renderFenixMetrics = () => {
        // Calculate weekly metrics based on fenixDate
        // Use T12:00:00 to avoid timezone shifts (Client Local safe)
        const getMonday = (d: Date) => {
            const day = d.getDay(); // 0-6 (Sun-Sat)
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            const mon = new Date(d.getTime());
            mon.setDate(diff);
            return mon;
        };

        const currentObj = new Date(fenixDate + 'T12:00:00');
        const activeMonday = getMonday(currentObj);

        const activeWeekDates: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(activeMonday);
            d.setDate(activeMonday.getDate() + i);
            // Robust YYYY-MM-DD generation
            activeWeekDates.push(d.toISOString().split('T')[0]);
        }

        const loanAdvisors = advisors.filter(a => a.position === Position.LOAN_ADVISOR);

        return (
            <div>
                <div className="flex items-center gap-4 mb-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Cumplimiento de Horario Protegido</h2>
                        <p className="text-sm text-gray-500">Porcentaje de ejecución de las horas Fenix asignadas (Solo Asesores de Préstamos).</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loanAdvisors.map(adv => {
                        let totalPlanned = 0;
                        let totalCompleted = 0;

                        activeWeekDates.forEach((dateStr, idx) => {
                            const dayOfWeek = idx + 1; // 1=Mon
                            const dayAssigns = scheduleAssignments.filter(a => a.advisorId === adv.id && a.dayOfWeek === dayOfWeek);

                            dayAssigns.forEach(assign => {
                                const act = scheduleActivities.find(ac => ac.id === assign.activityId);
                                if (act?.isProtected) {
                                    totalPlanned++;
                                    const isDone = fenixCompliances.some(f =>
                                        f.advisorId === adv.id &&
                                        f.date === dateStr &&
                                        f.timeSlot === assign.startTime &&
                                        f.isCompliant
                                    );
                                    if (isDone) totalCompleted++;
                                }
                            });
                        });

                        const percentage = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

                        return (
                            <div key={adv.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{adv.name}</h3>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{adv.position}</span>
                                    </div>
                                    <div className="text-3xl font-black text-gray-900">{percentage}%</div>
                                </div>

                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-4 relative z-10">
                                    <div
                                        className={`h-full transition-all duration-1000 ease-out rounded-full ${percentage >= 90 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between text-xs font-bold text-gray-500 relative z-10">
                                    <span>{totalCompleted} Completados</span>
                                    <span>{totalPlanned} Total Planificados</span>
                                </div>

                                <div className="absolute -bottom-6 -right-6 text-gray-50 opacity-50 z-0">
                                    <Check size={120} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderFenixChecklist = () => {
        const selectedDayOfWeek = new Date(fenixDate).getDay();
        const jsDay = new Date(fenixDate + 'T12:00:00').getDay();
        const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
        const dayName = DAYS[dayIndex];

        const relevantAssignments = scheduleAssignments.filter(a => {
            if (a.dayOfWeek !== dayIndex + 1) return false;
            const act = scheduleActivities.find(ac => ac.id === a.activityId);
            return act?.isProtected;
        }).sort((a, b) => {
            const advA = advisors.find(ad => ad.id === a.advisorId)?.name || '';
            const advB = advisors.find(ad => ad.id === b.advisorId)?.name || '';
            if (advA !== advB) return advA.localeCompare(advB);
            return a.startTime.localeCompare(b.startTime);
        });

        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const d = new Date(fenixDate);
                                d.setDate(d.getDate() - 1);
                                setFenixDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center">
                            <h3 className="font-bold text-lg capitalize">{dayName}</h3>
                            <input
                                type="date"
                                value={fenixDate}
                                onChange={(e) => setFenixDate(e.target.value)}
                                className="border-none text-gray-500 text-sm focus:ring-0 p-0 text-center bg-transparent"
                            />
                        </div>
                        <button
                            onClick={() => {
                                const d = new Date(fenixDate);
                                d.setDate(d.getDate() + 1);
                                setFenixDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="text-right">
                        <p className="text-sm text-gray-500">Actividades Protegidas</p>
                        <p className="text-2xl font-bold text-bank-600">{relevantAssignments.length}</p>
                    </div>
                </div>

                {relevantAssignments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed text-gray-400">
                        <Check size={48} className="mx-auto mb-2 opacity-20" />
                        <p>No hay actividades protegidas programadas para este día.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-3 text-left">Asesor</th>
                                    <th className="px-6 py-3 text-left">Horario</th>
                                    <th className="px-6 py-3 text-left">Actividad</th>
                                    <th className="px-6 py-3 text-center">Cumplimiento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {relevantAssignments.map(assign => {
                                    const advisor = advisors.find(a => a.id === assign.advisorId);
                                    const activity = scheduleActivities.find(a => a.id === assign.activityId);
                                    const compliance = fenixCompliances.find(f =>
                                        f.advisorId === assign.advisorId &&
                                        f.date === fenixDate &&
                                        f.timeSlot === assign.startTime
                                    );
                                    const isDone = compliance?.isCompliant || false;

                                    return (
                                        <tr key={assign.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {advisor?.photoUrl ? (
                                                        <img src={advisor.photoUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-bank-100 text-bank-600 flex items-center justify-center font-bold text-xs">
                                                            {advisor?.name.substring(0, 2)}
                                                        </div>
                                                    )}
                                                    <div className="font-medium text-gray-900">{advisor?.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-gray-600">
                                                {assign.startTime} - {assign.endTime}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className="px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                                                    style={{ backgroundColor: activity?.color }}
                                                >
                                                    {activity?.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => toggleFenixCompliance(assign.advisorId, fenixDate, assign.startTime, !isDone)}
                                                    className={`w-full py-2 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${isDone
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {isDone ? (
                                                        <>
                                                            <Check size={18} /> CUMPLIDO
                                                        </>
                                                    ) : (
                                                        <span>PENDIENTE</span>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderFenixReport = () => {
        const loanAdvisors = advisors.filter(a => a.position === Position.LOAN_ADVISOR);
        const getProtectedRanges = (advisorId: string, dayIndex: number) => {
            const dayAssigns = scheduleAssignments
                .filter(a => a.advisorId === advisorId && a.dayOfWeek === dayIndex + 1)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const protectedAssigns = dayAssigns.filter(a => {
                const act = scheduleActivities.find(ac => ac.id === a.activityId);
                return act?.isProtected;
            });

            if (protectedAssigns.length === 0) return [];

            const ranges: { s: string; e: string }[] = [];

            let start = protectedAssigns[0].startTime;
            let end = protectedAssigns[0].endTime;

            for (let i = 1; i < protectedAssigns.length; i++) {
                const current = protectedAssigns[i];
                if (current.startTime === end) {
                    end = current.endTime;
                } else {
                    ranges.push(formatRange(start, end));
                    start = current.startTime;
                    end = current.endTime;
                }
            }
            ranges.push(formatRange(start, end));
            return ranges;
        };

        const formatRange = (start: string, end: string) => {
            return { s: formatTime12(start), e: formatTime12(end) };
        };

        const formatTime12 = (t: string) => {
            const [h, m] = t.split(':');
            const hour = parseInt(h);
            const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
            const h12 = hour % 12 || 12;
            return `${h12}:${m} ${ampm}`;
        };

        return (
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                <style>{`
                    @media print {
                        @page {
                            size: letter landscape;
                            margin: 0.5cm;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #fenix-print-container, #fenix-print-container * {
                            visibility: visible;
                        }
                        #fenix-print-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background-color: white;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="font-bold text-gray-700">Horarios Protegidos Fenix (Vista de Impresión)</h2>
                    <button
                        onClick={() => window.print()}
                        className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-700 active:scale-95 transition-all"
                    >
                        <Printer size={18} /> Imprimir Reporte
                    </button>
                </div>

                <div id="fenix-print-container" className="w-full">
                    <div className="hidden print:block text-center mb-4 border-b-2 border-red-600 pb-2">
                        <div className="flex justify-between items-end">
                            <div className="text-left">
                                <h1 className="text-2xl font-black text-red-600 leading-none">grupo<br />elektra</h1>
                            </div>
                            <div className="text-center flex-1">
                                <h1 className="text-xl font-black uppercase tracking-wide">REPORTE DE HORARIOS PROTEGIDOS FENIX</h1>
                                <p className="text-[10px] font-bold tracking-widest uppercase mt-1">Sucursal Mega Salvatierra / Semanal</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-gray-600">SEMANA {getWeekNumber(new Date(fenixDate))}</div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="p-2 border border-gray-600 w-32 font-bold uppercase">Asesor</th>
                                    {DAYS.map(d => (
                                        <th key={d} className="p-2 border border-gray-600 w-auto font-bold uppercase text-center">{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loanAdvisors.map((adv, idx) => (
                                    <tr key={adv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="border border-gray-300 p-2 font-bold text-gray-800 align-middle">
                                            {adv.name}
                                        </td>
                                        {DAYS.map((_, dayIdx) => {
                                            const ranges = getProtectedRanges(adv.id, dayIdx);
                                            return (
                                                <td key={dayIdx} className="border border-gray-300 p-1 align-top h-16">
                                                    {ranges.length > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            {ranges.map((r, ri) => (
                                                                <div key={ri} className="flex flex-col justify-center text-[9px] bg-yellow-50 border border-yellow-200 p-1 rounded text-center font-bold text-gray-700">
                                                                    <span>{r.s} - {r.e}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex justify-between text-[10px] text-gray-400 italic border-t pt-2">
                        <span>Generado por Sistema de Gestión de Horarios</span>
                        <span>Fenix Compliance Report</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-6 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h1>
                    <p className="text-gray-500">Administración de turnos y actividades Fenix</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 border-b border-gray-200 no-print">
                <button
                    onClick={() => setActiveTab('CONFIG')}
                    className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'CONFIG' ? 'border-bank-600 text-bank-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Settings size={18} /> Configuración
                </button>
                <button
                    onClick={() => setActiveTab('EDITOR')}
                    className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'EDITOR' ? 'border-bank-600 text-bank-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Calendar size={18} /> Editor Semanal
                </button>
                <button
                    onClick={() => setActiveTab('VIEW')}
                    className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'VIEW' ? 'border-bank-600 text-bank-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Layout size={18} /> Visualizar (Imprimir)
                </button>
                <button
                    onClick={() => setActiveTab('FENIX')}
                    className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'FENIX' ? 'border-bank-600 text-bank-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <ListChecks size={18} /> Cumplimiento Fenix
                </button>
            </div>

            <div className="min-h-[600px]">
                {activeTab === 'CONFIG' && renderConfigTab()}
                {activeTab === 'EDITOR' && renderEditorTab()}
                {activeTab === 'VIEW' && renderViewTab()}
                {activeTab === 'FENIX' && renderFenixTab()}
            </div>
        </div>
    );
};

export default ScheduleManager;
