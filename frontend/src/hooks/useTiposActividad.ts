import { useCallback, useState } from "react";
import tiposActividadService from "../services/tiposActividad.service";
import type { TipoActividad } from "../models/actividad";
import type { PaginatedResponse } from "../models/pagination";

export function useTiposActividad() {
  const [data, setData] = useState<PaginatedResponse<TipoActividad> | null>(null);
  const [current, setCurrent] = useState<TipoActividad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tiposActividadService.list(params);
      setData(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al listar tipos de actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tiposActividadService.get(id);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al obtener tipo de actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: Partial<TipoActividad>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tiposActividadService.create(payload);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al crear tipo de actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: Partial<TipoActividad>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tiposActividadService.update(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al actualizar tipo de actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (id: string, payload: Partial<TipoActividad>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tiposActividadService.patch(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al editar tipo de actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await tiposActividadService.remove(id);
    } catch (e: any) {
      setError(e?.message ?? "Error al eliminar tipo de actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    current,
    loading,
    error,
    list,
    get,
    create,
    update,
    patch,
    remove,
    setCurrent, // útil para UI
  };
}
