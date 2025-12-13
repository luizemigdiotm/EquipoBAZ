
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { AppliesTo, Position, ReportType, Advisor, RecordData, BudgetConfig, Indicator } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trophy, Filter, X, ChevronLeft, Users, Briefcase, BarChart2, Ghost, Printer, Share2, Award, Medal, CheckCircle, AlertTriangle, Target, MessageCircle, Clock, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';

export const Dashboard = () => {
    const { records, advisors, indicators, budgets, branchConfig, saveBudget } = useData();

    // --- GLOBAL FILTERS STATE ---
    const [filterType, setFilterType] = useState<'DAY' | 'WEEK' | 'TRIMESTER' | 'YEAR'>('WEEK');

    // Detailed states for precise filtering
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));

    // Q1: 1-13, Q2: 14-26, Q3: 27-39, Q4: 40-52
    const currentWeek = getWeekNumber(new Date());
    const currentQuarter = currentWeek <= 13 ? 1 : currentWeek <= 26 ? 2 : currentWeek <= 39 ? 3 : 4;
    const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);

    // View Mode
    const [viewMode, setViewMode] = useState<'BRANCH' | 'ADVISOR'>('BRANCH');
    const [advisorRoleFilter, setAdvisorRoleFilter] = useState<'ALL' | Position.LOAN_ADVISOR | Position.AFFILIATION_ADVISOR>('ALL');
    const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');

    // Modal State
    const [showRanking, setShowRanking] = useState(false);
    const [showMute, setShowMute] = useState(false);
    const [historyIndicator, setHistoryIndicator] = useState<any | null>(null);

    // NEW STATE: Daily Commitment Mode
    const [showDailyCommitment, setShowDailyCommitment] = useState(false);

    // Real-time Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- HELPERS ---

    const getFilteredRecords = (
        sourceRecords: RecordData[],
        type: 'DAY' | 'WEEK' | 'TRIMESTER' | 'YEAR',
        year: number,
        quarter: number,
        week: number,
        dateStr: string
    ) => {
        return sourceRecords.filter(rec => {
            if (type === 'DAY') return rec.date === dateStr;
            if (type === 'WEEK') return rec.year === year && rec.week === week;
            if (type === 'TRIMESTER') {
                const startWeek = (quarter - 1) * 13 + 1;
                const endWeek = quarter * 13;
                return rec.year === year && rec.week >= startWeek && rec.week <= endWeek;
            }
            if (type === 'YEAR') return rec.year === year;
            return true;
        });
    };

    const dashboardRecords = useMemo(() => {
        return getFilteredRecords(records, filterType, selectedYear, selectedQuarter, selectedWeek, selectedDate);
    }, [records, filterType, selectedYear, selectedQuarter, selectedWeek, selectedDate]);

    const calculateSpecificTarget = (
        indicatorId: string,
        targetId: string,
        advPosition: Position | undefined,
        fType: 'DAY' | 'WEEK' | 'TRIMESTER' | 'YEAR',
        year: number,
        week: number,
        quarter: number,
        dayIndex: number
    ) => {

        const indicator = indicators.find(i => i.id === indicatorId);
        // Auto-detect average type if unit is %
        const isAverage = indicator?.isAverage === true || indicator?.unit === '%';

        let relevantBudgets = budgets.filter(b => b.indicatorId === indicatorId && b.targetId === targetId);

        if (relevantBudgets.length === 0 && targetId !== 'BRANCH_GLOBAL' && advPosition) {
            const posId = `POS_${advPosition}`;
            const posBudgets = budgets.filter(b => b.indicatorId === indicatorId && b.targetId === posId);
            if (posBudgets.length > 0) {
                relevantBudgets = posBudgets;
            }
        }

        let totalTarget = 0;
        let count = 0;

        if (fType === 'WEEK') {
            const weekBudgets = relevantBudgets.filter(b => b.year === year && b.week === week);
            const weeklyConfig = weekBudgets.find(b => b.periodType === 'WEEKLY');
            if (weeklyConfig) {
                totalTarget = weeklyConfig.amount;
            } else {
                // Deduplicate daily budgets: Take the LAST one for each dayOfWeek
                const uniqueDays = new Map<number, number>();
                weekBudgets.filter(b => b.periodType === 'DAILY').forEach(b => {
                    if (b.dayOfWeek !== undefined) {
                        uniqueDays.set(b.dayOfWeek, b.amount);
                    }
                });
                totalTarget = Array.from(uniqueDays.values()).reduce((sum, v) => sum + v, 0);
            }
        } else if (fType === 'DAY') {
            const weekBudgets = relevantBudgets.filter(b => b.year === year && b.week === week);

            // PRIORIDAD FIX: Primero buscar configuración DIARIA ESPECÍFICA.
            // Si existe un valor explícito para este día, usarlo.
            const dailyConfig = weekBudgets.find(b => b.periodType === 'DAILY' && b.dayOfWeek === dayIndex);

            if (dailyConfig) {
                totalTarget = dailyConfig.amount;
            } else {
                // Si no hay diario, buscar semanal y dividir/promediar
                const weeklyConfig = weekBudgets.find(b => b.periodType === 'WEEKLY');
                if (weeklyConfig) {
                    if (isAverage) totalTarget = weeklyConfig.amount;
                    else totalTarget = weeklyConfig.amount / 7;
                }
            }
        } else if (fType === 'TRIMESTER') {
            const startWeek = (quarter - 1) * 13 + 1;
            const endWeek = quarter * 13;

            // Deduplicate logic: Track weeks we have already added
            const processedWeeks = new Set<number>();

            relevantBudgets.filter(b => b.year === year && b.week >= startWeek && b.week <= endWeek).forEach(b => {
                if (b.periodType === 'WEEKLY') {
                    if (!processedWeeks.has(b.week)) {
                        totalTarget += b.amount;
                        // Only increment count if we haven't seen this week
                        count++;
                        processedWeeks.add(b.week);
                    }
                }
            });
            if (isAverage && count > 0) totalTarget = totalTarget / count;
        } else if (fType === 'YEAR') {
            // Deduplicate logic for Year
            const processedWeeks = new Set<number>();

            relevantBudgets.filter(b => b.year === year && b.periodType === 'WEEKLY').forEach(b => {
                if (!processedWeeks.has(b.week)) {
                    totalTarget += b.amount;
                    count++;
                    processedWeeks.add(b.week);
                }
            });
            if (isAverage && count > 0) totalTarget = totalTarget / count;
        }

        return totalTarget;
    };

    // --- DAILY COMMITMENT CALCULATION LOGIC ---
    const calculateAdjustedDailyCommitment = (
        ind: Indicator,
        targetId: string,
        advPosition: Position | undefined
    ): { value: number; isDeficit: boolean } => {
        const today = new Date();
        // Adjust to use the selected Date if in Day filter, otherwise use Today
        const refDate = filterType === 'DAY' ? new Date(selectedDate) : today;
        const dayIndex = refDate.getDay(); // 0-6
        const currentYear = selectedYear;
        const currentWeekNum = selectedWeek;

        // 1. Get Today's Base Target
        const todayBaseTarget = calculateSpecificTarget(ind.id, targetId, advPosition, 'DAY', currentYear, currentWeekNum, selectedQuarter, dayIndex);

        // If it's an average indicator (like %), we don't accumulate past deficits, we just return today's target
        if (ind.isAverage || ind.unit === '%') return { value: todayBaseTarget, isDeficit: false };

        // 2. Calculate Accumulated Target (Mon -> Yesterday)
        // Days to sum: From 1 (Mon) up to dayIndex - 1. 
        // If today is Mon (1), loop doesn't run, accumulation is 0.
        let accumTarget = 0;
        let accumReal = 0;

        // If Today is Sunday (0), we check Mon(1) to Sat(6). If Today is Mon(1), we check nothing.
        const daysToCheck = dayIndex === 0 ? [1, 2, 3, 4, 5, 6] : Array.from({ length: dayIndex - 1 }, (_, i) => i + 1);

        // Get Records for this week
        const weekRecords = records.filter(r =>
            r.year === currentYear &&
            r.week === currentWeekNum &&
            (viewMode === 'BRANCH' ? r.type === ReportType.BRANCH : (r.type === ReportType.INDIVIDUAL && r.advisorId === targetId))
        );

        daysToCheck.forEach(d => {
            // Target
            const t = calculateSpecificTarget(ind.id, targetId, advPosition, 'DAY', currentYear, currentWeekNum, selectedQuarter, d);
            accumTarget += t;

            // Real
            // Sum daily records for day d
            const dailyRec = weekRecords.find(r => r.frequency === 'DAILY' && r.dayOfWeek === d);
            if (dailyRec) {
                accumReal += (dailyRec.values[ind.id] || 0);
            }
        });

        // 3. Difference (Real - Target)
        // Deficit definition: Target > Real. Deficit Amount = Target - Real
        // Previous logic was Real - Target. If negative -> Deficit.
        // e.g. Real 399 - Target 527 = -128. Deficit is 128.
        // 3. Difference (Real - Target)
        // Deficit definition: Target > Real. Deficit Amount = Target - Real
        // Previous logic was Real - Target. If negative -> Deficit.
        // e.g. Real 399 - Target 527 = -128. Deficit is 128.
        const difference = accumReal - accumTarget;

        // 4. Logic: If difference is negative (Deficit), add abs(difference) to Today's Target.
        // Use PRECISE values (no intermediate rounding)
        const isDeficit = difference < 0;

        if (isDeficit) {
            // Apply Ceiling ONLY at the very end
            // O = Abs(VS) + OB
            const deficitAmount = Math.abs(difference);
            const finalCommitment = todayBaseTarget + deficitAmount;

            console.log(`[COMMITMENT_DEBUG] Ind: ${ind.name} | AccumTarget: ${accumTarget} | AccumReal: ${accumReal} | Diff: ${difference} | TodayBase: ${todayBaseTarget} | FinalRaw: ${finalCommitment} | FinalRounded: ${Math.ceil(finalCommitment)}`);

            return { value: Math.ceil(finalCommitment), isDeficit: true };
        } else {
            // If positive, we are ahead. Commitment is just today's base.
            return { value: Math.ceil(todayBaseTarget), isDeficit: false };
        }
    };

    // --- AGGREGATION & METRICS ---
    const getAggregatedValue = (indicator: any) => {
        if (viewMode === 'ADVISOR' && !selectedAdvisorId) return 0;

        // FIX: PARANOID FILTER for Branch View.
        // Explicitly exclude ANY individual record first.
        if (viewMode === 'BRANCH') {
            if (r.type === 'Individual' || r.type === ReportType.INDIVIDUAL) return false;
            // After explicit exclusion, require strict Branch type match AND no advisorId
            return (r.type === 'Sucursal' || r.type === ReportType.BRANCH) && !r.advisorId;
        }
        return r.type === ReportType.INDIVIDUAL && r.advisorId === selectedAdvisorId;
    });

    // Auto-detect average type if unit is %
    const isAverage = indicator.isAverage || indicator.unit === '%';

    // ROBUST AGGREGATION: Group by Advisor -> Deduplicate frequency -> Sum
    // This handles:
    // 1. Hybrid scenarios (Advisor A daily, Advisor B weekly)
    // 2. Database duplicates (Multiple rows for same Monday) by taking the last/first one

    const advisorMap = new Map<string, RecordData[]>();
    relevantRecords.forEach(r => {
        const k = r.advisorId;
        if (!advisorMap.has(k)) advisorMap.set(k, []);
        advisorMap.get(k)?.push(r);
    });

    let totalSum = 0;
    let totalCount = 0;

    advisorMap.forEach((recs) => {
        // For THIS advisor, decide value.
        // Deduplicate Daily: Map<day, val>
        const dailyValues = new Map<number, number>();
        // Deduplicate Weekly: Just take one
        let weeklyVal = 0;
        let hasWeekly = false;

        recs.forEach(r => {
            const val = r.values[indicator.id] || 0;
            if (r.frequency === 'DAILY') {
                // Overwrite duplicates for same day
                if (r.dayOfWeek !== undefined) dailyValues.set(r.dayOfWeek, val);
            } else if (filterType !== 'WEEK') {
                // Only consider WEEKLY records if NOT in 'WEEK' view (or if we want to allow mixed).
                // verification suggests User wants Table Logic: Sum of Dailies ONLY for Weekly View.
                // Ignoring Weekly records in WEEK view prevents "Zombie" Weekly data from appearing 
                // when Dailies are deleted.
                weeklyVal = val;
                hasWeekly = true;
            }
        });

        let advisorVal = 0;
        if (dailyValues.size > 0) {
            advisorVal = Array.from(dailyValues.values()).reduce((a, b) => a + b, 0);
        } else if (hasWeekly) {
            advisorVal = weeklyVal;
        }

        if (indicator.isAverage || indicator.unit === '%') {
            // For averages, we might need different logic (e.g. sum of percentages? or avg of percentages?)
            // Usually avg of percentages = sum / count
            totalSum += advisorVal;
            totalCount++;
        } else {
            totalSum += advisorVal;
        }
    });

    if (indicator.isAverage || indicator.unit === '%') {
        return Math.ceil(totalCount > 0 ? totalSum / totalCount : 0);
    } else {
        return Math.ceil(totalSum);
    }
};

// ... [Inside IndicatorHistoryModal tableData useMemo] ...

// ... relevantBudgets filter ...

// Deduplicate Daily Budgets
const dailyBudgetMap = new Map<number, number>();
relevantBudgets.filter((b: any) => b.periodType === 'DAILY').forEach((b: any) => {
    // Ensure key is Number to match day.id
    if (b.dayOfWeek !== undefined && b.dayOfWeek !== null) {
        dailyBudgetMap.set(Number(b.dayOfWeek), b.amount);
    }
});

const weeklyConfig = relevantBudgets.find((b: any) => b.periodType === 'WEEKLY');

// Calculate Total Target carefully
let weeklyTargetTotal = 0;
if (weeklyConfig) {
    weeklyTargetTotal = weeklyConfig.amount;
} else {
    weeklyTargetTotal = Array.from(dailyBudgetMap.values()).reduce((sum, val) => sum + val, 0);
}

// Fix: If isAverage, don't divide by 7
const dailyTargetFallback = isAverage ? weeklyTargetTotal : (weeklyTargetTotal > 0 ? weeklyTargetTotal / 7 : 0);

rows = days.map(day => {
    // Correct Priority: Specific Daily > Weekly Fallback
    let target = 0;
    // Robust lookup: try Number
    const specificAmount = dailyBudgetMap.get(Number(day.id));

    if (specificAmount !== undefined) {
        target = specificAmount;
    } else if (weeklyConfig) {
        target = dailyTargetFallback;
    }

    const dailyR = currentRecords.find((r: RecordData) => r.frequency === 'DAILY' && r.dayOfWeek === day.id);
    const real = dailyR ? (dailyR.values[indicator.id] || 0) : 0;
    const dailyPrev = prevRecords.find((r: RecordData) => r.frequency === 'DAILY' && r.dayOfWeek === day.id);
    const prev = dailyPrev ? (dailyPrev.values[indicator.id] || 0) : 0;
    totalReal += real; totalTarget += target; totalPrev += prev;
    return { label: day.label, target, real, prev };
});

// Fix: Don't overwrite totalReal with Weekly Record if we just calculated it from Dailies
// const weeklyRec = currentRecords.find((r: RecordData) => r.frequency === 'WEEKLY'); if (weeklyRec) totalReal = weeklyRec.values[indicator.id] || 0;

// Logic: If we found dailies (rows summed > 0 or currentRecords has daily), keep sum. 
// Only use weeklyRec if totalReal is 0 AND we have a weekly rec? 
// Actually, if we are in 'Desglose Diario', showing the sum of days is always more accurate to the view than a stale weekly total.
// If the user entered Weekly data only, 'days' loop (frequency='DAILY') yields 0 reals. 
// In that case, rows show 0. Modal shows 0. Total shows Weekly?
// If rows show 0, Total should probably match. showing 664 in Total while rows are 0 is confusing.
// So removing the overwrite is correct for consistency. 
// Use sum of rows.


const displayMetrics = useMemo(() => {
    if (viewMode === 'ADVISOR' && !selectedAdvisorId) return [];

    let relevantInds = indicators;
    let position: Position | undefined;

    if (viewMode === 'ADVISOR' && selectedAdvisorId) {
        const adv = advisors.find(a => a.id === selectedAdvisorId);
        if (adv) {
            position = adv.position;
            relevantInds = indicators.filter(i => {
                if (i.roles && i.roles.length > 0) return i.roles.includes(adv.position);
                return (adv.position === Position.LOAN_ADVISOR && (i.appliesTo === AppliesTo.LOAN || i.appliesTo === AppliesTo.ALL)) ||
                    (adv.position === Position.AFFILIATION_ADVISOR && (i.appliesTo === AppliesTo.AFFILIATION || i.appliesTo === AppliesTo.ALL));
            });
        }
    } else {
        relevantInds = indicators.filter(i => {
            if (i.roles && i.roles.length > 0) return i.roles.includes('BRANCH');
            return i.appliesTo === AppliesTo.BRANCH || i.appliesTo === AppliesTo.ALL;
        });
    }

    const d = new Date(selectedDate);
    const dayIndex = d.getDay();
    const calcWeek = filterType === 'DAY' ? getWeekNumber(d) : selectedWeek;
    const calcYear = filterType === 'DAY' ? d.getFullYear() : selectedYear;

    const currentWeekNum = getWeekNumber(new Date());
    let remainingWeeks = 1;
    if (filterType === 'YEAR') {
        remainingWeeks = Math.max(1, 52 - currentWeekNum);
    } else if (filterType === 'TRIMESTER') {
        const endWeek = selectedQuarter * 13;
        remainingWeeks = Math.max(1, endWeek - currentWeekNum);
        if (remainingWeeks < 0) remainingWeeks = 0;
    }

    return relevantInds.map(ind => {
        const actual = getAggregatedValue(ind);
        const targetId = viewMode === 'BRANCH' ? 'BRANCH_GLOBAL' : selectedAdvisorId;

        let target = 0;
        let isDeficit = false;

        if (showDailyCommitment) {
            // Calculate adjusted daily target AND deficit status
            const result = calculateAdjustedDailyCommitment(ind, targetId, position);
            target = result.value;
            isDeficit = result.isDeficit;
        } else {
            // Standard Calculation
            target = calculateSpecificTarget(ind.id, targetId, position, filterType, calcYear, calcWeek, selectedQuarter, dayIndex);
        }

        const percentage = target > 0 ? (actual / target) * 100 : (actual > 0 ? 100 : 0);
        const remaining = Math.max(0, target - actual);

        let pace = 0;
        let paceLabel = '';

        // Auto-detect average type if unit is %
        const isAverage = ind.isAverage || ind.unit === '%';

        if (!showDailyCommitment && !isAverage && (filterType === 'TRIMESTER' || filterType === 'YEAR')) {
            if (remaining > 0 && remainingWeeks > 0) {
                pace = Math.ceil(remaining / remainingWeeks);
                paceLabel = `Falta x Semana`;
            }
        }

        let remaining80 = 0;
        if (ind.group === 'TOTAL_SAN' && target > 0) {
            const target80 = Math.ceil(target * 0.8);
            remaining80 = Math.max(0, target80 - actual);
        }

        return { ...ind, actual, target, percentage, remaining, pace, paceLabel, remaining80, isDeficit };
    }).sort((a, b) => b.percentage - a.percentage);
}, [dashboardRecords, indicators, budgets, viewMode, selectedAdvisorId, filterType, selectedYear, selectedWeek, selectedQuarter, selectedDate, showDailyCommitment]);


// --- GROUPED METRICS ---
const groupedMetrics = useMemo(() => {
    const groups: any = {
        'COLOCACION': { title: 'BANCO', items: [], color: 'border-red-500 shadow-red-50', headerColor: 'text-red-700 bg-red-50' },
        'CAPTACION': { title: 'CAPTACIÓN', items: [], color: 'border-sky-500 shadow-sky-50', headerColor: 'text-sky-700 bg-sky-50' },
        'TOTAL_SAN': { title: 'TOTAL SAN', items: [], color: 'border-fuchsia-500 shadow-fuchsia-50', headerColor: 'text-fuchsia-700 bg-fuchsia-50' },
        'OTHER': { title: 'Otros Indicadores', items: [], color: 'border-gray-300 shadow-sm', headerColor: 'text-gray-700 bg-gray-50' }
    };

    displayMetrics.forEach(m => {
        if (m.group && groups[m.group]) {
            groups[m.group].items.push(m);
        } else {
            groups['OTHER'].items.push(m);
        }
    });

    return groups;
}, [displayMetrics]);

// --- ADVISOR LIST SUMMARY (Keep existing logic, omitted for brevity in this snippet as it is unchanged logic) ---
const advisorSummaryList = useMemo(() => {
    // ... (Existing advisor summary logic, kept same as previous file)
    if (viewMode !== 'ADVISOR' || selectedAdvisorId) return [];

    const filteredAdvisors = advisors.filter(a => {
        if (advisorRoleFilter === 'ALL') return true;
        return a.position === advisorRoleFilter;
    });

    const d = new Date(selectedDate);
    const dayIndex = d.getDay();
    const calcWeek = filterType === 'DAY' ? getWeekNumber(d) : selectedWeek;
    const calcYear = filterType === 'DAY' ? d.getFullYear() : selectedYear;

    return filteredAdvisors.map(adv => {
        const advIndicators = indicators.filter(i => {
            if (i.roles && i.roles.length > 0) return i.roles.includes(adv.position);
            return (adv.position === Position.LOAN_ADVISOR && (i.appliesTo === AppliesTo.LOAN || i.appliesTo === AppliesTo.ALL)) ||
                (adv.position === Position.AFFILIATION_ADVISOR && (i.appliesTo === AppliesTo.AFFILIATION || i.appliesTo === AppliesTo.ALL));
        });

        if (advIndicators.length === 0) return { ...adv, percentage: 0, scorePoints: 0 };

        let totalConfiguredWeight = 0;
        advIndicators.forEach(ind => {
            const weight = adv.position === Position.LOAN_ADVISOR ? ind.weightLoan : ind.weightAffiliation;
            if (weight && weight > 0) totalConfiguredWeight += weight;
        });

        let totalPoints = 0;
        let maxPossiblePoints = totalConfiguredWeight > 0 ? totalConfiguredWeight : 100;
        const defaultWeight = totalConfiguredWeight === 0 ? (100 / advIndicators.length) : 0;

        const advRecords = dashboardRecords.filter(r => r.advisorId === adv.id);

        advIndicators.forEach(ind => {
            // Auto-detect average type if unit is %
            const isAverage = ind.isAverage || ind.unit === '%';

            let actual = 0;
            if (isAverage && (filterType === 'TRIMESTER' || filterType === 'YEAR')) {
                let sum = 0;
                let count = 0;
                advRecords.forEach(r => {
                    const val = r.values[ind.id];
                    if (val !== undefined) { sum += val; count++; }
                });
                if (count > 0) actual = sum / count;
            } else {
                actual = advRecords.reduce((sum, r) => sum + (r.values[ind.id] || 0), 0);
            }

            const target = calculateSpecificTarget(ind.id, adv.id, adv.position, filterType, calcYear, calcWeek, selectedQuarter, dayIndex);

            let weight = 0;
            if (totalConfiguredWeight > 0) {
                weight = (adv.position === Position.LOAN_ADVISOR ? ind.weightLoan : ind.weightAffiliation) || 0;
            } else {
                weight = defaultWeight;
            }

            if (target > 0) {
                const compliance = actual / target;
                const points = compliance * weight;
                totalPoints += points;
            }
        });

        const finalPct = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;
        return { ...adv, percentage: Math.ceil(finalPct), scorePoints: Math.ceil(totalPoints) };
    }).sort((a, b) => b.percentage - a.percentage);
}, [advisors, viewMode, selectedAdvisorId, advisorRoleFilter, dashboardRecords, indicators, budgets, filterType, selectedYear, selectedWeek, selectedQuarter, selectedDate]);


const years = [2023, 2024, 2025, 2026];
const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

const handlePrint = () => {
    window.print();
};

const handleWhatsAppCommitment = () => {
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const todayName = days[new Date().getDay()];

    let text = `*Compromiso ${todayName}*\n\n`;

    // Helper to format item
    const formatItem = (item: any) => {
        const val = item.unit === '$' ? `$${item.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.unit === '%' ? `${item.target.toFixed(0)}%` : `#${item.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        // Use emoji based on deficit status
        const emoji = item.isDeficit ? '🔴' : '🟢';
        return `- ${emoji} ${item.name}${".".repeat(Math.max(1, 15 - item.name.length))} *${val}*\n`;
    };

    // Iterate Groups in Order
    const groups = ['COLOCACION', 'CAPTACION', 'TOTAL_SAN', 'OTHER'];
    const groupLabels: any = { 'COLOCACION': '💰 _Colocación_', 'CAPTACION': '💸 _Captación_', 'TOTAL_SAN': '🏦 _Total SAN_', 'OTHER': '📂 _Otros_' };

    groups.forEach(key => {
        const group = groupedMetrics[key];
        if (group && group.items.length > 0) {
            text += `*${group.title}:*\n\n`;
            text += `${groupLabels[key] || '_Items_'}\n`;
            group.items.forEach((item: any) => {
                text += formatItem(item);
            });
            text += `\n`;
        }
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

const handleSyncBudgets = async () => {
    if (!confirm('¿Estás seguro de actualizar el presupuesto oficial (Base de Datos) con los compromisos ajustados de hoy? Esto afectará la meta mostrada en la Pizarra Gerencial.')) return;

    const refDate = filterType === 'DAY' ? new Date(selectedDate) : new Date();
    const year = refDate.getFullYear();
    const week = getWeekNumber(refDate);
    const dayOfWeek = refDate.getDay();

    // Use visible metrics (displayMetrics) as the source
    const metricsToSync = displayMetrics;

    const newConfigs: BudgetConfig[] = [];

    metricsToSync.forEach(m => {
        // Re-calculate the Adjusted Target
        const result = calculateAdjustedDailyCommitment(m, viewMode === 'BRANCH' ? 'BRANCH_GLOBAL' : (selectedAdvisorId || 'BRANCH_GLOBAL'), viewMode === 'ADVISOR' && selectedAdvisorId ? advisors.find(a => a.id === selectedAdvisorId)?.position : undefined);

        if (result.value > 0) {
            newConfigs.push({
                id: '', // Let DB generate or Merge
                year: year,
                week: week,
                // FIX: 'frequency' was wrong. BudgetConfig uses 'periodType'.
                periodType: 'DAILY',
                dayOfWeek: dayOfWeek,
                indicatorId: m.id,
                targetId: viewMode === 'BRANCH' ? 'BRANCH_GLOBAL' : (selectedAdvisorId || 'BRANCH_GLOBAL'),
                amount: result.value // This is the ADJUSTED amount (Base + Deficit)
            });
        }
    });

    if (newConfigs.length > 0) {
        await saveBudget(newConfigs, year, week);
        alert(`Se actualizaron ${newConfigs.length} metas correctamente.`);
    } else {
        alert('No hay metas calculadas para sincronizar.');
    }
};



return (
    <div className="p-4 md:p-6 space-y-6 relative">
        {/* HEADER */}
        <div className={`bg-white p-4 rounded-lg shadow space-y-4 print:shadow-none print:border-none ${historyIndicator ? 'print:hidden' : ''}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-bank-900">Equipo BAZ</h1>
                    <p className="text-sm text-gray-500">Dashboard de Resultados</p>
                </div>

                {/* REAL TIME CLOCK */}
                <div className="hidden md:flex flex-col items-end px-4 border-r border-gray-100 mr-4">
                    <div className="text-2xl font-bold text-bank-800 tabular-nums">
                        {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                        {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap print:hidden justify-end">
                    <button
                        onClick={() => setShowDailyCommitment(!showDailyCommitment)}
                        className={`flex items-center font-bold py-2 px-4 rounded shadow transition-colors ${showDailyCommitment ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}
                        title={showDailyCommitment ? "Ver Metas Estándar" : "Ver Compromiso del Día (Incluye déficit)"}
                    >
                        <Target className="mr-2 h-5 w-5" />
                        {showDailyCommitment ? 'Meta Estándar' : 'Compromisos Hoy'}
                    </button>

                    {showDailyCommitment && (
                        <>
                            <button
                                onClick={handleWhatsAppCommitment}
                                className="flex items-center bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow transition-colors"
                                title="Compartir Compromisos por WhatsApp"
                            >
                                <MessageCircle className="mr-2 h-5 w-5" />
                                WhatsApp
                            </button>

                        </>
                    )}

                    <button
                        onClick={() => setShowMute(true)}
                        className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded shadow transition-colors"
                    >
                        <Ghost className="mr-2 h-5 w-5" />
                        Mudos
                    </button>
                    <button
                        onClick={() => setShowRanking(true)}
                        className="flex items-center bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded shadow transition-colors"
                    >
                        <Trophy className="mr-2 h-5 w-5" />
                        Ranking
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center bg-bank-600 hover:bg-bank-700 text-white font-bold py-2 px-4 rounded shadow transition-colors"
                        title="Imprimir Dashboard"
                    >
                        <Printer className="mr-2 h-5 w-5" />
                        Imprimir
                    </button>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row gap-4 border-t pt-4 flex-wrap print:hidden">
                {/* ... Existing Filters code ... */}
                <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Periodo</label>
                    <div className="flex items-center border rounded px-2 bg-gray-50">
                        <Filter size={16} className="text-gray-500 mr-2" />
                        <select className="bg-transparent py-2 w-full outline-none text-sm" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                            <option value="DAY">Día Específico</option>
                            <option value="WEEK">Semana</option>
                            <option value="TRIMESTER">Trimestre</option>
                            <option value="YEAR">Año</option>
                        </select>
                    </div>
                </div>

                {filterType === 'DAY' && (
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha</label>
                        <input type="date" className="w-full border rounded p-2 text-sm bg-gray-50" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    </div>
                )}

                {(filterType === 'WEEK' || filterType === 'TRIMESTER' || filterType === 'YEAR') && (
                    <div className="flex-1 min-w-[100px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Año</label>
                        <select className="w-full border rounded p-2 text-sm bg-gray-50" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}

                {filterType === 'WEEK' && (
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Semana</label>
                        <select className="w-full border rounded p-2 text-sm bg-gray-50" value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))}>
                            {weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
                        </select>
                    </div>
                )}

                {filterType === 'TRIMESTER' && (
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Trimestre</label>
                        <select className="w-full border rounded p-2 text-sm bg-gray-50" value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))}>
                            <option value={1}>Q1 (Sem 1-13)</option>
                            <option value={2}>Q2 (Sem 14-26)</option>
                            <option value={3}>Q3 (Sem 27-39)</option>
                            <option value={4}>Q4 (Sem 40-52)</option>
                        </select>
                    </div>
                )}

                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Vista</label>
                    <select className="w-full border rounded p-2 text-sm bg-gray-50 font-medium text-bank-800" value={viewMode} onChange={e => { setViewMode(e.target.value as any); setSelectedAdvisorId(''); }}>
                        <option value="BRANCH">Sucursal</option>
                        <option value="ADVISOR">Colaborador</option>
                    </select>
                </div>

                {viewMode === 'ADVISOR' && (
                    <>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Puesto</label>
                            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={advisorRoleFilter} onChange={e => setAdvisorRoleFilter(e.target.value as any)} disabled={!!selectedAdvisorId}>
                                <option value="ALL">Todos los Puestos</option>
                                <option value={Position.LOAN_ADVISOR}>{Position.LOAN_ADVISOR}</option>
                                <option value={Position.AFFILIATION_ADVISOR}>{Position.AFFILIATION_ADVISOR}</option>
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Colaborador</label>
                            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={selectedAdvisorId} onChange={e => setSelectedAdvisorId(e.target.value)}>
                                <option value="">-- Ver Todos (Resumen) --</option>
                                {advisors.filter(a => advisorRoleFilter === 'ALL' || a.position === advisorRoleFilter).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </>
                )}
            </div>

            {/* PRINT HEADER */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold">Reporte de Resultados: {filterType === 'WEEK' ? `Semana ${selectedWeek}` : filterType === 'DAY' ? selectedDate : `Año ${selectedYear}`}</h2>
                <div className="text-sm text-gray-500 mt-1">Generado: {currentTime.toLocaleString()}</div>
                {showDailyCommitment && <h3 className="text-lg font-bold text-orange-600">COMPROMISOS DEL DÍA (AJUSTADO)</h3>}
            </div>
        </div>

        {/* ADVISOR DIRECTORY */}
        {
            viewMode === 'ADVISOR' && !selectedAdvisorId && (
                <div className={`animate-fade-in-up ${historyIndicator ? 'print:hidden' : ''}`}>
                    {/* Same Advisor Directory code... */}
                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center print:hidden">
                        <Users className="mr-2" /> Directorio de Asesores
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-3">
                        {advisorSummaryList.map(adv => (
                            <div key={adv.id} onClick={() => setSelectedAdvisorId(adv.id)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:border-bank-400 transition-all group relative overflow-hidden break-inside-avoid">
                                <div className={`absolute top-0 left-0 w-2 h-full ${adv.position === Position.LOAN_ADVISOR ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                                <div className="ml-3">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 flex-shrink-0">
                                            {adv.photoUrl ? <img src={adv.photoUrl} alt={adv.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"><Briefcase size={20} /></div>}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 leading-tight group-hover:text-bank-600 transition-colors">{adv.name}</h4>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${adv.position === Position.LOAN_ADVISOR ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {adv.position === Position.LOAN_ADVISOR ? 'Préstamos' : 'Afiliación'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-500">Puntaje</span>
                                            <span className={`text-xl font-bold ${adv.percentage >= 100 ? 'text-green-600' : adv.percentage >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {adv.scorePoints?.toFixed(0) || 0} pts
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                            <div className={`h-2 rounded-full ${adv.percentage >= 100 ? 'bg-green-500' : adv.percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(adv.percentage, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }

        {/* METRICS & CHARTS */}
        {
            ((viewMode === 'ADVISOR' && selectedAdvisorId) || viewMode === 'BRANCH') && (
                <div className={historyIndicator ? 'print:hidden' : ''}>
                    {viewMode === 'ADVISOR' && selectedAdvisorId && (
                        <button onClick={() => setSelectedAdvisorId('')} className="flex items-center text-bank-600 font-semibold hover:underline mb-2 print:hidden">
                            <ChevronLeft className="w-5 h-5" /> Volver a la lista de asesores
                        </button>
                    )}

                    {showDailyCommitment && (
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg shadow-sm">
                            <div className="flex">
                                <div className="flex-shrink-0"><Target className="h-5 w-5 text-orange-500" /></div>
                                <div className="ml-3">
                                    <p className="text-sm font-bold text-orange-800 uppercase tracking-wide">Vista: Compromisos del Día Ajustados</p>
                                    <p className="text-xs text-orange-700 mt-1">
                                        Los objetivos mostrados incluyen el déficit acumulado desde el Lunes hasta ayer.
                                        <br />Calculado: (Meta Acumulada - Real Acumulado) + Meta Hoy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GROUPED INDICATORS RENDER */}
                    {['COLOCACION', 'CAPTACION', 'TOTAL_SAN', 'OTHER'].map(groupKey => {
                        const group = groupedMetrics[groupKey];
                        if (group.items.length === 0) return null;

                        return (
                            <div key={groupKey} className="mb-8">
                                <div className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg ${group.headerColor}`}>
                                    <h3 className="font-bold text-sm uppercase tracking-wider">{group.title}</h3>
                                    <span className="text-xs font-bold opacity-70">{group.items.length} Indicadores</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up print:grid-cols-4">
                                    {group.items.map((item: any) => (
                                        <div key={item.id} onClick={() => setHistoryIndicator(item)} className={`bg-white rounded-lg shadow p-4 relative overflow-hidden transition-all hover:scale-105 cursor-pointer hover:shadow-lg group break-inside-avoid border-l-4 ${group.color}`}>

                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-sm font-medium text-gray-500 truncate pr-4">{item.name}</h3>
                                                {!showDailyCommitment && (
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.percentage >= 100 ? 'bg-green-100 text-green-800' : item.percentage >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                        {item.percentage.toFixed(0)}%
                                                    </span>
                                                )}
                                                {showDailyCommitment && (
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200 uppercase">
                                                        Meta Hoy
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-end space-x-2 mb-3">
                                                {/* In Daily Commitment Mode, The Main Number is TARGET, not Actual */}
                                                {showDailyCommitment ? (
                                                    <>
                                                        <span className={`text-2xl font-bold ${item.isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                                                            {item.unit === '$' ? `$${item.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                            {item.unit === '%' ? '%' : ''}
                                                        </span>
                                                        <span className="text-xs text-gray-400 mb-1">
                                                            (Compromiso)
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-2xl font-bold text-gray-900">
                                                            {item.unit === '$' ? `$${item.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                            {item.unit === '%' ? '%' : ''}
                                                        </span>
                                                        <span className="text-xs text-gray-400 mb-1">
                                                            / {item.unit === '$' ? `$${item.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {!showDailyCommitment && (
                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                                    <div className={`h-2 rounded-full ${item.percentage >= 100 ? 'bg-green-500' : item.percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(item.percentage, 100)}%` }}></div>
                                                </div>
                                            )}

                                            {showDailyCommitment && (
                                                <div className="text-xs border-t pt-2 bg-gray-50 -mx-4 -mb-4 px-4 pb-2 mt-auto">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-gray-500">Real Hoy/Acum:</span>
                                                        <span className="font-bold text-blue-600">
                                                            {item.unit === '$' ? `$${item.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-red-50 p-1 -mx-1 rounded">
                                                        <span className="text-red-700 font-bold">Falta:</span>
                                                        <span className="font-bold text-red-700">
                                                            {item.unit === '$' ? `$${Math.max(0, item.target - item.actual).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : Math.max(0, item.target - item.actual).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {!showDailyCommitment && (
                                                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 bg-gray-50 -mx-4 -mb-4 px-4 pb-2 mt-auto">
                                                    <div>
                                                        <span className="text-gray-400 block mb-0.5 font-medium">Falta Total</span>
                                                        <span className={`font-bold text-sm ${item.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {item.remaining > 0 ? (
                                                                <>
                                                                    {item.unit === '$' ? `$${item.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                    {item.unit === '%' ? ' pts' : ''}
                                                                </>
                                                            ) : '¡Logrado!'}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        {item.pace > 0 ? (
                                                            <>
                                                                <span className="text-gray-400 block mb-0.5 font-medium">{item.paceLabel}</span>
                                                                <span className="font-bold text-red-600 text-sm">
                                                                    {item.unit === '$' ? `$${item.pace.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.pace.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-300 italic flex h-full items-end justify-end">---</span>
                                                        )}
                                                    </div>
                                                    {groupKey === 'TOTAL_SAN' && (
                                                        <div className="col-span-2 border-t mt-1 pt-1 text-center">
                                                            <span className="text-[10px] text-gray-400 mr-1">Falta para 80%:</span>
                                                            <span className={`text-[10px] font-bold ${item.remaining80 > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                                                {item.remaining80 > 0 ? (item.unit === '$' ? `$${item.remaining80.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : item.remaining80.toLocaleString(undefined, { maximumFractionDigits: 0 })) : '¡Cumplido!'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* CHARTS (Only if not in Daily Commitment Mode) */}
                    {!showDailyCommitment && (
                        <div className="bg-white p-6 rounded-lg shadow animate-fade-in-up mt-6 break-inside-avoid">
                            <h3 className="text-lg font-bold mb-4 text-gray-800">Comparativo Real vs Presupuesto</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayMetrics}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={12} />
                                        <YAxis />
                                        <ReTooltip />
                                        <Legend />
                                        <Bar dataKey="actual" name="Real" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="target" name="Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        {/* MODALS */}
        {
            historyIndicator && (
                <IndicatorHistoryModal
                    indicator={historyIndicator}
                    year={selectedYear}
                    week={selectedWeek}
                    quarter={selectedQuarter}
                    filterType={filterType}
                    records={records}
                    budgets={budgets}
                    viewMode={viewMode}
                    selectedAdvisorId={selectedAdvisorId}
                    advisors={advisors}
                    indicators={indicators}
                    onClose={() => setHistoryIndicator(null)}
                />
            )
        }

        {
            showRanking && (
                <RankingModal
                    onClose={() => setShowRanking(false)}
                    records={records}
                    advisors={advisors}
                    indicators={indicators}
                    budgets={budgets}
                    year={selectedYear}
                    week={selectedWeek}
                    filterType={filterType}
                />
            )
        }

        {
            showMute && (
                <MuteAdvisorsModal onClose={() => setShowMute(false)} records={records} advisors={advisors} indicators={indicators} year={selectedYear} week={selectedWeek} />
            )
        }
    </div >
);
};

// ... Helper Modals (IndicatorHistoryModal, RankingModal, MuteAdvisorsModal) ...
// Included below to maintain full file integrity, though logic is unchanged from previous step.

const IndicatorHistoryModal = ({ indicator, year, week, quarter, filterType, records, budgets, viewMode, selectedAdvisorId, advisors, indicators, onClose }: any) => {
    const modalRef = useRef<HTMLDivElement>(null);
    // Auto-detect average type if unit is %
    const isAverage = indicator.isAverage || indicator.unit === '%';

    const advisorInfo = useMemo(() => { if (viewMode === 'ADVISOR' && selectedAdvisorId) { return advisors.find((a: any) => a.id === selectedAdvisorId); } return null; }, [viewMode, selectedAdvisorId, advisors]);
    const historyData = useMemo(() => {
        const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
        let position: Position | undefined;
        let targetId = 'BRANCH_GLOBAL';
        if (viewMode === 'ADVISOR' && selectedAdvisorId) { const adv = advisors.find((a: any) => a.id === selectedAdvisorId); if (adv) { position = adv.position; targetId = selectedAdvisorId; } }
        return weeks.map(w => {
            const weeklyRecords = records.filter((r: RecordData) => r.year === year && r.week === w && (viewMode === 'BRANCH' ? r.type === ReportType.BRANCH : (r.type === ReportType.INDIVIDUAL && r.advisorId === selectedAdvisorId)));
            const actual = weeklyRecords.reduce((sum: number, r: RecordData) => sum + (r.values[indicator.id] || 0), 0);
            let target = 0;
            let relevantBudgets = budgets.filter((b: any) => b.indicatorId === indicator.id && b.targetId === targetId && b.year === year && b.week === w);
            if (relevantBudgets.length === 0 && targetId !== 'BRANCH_GLOBAL' && position) { const posId = `POS_${position}`; relevantBudgets = budgets.filter((b: any) => b.indicatorId === indicator.id && b.targetId === posId && b.year === year && b.week === w); }

            // Deduplicate logic for Chart
            const dailyBudgetMap = new Map<number, number>();
            relevantBudgets.filter((b: any) => b.periodType === 'DAILY').forEach((b: any) => {
                if (b.dayOfWeek !== undefined) dailyBudgetMap.set(b.dayOfWeek, b.amount);
            });

            const weeklyConfig = relevantBudgets.find((b: any) => b.periodType === 'WEEKLY');
            if (weeklyConfig) {
                target = weeklyConfig.amount;
            } else {
                target = Array.from(dailyBudgetMap.values()).reduce((sum, val) => sum + val, 0);
            }
            return { name: `Sem ${w}`, week: w, actual: actual, target: target };
        }).filter(d => d.actual > 0 || d.target > 0);
    }, [indicator, year, records, budgets, viewMode, selectedAdvisorId]);
    const tableData = useMemo(() => {
        let rows: any[] = []; let totalReal = 0; let totalTarget = 0; let totalPrev = 0; let countReal = 0; let countTarget = 0;
        let targetId = 'BRANCH_GLOBAL'; let position: Position | undefined;
        if (viewMode === 'ADVISOR' && selectedAdvisorId) { const adv = advisors.find((a: any) => a.id === selectedAdvisorId); if (adv) { position = adv.position; targetId = selectedAdvisorId; } }
        if (filterType === 'WEEK') {
            const days = [{ id: 1, label: 'Lunes' }, { id: 2, label: 'Martes' }, { id: 3, label: 'Miércoles' }, { id: 4, label: 'Jueves' }, { id: 5, label: 'Viernes' }, { id: 6, label: 'Sábado' }, { id: 0, label: 'Domingo' }];
            const currentRecords = records.filter((r: RecordData) => r.year === year && r.week === week && (viewMode === 'BRANCH' ? r.type === ReportType.BRANCH : (r.type === ReportType.INDIVIDUAL && r.advisorId === selectedAdvisorId)));
            const prevRecords = records.filter((r: RecordData) => r.year === year && r.week === week - 1 && (viewMode === 'BRANCH' ? r.type === ReportType.BRANCH : (r.type === ReportType.INDIVIDUAL && r.advisorId === selectedAdvisorId)));
            let relevantBudgets = budgets.filter((b: any) => b.indicatorId === indicator.id && b.targetId === targetId && b.year === year && b.week === week);
            if (relevantBudgets.length === 0 && targetId !== 'BRANCH_GLOBAL' && position) { relevantBudgets = budgets.filter((b: any) => b.indicatorId === indicator.id && b.targetId === `POS_${position}` && b.year === year && b.week === week); }

            // Deduplicate Daily Budgets
            const dailyBudgetMap = new Map<number, number>();
            relevantBudgets.filter((b: any) => b.periodType === 'DAILY').forEach((b: any) => {
                // Ensure key is Number and handle 0 correctly
                if (b.dayOfWeek !== undefined && b.dayOfWeek !== null) {
                    dailyBudgetMap.set(Number(b.dayOfWeek), b.amount);
                }
            });

            const weeklyConfig = relevantBudgets.find((b: any) => b.periodType === 'WEEKLY');

            // Calculate Total Target carefully
            let weeklyTargetTotal = 0;
            if (weeklyConfig) {
                weeklyTargetTotal = weeklyConfig.amount;
            } else {
                weeklyTargetTotal = Array.from(dailyBudgetMap.values()).reduce((sum, val) => sum + val, 0);
            }

            // Fix: If isAverage, don't divide by 7
            const dailyTargetFallback = isAverage ? weeklyTargetTotal : (weeklyTargetTotal > 0 ? weeklyTargetTotal / 7 : 0);

            rows = days.map(day => {
                // Correct Priority: Specific Daily > Weekly Fallback
                let target = 0;
                // Robust lookup
                const specificAmount = dailyBudgetMap.get(Number(day.id));

                if (specificAmount !== undefined) {
                    target = specificAmount;
                } else if (weeklyConfig) {
                    target = dailyTargetFallback;
                }

                const dailyR = currentRecords.find((r: RecordData) => r.frequency === 'DAILY' && r.dayOfWeek === day.id);
                const real = dailyR ? (dailyR.values[indicator.id] || 0) : 0;
                const dailyPrev = prevRecords.find((r: RecordData) => r.frequency === 'DAILY' && r.dayOfWeek === day.id);
                const prev = dailyPrev ? (dailyPrev.values[indicator.id] || 0) : 0;
                totalReal += real; totalTarget += target; totalPrev += prev;
                return { label: day.label, target, real, prev };
            });
            // REMOVED: Weekly Record Overwrite. Trust the Daily Sum for "Desglose Diario".
            // const weeklyRec = currentRecords.find((r: RecordData) => r.frequency === 'WEEKLY'); if (weeklyRec) totalReal = weeklyRec.values[indicator.id] || 0;
            const weeklyPrevRec = prevRecords.find((r: RecordData) => r.frequency === 'WEEKLY'); if (weeklyPrevRec) totalPrev = weeklyPrevRec.values[indicator.id] || 0;
        } else {
            let startWeek = 1; let endWeek = 52;
            if (filterType === 'TRIMESTER') { startWeek = (quarter - 1) * 13 + 1; endWeek = quarter * 13; }
            for (let w = startWeek; w <= endWeek; w++) {
                const weeklyRecords = records.filter((r: RecordData) => r.year === year && r.week === w && (viewMode === 'BRANCH' ? r.type === ReportType.BRANCH : (r.type === ReportType.INDIVIDUAL && r.advisorId === selectedAdvisorId)));
                const real = Math.ceil(weeklyRecords.reduce((sum: number, r: RecordData) => sum + (r.values[indicator.id] || 0), 0));
                let target = 0;
                let relevantBudgets = budgets.filter((b: any) => b.indicatorId === indicator.id && b.targetId === targetId && b.year === year && b.week === w);
                if (relevantBudgets.length === 0 && targetId !== 'BRANCH_GLOBAL' && position) { relevantBudgets = budgets.filter((b: any) => b.indicatorId === indicator.id && b.targetId === `POS_${position}` && b.year === year && b.week === w); }
                const weeklyConfig = relevantBudgets.find((b: any) => b.periodType === 'WEEKLY');
                if (weeklyConfig) target = weeklyConfig.amount; else target = relevantBudgets.filter((b: any) => b.periodType === 'DAILY').reduce((sum: number, b: any) => sum + b.amount, 0);
                target = Math.ceil(target);
                const prevWeeklyRecords = records.filter((r: RecordData) => r.year === year && r.week === w - 1 && (viewMode === 'BRANCH' ? r.type === ReportType.BRANCH : (r.type === ReportType.INDIVIDUAL && r.advisorId === selectedAdvisorId)));
                const prev = Math.ceil(prevWeeklyRecords.reduce((sum: number, r: RecordData) => sum + (r.values[indicator.id] || 0), 0));
                if (isAverage) { if (real > 0) { totalReal += real; countReal++; } if (target > 0) { totalTarget += target; countTarget++; } totalPrev += prev; } else { totalReal += real; totalTarget += target; totalPrev += prev; }
                rows.push({ label: `Sem ${w}`, target, real, prev });
            }
            if (isAverage) { totalReal = Math.ceil(countReal > 0 ? totalReal / countReal : 0); totalTarget = Math.ceil(countTarget > 0 ? totalTarget / countTarget : 0); }
        }
        rows = rows.map(r => ({ ...r, diff: r.real - r.target, diffPct: r.target > 0 ? (r.real / r.target) - 1 : 0, prevDiff: r.real - r.prev, prevPct: r.prev > 0 ? (r.real / r.prev) - 1 : 0 }));
        return { rows, totals: { real: totalReal, target: totalTarget, prev: totalPrev } };
    }, [indicator, year, week, quarter, filterType, records, budgets, viewMode, selectedAdvisorId]);
    const muteAdvisorsList = useMemo(() => {
        const relevantAdvisors = advisors.filter((adv: Advisor) => {
            if (indicator.roles && indicator.roles.length > 0) return indicator.roles.includes(adv.position);
            return (adv.position === Position.LOAN_ADVISOR && (indicator.appliesTo === AppliesTo.LOAN || indicator.appliesTo === AppliesTo.ALL)) || (adv.position === Position.AFFILIATION_ADVISOR && (indicator.appliesTo === AppliesTo.AFFILIATION || indicator.appliesTo === AppliesTo.ALL));
        });
        const mutes: Advisor[] = [];
        relevantAdvisors.forEach((adv: Advisor) => {
            let val = 0;
            if (filterType === 'WEEK') { val = records.filter((r: RecordData) => r.year === year && r.week === week && r.advisorId === adv.id).reduce((s: number, r: RecordData) => s + (r.values[indicator.id] || 0), 0); }
            else if (filterType === 'TRIMESTER') { const startWeek = (quarter - 1) * 13 + 1; const endWeek = quarter * 13; val = records.filter((r: RecordData) => r.year === year && r.week >= startWeek && r.week <= endWeek && r.advisorId === adv.id).reduce((s: number, r: RecordData) => s + (r.values[indicator.id] || 0), 0); }
            else { val = records.filter((r: RecordData) => r.year === year && r.advisorId === adv.id).reduce((s: number, r: RecordData) => s + (r.values[indicator.id] || 0), 0); }
            if (val <= 0) mutes.push(adv);
        });
        return mutes;
    }, [advisors, records, indicator, year, week, quarter, filterType]);
    const handlePrint = () => { window.print(); };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 print:fixed print:inset-0 print:bg-white print:z-50 print:p-0 print:h-screen print:w-screen">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col print:shadow-none print:max-w-none print:max-h-none print:w-full print:h-full print:rounded-none">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl print:hidden">
                    <div><h3 className="text-xl font-bold text-gray-800">{indicator.name}</h3><p className="text-sm text-gray-500">Detalle {filterType === 'WEEK' ? 'Semanal' : filterType === 'TRIMESTER' ? 'Trimestral' : 'Anual'}</p></div>
                    <div className="flex gap-2"><button onClick={handlePrint} className="p-2 hover:bg-gray-200 rounded-full text-blue-600" title="Imprimir"><Printer size={20} /></button><button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button></div>
                </div>
                <div ref={modalRef} className="p-6 space-y-8 print:p-8 bg-white">
                    <div className="hidden print:block mb-6 text-center border-b pb-4"><h1 className="text-2xl font-bold">{advisorInfo ? advisorInfo.name : 'Reporte Sucursal Global'}</h1><h2 className="text-xl text-gray-600">Indicador: {indicator.name}</h2><p className="text-sm text-gray-500">Periodo: {filterType === 'WEEK' ? `Semana ${week}` : filterType === 'TRIMESTER' ? `Trimestre ${quarter}` : `Año ${year}`}</p></div>
                    <div className="h-[300px] border rounded-lg p-2 bg-white print:border-none"><h4 className="text-sm font-bold text-gray-700 mb-2">Historial Anual</h4><ResponsiveContainer width="100%" height="100%"><BarChart data={historyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} fontSize={10} /><YAxis /><ReTooltip formatter={(value: number) => indicator.unit === '$' ? `$${value.toLocaleString()}` : value.toLocaleString(undefined, { maximumFractionDigits: 2 })} /><Legend /><Bar dataKey="actual" name="Real" fill="#0ea5e9" radius={[4, 4, 0, 0]} /><Bar dataKey="target" name="Meta" fill="#cbd5e1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                    <div className="border rounded-lg overflow-hidden"><div className="bg-gray-100 p-3 font-bold text-gray-700 border-b flex justify-between print:bg-gray-50"><span>Desglose {filterType === 'WEEK' ? 'Diario' : 'Semanal'}</span><span className="text-xs font-normal text-gray-500 mt-1">Comparativo vs Meta y Anterior</span></div><div className="overflow-x-auto"><table className="w-full text-sm text-right"><thead className="bg-gray-50 text-xs text-gray-500 uppercase print:bg-white print:border-b"><tr><th className="px-4 py-2 text-left">{filterType === 'WEEK' ? 'Día' : 'Semana'}</th><th className="px-4 py-2 bg-yellow-50 print:bg-white">{filterType === 'WEEK' ? 'Sem. Ant' : 'Per. Ant'}</th><th className="px-4 py-2">Objetivo</th><th className="px-4 py-2 font-bold bg-blue-50 text-blue-900 print:bg-white print:text-black">Real</th><th className="px-4 py-2">Vs Objetivo</th><th className="px-4 py-2">Vs Anterior</th></tr></thead><tbody className="divide-y">{tableData.rows.map((row: any) => (<tr key={row.label} className="hover:bg-gray-50"><td className="px-4 py-2 text-left font-medium">{row.label}</td><td className="px-4 py-2 bg-yellow-50 text-gray-600 print:bg-white">{row.prev.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td className="px-4 py-2">{row.target.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td className="px-4 py-2 font-bold bg-blue-50 text-blue-800 print:bg-white print:text-black">{row.real.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td className={`px-4 py-2 ${row.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}><div className="flex flex-col text-xs"><span>{row.diff > 0 ? '+' : ''}{row.diff.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span><span>({(row.diffPct * 100).toFixed(0)}%)</span></div></td><td className={`px-4 py-2 ${row.prevDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}><div className="flex flex-col text-xs"><span>{row.prevDiff > 0 ? '+' : ''}{row.prevDiff.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span><span>({(row.prevPct * 100).toFixed(0)}%)</span></div></td></tr>))}<tr className="bg-gray-100 font-bold border-t-2 border-gray-300 print:bg-gray-50"><td className="px-4 py-2 text-left">TOTAL {isAverage ? '(Promedio)' : ''}</td><td className="px-4 py-2">{tableData.totals.prev.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td className="px-4 py-2">{tableData.totals.target.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td className="px-4 py-2 text-blue-900 text-lg print:text-black">{tableData.totals.real.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td className="px-4 py-2 text-center text-gray-500">-</td><td className="px-4 py-2 text-center text-gray-500">-</td></tr></tbody></table></div></div>
                    <div className={`mt-6 p-4 rounded-lg border ${muteAdvisorsList.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}><div className="flex items-center gap-2 mb-3">{muteAdvisorsList.length > 0 ? <AlertTriangle className="text-red-500" /> : <CheckCircle className="text-green-500" />}<h4 className={`font-bold ${muteAdvisorsList.length > 0 ? 'text-red-800' : 'text-green-800'}`}>{muteAdvisorsList.length > 0 ? `Asesores mudos en ${indicator.name}` : `Sin asesores mudos en ${indicator.name}`}</h4></div>{muteAdvisorsList.length > 0 && (<div className="flex flex-wrap gap-2">{muteAdvisorsList.map((adv: Advisor) => (<span key={adv.id} className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-red-200 text-red-700 text-sm font-medium shadow-sm"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>{adv.name}</span>))}</div>)}</div>
                </div>
            </div>
            {/* DEBUG PANEL - REMOVE AFTER FIX */}
            {viewMode === 'BRANCH' && (
                <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded text-xs z-50 max-w-lg font-mono">
                    <h3 className="font-bold border-b mb-2">DEBUG: Branch Aggregation Filter</h3>
                    <div>Total Records (Raw): {dashboardRecords.length}</div>
                    <div>
                        Filtered for Aggregation: {
                            dashboardRecords.filter(r => (r.type === 'Sucursal' || r.type === ReportType.BRANCH) && !r.advisorId).length
                        }
                    </div>
                    <div className="mt-2 text-yellow-300">
                        <strong>Rejected (Individual):</strong> {
                            dashboardRecords.filter(r => r.type === 'Individual' || r.type === ReportType.INDIVIDUAL).length
                        }
                    </div>
                    <div className="mt-2 text-red-300">
                        <strong>Oddities (Type Sucursal + Has Advisor):</strong> {
                            dashboardRecords.filter(r => (r.type === 'Sucursal' || r.type === ReportType.BRANCH) && !!r.advisorId).length
                        }
                    </div>
                    <div className="mt-2 text-blue-300">
                        <strong>Oddities (Type Indiv + No Advisor):</strong> {
                            dashboardRecords.filter(r => (r.type === 'Individual' || r.type === ReportType.INDIVIDUAL) && !r.advisorId).length
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

const RankingModal = ({ onClose, records, advisors, indicators, budgets, year, week, filterType }: any) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const calculateScore = (adv: Advisor) => {
        const advRecords = records.filter((r: RecordData) => r.advisorId === adv.id && r.year === year);
        const advIndicators = indicators.filter((i: Indicator) => { if (i.roles && i.roles.length > 0) return i.roles.includes(adv.position); return (adv.position === Position.LOAN_ADVISOR && (i.appliesTo === AppliesTo.LOAN || i.appliesTo === AppliesTo.ALL)) || (adv.position === Position.AFFILIATION_ADVISOR && (i.appliesTo === AppliesTo.AFFILIATION || i.appliesTo === AppliesTo.ALL)); });
        let totalPoints = 0; let totalPossible = 0;
        advIndicators.forEach((ind: Indicator) => {
            let actual = 0; if (filterType === 'WEEK') { actual = advRecords.filter((r: any) => r.week === week).reduce((s: number, r: any) => s + (r.values[ind.id] || 0), 0); } else if (filterType === 'YEAR') { actual = advRecords.reduce((s: number, r: any) => s + (r.values[ind.id] || 0), 0); } else { actual = advRecords.filter((r: any) => r.week === week).reduce((s: number, r: any) => s + (r.values[ind.id] || 0), 0); }
            let target = 0; const targetId = adv.id; const relevantBudgets = budgets.filter((b: any) => b.indicatorId === ind.id && (b.targetId === targetId || b.targetId === `POS_${adv.position}`));
            if (filterType === 'WEEK') { const b = relevantBudgets.find((b: any) => b.year === year && b.week === week && b.periodType === 'WEEKLY'); if (b) target = b.amount; else { const dailies = relevantBudgets.filter((b: any) => b.year === year && b.week === week && b.periodType === 'DAILY'); target = dailies.reduce((s: number, x: any) => s + x.amount, 0); } } else if (filterType === 'YEAR') { target = relevantBudgets.filter((b: any) => b.year === year && b.periodType === 'WEEKLY').reduce((s: number, x: any) => s + x.amount, 0); }
            const weight = (adv.position === Position.LOAN_ADVISOR ? ind.weightLoan : ind.weightAffiliation) || 0;
            if (weight > 0) { totalPossible += weight; if (target > 0) { totalPoints += (actual / target) * weight; } }
        });
        return { ...adv, points: Math.ceil(totalPoints), percentage: totalPossible > 0 ? (totalPoints / totalPossible) * 100 : 0 };
    };
    const rankings = useMemo(() => { const scoredAdvisors = advisors.map(calculateScore); return { loan: scoredAdvisors.filter((a: any) => a.position === Position.LOAN_ADVISOR).sort((a: any, b: any) => b.points - a.points), affiliation: scoredAdvisors.filter((a: any) => a.position === Position.AFFILIATION_ADVISOR).sort((a: any, b: any) => b.points - a.points) }; }, [records, advisors, indicators, budgets, year, week, filterType]);
    const handleDownloadImage = async () => { if (!modalRef.current) return; try { const canvas = await html2canvas(modalRef.current, { backgroundColor: '#ffffff', scale: 2 }); const link = document.createElement('a'); link.download = `Ranking_Semana_${week}.jpg`; link.href = canvas.toDataURL('image/jpeg', 0.9); link.click(); } catch (e) { alert('Error al generar imagen'); } };
    const renderRankingColumn = (title: string, data: any[], colorClass: string) => { const winner = data[0]; return (<div className="flex-1 flex flex-col gap-4"> <h4 className={`text-xl font-bold ${colorClass} mb-2`}>{title}</h4> {winner ? (<div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden"> <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div> <div className="w-24 h-24 rounded-full p-1 bg-yellow-400 mb-3 shadow-lg"> <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-white"> {winner.photoUrl ? <img src={winner.photoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-4 text-gray-300" />} </div> </div> <h3 className="text-lg font-bold text-gray-900">{winner.name}</h3> <p className="text-blue-600 font-bold mb-2">¡Mejor Asesor!</p> <div className="mt-2"> <span className="text-3xl font-black text-gray-800">{winner.points.toFixed(0)} <span className="text-base text-gray-500 font-normal">pts</span></span> <p className="text-xs text-gray-400 uppercase tracking-wide mt-1">Puntaje Total</p> </div> </div>) : (<div className="text-center py-10 bg-gray-50 rounded-lg text-gray-400 italic">Sin datos para este periodo</div>)} <div className="space-y-3 mt-2"> {data.map((adv, idx) => (<div key={adv.id} className="bg-white border border-gray-100 rounded-lg p-3 flex items-center shadow-sm"> <div className="mr-3"> {idx === 0 ? <Medal className="text-yellow-500 w-6 h-6" /> : idx === 1 ? <Medal className="text-gray-400 w-6 h-6" /> : idx === 2 ? <Medal className="text-orange-400 w-6 h-6" /> : <span className="w-6 h-6 flex items-center justify-center font-bold text-gray-400">{idx + 1}</span>} </div> <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden mr-3 flex-shrink-0"> {adv.photoUrl ? <img src={adv.photoUrl} className="w-full h-full object-cover" /> : <Users className="p-2 text-gray-300" />} </div> <div className="flex-1 min-w-0"> <h5 className="font-bold text-gray-800 text-sm truncate">{adv.name}</h5> <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1"> <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(adv.percentage, 100)}%` }}></div> </div> <p className="text-[10px] text-gray-400 mt-0.5">Puntaje</p> </div> <div className="text-right pl-2"> <span className="block font-bold text-gray-700">{adv.points.toFixed(0)}</span> </div> </div>))} </div> </div>); };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"> <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"> <div className="p-4 border-b flex justify-between items-center bg-gray-50"> <h3 className="text-xl font-bold text-gray-800 flex items-center"><Trophy className="mr-2 text-yellow-500" /> Ranking de Desempeño</h3> <div className="flex gap-2"> <button onClick={handleDownloadImage} className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"> <Share2 size={14} /> Compartir Imagen </button> <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button> </div> </div> <div className="overflow-y-auto p-6 bg-white" ref={modalRef}> <div className="flex flex-col md:flex-row gap-8"> {renderRankingColumn('Préstamos', rankings.loan, 'text-blue-700')} {renderRankingColumn('Afiliación', rankings.affiliation, 'text-emerald-700')} </div> </div> </div> </div>);
};

const MuteAdvisorsModal = ({ onClose, records, advisors, indicators, year, week }: any) => {
    const indicatorsData = useMemo(() => { return indicators.map((ind: Indicator) => { const muteAdvisors = advisors.filter((adv: Advisor) => { if (ind.roles && ind.roles.length > 0) { if (!ind.roles.includes(adv.position)) return false; } else { if (adv.position === Position.LOAN_ADVISOR && ind.appliesTo === AppliesTo.AFFILIATION) return false; if (adv.position === Position.AFFILIATION_ADVISOR && ind.appliesTo === AppliesTo.LOAN) return false; } const advRecs = records.filter((r: RecordData) => r.year === year && r.week === week && r.advisorId === adv.id); const val = advRecs.reduce((sum: number, r: RecordData) => sum + (r.values[ind.id] || 0), 0); return val <= 0; }); return { ...ind, muteAdvisors }; }).filter((i: any) => i.muteAdvisors.length > 0); }, [indicators, advisors, records, year, week]);
    const { bestAdvisor, worstAdvisor } = useMemo(() => { const counts = new Map(); advisors.forEach((adv: Advisor) => counts.set(adv.id, 0)); indicators.forEach((ind: Indicator) => { advisors.forEach((adv: Advisor) => { let applies = false; if (ind.roles && ind.roles.length > 0) applies = ind.roles.includes(adv.position); else { applies = (adv.position === Position.LOAN_ADVISOR && (ind.appliesTo === AppliesTo.LOAN || ind.appliesTo === AppliesTo.ALL)) || (adv.position === Position.AFFILIATION_ADVISOR && (ind.appliesTo === AppliesTo.AFFILIATION || ind.appliesTo === AppliesTo.ALL)); } if (applies) { const advRecs = records.filter((r: RecordData) => r.year === year && r.week === week && r.advisorId === adv.id); const val = advRecs.reduce((sum: number, r: RecordData) => sum + (r.values[ind.id] || 0), 0); if (val <= 0) { counts.set(adv.id, counts.get(adv.id) + 1); } } }); }); let minMutes = 999; let maxMutes = -1; let bestId: string | null = null; let worstId: string | null = null; counts.forEach((count, id) => { if (count < minMutes) { minMutes = count; bestId = id; } if (count > maxMutes) { maxMutes = count; worstId = id; } }); const best = advisors.find((a: Advisor) => a.id === bestId); const worst = advisors.find((a: Advisor) => a.id === worstId); let totalActiveBest = 0; if (best) { totalActiveBest = indicators.filter((i: Indicator) => { if (i.roles && i.roles.length > 0) return i.roles.includes(best.position); return (best.position === Position.LOAN_ADVISOR && (i.appliesTo === AppliesTo.LOAN || i.appliesTo === AppliesTo.ALL)) || (best.position === Position.AFFILIATION_ADVISOR && (i.appliesTo === AppliesTo.AFFILIATION || i.appliesTo === AppliesTo.ALL)); }).length; } return { bestAdvisor: best ? { ...best, muteCount: minMutes, totalActive: totalActiveBest } : null, worstAdvisor: worst ? { ...worst, muteCount: maxMutes } : null }; }, [advisors, indicators, records, year, week]);
    const handleShare = () => {
        let text = `*Reporte de Asesores Mudos - Semana ${week} ${year}*\n\n`;
        if (bestAdvisor) { text += `🏆 *Mejor Asesor:* ${bestAdvisor.name} (${bestAdvisor.muteCount} indicadores en cero)\n`; }
        if (worstAdvisor && worstAdvisor.muteCount > 0) { text += `⚠️ *Mayor cantidad de ceros:* ${worstAdvisor.name} (${worstAdvisor.muteCount} indicadores en cero)\n`; }
        text += `\n*Detalle por Indicador:*\n\n`;
        indicatorsData.forEach((ind: any) => { text += `🔴 *${ind.name}* (${ind.muteAdvisors.length}):\n`; ind.muteAdvisors.forEach((adv: any) => { text += `- ${adv.name}\n`; }); text += `\n`; });
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"> <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"> <div className="bg-slate-900 p-4 flex justify-between items-center text-white"> <div> <h3 className="text-xl font-bold flex items-center"><Ghost className="mr-2 text-gray-400" /> Asesores Mudos</h3> <p className="text-xs text-gray-400">Semana {week} - Año {year}</p> </div> <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-gray-400 hover:text-white transition-colors"><X size={20} /></button> </div> <div className="overflow-y-auto p-6 bg-gray-50 flex-1"> {bestAdvisor && (<div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-8 flex items-center justify-between shadow-sm"> <div> <h2 className="text-xl font-bold text-green-800 mb-1">¡Felicidades {bestAdvisor.name}!</h2> <p className="text-green-700 text-sm mb-3">Eres el asesor con menos indicadores en cero esta semana.</p> <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-green-200 text-green-700 text-sm font-bold shadow-sm"> <Award size={16} className="mr-2 text-yellow-500" /> Solo {bestAdvisor.muteCount} indicadores mudos de {bestAdvisor.totalActive} </span> </div> <div className="hidden md:block"> <Trophy size={64} className="text-green-200" /> </div> </div>)} <div className="flex justify-between items-end mb-4"> <h3 className="font-bold text-gray-800 text-lg">Detalle por Indicador</h3> <button onClick={handleShare} className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"> <Share2 size={16} className="mr-2" /> Compartir en WhatsApp </button> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {indicatorsData.map((ind: any) => (<div key={ind.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"> <div className="flex justify-between items-center mb-3"> <h4 className="font-bold text-gray-800">{ind.name}</h4> <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{ind.muteAdvisors.length}</span> </div> <ul className="space-y-1"> {ind.muteAdvisors.map((adv: Advisor) => (<li key={adv.id} className="text-sm text-gray-600 flex items-center"> <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></span> {adv.name} </li>))} </ul> </div>))} {indicatorsData.length === 0 && (<div className="col-span-2 text-center py-12 text-gray-400"> <CheckCircle className="mx-auto h-12 w-12 text-green-200 mb-2" /> <p>¡Excelente! No hay indicadores mudos esta semana.</p> </div>)} </div> </div> </div> </div>);
};

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
