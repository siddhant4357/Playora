import Link from "next/link";
import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "#courts", label: "Courts" },
  { href: "#members", label: "Members" },
  { href: "#plans", label: "Plans" },
  { href: "#modules", label: "Modules" },
  { href: "#owner", label: "For owners" },
];

export function Nav() {
  return (
    <header className="ln">
      <div className="l-container ln-inner">
        <Link href="/" className="ln-brand" aria-label="CourtOS home">
          <span className="ln-mark" aria-hidden="true">
            <Trophy size={15} strokeWidth={2.5} />
          </span>
          CourtOS
          <small>for The Champions Club</small>
        </Link>

        <nav aria-label="Primary">
          <ul className="ln-links">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ln-right">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-primary">
            Join the club
          </Link>
        </div>
      </div>
    </header>
  );
}
