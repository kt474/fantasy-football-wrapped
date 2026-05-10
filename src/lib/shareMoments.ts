export type ShareMomentTone =
  | "hero"
  | "pain"
  | "chaos"
  | "cold"
  | "lucky";

export type ShareMoment = {
  id: string;
  type:
    | "top_scorer"
    | "bench_blunder"
    | "tough_loss"
    | "biggest_blowout"
    | "weekly_mvp";
  title: string;
  headline: string;
  subtext: string;
  statLabel: string;
  statValue: string;
  leagueName?: string;
  week: number;
  managerName?: string;
  opponentName?: string;
  accent: ShareMomentTone;
  ctaUrl: string;
};

export const shareMomentAccentClasses: Record<ShareMomentTone, string> = {
  hero: "border-emerald-300 bg-emerald-50 text-emerald-950",
  pain: "border-rose-300 bg-rose-50 text-rose-950",
  chaos: "border-amber-300 bg-amber-50 text-amber-950",
  cold: "border-sky-300 bg-sky-50 text-sky-950",
  lucky: "border-violet-300 bg-violet-50 text-violet-950",
};

export const shareMomentExportAccents: Record<
  ShareMomentTone,
  { background: string; foreground: string; chip: string }
> = {
  hero: {
    background: "from-emerald-950 via-emerald-900 to-slate-950",
    foreground: "text-emerald-100",
    chip: "bg-emerald-300 text-emerald-950",
  },
  pain: {
    background: "from-rose-950 via-slate-950 to-zinc-950",
    foreground: "text-rose-100",
    chip: "bg-rose-300 text-rose-950",
  },
  chaos: {
    background: "from-amber-950 via-stone-950 to-slate-950",
    foreground: "text-amber-100",
    chip: "bg-amber-300 text-amber-950",
  },
  cold: {
    background: "from-sky-950 via-slate-950 to-zinc-950",
    foreground: "text-sky-100",
    chip: "bg-sky-300 text-sky-950",
  },
  lucky: {
    background: "from-violet-950 via-slate-950 to-zinc-950",
    foreground: "text-violet-100",
    chip: "bg-violet-300 text-violet-950",
  },
};

export const formatSharePoints = (points: number) => {
  return Number.isInteger(points) ? `${points}` : points.toFixed(2);
};

