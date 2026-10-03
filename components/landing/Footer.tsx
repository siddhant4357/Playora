import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandMark";

export function Footer() {
  return (
    <footer className="lf">
      <div className="l-container">
        <div className="lf-grid">
          <div className="lf-brand">
            <Link href="/" className="ln-brand" aria-label="Playora home">
              <BrandLogo height={24} />
            </Link>
            <p>
              The operating system for a sports club — courts, members, bar, shop, staff and the money on one kernel. Built for The
              Champions Club.
            </p>
          </div>
          <div>
            <h4>The club</h4>
            <ul>
              <li><Link href="/courts">Courts &amp; availability</Link></li>
              <li><Link href="/plans">Membership plans</Link></li>
              <li><Link href="/shop">Pro shop</Link></li>
              <li><Link href="/trial">Book a free trial</Link></li>
              <li><Link href="/contact">Contact us</Link></li>
            </ul>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="#modules">Modules</a></li>
              <li><a href="#owner">For owners</a></li>
              <li><a href="#booking">Booking engine</a></li>
              <li><a href="#members">Member 360</a></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><Link href="/login">Sign in</Link></li>
              <li><Link href="/register">Create account</Link></li>
              <li><Link href="/forgot-password">Forgot password</Link></li>
            </ul>
          </div>
        </div>
        <div className="lf-bottom">
          <span>© {new Date().getFullYear()} The Champions Club · Playora</span>
          <span>Built for the Odoo Hackathon</span>
        </div>
      </div>
    </footer>
  );
}
