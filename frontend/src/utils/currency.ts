export function formatBolivianos(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  const formatted = amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Bs ${formatted}`;
}
