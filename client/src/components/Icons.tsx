// TaskFlow - Inline SVG icon set
// Lightweight Lucide-style stroke icons - no icon dependency required

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): SVGProps<SVGSVGElement> => ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
});

export const IconDashboard = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
);

export const IconInfo = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
    </svg>
);

export const IconPlus = ({ size = 18, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </svg>
);

export const IconSearch = ({ size = 18, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </svg>
);

export const IconPencil = ({ size = 16, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
);

export const IconTrash = ({ size = 16, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M3 6h18" />
        <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
    </svg>
);

export const IconX = ({ size = 18, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

export const IconMenu = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
    </svg>
);

export const IconLogout = ({ size = 18, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
    </svg>
);

export const IconCheck = ({ size = 16, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="m5 13 4 4L19 7" />
    </svg>
);

export const IconCheckCircle = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
);

export const IconList = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3.5 6h.01" />
        <path d="M3.5 12h.01" />
        <path d="M3.5 18h.01" />
    </svg>
);

export const IconClock = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </svg>
);

export const IconPlay = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
    </svg>
);

export const IconFlag = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M5 21V4" />
        <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
);

export const IconCalendar = ({ size = 14, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4" />
        <path d="M8 3v4" />
        <path d="M3 11h18" />
    </svg>
);

export const IconAlert = ({ size = 20, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </svg>
);

export const IconInbox = ({ size = 40, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" />
    </svg>
);

export const IconUser = ({ size = 18, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
);

export const IconSparkles = ({ size = 18, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest}>
        <path d="m12 3 1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9Z" />
        <path d="M19 15.5 19.8 17.4 21.7 18.2 19.8 19 19 20.9 18.2 19 16.3 18.2 18.2 17.4Z" />
    </svg>
);

export const IconLogo = ({ size = 26, ...rest }: IconProps) => (
    <svg {...base(size)} {...rest} strokeWidth={2.4}>
        <path d="m4 13 5 5L20 6" />
    </svg>
);
