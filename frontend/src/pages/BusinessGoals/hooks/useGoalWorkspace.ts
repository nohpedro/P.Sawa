import { useEffect, useState } from "react";
import type { InventoryPurchaseBatch } from "../../../models/inventory";
import type { BusinessFixedExpense, BusinessGoal, BusinessGoalConnection, BusinessGoalNode } from "../../../models/businessGoals";
import businessGoalsService from "../../../services/businessGoals.service";
import inventoryService from "../../../services/inventory.service";
import { getErrorMessage } from "../../../utils/error";

export function useGoalWorkspace(goalId?: string) {
  const [goal, setGoal] = useState<BusinessGoal | null>(null);
  const [nodes, setNodes] = useState<BusinessGoalNode[]>([]);
  const [connections, setConnections] = useState<BusinessGoalConnection[]>([]);
  const [expenses, setExpenses] = useState<BusinessFixedExpense[]>([]);
  const [batches, setBatches] = useState<InventoryPurchaseBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!goalId) return;
    setLoading(true);
    setError(null);
    try {
      const [goalRes, nodeRes, connectionRes, expenseRes] = await Promise.all([
        businessGoalsService.getGoal(goalId),
        businessGoalsService.listNodes({ goal: goalId, page_size: "100" }),
        businessGoalsService.listConnections({ goal: goalId, page_size: "100" }),
        businessGoalsService.listExpenses({ page: "1", page_size: "100" }),
      ]);
      const batchRes = await inventoryService.listBatches({
        page: "1",
        page_size: "100",
        fecha_desde: goalRes.fecha_inicio,
        fecha_hasta: goalRes.fecha_fin,
        ordering: "-fecha_compra",
      });
      setGoal(goalRes);
      setNodes(nodeRes.results ?? []);
      setConnections(connectionRes.results ?? []);
      setExpenses(expenseRes.results ?? []);
      setBatches(batchRes.results ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar la asignacion de variables."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId]);

  return { goal, nodes, connections, expenses, batches, loading, error, reload: load };
}
