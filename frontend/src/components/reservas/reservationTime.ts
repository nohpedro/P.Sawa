import type { Reserva } from "../../models/reserva";
import type { HHMM } from "./ClockTimePicker";

export function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

export function minutesToHHMM(total: number): HHMM {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const pad2 = (value: number) => (value < 10 ? `0${value}` : `${value}`);
  return `${pad2(hours)}:${pad2(minutes)}` as HHMM;
}

export function addMinutes(hhmm: HHMM, minutes: number): HHMM {
  return minutesToHHMM(hhmmToMinutes(hhmm) + minutes);
}

export function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

export function reservationStartMinutes(reserva: Reserva): number {
  const date = new Date(reserva.inicio);
  return date.getHours() * 60 + date.getMinutes();
}

export function reservationEndMinutes(reserva: Reserva): number {
  const date = new Date(reserva.fin);
  return date.getHours() * 60 + date.getMinutes();
}

export function reservationDurationMinutes(reserva: Reserva): number {
  return Math.max(15, reservationEndMinutes(reserva) - reservationStartMinutes(reserva));
}

export function dateToHHMM(date: Date): HHMM {
  return minutesToHHMM(date.getHours() * 60 + date.getMinutes());
}

export function roundHHMMToStep(value: HHMM, minuteStep: number): HHMM {
  const rounded = Math.round(hhmmToMinutes(value) / minuteStep) * minuteStep;
  return minutesToHHMM(rounded);
}
