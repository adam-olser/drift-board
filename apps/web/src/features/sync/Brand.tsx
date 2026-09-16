/** The three-line brand mark from the design; tinted by the sync state from Milestone 7 on. */
export function Brand({ color = 'var(--ok)' }: { color?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2 5h12M2 8h8M2 11h10" />
    </svg>
  );
}
