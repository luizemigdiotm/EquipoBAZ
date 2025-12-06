
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Printer, Calendar } from 'lucide-react';

export const Commitments = () => {
  const { indicators, budgets } = useData();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const years = [2023, 2024, 2025, 2026];

  const days = [
    { id: 1, label: 'LUNES' },
    { id: 2, label: 'MARTES' },
    { id: 3, label: 'MIÉRCOLES' },
    { id: 4, label: 'JUEVES' },
    { id: 5, label: 'VIERNES' },
    { id: 6, label: 'SÁBADO' },
    { id: 0, label: 'DOMINGO' },
  ];

  // Helper to get budget value
  const getBudgetData = () => {
      // Group indicators
      const groups = {
          'COLOCACION': { title: 'BANCO', indicators: [] as any[] },
          'TOTAL_SAN': { title: 'TOTAL SAN', indicators: [] as any[] },
          'CAPTACION': { title: 'CAPTACIÓN', indicators: [] as any[] },
          'OTHER': { title: 'OTROS', indicators: [] as any[] }
      };

      indicators.forEach(ind => {
          const groupKey = ind.group || 'OTHER';
          
          // Get Budget Configuration for this week
          // We assume Branch Global for the general commitment view
          const relevantBudgets = budgets.filter(b => b.indicatorId === ind.id && b.targetId === 'BRANCH_GLOBAL' && b.year === selectedYear && b.week === selectedWeek);
          
          let dailyValues: {[key:number]: number} = {};
          let total = 0;

          // Check if Daily Budgets exist
          const dailyConfigs = relevantBudgets.filter(b => b.periodType === 'DAILY');
          
          if (dailyConfigs.length > 0) {
               dailyConfigs.forEach(b => {
                   if (b.dayOfWeek !== undefined) {
                       dailyValues[b.dayOfWeek] = b.amount;
                       if (ind.isCumulative !== false) total += b.amount;
                       else total = Math.max(total, b.amount);
                   }
               });
               // Fill missing days with 0
               days.forEach(d => { if (dailyValues[d.id] === undefined) dailyValues[d.id] = 0; });
          } else {
               // Fallback to Weekly
               const weeklyConfig = relevantBudgets.find(b => b.periodType === 'WEEKLY');
               if (weeklyConfig) {
                   total = weeklyConfig.amount;
                   if (ind.isCumulative !== false) {
                       const dailyAvg = total / 7;
                       days.forEach(d => dailyValues[d.id] = dailyAvg);
                   } else {
                       // If not cumulative (e.g. %), daily value is the same as weekly target
                       days.forEach(d => dailyValues[d.id] = total);
                   }
               } else {
                   days.forEach(d => dailyValues[d.id] = 0);
               }
          }

          if (groups[groupKey]) {
              groups[groupKey].indicators.push({ ...ind, dailyValues, total });
          } else {
              groups['OTHER'].indicators.push({ ...ind, dailyValues, total });
          }
      });

      return groups;
  };

  const data = useMemo(() => getBudgetData(), [indicators, budgets, selectedYear, selectedWeek]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* CSS For Print Landscape */}
      <style>{`
        @media print {
            @page {
                size: letter landscape;
                margin: 5mm;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print {
                display: none !important;
            }
            .print-full-width {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
        }
      `}</style>

      {/* HEADER & FILTERS */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100 no-print">
         <div className="flex justify-between items-center">
             <div>
                 <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                     <Calendar className="mr-2" /> Compromisos Semanales
                 </h1>
                 <p className="text-sm text-gray-500">Vista detallada de metas diarias</p>
             </div>
             <div className="flex gap-4 items-center">
                 <div className="flex items-center gap-2">
                     <label className="text-xs font-bold text-gray-500">Año:</label>
                     <select className="border rounded p-1 text-sm outline-none" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                         {years.map(y => <option key={y} value={y}>{y}</option>)}
                     </select>
                 </div>
                 <div className="flex items-center gap-2">
                     <label className="text-xs font-bold text-gray-500">Semana:</label>
                     <select className="border rounded p-1 text-sm outline-none" value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))}>
                         {weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
                     </select>
                 </div>
                 <button onClick={handlePrint} className="bg-bank-600 hover:bg-bank-700 text-white px-4 py-2 rounded font-bold flex items-center transition-colors">
                     <Printer size={18} className="mr-2"/> Imprimir Tabla
                 </button>
             </div>
         </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white p-4 rounded-lg shadow print:shadow-none print:p-0">
          {/* PRINT HEADER */}
          <div className="hidden print:block text-center mb-4">
              <h1 className="text-xl font-bold uppercase">SUC MEGA SALVATIERRA - SEMANA {selectedWeek}</h1>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead>
                      <tr className="bg-gray-300 text-gray-800 font-bold uppercase text-xs">
                          <th className="border border-gray-400 px-2 py-1.5 text-left w-1/5">BANCO / CONCEPTO</th>
                          {days.map(d => (
                              <th key={d.id} className="border border-gray-400 px-2 py-1.5 text-center w-[10%]">{d.label}</th>
                          ))}
                          <th className="border border-gray-400 px-2 py-1.5 text-center bg-gray-400 text-black w-[10%]">TOTAL</th>
                      </tr>
                  </thead>
                  <tbody>
                      {/* COLOCACION GROUP */}
                      {data['COLOCACION'].indicators.length > 0 && (
                          <>
                              <tr className="bg-gray-100 font-bold text-xs"><td colSpan={9} className="border border-gray-300 px-2 py-1 text-center bg-gray-200">COLOCACIÓN</td></tr>
                              {data['COLOCACION'].indicators.map(ind => (
                                  <TableRow key={ind.id} ind={ind} days={days} />
                              ))}
                          </>
                      )}

                       {/* CAPTACION GROUP */}
                       {data['CAPTACION'].indicators.length > 0 && (
                          <>
                              <tr className="bg-gray-100 font-bold text-xs"><td colSpan={9} className="border border-gray-300 px-2 py-1 text-center bg-gray-200">CAPTACIÓN</td></tr>
                              {data['CAPTACION'].indicators.map(ind => (
                                  <TableRow key={ind.id} ind={ind} days={days} />
                              ))}
                          </>
                      )}

                      {/* TOTAL SAN GROUP */}
                      {data['TOTAL_SAN'].indicators.length > 0 && (
                          <>
                              <tr className="bg-gray-100 font-bold text-xs"><td colSpan={9} className="border border-gray-300 px-2 py-1 text-center bg-gray-400 text-white uppercase tracking-wider">TOTAL SAN</td></tr>
                              {data['TOTAL_SAN'].indicators.map(ind => (
                                  <TableRow key={ind.id} ind={ind} days={days} />
                              ))}
                          </>
                      )}
                  </tbody>
              </table>
          </div>
          
          <div className="hidden print:block mt-8 text-xs text-gray-500 text-center">
              Generado el {new Date().toLocaleDateString()} - Sistema Equipo BAZ
          </div>
      </div>
    </div>
  );
};

const TableRow: React.FC<{ ind: any, days: any[] }> = ({ ind, days }) => {
    const format = (val: number) => {
        if (ind.unit === '$') return `$${val.toLocaleString(undefined, {maximumFractionDigits:0})}`;
        if (ind.unit === '%') return `${val.toFixed(0)}%`;
        return val.toLocaleString(undefined, {maximumFractionDigits:0});
    };

    return (
        <tr className="hover:bg-gray-50 text-xs text-gray-700 font-medium">
            <td className="border border-gray-300 px-2 py-1.5 text-left font-bold text-gray-800">{ind.name}</td>
            {days.map((d: any) => (
                <td key={d.id} className="border border-gray-300 px-2 py-1.5 text-center">
                    {format(ind.dailyValues[d.id])}
                </td>
            ))}
            <td className="border border-gray-300 px-2 py-1.5 text-center font-bold bg-gray-100">
                {format(ind.total)}
            </td>
        </tr>
    );
};

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
