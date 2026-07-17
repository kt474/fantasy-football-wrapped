type NumericIteratee<T> = keyof T | ((value: T) => number);
type KeyIteratee<T> = keyof T | ((value: T) => unknown);

const numericValue = <T>(value: T, iteratee: NumericIteratee<T>) =>
  Number(typeof iteratee === "function" ? iteratee(value) : value[iteratee]);

const keyValue = <T>(value: T, iteratee: KeyIteratee<T>) =>
  typeof iteratee === "function" ? iteratee(value) : value[iteratee];

export const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

export const mean = (values: readonly number[]) =>
  values.length > 0 ? sum(values) / values.length : Number.NaN;

export const min = (values: readonly number[]) =>
  values.length > 0 ? Math.min(...values) : undefined;

export const max = (values: readonly number[]) =>
  values.length > 0 ? Math.max(...values) : undefined;

export const minBy = <T>(
  values: readonly T[],
  iteratee: NumericIteratee<T>
) =>
  values.reduce<T | undefined>(
    (result, value) =>
      result === undefined ||
      numericValue(value, iteratee) < numericValue(result, iteratee)
        ? value
        : result,
    undefined
  );

export const maxBy = <T>(
  values: readonly T[],
  iteratee: NumericIteratee<T>
) =>
  values.reduce<T | undefined>(
    (result, value) =>
      result === undefined ||
      numericValue(value, iteratee) > numericValue(result, iteratee)
        ? value
        : result,
    undefined
  );

export const groupBy = <T>(
  values: readonly T[],
  iteratee: KeyIteratee<T>
) =>
  values.reduce<Record<string, T[]>>((groups, value) => {
    const key = String(keyValue(value, iteratee));
    (groups[key] ??= []).push(value);
    return groups;
  }, {});

export const countBy = <T>(
  values: readonly T[],
  iteratee: (value: T) => unknown
) =>
  values.reduce<Record<string, number>>((counts, value) => {
    const key = String(iteratee(value));
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

export const flatten = <T>(values: readonly (readonly T[])[]) =>
  values.flat();

export const zip = <T>(...values: readonly (readonly T[])[]) => {
  const length = Math.max(0, ...values.map((value) => value.length));
  return Array.from({ length }, (_, index) =>
    values.map((value) => value[index])
  );
};

export const round = (value: number, precision = 0) => {
  const multiplier = 10 ** precision;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

export const capitalize = (value: string) =>
  value.length > 0 ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "";
