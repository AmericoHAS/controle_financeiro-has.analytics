export interface WorkBook { SheetNames: string[]; Sheets: Record<string, unknown> }
export function read(data: ArrayBuffer | string, options?: Record<string, unknown>): WorkBook;
export const utils: { sheet_to_json<T>(sheet: unknown, options?: Record<string, unknown>): T[] };
