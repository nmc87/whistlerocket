const PATHS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  check: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  settings: 'M4 6h10M19 6h1M4 12h3M12 12h8M4 18h11M18.5 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM11.5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19.5 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  plus: 'M12 5v14M5 12h14',
  play: 'M8 5.5v13l11-6.5z',
  stop: 'M7 7h10v10H7z',
  timer: 'M10 2h4M12 14l3-3M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0z',
  search: 'M20 20l-3.5-3.5M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  up: 'M18 15l-6-6-6 6',
  down: 'M6 9l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14',
  upload: 'M12 20V9M7.5 13.5L12 9l4.5 4.5M5 4h14',
  x: 'M6 6l12 12M18 6L6 18',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  calendar: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM14.4 10a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0z',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  minus: 'M5 12h14',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  sun: 'M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, strokeWidth = 1.8, className }: { name: IconName; size?: number; strokeWidth?: number; className?: string }) {
  const filled = name === 'play' || name === 'stop';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Het WhistleRocket-merkteken: fluitraket met geluidsgolven op amber. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#F5B451" />
      <path d="M6.8 17a4.2 4.2 0 0 0 4.2 4.2" fill="none" stroke="#1A1306" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 17a7 7 0 0 0 7 7" fill="none" stroke="#1A1306" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <g transform="translate(15.5 12.5) rotate(45) scale(0.82) translate(-14 -14)">
        <path d="M14 3.5c2.7 2.1 3.8 5.2 3.8 8.6v5.6h-7.6v-5.6c0-3.4 1.1-6.5 3.8-8.6z" fill="#1A1306" />
        <circle cx="14" cy="11.4" r="1.7" fill="#F5B451" />
        <path d="M10.2 14.6l-2.6 2.8v2.6l2.6-1z" fill="#1A1306" />
        <path d="M17.8 14.6l2.6 2.8v2.6l-2.6-1z" fill="#1A1306" />
        <path d="M12.4 19h3.2l-1.6 3.4z" fill="#1A1306" />
      </g>
    </svg>
  );
}
