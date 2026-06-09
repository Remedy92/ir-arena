export function DisclaimerStrip() {
  return (
    <div
      role="note"
      className="sticky top-14 z-40 flex shrink-0 items-center justify-center gap-2 border-b border-[#F0E4B8] bg-[#FDF8E7] px-4 py-2 text-center"
    >
      <FlaskIcon className="size-3.5 shrink-0 text-[#B8920A]" />
      <p className="text-[11px] font-medium leading-tight tracking-wide text-[#8A6D08]">
        <span className="font-semibold">Synthetic cases only</span>
        <span className="mx-1.5 text-[#D9C277]">·</span>
        Research demo, not for clinical use.
      </p>
    </div>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 3h6" />
      <path d="M10 3v6.5L5.2 17.3A2 2 0 0 0 6.9 20.4h10.2a2 2 0 0 0 1.7-3.1L14 9.5V3" />
      <path d="M7.5 14h9" />
    </svg>
  );
}
