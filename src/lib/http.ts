export const assertOk = (response: Response, context: string) => {
  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}`);
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
