import { useEffect, useState } from "react";
import type { BusinessFixedExpense, BusinessGoal, BusinessGoalConnection, BusinessGoalNode } from "../../../models/businessGoals";
import businessGoalsService from "../../../services/businessGoals.service";
import { getErrorMessage } from "../../../utils/error";

export function useGoalWorkspace(goalId?: string) {
  const [goal, setGoal] = useState<BusinessGoal | null>(null);
  const [nodes, setNodes] = useState<BusinessGoalNode[]>([]);
  const [connections, setConnections] = useState<BusinessGoalConnection[]>([]);
  const [expenses, setExpenses] = useState<BusinessFixedExpense[]>([]);
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
      setGoal(goalRes);
      setNodes(nodeRes.results ?? []);
      setConnections(connectionRes.results ?? []);
      setExpenses(expenseRes.results ?? []);
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

  return { goal, nodes, connections, expenses, loading, error, reload: load };
}
