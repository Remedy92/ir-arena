export function Hero() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 text-center">
      <h1 className="font-['Newsreader',Georgia,serif] text-3xl font-light tracking-tight text-[#2E2B29] sm:text-4xl">
        Which model calls the{' '}
        <em className="relative inline-block not-italic">
          <span className="relative z-10 font-['Newsreader',Georgia,serif] italic">
            bleed
          </span>
          <span
            aria-hidden
            className="absolute inset-x-[-0.12em] bottom-[0.08em] z-0 h-[0.55em] rounded-sm bg-[#F4C406]"
          />
        </em>
        ?
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#67625B]">
        Four models triage the same synthetic IR case in parallel. Compare
        decisions blind, then reveal who called it.
      </p>
    </section>
  );
}