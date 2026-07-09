import { useEffect, useState } from "react";
import type { BusinessGoal } from "../../../models/businessGoals";
import businessGoalsService from "../../../services/businessGoals.service";
import { getErrorMessage } from "../../../utils/error";

export function useBusinessGoals(params?: Record<string, string>) {
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await businessGoalsService.listGoals({ page: "1", page_size: "100", ...(params ?? {}) });
      setGoals(res.results ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las metas."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params ?? {})]);

  return { goals, loading, error, reload: load };
}
