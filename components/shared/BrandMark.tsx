import Link from "next/link";
import Image from "next/image";
import { cn } from "cn";

export const BRAND_NAME = "Playora";
export const BRAND_LOGO = "/playora-logo.jpeg";

/**
 * Playora wordmark. The source artwork sits on a white background, so it is
 * always rendered on a white plate to stay legible in dark mode.
 */
export function BrandLogo({ height = 28, className }: { height?: number; className?: string }) {
  const width = Math.round(height * 3.2);
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center rounded-md bg-white px-2 py-1", className)}
      style={{ height: height + 8 }}
    >
      <Image src={BRAND_LOGO} alt="" width={width} height={height} priority style={{ height, width: "auto" }} />
    </span>
  );
}

export function BrandMark({ className, height = 28 }: { className?: string; height?: number }) {
  return (
    <Link href="/" aria-label={`${BRAND_NAME} home`} className={cn("inline-flex items-center", className)}>
      <BrandLogo height={height} />
      <span className="sr-only">{BRAND_NAME}</span>
    </Link>
  );
}
