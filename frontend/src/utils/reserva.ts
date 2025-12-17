export function calcularFinISO(
  inicioISO: string,
  duracionMinutosBase: number,
  bloques: number
): string {
  const inicio = new Date(inicioISO);
  const total = duracionMinutosBase * Math.max(1, bloques);
  return new Date(inicio.getTime() + total * 60_000).toISOString();
}
