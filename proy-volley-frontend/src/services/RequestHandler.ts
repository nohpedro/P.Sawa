// src/services/RequestHandler.ts

type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface QueryParams { [key: string]: string; }
interface HeadersMap  { [key: string]: string; }
interface DataMap     { [key: string]: any; }
interface FilesMap    { [key: string]: File; }

export default class RequestHandler {
  public readonly baseUrl: string;

  constructor(baseUrlOverride?: string) {
    this.baseUrl = baseUrlOverride ?? this._determineBaseUrl();
  }

private _determineBaseUrl(): string {
  if (import.meta.env.DEV) {
    const host = window.location.hostname
    return (host === 'localhost' || host === '127.0.0.1')
      ? 'http://localhost:7000/'
      : `http://${host}:7000/`
  }

  // PRODUCCIÓN: fuerza siempre el puerto 8000
  const host = window.location.hostname
  return `http://${host}:7000/`
}

  private _getAuthHeader(): string | null {
    const token = localStorage.getItem("access_token");
    return token ? `Bearer ${token}` : null;
  }

  public getRequest(
    endpoint: string,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendRequest("GET", endpoint, { params, headers });
  }

  public postRequest(
    endpoint: string,
    data?: DataMap,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendRequest("POST", endpoint, { data, params, headers });
  }

  public putRequest(
    endpoint: string,
    data?: DataMap,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendRequest("PUT", endpoint, { data, params, headers });
  }

  public patchRequest(
    endpoint: string,
    data?: DataMap,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendRequest("PATCH", endpoint, { data, params, headers });
  }

  public deleteRequest(
    endpoint: string,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendRequest("DELETE", endpoint, { params, headers });
  }

  public async postMultipart(
    endpoint: string,
    data?: QueryParams,
    files?: FilesMap,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendMultipart("POST", endpoint, { data, files, params, headers });
  }

  public async putMultipart(
    endpoint: string,
    data?: QueryParams,
    files?: FilesMap,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendMultipart("PUT", endpoint, { data, files, params, headers });
  }

  public async patchMultipart(
    endpoint: string,
    data?: QueryParams,
    files?: FilesMap,
    params?: QueryParams,
    headers?: HeadersMap
  ) {
    return this._sendMultipart("PATCH", endpoint, { data, files, params, headers });
  }

  private async _sendMultipart(
    method: "POST" | "PUT" | "PATCH",
    endpoint: string,
    opts: {
      data?: QueryParams;
      files?: FilesMap;
      params?: QueryParams;
      headers?: HeadersMap;
    }
  ) {
    const url = this._buildUrl(endpoint, opts.params);
    console.debug(`[${method} multipart]`, url);

    const form = new FormData();
    if (opts.data) Object.entries(opts.data).forEach(([k, v]) => form.append(k, v));
    if (opts.files) Object.entries(opts.files).forEach(([k, file]) => {
      form.append(k, file, file.name);
    });

    const hdrs: HeadersMap = { ...opts.headers };
    const auth = this._getAuthHeader();
    if (auth) hdrs.Authorization = auth;

    const response = await fetch(url, { method, headers: hdrs, body: form });
    return this._handleResponse(response, url);
  }

  private async _sendRequest(
    method: HTTPMethod,
    endpoint: string,
    opts: {
      data?: DataMap;
      params?: QueryParams;
      headers?: HeadersMap;
    }
  ) {
    const url = this._buildUrl(endpoint, opts.params);
    console.debug(`[${method}]`, url);

    const hdrs: HeadersMap = { "Content-Type": "application/json", ...opts.headers };
    const auth = this._getAuthHeader();
    if (auth) hdrs.Authorization = auth;

    const init: RequestInit = {
      method,
      headers: hdrs,
      body:
        opts.data != null && method !== "GET"
          ? JSON.stringify(opts.data)
          : undefined,
    };

    const response = await fetch(url, init);
    return this._handleResponse(response, url);
  }

  private _buildUrl(endpoint: string, params?: QueryParams): string {
    const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const url = new URL(this.baseUrl + path);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    return url.toString();
  }

  private async _handleResponse(res: Response, url: string) {
    const contentType = res.headers.get("content-type") || "";
    if (res.ok) {
      if (contentType.includes("application/json")) return res.json();
      console.warn(`[Warn] ${url} response not JSON: ${contentType}`);
      return res.text();
    } else {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status} @ ${url}: ${errText}`);
    }
  }
}
