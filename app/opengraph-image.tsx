import { ImageResponse } from 'next/og';

export const alt =
  'IR Arena — blinded side-by-side LLM triage comparison for interventional radiology';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FCFAF8',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2E2B29"
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"
          >
            <path d="M12 2.6 19 5.4v6.2c0 4.3-3 7.3-7 8.8-4-1.5-7-4.5-7-8.8V5.4z" />
            <path d="M7.5 12h2.2l1.4-3 1.6 6 1.3-3h2" />
          </svg>
          <div
            style={{
              fontSize: 44,
              fontWeight: 500,
              color: '#2E2B29',
              letterSpacing: -0.5,
            }}
          >
            IR Arena
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div
              style={{
                width: 72,
                height: 8,
                background: '#F4C406',
                borderRadius: 4,
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 68,
                fontWeight: 600,
                color: '#2E2B29',
                letterSpacing: -2,
                lineHeight: 1.05,
              }}
            >
              <div>Blinded LLM triage</div>
              <div>for interventional radiology</div>
            </div>
          </div>
          <div style={{ fontSize: 30, color: '#67625B', maxWidth: 940 }}>
            Side-by-side comparison of frontier models on synthetic acute
            hemorrhage cases. A research demo.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: '#8B857C',
          }}
        >
          <div>Synthetic data · Not clinical advice</div>
          <div>ir-arena</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
