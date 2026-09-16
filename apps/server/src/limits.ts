import { badInput } from './errors';

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5_000;
export const NAME_MAX = 40;

/** Validate at the edge (resolvers); nothing below re-checks. */
export function assertLength(field: string, value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw badInput(`${field} cannot be empty.`);
  if (trimmed.length > max) throw badInput(`${field} is longer than ${max} characters.`);
  return trimmed;
}
