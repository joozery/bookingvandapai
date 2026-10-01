export interface TripTheme {
  name: string;
  borderLeft: string;
  titleColor: string;
  badgeBg: string;
  dotBg: string;
  boxBg: string;
  iconColor: string;
  labelColor: string;
  vanBg: string;
  vanTitle: string;
  priceColor: string;
  cardHover: string;
  shareBtn: string;
}

export const TRIP_COLOR_THEMES: TripTheme[] = [
  {
    name: 'violet',
    borderLeft: 'border-l-violet-500',
    titleColor: 'text-violet-950',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
    dotBg: 'bg-violet-500',
    boxBg: 'bg-violet-50/80 border-violet-200/70',
    iconColor: 'text-violet-600',
    labelColor: 'text-violet-800',
    vanBg: 'bg-violet-100/70 border-violet-200',
    vanTitle: 'text-violet-900',
    priceColor: 'text-violet-600',
    cardHover: 'hover:border-violet-400 hover:shadow-violet-100',
    shareBtn: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  },
  {
    name: 'emerald',
    borderLeft: 'border-l-emerald-500',
    titleColor: 'text-emerald-950',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotBg: 'bg-emerald-500',
    boxBg: 'bg-emerald-50/80 border-emerald-200/70',
    iconColor: 'text-emerald-600',
    labelColor: 'text-emerald-800',
    vanBg: 'bg-emerald-100/70 border-emerald-200',
    vanTitle: 'text-emerald-900',
    priceColor: 'text-emerald-600',
    cardHover: 'hover:border-emerald-400 hover:shadow-emerald-100',
    shareBtn: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    name: 'blue',
    borderLeft: 'border-l-blue-500',
    titleColor: 'text-blue-950',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    dotBg: 'bg-blue-500',
    boxBg: 'bg-blue-50/80 border-blue-200/70',
    iconColor: 'text-blue-600',
    labelColor: 'text-blue-800',
    vanBg: 'bg-blue-100/70 border-blue-200',
    vanTitle: 'text-blue-900',
    priceColor: 'text-blue-600',
    cardHover: 'hover:border-blue-400 hover:shadow-blue-100',
    shareBtn: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  },
  {
    name: 'amber',
    borderLeft: 'border-l-amber-500',
    titleColor: 'text-amber-950',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
    dotBg: 'bg-amber-500',
    boxBg: 'bg-amber-50/80 border-amber-200/70',
    iconColor: 'text-amber-600',
    labelColor: 'text-amber-800',
    vanBg: 'bg-amber-100/70 border-amber-200',
    vanTitle: 'text-amber-900',
    priceColor: 'text-amber-600',
    cardHover: 'hover:border-amber-400 hover:shadow-amber-100',
    shareBtn: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  },
  {
    name: 'rose',
    borderLeft: 'border-l-rose-500',
    titleColor: 'text-rose-950',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    dotBg: 'bg-rose-500',
    boxBg: 'bg-rose-50/80 border-rose-200/70',
    iconColor: 'text-rose-600',
    labelColor: 'text-rose-800',
    vanBg: 'bg-rose-100/70 border-rose-200',
    vanTitle: 'text-rose-900',
    priceColor: 'text-rose-600',
    cardHover: 'hover:border-rose-400 hover:shadow-rose-100',
    shareBtn: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  },
  {
    name: 'cyan',
    borderLeft: 'border-l-cyan-500',
    titleColor: 'text-cyan-950',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    dotBg: 'bg-cyan-500',
    boxBg: 'bg-cyan-50/80 border-cyan-200/70',
    iconColor: 'text-cyan-600',
    labelColor: 'text-cyan-800',
    vanBg: 'bg-cyan-100/70 border-cyan-200',
    vanTitle: 'text-cyan-900',
    priceColor: 'text-cyan-600',
    cardHover: 'hover:border-cyan-400 hover:shadow-cyan-100',
    shareBtn: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
  },
  {
    name: 'indigo',
    borderLeft: 'border-l-indigo-500',
    titleColor: 'text-indigo-950',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dotBg: 'bg-indigo-500',
    boxBg: 'bg-indigo-50/80 border-indigo-200/70',
    iconColor: 'text-indigo-600',
    labelColor: 'text-indigo-800',
    vanBg: 'bg-indigo-100/70 border-indigo-200',
    vanTitle: 'text-indigo-900',
    priceColor: 'text-indigo-600',
    cardHover: 'hover:border-indigo-400 hover:shadow-indigo-100',
    shareBtn: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  },
  {
    name: 'teal',
    borderLeft: 'border-l-teal-500',
    titleColor: 'text-teal-950',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    dotBg: 'bg-teal-500',
    boxBg: 'bg-teal-50/80 border-teal-200/70',
    iconColor: 'text-teal-600',
    labelColor: 'text-teal-800',
    vanBg: 'bg-teal-100/70 border-teal-200',
    vanTitle: 'text-teal-900',
    priceColor: 'text-teal-600',
    cardHover: 'hover:border-teal-400 hover:shadow-teal-100',
    shareBtn: 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100',
  },
];

export function getTripTheme(index: number): TripTheme {
  return TRIP_COLOR_THEMES[index % TRIP_COLOR_THEMES.length];
}
