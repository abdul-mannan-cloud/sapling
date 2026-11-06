/**
 * Sapling brand mark and wordmark.
 *
 * The two-leaf "shoot" paths are lifted verbatim from saplinghealth.com's
 * icon.svg (their favicon) so the internal tool carries the exact same mark;
 * `currentColor` makes it recolorable per surface. The wordmark is set in
 * Inter — the brand font used across their site — lowercase with tight
 * tracking, matching how they render "sapling" in the nav.
 */

const SHOOT_PATHS = [
  'M36.5553 77.1973C37.0569 52.1065 20.6098 38.3951 8.1271 32.8766C4.95343 31.4735 1.4074 33.407 0.76299 36.8166C-4.19985 63.0754 16.2186 76.4889 28.1617 82.2264C31.9677 84.0547 36.4709 81.4188 36.5553 77.1973Z',
  'M39.4637 76.5829C36.2643 32.4191 66.6287 9.69533 87.2314 1.8992C90.4595 0.677646 93.9444 2.58885 94.7502 5.94502C105.898 52.3772 66.0393 73.9754 48.0633 81.7174C44.2025 83.3802 39.7674 80.7756 39.4637 76.5829Z',
];

export function SaplingMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g transform="translate(22 25) scale(0.58)" fill="currentColor">
        {SHOOT_PATHS.map((d) => (
          <path key={d.slice(-12)} d={d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Full lockup: shoot mark + lowercase "sapling" wordmark, with an optional
 * context label ("Family Clinic", "Staff Console") set off by a hairline.
 */
export function Logo({
  theme = 'light',
  size = 20,
  sub,
}: {
  theme?: 'light' | 'dark';
  size?: number;
  sub?: string;
}) {
  return (
    <span className={`logo${theme === 'dark' ? ' logo-dark' : ''}`}>
      <SaplingMark size={size} />
      <span className="logo-word">sapling</span>
      {sub && (
        <>
          <span className="logo-rule" aria-hidden="true" />
          <span className="logo-sub">{sub}</span>
        </>
      )}
    </span>
  );
}
