import { useCallback, useState } from "react";
import espaciosService from "../services/espacios.service";
import type { Espacio, EspacioWriteDTO } from "../models/espacio";
import type { PaginatedResponse } from "../models/pagination";

export function useEspacios() {
  const [data, setData] = useState<PaginatedResponse<Espacio> | null>(null);
  const [current, setCurrent] = useState<Espacio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espaciosService.list(params);
      setData(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al listar espacios");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espaciosService.get(id);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al obtener espacio");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: EspacioWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espaciosService.create(payload);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al crear espacio");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: EspacioWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espaciosService.update(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al actualizar espacio");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (id: string, payload: Partial<EspacioWriteDTO>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await espaciosService.patch(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al editar espacio");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await espaciosService.remove(id);
    } catch (e: any) {
      setError(e?.message ?? "Error al eliminar espacio");
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
