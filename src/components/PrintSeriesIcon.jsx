// Match the existing series symbols without relying on a font's Unicode coverage.
export default function PrintSeriesIcon({ seriesKey }) {
  let shape;
  switch (seriesKey) {
    case 'sketch':
      shape = [0, 60, 120].map(angle => (
        <ellipse key={angle} cx="12" cy="12" rx="2.2" ry="10" transform={`rotate(${angle} 12 12)`} />
      ));
      break;
    case 'foundation':
      shape = <path d="m12 1.5 3.2 6.6 7.3 1-5.3 5.2 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.2 7.3-1z" />;
      break;
    case 'chronicle':
      shape = <path d="M8 8H5a3 3 0 1 1 3-3v14a3 3 0 1 1-3-3h14a3 3 0 1 1-3 3V5a3 3 0 1 1 3 3H8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />;
      break;
    case 'legend':
      shape = <path d="m12 1 5 5-5 5-5-5zm-6 6 5 5-5 5-5-5zm12 0 5 5-5 5-5-5zm-6 6 5 5-5 5-5-5z" />;
      break;
    case 'engrained':
      shape = <><path d="m12 1.5 10.5 10.5L12 22.5 1.5 12z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m12 6 6 6-6 6-6-6z" /></>;
      break;
    default:
      return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      data-print-series-icon={seriesKey}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {shape}
    </svg>
  );
}
