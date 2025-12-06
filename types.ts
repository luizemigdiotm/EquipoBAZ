
export enum Position {
  LOAN_ADVISOR = 'Asesor de Préstamos',
  AFFILIATION_ADVISOR = 'Asesor de Afiliación',
  BRANCH_MANAGER = 'Gerente de Sucursal'
}

export enum ReportType {
  INDIVIDUAL = 'Individual',
  BRANCH = 'Sucursal'
}

export enum AppliesTo {
  LOAN = 'Asesores de Préstamos',
  AFFILIATION = 'Asesores de Afiliación',
  BRANCH = 'Sucursal',
  ALL = 'Todos'
}

export type IndicatorGroup = 'COLOCACION' | 'CAPTACION' | 'TOTAL_SAN';

export interface Advisor {
  id: string;
  name: string;
  employeeNumber?: string;
  position: Position;
  photoUrl?: string; // Base64
  birthDate?: string; // YYYY-MM-DD
  hireDate?: string;  // YYYY-MM-DD
}

export interface Indicator {
  id: string;
  name: string;
  appliesTo: AppliesTo; 
  roles?: string[];     
  unit: '$' | '%' | '#';
  weightLoan?: number;        
  weightAffiliation?: number; 
  isCumulative?: boolean;     
  isAverage?: boolean;        
  group?: IndicatorGroup;     
}

export interface BudgetConfig {
  id: string;
  indicatorId: string;
  targetId: string; 
  year: number;     
  week: number;     
  periodType: 'WEEKLY' | 'DAILY';
  dayOfWeek?: number; 
  amount: number;
}

export interface RecordData {
  id: string;
  date: string; 
  year: number;
  week: number;
  type: ReportType;
  frequency: 'WEEKLY' | 'DAILY'; 
  dayOfWeek?: number; 
  advisorId?: string; 
  values: { [indicatorId: string]: number };
}

export interface User {
  id: string;
  username: string;
  password?: string; 
  role: 'ADMIN' | 'EDITOR' | 'LECTOR'; 
  photoUrl?: string; 
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export type RRHHEventType = 'VACATION' | 'PERMIT' | 'INCAPACITY' | 'ABSENCE' | 'DAY_OFF' | 'RECOGNITION' | 'ACTIVITY';

export interface RRHHEvent {
  id: string;
  advisorId?: string; // Optional, if global event
  type: RRHHEventType;
  startDate: string;
  endDate: string;
  recurringDay?: number; // 0=Sun, 1=Mon... if type is DAY_OFF
  title: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DONE';
}

export interface SupervisionLog {
  id: string;
  date: string;
  advisorId: string;
  type: 'FAILURE' | 'COACHING' | 'ACHIEVEMENT';
  indicatorName: string; // e.g., 'Uniforme', 'Efectivo', 'Actitud'
  details: string;
  photoUrl?: string;
  timestamp: string;
}

export interface CoachingSession {
  id: string;
  date: string;
  advisorId: string;
  level: 'LEVEL_2' | 'LEVEL_3'; // Minuta vs PMD
  problem: string;
  agreements: string[]; // List of commitments
  managerCommitment: string;
  reviewDate: string;
}

export interface DateFilter {
  type: 'DAY' | 'WEEK' | '2WEEKS' | '4WEEKS' | 'TRIMESTER' | 'YEAR';
  value?: string; 
}
