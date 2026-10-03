import Link from "next/link";
import { Trophy } from "lucide-react";

const links = [
  { label: "Book a court", href: "/me/book" },
  { label: "Memberships", href: "/#plans" },
  { label: "Bar & shop", href: "/#bar" },
  { label: "Help", href: "mailto:hello@champions.club" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background text-muted-foreground font-sans">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Yolla home" className="flex items-center gap-2 font-semibold text-foreground">
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <Trophy size={13} strokeWidth={2.5} />
            </span>
            Yolla
          </Link>
          <span aria-hidden="true" className="hidden md:inline">·</span>
          <span className="text-pretty">The Champions Club — courts, members, bar and the money on one kernel.</span>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="transition-colors hover:text-foreground focus-visible:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-6 py-3 text-xs">
          © {year} The Champions Club · Built on Yolla for the Odoo Hackathon
        </p>
      </div>
    </footer>
  );
}
