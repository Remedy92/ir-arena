import { getLeaderboardData } from '@/lib/leaderboard-data';

export const runtime = 'nodejs';
// Aggregate stats are safe to cache publicly at the edge — they contain no
// user IDs or raw case text. The page server component also uses
// `revalidate = 300` for ISR, so both paths refresh together.
export const revalidate = 300;

/**
 * Public aggregate leaderboard. No auth — returns only counts and averages over
 * `run_votes` and `run_arms`. Never selects `user_id` or `case_text` into the
 * response. Empty DB → 200 with `models: []` and zero totals (the UI renders
 * the empty state).
 */
export async function GET() {
  try {
    const body = await getLeaderboardData();

    return new Response(JSON.stringify(body), {
      headers: {
        'content-type': 'application/json',
        // Public + short browser cache + longer CDN cache + stale revalidation.
        'cache-control':
          'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[leaderboard] failed:', error);
    return Response.json({ error: 'leaderboard_failed' }, { status: 500 });
  }
}
