
import { Advisor, Indicator, Position, AppliesTo, User } from '../types';

// USERS ARE NOW MANAGED IN FIREBASE AUTH & FIRESTORE
// Keeping types for reference, but data is empty
export const INITIAL_USERS: User[] = [];

export const INITIAL_ADVISORS: Advisor[] = [
  { id: '1', name: 'Juan Pérez', position: Position.LOAN_ADVISOR },
  { id: '2', name: 'Ana Gómez', position: Position.AFFILIATION_ADVISOR },
  { id: '3', name: 'Carlos Ruiz', position: Position.LOAN_ADVISOR },
  { id: '4', name: 'Maria Lopez', position: Position.AFFILIATION_ADVISOR },
];

export const INITIAL_INDICATORS: Indicator[] = [
  // Shared
  { id: 'ind_eff', name: 'Efectivo', appliesTo: AppliesTo.LOAN, unit: '$' },
  { id: 'ind_eff_app', name: 'Efectivo App', appliesTo: AppliesTo.LOAN, unit: '%' },
  { id: 'ind_new', name: 'Nuevos', appliesTo: AppliesTo.LOAN, unit: '$' },
  { id: 'ind_vida', name: 'Vidamax', appliesTo: AppliesTo.ALL, unit: '$' },
  { id: 'ind_nolig', name: 'No Ligados', appliesTo: AppliesTo.ALL, unit: '$' },
  { id: 'ind_afil', name: 'Afiliaciones', appliesTo: AppliesTo.ALL, unit: '#' },
  { id: 'ind_port', name: 'Portabilidades', appliesTo: AppliesTo.ALL, unit: '#' },
  
  // Affiliation Only
  { id: 'ind_guard', name: 'Guardaditos', appliesTo: AppliesTo.AFFILIATION, unit: '#' },
  { id: 'ind_debit', name: 'Débitos', appliesTo: AppliesTo.AFFILIATION, unit: '#' },
  { id: 'ind_inv', name: 'Inversiones', appliesTo: AppliesTo.AFFILIATION, unit: '#' },
  { id: 'ind_amigo', name: 'Guardadito Amigo', appliesTo: AppliesTo.AFFILIATION, unit: '#' },
  { id: 'ind_lig', name: 'Ligados', appliesTo: AppliesTo.AFFILIATION, unit: '$' },

  // Branch Specific
  { id: 'ind_col_total', name: 'Colocación Total', appliesTo: AppliesTo.BRANCH, unit: '$' },
  { id: 'ind_cap_neta', name: 'Captación Neta', appliesTo: AppliesTo.BRANCH, unit: '$' },
  { id: 'ind_sales', name: 'Ventas', appliesTo: AppliesTo.BRANCH, unit: '$' },
];
