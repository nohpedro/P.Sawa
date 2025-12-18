import { useCallback, useState } from "react";
import clientesService from "../services/clientes.service";
import type { Cliente, ClienteWriteDTO } from "../models/cliente";
import type { PaginatedResponse } from "../models/pagination";
import { getErrorMessage } from "../utils/error";

export function useClientes() {
  const [data, setData] = useState<PaginatedResponse<Cliente> | null>(null);
  const [current, setCurrent] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientesService.list(params);
      setData(res);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al listar clientes"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientesService.get(id);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al obtener cliente"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: ClienteWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientesService.create(payload);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al crear cliente"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: ClienteWriteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientesService.update(id, payload);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al actualizar cliente"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (id: string, payload: Partial<ClienteWriteDTO>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientesService.patch(id, payload);
      setCurrent(res);
      return res;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al editar cliente"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await clientesService.remove(id);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error al eliminar cliente"));
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
