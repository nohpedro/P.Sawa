export type GoalPriority = "baja" | "media" | "alta" | "critica";
export type GoalStatus = "borrador" | "activa" | "pausada" | "cumplida" | "cancelada";
export type GoalType = "no_renovable" | "renovable";
export type RenewalFrequency = "weekly" | "monthly" | "custom_days";
export type BalanceHandling = "reset" | "carry_over" | "reserve_only";
export type ExpenseFrequency = "once" | "weekly" | "monthly" | "custom_days";
export type ExpenseStatus = "activo" | "pausado" | "pagado" | "vencido" | "cancelado";
export type MovementType = "ingreso" | "gasto" | "reserva" | "ajuste";
export type GoalNodeType =
  | "ventas"
  | "reservas"
  | "salarios"
  | "servicios"
  | "alquiler"
  | "gastos_variables"
  | "facturas_pendientes"
  | "ingreso_manual"
  | "porcentaje_reservado"
  | "periodo_calculo"
  | "gasto_fijo";

export interface GoalProgress {
  cycle_id: string;
  cycle_number: number;
  monto_acumulado: string;
  monto_faltante: string;
  porcentaje_avance: string;
  ingreso_acumulado: string;
  ingreso_necesario: string;
  ingreso_faltante: string;
  ingresos_reservas: string;
  ingresos_ventas: string;
  gastos_totales: string;
  gastos_fijos: string;
  gastos_variables: string;
  gastos_movimientos: string;
  gastos_pendientes: string;
  ganancia_acumulada: string;
  ganancia_faltante: string;
  dias_restantes: number;
  proyeccion_cumplimiento: string;
  cumplimiento_estimado: boolean;
  gastos_relacionados: string[];
  proxima_renovacion?: string | null;
}

export interface BusinessGoalCycle {
  id: string;
  goal: string;
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  monto_objetivo: string;
  saldo_inicial: string;
  monto_acumulado: string;
  estado: GoalStatus;
}

export interface BusinessGoal {
  id: string;
  nombre: string;
  descripcion: string;
  monto_objetivo: string;
  fecha_inicio: string;
  fecha_fin: string;
  prioridad: GoalPriority;
  prioridad_label?: string;
  estado: GoalStatus;
  estado_label?: string;
  recursos_reservados: string;
  variables_calculo: Record<string, unknown>;
  tipo: GoalType;
  tipo_label?: string;
  frecuencia_renovacion?: RenewalFrequency | "";
  frecuencia_dias: number;
  proximo_ciclo?: string | null;
  manejo_saldo: BalanceHandling;
  conservar_nodos: boolean;
  progress?: GoalProgress;
  current_cycle?: BusinessGoalCycle;
}

export type BusinessGoalWriteDTO = Omit<BusinessGoal, "id" | "progress" | "current_cycle" | "prioridad_label" | "estado_label" | "tipo_label">;

export interface BusinessFixedExpense {
  id: string;
  nombre: string;
  categoria: string;
  monto: string;
  frecuencia: ExpenseFrequency;
  frecuencia_dias: number;
  fecha_pago: string;
  prioridad: GoalPriority;
  estado: ExpenseStatus;
  proveedor: string;
  notas: string;
}

export type BusinessFixedExpenseWriteDTO = Omit<BusinessFixedExpense, "id">;

export interface BusinessGoalMovement {
  id: string;
  goal: string;
  cycle: string;
  tipo: MovementType;
  concepto: string;
  monto: string;
  fecha: string;
  categoria: string;
  notas: string;
}

export interface BusinessGoalNode {
  id: string;
  goal: string;
  cycle?: string | null;
  tipo: GoalNodeType;
  tipo_label?: string;
  etiqueta: string;
  valor: string;
  porcentaje: string;
  periodo_inicio?: string | null;
  periodo_fin?: string | null;
  posicion_x: number;
  posicion_y: number;
  config: Record<string, unknown>;
}

export type BusinessGoalNodeWriteDTO = Omit<BusinessGoalNode, "id" | "tipo_label">;

export interface BusinessGoalConnection {
  id: string;
  goal: string;
  cycle?: string | null;
  source: string;
  target: string;
  source_label?: string;
  target_label?: string;
  operador: string;
  peso: string;
}
