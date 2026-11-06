/** Minimal stroke-icon set, drawn to match Inter's geometry (16px grid, 1.5 stroke). */

type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 13V3" />
    <path d="M3.5 7.5 8 3l4.5 4.5" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);

export const IconPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11.3 2.6a1.4 1.4 0 0 1 2 2L5.6 12.3l-2.7.7.7-2.7 7.7-7.7Z" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 4.5h11M6.5 2.5h3M4 4.5l.6 9h6.8l.6-9M6.6 7v4M9.4 7v4" />
  </Svg>
);

export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3 5 8l5 5" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3l5 5-5 5" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.8V8l2.4 1.6" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="5.5" r="2.5" />
    <path d="M1.8 13.2a4.4 4.4 0 0 1 8.4 0" />
    <path d="M10.5 3.4a2.5 2.5 0 0 1 0 4.7M11.4 13.2a4.4 4.4 0 0 0-1.4-3.2 3.4 3.4 0 0 1 4.2 3.2" />
  </Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 8.6 3.6 3h8.8L14 8.6V13H2V8.6Z" />
    <path d="M2 8.6h3l.8 1.8h4.4l.8-1.8h3" />
  </Svg>
);

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 7.4c0 2.9-2.5 5.2-5.5 5.2-.6 0-1.2-.1-1.7-.3L3 13.5l.9-2.6A5 5 0 0 1 2.5 7.4c0-2.9 2.5-5.2 5.5-5.2s5.5 2.3 5.5 5.2Z" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 2.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 11l3-3-3-3M5.5 8h7.5" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5 6.5 12 13 4" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.3 14.4 13H1.6L8 2.3Z" />
    <path d="M8 6.3v3M8 11.2v.1" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="3" width="12" height="11" rx="1.6" />
    <path d="M2 6.4h12M5.5 1.8v2.4M10.5 1.8v2.4" />
  </Svg>
);

export const IconPill = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.8" y="5.2" width="12.4" height="5.6" rx="2.8" transform="rotate(-40 8 8)" />
    <path d="M5.9 10.1 10.1 5.9" />
  </Svg>
);

export const IconClipboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="2.5" width="10" height="12" rx="1.4" />
    <path d="M6 2.5V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.5" transform="translate(0 1)" />
    <path d="M5.5 7h5M5.5 9.6h5M5.5 12.2h3" />
  </Svg>
);

export const IconDollar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 1.8v12.4" />
    <path d="M10.8 5.2c0-1.2-1.3-2-2.8-2S5.2 4 5.2 5.2c0 3 5.6 1.7 5.6 4.9 0 1.3-1.2 2.1-2.8 2.1s-2.8-.8-2.8-2.1" />
  </Svg>
);

export const IconHelp = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M6.2 6.2c.2-1 1-1.6 1.8-1.6 1 0 1.8.8 1.8 1.7 0 1.4-1.8 1.5-1.8 2.9M8 11.6v.1" />
  </Svg>
);

export const IconMic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5.3" y="1.8" width="5.4" height="8" rx="2.7" />
    <path d="M3.2 7.5a4.8 4.8 0 0 0 9.6 0" />
    <path d="M8 12.3v2M5.8 14.3h4.4" />
  </Svg>
);

export const IconSquare = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

/** Icon lookup for handoff types, shared by the staff queue and detail views. */
export const HANDOFF_ICONS = {
  appointment_request: IconCalendar,
  refill: IconPill,
  clinical_question: IconClipboard,
  billing: IconDollar,
  other: IconHelp,
  emergency: IconAlert,
} as const;
