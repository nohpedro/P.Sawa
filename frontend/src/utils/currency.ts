export function formatBolivianos(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  const formatted = amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Bs ${formatted}`;
}

export function cashRound(value: string | number | null | undefined): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  const cents = Math.round(amount * 100);
  const candidates: number[] = [];
  for (let candidate = Math.max(20, cents - 100); candidate <= cents + 100; candidate += 1) {
    if (candidate % 10 !== 0) continue;
    const units = candidate / 10;
    if (units === 1 || units === 3) continue;
    candidates.push(candidate);
  }

  const rounded = candidates.reduce((best, candidate) => {
    if (best === null) return candidate;
    const candidateDistance = Math.abs(candidate - cents);
    const bestDistance = Math.abs(best - cents);
    if (candidateDistance < bestDistance) return candidate;
    if (candidateDistance === bestDistance && candidate > best) return candidate;
    return best;
  }, null as number | null);

  return Number(((rounded ?? cents) / 100).toFixed(2));
}

export function isWholeQuantity(value: string | number | null | undefined): boolean {
  const amount = Number(value ?? "");
  return Number.isFinite(amount) && Number.isInteger(amount);
}
