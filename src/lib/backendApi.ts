import { authenticatedFetch } from "@/lib/authFetch";
import {
  runWithRequestTimeout,
  type RequestOptions,
} from "@/lib/request";

const BACKEND_REQUEST_TIMEOUT_MS = 20_000;

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
    timeoutMs = BACKEND_REQUEST_TIMEOUT_MS,
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
