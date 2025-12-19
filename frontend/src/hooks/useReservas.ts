import { useCallback, useState } from "react";
import reservasService from "../services/reservas.service";
import type { Reserva, ReservaWriteDTO } from "../models/reserva";
import type { PaginatedResponse } from "../models/pagination";
import { getErrorMessage } from "../utils/error";

/**
 * Extrae YYYY-MM-DD desde un ISO string
 */
function isoToDate(iso: string): string {
  return iso.slice(0, 10);
}

export function useReservas() {
  const [data, setData] = useState<PaginatedResponse<Reserva> | null>(null);
  const [current, setCurrent] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Listar reservas (con filtros desde / hasta)
   */
  const list = useCallback(
    async (params?: {
      page?: string;
      desde?: string;
      hasta?: string;
      espacio?: string;
      usuario?: string;
      actividad?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await reservasService.list(params);
        setData(res);
        return res;
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Error al listar reservas"));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtener una reserva por ID
   */
  const get = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.get(id);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al obtener reserva"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear reserva
   * - Calcula automáticamente ?desde & ?hasta desde inicio / fin
   */
  const create = useCallback(async (payload: ReservaWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const desde = isoToDate(payload.inicio);
      const hasta = isoToDate(payload.fin);
      const res = await reservasService.create(payload, desde, hasta);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al crear reserva"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update completo
   */
  const update = useCallback(async (id: string, payload: ReservaWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.update(id, payload);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al actualizar reserva"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Patch parcial
   */
  const patch = useCallback(async (id: string, payload: Partial<ReservaWriteDTO>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.patch(id, payload);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al editar reserva"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Eliminar reserva
   */
  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await reservasService.remove(id);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al eliminar reserva"));
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
