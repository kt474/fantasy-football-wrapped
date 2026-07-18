export class HttpError extends Error {
  readonly status: number;

  constructor(context: string, status: number) {
    super(`${context} failed with status ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

export const assertOk = (response: Response, context: string) => {
  if (!response.ok) {
    throw new HttpError(context, response.status);
  }
};

export const parseJson = async <T>(
  response: Response,
  context: string
): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON`);
  }
};
