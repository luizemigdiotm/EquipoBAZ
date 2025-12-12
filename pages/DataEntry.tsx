
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ReportType, Position, AppliesTo, RecordData } from '../types';
import { Save, AlertCircle, Calendar, CheckSquare, Info, Edit2, Trash2, Clock, Split, HelpCircle } from 'lucide-react';

export const DataEntry = () => {
  const { advisors, indicators, saveRecord, deleteRecord, records } = useData();

  // Form State
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [week, setWeek] = useState<number>(getWeekNumber(new Date()));
  const [frequency, setFrequency] = useState<'WEEKLY' | 'DAILY'>('WEEKLY');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // 1 = Monday

  // NEW: Auto Distribution State
  const [autoDistribute, setAutoDistribute] = useState(false);

  const [reportType, setReportType] = useState<ReportType>(ReportType.INDIVIDUAL);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');

  // Values State (Map of indicator ID -> value)
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Derived Data
  const selectedAdvisor = useMemo(() =>
    advisors.find(a => a.id === selectedAdvisorId),
    [advisors, selectedAdvisorId]);

  const activeIndicators = useMemo(() => {
    return indicators.filter(i => {
      // Priority: Check specific Roles array
      if (i.roles && i.roles.length > 0) {
        if (reportType === ReportType.BRANCH) return i.roles.includes('BRANCH');
        if (selectedAdvisor) return i.roles.includes(selectedAdvisor.position);
        return false;
      }

      // Fallback: Legacy logic
      if (reportType === ReportType.BRANCH) {
        return i.appliesTo === AppliesTo.BRANCH || i.appliesTo === AppliesTo.ALL;
      }

      if (selectedAdvisor) {
        if (selectedAdvisor.position === Position.LOAN_ADVISOR) {
          return i.appliesTo === AppliesTo.LOAN || i.appliesTo === AppliesTo.ALL;
        }
        if (selectedAdvisor.position === Position.AFFILIATION_ADVISOR) {
          return i.appliesTo === AppliesTo.AFFILIATION || i.appliesTo === AppliesTo.ALL;
        }
      }
      return false;
    });
  }, [reportType, selectedAdvisor, indicators]);

  // Existing Records for the current selection (for the List view at bottom)
  const existingRecords = useMemo(() => {
    return records.filter(r =>
      r.year === year &&
      r.week === week &&
      r.type === reportType &&
      (reportType === ReportType.INDIVIDUAL ? r.advisorId === selectedAdvisorId : true)
    ).sort((a, b) => {
      // Sort daily records by day
      if (a.frequency === 'DAILY' && b.frequency === 'DAILY') {
        return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
      }
      return 0;
    });
  }, [records, year, week, reportType, selectedAdvisorId]);

  const handleInputChange = (id: string, value: string) => {
    setFormValues(prev => ({ ...prev, [id]: value }));
    // Clear error for this field if user types
    if (errors[id]) {
      setErrors(prev => {
        const newErr = { ...prev };
        delete newErr[id];
        return newErr;
      });
    }
    // Clear global error msg
    if (errorMsg) setErrorMsg('');
  };

  // Helper to calculate date from Year/Week/Day
  const getCalculatedDate = (targetDayOfWeek?: number) => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

    // If weekly, default to Monday of that week
    // If auto-distributing, we will call this multiple times with specific days
    const targetDay = targetDayOfWeek !== undefined
      ? targetDayOfWeek
      : (frequency === 'DAILY' ? dayOfWeek : 1);

    // Adjust from Monday (1)
    const resultDate = new Date(ISOweekStart);
    // Our dayOfWeek: 0=Sun, 1=Mon ... 6=Sat
    // ISO Start is Monday. 
    // If target is 1 (Mon), add 0. If target 2 (Tue), add 1.
    // If target 0 (Sun), add 6.
    const addDays = targetDay === 0 ? 6 : targetDay - 1;
    resultDate.setDate(ISOweekStart.getDate() + addDays);

    return resultDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reportType === ReportType.INDIVIDUAL && !selectedAdvisorId) {
      alert('Por favor seleccione un colaborador');
      return;
    }

    // --- VALIDATION: Check for empty fields ---
    const newErrors: { [key: string]: boolean } = {};
    let hasEmptyFields = false;

    activeIndicators.forEach(ind => {
      const val = formValues[ind.id];
      // Check if value is empty string or undefined (null check for safety)
      if (val === '' || val === undefined || val === null) {
        newErrors[ind.id] = true;
        hasEmptyFields = true;
      }
    });

    if (hasEmptyFields) {
      setErrors(newErrors);
      setErrorMsg('No se puede guardar: Existen campos vacíos. Por favor coloque "0" si no hay valor.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // --- Check for existing record (Collision Detection) ---
    // Only check if NOT Auto Distributing (Auto Distribute implies overwrite/logic)
    if (!autoDistribute) {
      const exists = records.find(r =>
        r.id !== editingId &&
        r.year === year &&
        r.week === week &&
        r.type === reportType &&
        r.advisorId === (reportType === ReportType.INDIVIDUAL ? selectedAdvisorId : undefined) &&
        r.frequency === frequency &&
        (frequency === 'DAILY' ? r.dayOfWeek === dayOfWeek : true)
      );

      if (exists) {
        const periodText = frequency === 'DAILY'
          ? `Día: ${days.find(d => d.val === dayOfWeek)?.label}`
          : 'Registro Semanal';
        const targetName = reportType === ReportType.INDIVIDUAL ? selectedAdvisor?.name : 'Sucursal';

        const confirmOverwrite = window.confirm(
          `⚠️ ATENCIÓN: Ya existen datos registrados para:\n\n` +
          `• Periodo: Año ${year}, Semana ${week} (${periodText})\n` +
          `• Objetivo: ${targetName}\n\n` +
          `¿Desea SOBRESCRIBIR estos datos? Los datos anteriores se perderán.`
        );

        if (!confirmOverwrite) return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const numericValues: { [key: string]: number } = {};
      activeIndicators.forEach(ind => {
        numericValues[ind.id] = parseFloat(formValues[ind.id] || '0');
      });

      if (frequency === 'WEEKLY' && autoDistribute) {
        // --- AUTO DISTRIBUTION LOGIC ---
        const today = new Date();
        const currentDay = today.getDay(); // 0=Sun, 1=Mon, 5=Fri

        // Logic: Distribute from Monday (1) up to Yesterday (currentDay - 1)
        // If today is Monday (1), we can't distribute to past.
        // If today is Sunday (0), treat as day 7 for loop, so distribute 1-6.

        let limitDay = currentDay === 0 ? 7 : currentDay;
        // Distribute up to "Yesterday" means < limitDay
        // e.g. Fri (5) -> loop 1, 2, 3, 4.

        const daysToDistribute: number[] = [];
        for (let d = 1; d < limitDay; d++) {
          daysToDistribute.push(d);
        }

        if (daysToDistribute.length === 0) {
          // Fallback if Monday: Just save as Monday Daily
          daysToDistribute.push(1);
        }

        const count = daysToDistribute.length;

        // First iteration cleans up Weekly record to avoid duplication
        let isFirst = true;

        for (const d of daysToDistribute) {
          const distributedValues: { [key: string]: number } = {};

          Object.keys(numericValues).forEach(key => {
            // Divide total by count
            // Use floor or specific decimal logic? Standard float is fine.
            distributedValues[key] = numericValues[key] / count;
          });

          const record: RecordData = {
            id: '', // Empty ID for new record (let DB generate it)
            year,
            week,
            date: getCalculatedDate(d),
            type: reportType,
            frequency: 'DAILY',
            dayOfWeek: d,
            advisorId: reportType === ReportType.INDIVIDUAL ? selectedAdvisorId : undefined,
            values: distributedValues
          };

          // For the first record, we ask to cleanup WEEKLY records to convert type
          await saveRecord(record, isFirst ? 'DELETE_WEEKLY' : undefined);
          isFirst = false;
        }

        setSuccessMsg(`Se distribuyó el monto acumulado entre ${count} días (Lun - ${days.find(d => d.val === daysToDistribute[daysToDistribute.length - 1])?.label}).`);

      } else {
        // --- STANDARD SAVE ---
        const newRecord: RecordData = {
          id: editingId || '', // Use existing ID if editing, else empty
          year,
          week,
          date: getCalculatedDate(),
          type: reportType,
          frequency,
          dayOfWeek: frequency === 'DAILY' ? dayOfWeek : undefined,
          advisorId: reportType === ReportType.INDIVIDUAL ? selectedAdvisorId : undefined,
          values: numericValues
        };

        // If switching types (Weekly vs Daily), cleanup logic is handled by context if needed, 
        // but here we send undefined unless we want strict replacement.
        // If saving Daily, we might warn about Weekly existing (handled above).
        // If saving Weekly, we usually overwrite Daily.
        const cleanup = frequency === 'WEEKLY' ? 'DELETE_DAILY' : 'DELETE_WEEKLY';

        await saveRecord(newRecord, cleanup);
        setSuccessMsg(editingId ? 'Registro actualizado exitosamente' : 'Registro guardado exitosamente');
      }

      setErrors({});
      // Reset partial form
      setFormValues({});
      setEditingId(null);
      setTimeout(() => setSuccessMsg(''), 5000);

    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Error desconocido';
      setErrorMsg(`Error al guardar: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rec: RecordData) => {
    setEditingId(rec.id);
    setYear(rec.year);
    setWeek(rec.week);
    setFrequency(rec.frequency);
    if (rec.frequency === 'DAILY' && rec.dayOfWeek !== undefined) {
      setDayOfWeek(rec.dayOfWeek);
    }
    setAutoDistribute(false); // Reset auto distribute on edit

    // Values
    const newValues: { [key: string]: string } = {};
    Object.entries(rec.values).forEach(([k, v]) => {
      newValues[k] = v.toString();
    });
    setFormValues(newValues);

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este registro permanentemente?')) {
      try {
        await deleteRecord(id);
        if (editingId === id) {
          setEditingId(null);
          setFormValues({});
        }
      } catch (e) {
        alert('Error al eliminar');
      }
    }
  };

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const years = [2023, 2024, 2025, 2026];
  const days = [
    { label: 'Lunes', val: 1 }, { label: 'Martes', val: 2 }, { label: 'Miércoles', val: 3 },
    { label: 'Jueves', val: 4 }, { label: 'Viernes', val: 5 }, { label: 'Sábado', val: 6 }, { label: 'Domingo', val: 0 },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md my-6">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-bank-800">
          {editingId ? 'Editando Registro' : 'Registro de Colocación'}
        </h2>
        <p className="text-sm text-gray-500">
          {editingId ? 'Modifique los valores y guarde los cambios.' : 'Ingrese los resultados de la gestión comercial.'}
        </p>
      </div>

      {successMsg && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md flex items-center animate-fade-in-up">
          <Save className="w-5 h-5 mr-2" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center animate-shake">
          <AlertCircle className="w-5 h-5 mr-2" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* TIME PERIOD SELECTOR */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" /> Periodo de Reporte
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Año</label>
              <select
                className="w-full border rounded-md p-2 bg-white focus:ring-2 focus:ring-bank-500 outline-none"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Semana</label>
              <select
                className="w-full border rounded-md p-2 bg-white focus:ring-2 focus:ring-bank-500 outline-none"
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
              >
                {weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
              </select>
            </div>

            {/* FREQUENCY TOGGLE */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Frecuencia de Captura</label>
              <div className="flex bg-white rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFrequency('WEEKLY')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${frequency === 'WEEKLY' ? 'bg-bank-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Semanal (Acumulado)
                </button>
                <div className="w-px bg-gray-200"></div>
                <button
                  type="button"
                  onClick={() => setFrequency('DAILY')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${frequency === 'DAILY' ? 'bg-bank-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Diario
                </button>
              </div>
            </div>
          </div>

          {/* WEEKLY AUTO DISTRIBUTION TOGGLE */}
          {frequency === 'WEEKLY' && !editingId && (
            <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in-up">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDistribute}
                  onChange={(e) => setAutoDistribute(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 text-bank-600 border-gray-300 rounded focus:ring-bank-500"
                />
                <div>
                  <div className="font-bold text-bank-800 text-sm flex items-center">
                    <Split size={14} className="mr-1" />
                    Distribución Automática (Días Anteriores)
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Si activa esto, el sistema dividirá el monto ingresado entre los días transcurridos de la semana (Lunes hasta Ayer) y guardará registros diarios automáticamente.
                    <br /><strong>Ideal para corregir el cálculo de "Compromiso del Día".</strong>
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* DAILY SELECTOR */}
          {frequency === 'DAILY' && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Día de la Semana</label>
              <div className="flex flex-wrap gap-2">
                {days.map(d => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setDayOfWeek(d.val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${dayOfWeek === d.val
                        ? 'bg-bank-100 text-bank-700 border-bank-300 ring-2 ring-bank-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-bank-300'
                      }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
          <select
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-bank-500 outline-none"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as ReportType);
              setFormValues({});
              setErrors({});
            }}
          >
            <option value={ReportType.INDIVIDUAL}>Reporte Individual de Colaborador</option>
            <option value={ReportType.BRANCH}>Reporte de Sucursal</option>
          </select>
        </div>

        {/* Dynamic Section */}
        {reportType === ReportType.INDIVIDUAL && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
              <select
                className="w-full border rounded-md p-2 bg-white focus:ring-2 focus:ring-bank-500 outline-none"
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
              >
                <option value="">-- Seleccione un Colaborador --</option>
                {advisors.map(adv => (
                  <option key={adv.id} value={adv.id}>{adv.name}</option>
                ))}
              </select>
            </div>

            {selectedAdvisor && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
                <div className="flex items-center text-bank-800 font-medium">
                  <div className="w-2 h-2 rounded-full bg-bank-500 mr-2"></div>
                  {selectedAdvisor.position}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Indicators Form */}
        {(reportType === ReportType.BRANCH || (reportType === ReportType.INDIVIDUAL && selectedAdvisorId)) && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold text-gray-800">Indicadores</h3>
              <div className="flex items-center bg-yellow-50 text-yellow-800 text-xs px-2 py-1 rounded border border-yellow-100">
                <Info size={14} className="mr-1" />
                Si no hay dato, coloque 0
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeIndicators.length > 0 ? activeIndicators.map(ind => (
                <div key={ind.id} className="relative group">
                  <label className={`block text-xs font-semibold uppercase mb-1 truncate transition-colors ${errors[ind.id] ? 'text-red-600' : 'text-gray-600'}`} title={ind.name}>
                    {ind.name} {errors[ind.id] && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full border rounded-md py-2 pl-3 pr-8 focus:outline-none transition-shadow ${errors[ind.id]
                          ? 'border-red-500 ring-1 ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-2 focus:ring-bank-500'
                        }`}
                      placeholder="0"
                      value={formValues[ind.id] || ''}
                      onChange={(e) => handleInputChange(ind.id, e.target.value)}
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-sm font-mono font-bold select-none">
                      {ind.unit}
                    </span>
                  </div>
                  {errors[ind.id] && <span className="text-[10px] text-red-500 font-bold">Campo obligatorio</span>}
                </div>
              )) : (
                <div className="col-span-3 text-center text-gray-400 py-8 border-2 border-dashed rounded-lg bg-gray-50">
                  <AlertCircle className="inline-block w-8 h-8 mb-2 opacity-50" />
                  <p>No hay indicadores configurados para esta selección.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-6 flex gap-3">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormValues({});
                setAutoDistribute(false);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar Edición
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 bg-bank-600 hover:bg-bank-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex justify-center items-center transform hover:-translate-y-0.5 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <CheckSquare className="w-5 h-5 mr-2" />
            {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar Registro' : (autoDistribute ? 'Distribuir y Guardar' : 'Guardar Registro')}
          </button>
        </div>
      </form>

      {/* EXISTING RECORDS TABLE */}
      {existingRecords.length > 0 && (
        <div className="mt-12 border-t pt-6">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Registros Existentes (Semana {week} - {year})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border rounded-lg">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Fecha Captura</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {existingRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${rec.frequency === 'WEEKLY' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {rec.frequency === 'WEEKLY' ? 'Semanal' : 'Diario'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rec.frequency === 'DAILY'
                        ? days.find(d => d.val === rec.dayOfWeek)?.label
                        : 'Acumulado Total'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(rec.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(rec)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
