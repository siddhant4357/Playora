import Link from "next/link";
import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="lf">
      <div className="l-container">
        <div className="lf-grid">
          <div className="lf-brand">
            <Link href="/" className="ln-brand" aria-label="Yolla home">
              <span className="ln-mark" aria-hidden="true">
                <Trophy size={15} strokeWidth={2.5} />
              </span>
              Yolla
            </Link>
            <p>
              The operating system for a sports club — courts, members, bar, shop, staff and the money on one kernel. Built for The
              Champions Club.
            </p>
          </div>
          <div>
            <h4>The club</h4>
            <ul>
              <li><a href="#courts">Courts &amp; availability</a></li>
              <li><a href="#plans">Membership plans</a></li>
              <li><a href="#bar">Bar &amp; shop</a></li>
              <li><Link href="/register">Book a trial</Link></li>
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
          <span>© {new Date().getFullYear()} The Champions Club · Yolla</span>
          <span>Built for the Odoo Hackathon</span>
        </div>
      </div>
    </footer>
  );
}
