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

/**
 * Normaliza mensajes de errores de reservas a algo que el usuario entienda.
 * Aquí manejamos explícitamente el caso:
 *   {"inicio":["Existe una reserva que se solapa."]}
 */
function humanizeReservaError(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (m.includes("solapa") || m.includes("solap")) {
    return "Ese horario ya está reservado. Elige otro rango de horas.";
  }
  return rawMessage;
}

export function useReservas() {
  const [data, setData] = useState<PaginatedResponse<Reserva> | null>(null);
  const [current, setCurrent] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(
    async (params?: {
      page?: string;
      page_size?: string;
      desde?: string;
      hasta?: string;
      espacio?: string;
      usuario?: string;
      cliente?: string;
      actividad?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await reservasService.list(params);
        setData(res);
        return res;
      } catch (e: unknown) {
        const raw = getErrorMessage(e, "Error al listar reservas");
        const msg = humanizeReservaError(raw);
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const get = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.get(id);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      const raw = getErrorMessage(e, "Error al obtener reserva");
      const msg = humanizeReservaError(raw);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear reserva
   * - Calcula automáticamente ?desde & ?hasta desde inicio / fin
   * - Normaliza el mensaje si el backend devuelve solapamiento
   * - Lanza Error(msg) para que el form/página pueda mostrarlo
   */
  const create = useCallback(async (payload: ReservaWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const desde = isoToDate(payload.inicio);
      const hasta = isoToDate(payload.fin);

      const res = await reservasService.create(payload, { desde, hasta });

      // opcional: podrías refrescar el listado aquí si tu UI lo requiere
      // await list({ page: "1", desde, hasta });

      return res;
    } catch (e: unknown) {
      const raw = getErrorMessage(e, "Error al crear reserva");
      const msg = humanizeReservaError(raw);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: ReservaWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.update(id, payload);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      const raw = getErrorMessage(e, "Error al actualizar reserva");
      const msg = humanizeReservaError(raw);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (id: string, payload: Partial<ReservaWriteDTO>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservasService.patch(id, payload);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      const raw = getErrorMessage(e, "Error al editar reserva");
      const msg = humanizeReservaError(raw);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await reservasService.remove(id);
    } catch (e: unknown) {
      const raw = getErrorMessage(e, "Error al eliminar reserva");
      const msg = humanizeReservaError(raw);
      setError(msg);
      throw new Error(msg);
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
