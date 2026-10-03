import type { ReactNode } from "react";
import "../landing.css";
import "./public.css";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="landing">
      <Nav appHref={user ? homeFor(user.role) : null} />
      <main className="pub-main l-container">{children}</main>
      <Footer />
    </div>
  );
}
