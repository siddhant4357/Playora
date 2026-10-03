import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/courts", label: "Courts" },
  { href: "/plans", label: "Plans" },
  { href: "/shop", label: "Shop" },
  { href: "/trial", label: "Free trial" },
  { href: "/contact", label: "Contact" },
];

interface NavProps {
  /** Role home of the signed-in user, or null for guests. */
  appHref?: string | null;
}

export function Nav({ appHref = null }: NavProps) {
  return (
    <header className="ln">
      <div className="l-container ln-inner">
        <Link href="/" className="ln-brand" aria-label="Playora home">
          <BrandLogo height={30} />
        </Link>

        <nav aria-label="Primary">
          <ul className="ln-links">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ln-right">
          <ThemeToggle />
          {appHref ? (
            <Link href={appHref} className="btn btn-primary">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary">
                Join the club
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
