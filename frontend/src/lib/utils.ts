import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtDT = (n: number | string) =>
  Number(n || 0).toLocaleString('fr-TN', { maximumFractionDigits: 0 }) + ' DT';

export const fmtNum = (n: number | string) =>
  Number(n || 0).toLocaleString('fr-TN');

export const MOIS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
export const MOIS_S = [
  '', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
];
