export type Success<T> = { success: true; data: T };
export type Failure<E> = { success: false; error: E };
export type Result<T, E = Error> = Success<T> | Failure<E>;

export const ok = <T>(data: T): Success<T> => ({ success: true, data });
export const fail = <E>(error: E): Failure<E> => ({ success: false, error });
