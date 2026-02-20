import { cn } from "@/lib/utils/cn";

export const AXLE_BRAND = {
  amber: "#F59E0B",
  amberLight: "#FBBF24",
  amberDark: "#D97706",
  amberDeep: "#B45309",
  dark: "#0A0E1A",
  darkCard: "#111827",
  darkSurface: "#0F172A",
  slate: "#1E293B",
  textWhite: "#F8FAFC",
  textGray: "#94A3B8",
  textMuted: "#64748B",
};

type MarkProps = {
  size?: number;
  color?: string;
  className?: string;
  mono?: boolean;
  bgColor?: string;
};

type WordmarkProps = {
  height?: number;
  color?: string;
  className?: string;
};

type LogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  textColor?: string;
  layout?: "horizontal" | "vertical";
  className?: string;
};

export function AxleLogomark({
  size = 64,
  color = AXLE_BRAND.amber,
  className,
  mono = false,
  bgColor = AXLE_BRAND.dark,
}: MarkProps) {
  const c = mono ? "currentColor" : color;
  const inner = mono ? bgColor : AXLE_BRAND.dark;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Axle logomark"
    >
      <circle cx="32" cy="32" r="28" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <line x1="4" y1="32" x2="60" y2="32" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="32" r="5.5" fill={c} />
      <circle cx="18" cy="32" r="2.5" fill={inner} />
      <circle cx="46" cy="32" r="5.5" fill={c} />
      <circle cx="46" cy="32" r="2.5" fill={inner} />
      <path
        d="M18 32 C18 16, 46 16, 46 32"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 3"
        opacity="0.5"
      />
      <circle cx="32" cy="18.5" r="3" fill={c} opacity="0.8" />
      <path
        d="M28 5.5 L32 1 L36 5.5"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function AxleWordmark({
  height = 28,
  color = AXLE_BRAND.textWhite,
  className,
}: WordmarkProps) {
  const scale = height / 28;
  const width = 108 * scale;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 108 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Axle wordmark"
    >
      <path d="M2 27L12.5 1H15.5L26 27H22.5L19.8 20H8.2L5.5 27H2ZM9.3 17H18.7L14 4.5L9.3 17Z" fill={color} />
      <path d="M28 27L38.5 14L29 1H33.2L40.5 11.5L47.8 1H52L42.5 14L53 27H48.8L40.5 16.5L32.2 27H28Z" fill={color} />
      <path d="M56 1H59.5V23.5H73V27H56V1Z" fill={color} />
      <path d="M76 1H106V4.5H79.5V12H103V15.5H79.5V23.5H106V27H76V1Z" fill={color} />
    </svg>
  );
}

export function AxleLogo({
  size = "md",
  color = AXLE_BRAND.amber,
  textColor = AXLE_BRAND.textWhite,
  layout = "horizontal",
  className,
}: LogoProps) {
  const sizes: Record<NonNullable<LogoProps["size"]>, number> = { sm: 32, md: 48, lg: 64, xl: 80 };
  const markSize = sizes[size];
  const wordHeight = markSize * 0.42;
  const gap = markSize * 0.28;

  if (layout === "vertical") {
    return (
      <div className={cn("flex flex-col items-center", className)} style={{ gap }}>
        <AxleLogomark size={markSize} color={color} />
        <AxleWordmark height={wordHeight} color={textColor} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)} style={{ gap }}>
      <AxleLogomark size={markSize} color={color} />
      <AxleWordmark height={wordHeight} color={textColor} />
    </div>
  );
}
