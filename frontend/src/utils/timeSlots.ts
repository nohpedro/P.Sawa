// src/utils/timeSlots.ts

export type HHMM = `${string}:${string}`;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function minutesToHHMM(totalMinutes: number): HHMM {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}` as HHMM;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return h * 60 + m;
}

export function addMinutes(hhmm: string, minutesToAdd: number): HHMM {
  const base = hhmmToMinutes(hhmm);
  const next = base + minutesToAdd;
  return minutesToHHMM(next);
}

export function buildTimeOptions(opts?: {
  startHH?: number;   // default 6
  endHH?: number;     // default 23
  stepMin?: number;   // default 30
}): Array<{ label: string; value: HHMM }> {
  const startHH = opts?.startHH ?? 6;
  const endHH = opts?.endHH ?? 23;
  const stepMin = opts?.stepMin ?? 30;

  const start = startHH * 60;
  const end = endHH * 60;

  const out: Array<{ label: string; value: HHMM }> = [];
  for (let t = start; t <= end; t += stepMin) {
    const v = minutesToHHMM(t);
    out.push({ label: v, value: v });
  }
  return out;
}

export function buildDurationOptions(
  durationsMin: number[] = [30, 60, 90, 120, 150, 180]
): Array<{ label: string; value: string }> {
  return durationsMin.map((min) => ({
    value: String(min),
    label: min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`,
  }));
}
