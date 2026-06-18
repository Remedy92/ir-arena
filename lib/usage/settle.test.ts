import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sqlCalls } = vi.hoisted(() => ({
  sqlCalls: [] as string[],
}));

vi.mock('ai', () => ({
  gateway: {
    getGenerationInfo: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => {
  const sql = Object.assign(
    (strings: TemplateStringsArray) => {
      sqlCalls.push(strings.join('?'));
      return Promise.resolve([]);
    },
    {
      transaction: vi.fn(),
    },
  );

  return {
    getSql: () => sql,
  };
});

describe('settleUsage', () => {
  beforeEach(() => {
    sqlCalls.length = 0;
  });

  it('uses the reserved usage event as the idempotency guard', async () => {
    const { settleUsage } = await import('./settle');

    await settleUsage({
      reservationId: 123,
      userId: 'user-1',
      ceilingMicroUsd: 500,
      generationId: undefined,
      usage: undefined,
    });

    expect(sqlCalls).toHaveLength(1);
    expect(sqlCalls[0]).toContain("status = 'reserved'");
    expect(sqlCalls[0]).toContain('UPDATE user_budget');
    expect(sqlCalls[0]).toContain('UPDATE usage_events');
  });
});
