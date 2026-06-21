import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FCFAF8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="128"
          height="128"
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
      </div>
    ),
    { ...size },
  );
}
