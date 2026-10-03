import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  Phone,
  ChevronDown,
} from "lucide-react";

const linkClass =
  "block py-[3px] text-[15px] leading-5 text-[#b4b6c2] hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white focus-visible:underline";
const headingClass = "text-white text-[22px] font-semibold leading-tight mb-2.5";

type FooterLink = { label: string; href: string };

// Each inner array is a visual group (small gap between groups)
const columns: { title: string; groups: FooterLink[][] }[][] = [
  [
    {
      title: "Community",
      groups: [
        [
          { label: "Tutorials", href: "#" },
          { label: "Documentation", href: "#" },
          { label: "Forum", href: "#" },
        ],
      ],
    },
    {
      title: "Open Source",
      groups: [
        [{ label: "Download", href: "#" }],
        [
          { label: "Github", href: "#" },
          { label: "Runbot", href: "#" },
          { label: "Translations", href: "#" },
        ],
      ],
    },
  ],
  [
    {
      title: "Services",
      groups: [
        [{ label: "Odoo.sh Hosting", href: "#" }],
        [
          { label: "Support", href: "#" },
          { label: "Upgrade", href: "#" },
          { label: "Custom Developments", href: "#" },
          { label: "Education", href: "#" },
        ],
        [{ label: "Find an Accountant", href: "#" }],
        [
          { label: "Find a Partner", href: "#" },
          { label: "Become a Partner", href: "#" },
        ],
      ],
    },
  ],
  [
    {
      title: "About us",
      groups: [
        [
          { label: "Our company", href: "#" },
          { label: "Brand Assets", href: "#" },
          { label: "Contact us", href: "#" },
          { label: "Jobs", href: "#" },
        ],
        [
          { label: "Events", href: "#" },
          { label: "Podcast", href: "#" },
          { label: "Blog", href: "#" },
          { label: "Customers", href: "#" },
        ],
      ],
    },
  ],
];

// Inline SVGs for brands lucide doesn't ship
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2h-3.4v13.3a2.9 2.9 0 1 1-2.1-2.8V9.5a6.3 6.3 0 1 0 5.5 6.3V9.1a8.2 8.2 0 0 0 4.8 1.5V7.2a4.8 4.8 0 0 1-1-.5z" />
  </svg>
);

const socials = [
  { label: "Facebook", href: "#", icon: <FacebookIcon /> },
  { label: "X", href: "#", icon: <XIcon /> },
  { label: "LinkedIn", href: "#", icon: <LinkedinIcon /> },
  { label: "GitHub", href: "#", icon: <GithubIcon /> },
  { label: "Instagram", href: "#", icon: <InstagramIcon /> },
  { label: "TikTok", href: "#", icon: <TikTokIcon /> },
  { label: "Phone", href: "#", icon: <Phone size={18} /> },
  { label: "WhatsApp", href: "#", icon: <MessageCircle size={18} /> },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#282833] text-[#b4b6c2] font-sans">
      {/* Logo */}
      <div className="flex justify-center pt-1 pb-1">
        <Link href="/" aria-label="Odoo home">
          <Image
            src="/odoo-logo-clean.png"
            alt="Odoo"
            width={120}
            height={40}
            className="brightness-0 invert"
          />
        </Link>
      </div>

      {/* Main grid */}
      <div className="mx-auto w-full max-w-6xl grid grid-cols-1 gap-x-4 gap-y-6 px-8 md:px-12 pb-6 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.5fr)]">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-6">
            {col.map((section) => (
              <nav key={section.title} aria-label={section.title}>
                <h3 className={headingClass}>{section.title}</h3>
                <div className="flex flex-col gap-3">
                  {section.groups.map((group, gi) => (
                    <div key={gi}>
                      {group.map((l) => (
                        <Link key={l.label} href={l.href} className={linkClass}>
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </nav>
            ))}
            {/* Legal row lives at the bottom of About us */}
            {i === 2 && (
              <div className="-mt-3">
                <div className="flex items-center gap-2">
                  <Link href="#" className={linkClass + " inline-block"}>Legal</Link>
                  <span aria-hidden="true">•</span>
                  <Link href="#" className={linkClass + " inline-block"}>Privacy</Link>
                </div>
                <Link href="#" className={linkClass}>Security</Link>
              </div>
            )}
          </div>
        ))}

        {/* Right column */}
        <div className="flex flex-col sm:col-span-2 lg:col-span-1">
          <div className="border-b border-[#3d3d4a] pb-4">
          <div className="relative group inline-block">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-[#34343f] px-4 py-2.5 text-[15px] font-medium text-[#d5d7e0] shadow-sm transition-colors hover:bg-[#3e3e4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
              aria-haspopup="listbox"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://flagcdn.com/20x15/us.png" srcSet="https://flagcdn.com/40x30/us.png 2x" width="20" height="15" alt="US" className="rounded-sm" />
              English
              <ChevronDown size={14} aria-hidden="true" className="transition-transform group-hover:rotate-180" />
            </button>

            {/* Dropdown — visible on hover, decorative only */}
            <ul
              role="listbox"
              className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-[#3d3d4a] bg-[#2c2c38] py-1 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150"
            >
              {[
                { code: "us", label: "English" },
                { code: "in", label: "हिन्दी" },
                { code: "fr", label: "Français" },
                { code: "de", label: "Deutsch" },
                { code: "ae", label: "العربية" },
              ].map(({ code, label }) => (
                <li
                  key={code}
                  role="option"
                  aria-selected={code === "us"}
                  className="flex cursor-pointer items-center gap-2.5 px-4 py-2 text-[14px] text-[#d5d7e0] hover:bg-[#3e3e4a] transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://flagcdn.com/20x15/${code}.png`}
                    srcSet={`https://flagcdn.com/40x30/${code}.png 2x`}
                    width="20"
                    height="15"
                    alt={code.toUpperCase()}
                    className="rounded-sm flex-shrink-0"
                  />
                  {label}
                  {code === "us" && (
                    <span className="ml-auto text-[#714B67] text-xs">✓</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          </div>

          <p className="mt-6 max-w-[520px] text-[15px] leading-normal">
            Odoo is a suite of open source business apps that cover all your company
            needs: CRM, eCommerce, accounting, inventory, point of sale, project
            management, etc.
          </p>
          <p className="mt-4 max-w-[520px] text-[15px] leading-normal">
            Odoo&apos;s unique value proposition is to be at the same time very easy
            to use and fully integrated.
          </p>

          <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[#8f91a3]">
            {socials.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  aria-label={s.label}
                  className="block transition-colors hover:text-white focus-visible:text-white"
                >
                  {s.icon}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#1d1d26] py-0.03">
        <div className="flex items-center justify-center gap-2 text-[14px] text-[#b4b6c2]">
          <span>Website made with</span>
          <Image
            src="/odoo-logo-clean.png"
            alt="Odoo"
            width={56}
            height={20}
            className="brightness-0 invert"
          />
        </div>
      </div>
    </footer>
  );
}