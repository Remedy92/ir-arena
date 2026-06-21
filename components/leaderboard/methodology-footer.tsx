/**
 * Static research-posture footer for the benchmark page. Keeps the study
 * framing in view: wins are preferences, not correctness; CIs are shown;
 * small samples are flagged; cases are synthetic. Matches the invariants in
 * CLAUDE.md (no answer repair, strict schema, same prompt for every model).
 */
export function MethodologyFooter() {
  return (
    <section
      aria-label="Methodology"
      className="rounded-[14px] border border-[#EEEDEC] bg-white px-4 py-4"
    >
      <h2 className="mb-2 text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
        Methodology
      </h2>
      <p className="max-w-2xl text-xs leading-relaxed text-[#67625B]">
        Wins are user-judged preferences on blinded side-by-side runs —{' '}
        <span className="font-medium text-[#2E2B29]">not objective correctness</span>.
        Wilson 95% confidence intervals are shown on every win rate; models with
        fewer than 5 appearances are flagged as low sample. Average confidence is
        self-reported by the winning model. Synthetic cases only. Research demo,
        not for clinical use.
      </p>
    </section>
  );
}
