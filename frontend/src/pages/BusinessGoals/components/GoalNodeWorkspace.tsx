import { createPortal } from "react-dom";
import { useState } from "react";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import Toast from "../../../components/ui/Toast";
import type { BusinessFixedExpense, BusinessGoalConnection, BusinessGoalNode, BusinessGoalNodeWriteDTO } from "../../../models/businessGoals";
import businessGoalsService from "../../../services/businessGoals.service";
import { formatBolivianos } from "../../../utils/currency";
import { getErrorMessage } from "../../../utils/error";
import { useGoalWorkspace } from "../hooks/useGoalWorkspace";
import ConfirmGoalActionModal from "../modals/ConfirmGoalActionModal";
import GoalConnectionModal from "../modals/GoalConnectionModal";
import GoalNodeModal from "../modals/GoalNodeModal";
import { nodeDraftFromFixedExpense } from "../utils/variableMapping";
import GoalNodeBoard, { type AutomaticVariableKind } from "./GoalNodeBoard";

export default function GoalNodeWorkspace({ goalId, compact = false }: { goalId: string; compact?: boolean }) {
  const { goal, nodes, connections, expenses, loading, error, reload } = useGoalWorkspace(goalId);
  const [editingNode, setEditingNode] = useState<BusinessGoalNode | null>(null);
  const [deleteNode, setDeleteNode] = useState<BusinessGoalNode | null>(null);
  const [editingConnection, setEditingConnection] = useState<BusinessGoalConnection | null>(null);
  const [nodeModal, setNodeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" as "info" | "success" | "error" });

  const saveNode = async (draft: BusinessGoalNodeWriteDTO) => {
    setSaving(true);
    try {
      if (editingNode) await businessGoalsService.patchNode(editingNode.id, draft);
      else await businessGoalsService.createNode(draft);
      setNodeModal(false);
      setEditingNode(null);
      await reload();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo guardar el nodo."), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const ensureGoalTargetNode = async (): Promise<BusinessGoalNode | null> => {
    if (!goal) return null;
    const existing = nodes.find((node) => node.config?.role === "goal_target");
    if (existing) return existing;

    return businessGoalsService.createNode({
      goal: goal.id,
      cycle: goal.progress?.cycle_id ?? null,
      tipo: "periodo_calculo",
      etiqueta: `Meta: ${goal.nombre}`,
      valor: "0",
      porcentaje: "0",
      periodo_inicio: goal.fecha_inicio,
      periodo_fin: goal.fecha_fin,
      posicion_x: 34,
      posicion_y: 220,
      config: { role: "goal_target", estado: goal.estado, monto_objetivo: goal.monto_objetivo },
    });
  };

  const dropExpenseOnGoal = async (expense: BusinessFixedExpense) => {
    if (!goal) return;
    if (nodes.some((node) => node.config?.fixed_expense_id === expense.id)) {
      setToast({ open: true, message: "Este gasto ya esta asignado a la meta.", type: "info" });
      return;
    }

    setSaving(true);
    try {
      const target = await ensureGoalTargetNode();
      const variableCount = nodes.filter((node) => node.config?.role !== "goal_target").length;
      const node = await businessGoalsService.createNode(nodeDraftFromFixedExpense({ goalId: goal.id, cycleId: goal.progress?.cycle_id, expense, index: variableCount }));
      if (target) {
        await businessGoalsService.createConnection({ goal: goal.id, cycle: goal.progress?.cycle_id, source: node.id, target: target.id, operador: "+", peso: "1" });
      }
      await reload();
      const progress = await businessGoalsService.goalProgress(goal.id);
      setToast({
        open: true,
        type: progress.cumplimiento_estimado ? "success" : "info",
        message: `${expense.nombre} asignado. Proyeccion: ${progress.cumplimiento_estimado ? "favorable" : "en riesgo"} (${formatBolivianos(progress.proyeccion_cumplimiento)}).`,
      });
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo asignar el gasto a la meta."), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const dropAutomaticVariableOnGoal = async (kind: AutomaticVariableKind) => {
    if (!goal) return;
    if (nodes.some((node) => node.tipo === kind && !node.config?.fixed_expense_id)) {
      setToast({ open: true, message: "Esta variable automatica ya esta asignada a la meta.", type: "info" });
      return;
    }

    const labels: Record<AutomaticVariableKind, string> = {
      ventas: "Ventas de productos",
      reservas: "Reservas",
    };

    setSaving(true);
    try {
      const target = await ensureGoalTargetNode();
      const variableCount = nodes.filter((node) => node.config?.role !== "goal_target").length;
      const node = await businessGoalsService.createNode({
        goal: goal.id,
        cycle: goal.progress?.cycle_id ?? null,
        tipo: kind,
        etiqueta: labels[kind],
        valor: "0",
        porcentaje: "100",
        periodo_inicio: goal.fecha_inicio,
        periodo_fin: goal.fecha_fin,
        posicion_x: 520,
        posicion_y: 70 + variableCount * 172,
        config: { automatic: true, fuente: kind },
      });
      if (target) {
        await businessGoalsService.createConnection({ goal: goal.id, cycle: goal.progress?.cycle_id, source: node.id, target: target.id, operador: "+", peso: "1" });
      }
      await reload();
      setToast({ open: true, type: "success", message: `${labels[kind]} ahora actualiza el avance de la meta.` });
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo asignar la variable automatica."), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteNode = async () => {
    if (!deleteNode) return;
    setSaving(true);
    try {
      await businessGoalsService.deleteNode(deleteNode.id);
      setDeleteNode(null);
      await reload();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar el nodo."), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const moveNode = async (node: BusinessGoalNode, position: { x: number; y: number }) => {
    if (node.posicion_x === position.x && node.posicion_y === position.y) return;

    try {
      await businessGoalsService.patchNode(node.id, { posicion_x: position.x, posicion_y: position.y });
      await reload();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo mover el nodo."), type: "error" });
    }
  };

  const saveConnection = async (draft: Pick<BusinessGoalConnection, "operador" | "peso">) => {
    if (!editingConnection) return;
    setSaving(true);
    try {
      await businessGoalsService.patchConnection(editingConnection.id, draft);
      setEditingConnection(null);
      await reload();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo actualizar la conexion."), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const deleteConnection = async () => {
    if (!editingConnection) return;
    setSaving(true);
    try {
      await businessGoalsService.deleteConnection(editingConnection.id);
      setEditingConnection(null);
      await reload();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar la relacion."), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card
        title={compact ? "Mapa visual" : "Asignacion visual de variables"}
        subtitle={goal ? `Nodos y conexiones para ${goal.nombre}` : "Nodos y conexiones"}
        rightSlot={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => { setEditingNode(null); setNodeModal(true); }}>+ Nodo</Button>
          </div>
        }
      >
        {loading && <Loader label="Cargando nodos..." />}
        {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
        {goal && (
          <GoalNodeBoard
            goal={goal}
            nodes={nodes}
            connections={connections}
            expenses={expenses}
            onDropExpense={(expense) => void dropExpenseOnGoal(expense)}
            onDropAutomaticVariable={(kind) => void dropAutomaticVariableOnGoal(kind)}
            onEditNode={(node) => { setEditingNode(node); setNodeModal(true); }}
            onDeleteNode={setDeleteNode}
            onMoveNode={(node, position) => void moveNode(node, position)}
            onEditConnection={setEditingConnection}
          />
        )}
      </Card>

      {nodeModal && goal && createPortal(<GoalNodeModal goalId={goal.id} cycleId={goal.progress?.cycle_id} node={editingNode} expenses={expenses} loading={saving} onClose={() => setNodeModal(false)} onSubmit={saveNode} />, document.body)}
      {deleteNode && createPortal(<ConfirmGoalActionModal title="Eliminar nodo" message={`Se eliminara el nodo ${deleteNode.etiqueta} y sus conexiones asociadas.`} loading={saving} onClose={() => setDeleteNode(null)} onConfirm={confirmDeleteNode} />, document.body)}
      {editingConnection && createPortal(<GoalConnectionModal connection={editingConnection} loading={saving} onClose={() => setEditingConnection(null)} onSubmit={(draft) => void saveConnection(draft)} onDelete={() => void deleteConnection()} />, document.body)}
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </>
  );
}
