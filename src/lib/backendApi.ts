import { authenticatedFetch } from "@/lib/authFetch";
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  runWithRequestTimeout,
  type RequestOptions,
} from "@/lib/request";

export const getBackendBaseUrl = () =>
  (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");

export const getBackendApiUrl = (path: string) =>
  `${getBackendBaseUrl()}${path}`;

type AuthenticatedBackendFetchOptions = Omit<RequestInit, "signal"> &
  RequestOptions;

export const authenticatedBackendFetch = (
  path: string,
  {
    signal,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...init
  }: AuthenticatedBackendFetchOptions = {}
) =>
  runWithRequestTimeout(
    (requestSignal) =>
      authenticatedFetch(getBackendApiUrl(path), {
        ...init,
        signal: requestSignal,
      }),
    { signal, timeoutMs }
  );
