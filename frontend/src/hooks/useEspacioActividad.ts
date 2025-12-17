import { useCallback, useState } from "react";
import espacioActividadService from "../services/espacioActividad.service";
import type { EspacioActividad } from "../models/actividad";
import type { PaginatedResponse } from "../models/pagination";

export function useEspacioActividad() {
  const [data, setData] = useState<PaginatedResponse<EspacioActividad> | null>(null);
  const [current, setCurrent] = useState<EspacioActividad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espacioActividadService.list(params);
      setData(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al listar espacio-actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espacioActividadService.get(id);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al obtener espacio-actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: Partial<EspacioActividad>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espacioActividadService.create(payload);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al crear espacio-actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: Partial<EspacioActividad>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espacioActividadService.update(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al actualizar espacio-actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (id: string, payload: Partial<EspacioActividad>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espacioActividadService.patch(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al editar espacio-actividad");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await espacioActividadService.remove(id);
    } catch (e: any) {
      setError(e?.message ?? "Error al eliminar espacio-actividad");
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
    setCurrent,
  };
}
