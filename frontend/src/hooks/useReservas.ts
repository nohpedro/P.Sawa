import { useCallback, useState } from "react";
import reservasService from "../services/reservas.service";
import type { Reserva, ReservaCreateDTO } from "../models/reserva";
import type { PaginatedResponse } from "../models/pagination";

export function useReservas() {
  const [data, setData] = useState<PaginatedResponse<Reserva> | null>(null);
  const [current, setCurrent] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.list(params);
      setData(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al listar reservas");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.get(id);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al obtener reserva");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: ReservaCreateDTO) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.create(payload);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al crear reserva");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: Partial<Reserva>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.update(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al actualizar reserva");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (id: string, payload: Partial<Reserva>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.patch(id, payload);
      setCurrent(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Error al editar reserva");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await reservasService.remove(id);
    } catch (e: any) {
      setError(e?.message ?? "Error al eliminar reserva");
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
