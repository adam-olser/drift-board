import mercurius from 'mercurius';

// why: mercurius is CommonJS; named ESM imports of its exports fail at runtime.
const { ErrorWithProps } = mercurius;

/** The only error codes a client ever sees. Anything else surfaces as INTERNAL with no detail. */
export const ErrorCode = {
  CardGone: 'CARD_GONE',
  VersionMismatch: 'VERSION_MISMATCH',
  BadInput: 'BAD_INPUT',
  NotFound: 'NOT_FOUND',
  Unauthenticated: 'UNAUTHENTICATED',
  RateLimited: 'RATE_LIMITED',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const cardGone = (cardId: string) =>
  new ErrorWithProps('This card was deleted by someone else.', {
    code: ErrorCode.CardGone,
    cardId,
  });

export const versionMismatch = (current: unknown) =>
  new ErrorWithProps('Someone else edited this card first.', {
    code: ErrorCode.VersionMismatch,
    current,
  });

export const badInput = (message: string) =>
  new ErrorWithProps(message, { code: ErrorCode.BadInput }, 400);

export const notFound = (what: string) =>
  new ErrorWithProps(`${what} not found.`, { code: ErrorCode.NotFound }, 404);

export const unauthenticated = () =>
  new ErrorWithProps('Start a session first.', { code: ErrorCode.Unauthenticated }, 401);

export const rateLimited = () =>
  new ErrorWithProps(
    'Too many attempts, try again in a minute.',
    { code: ErrorCode.RateLimited },
    429
  );
