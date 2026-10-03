import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultClub } from "@/lib/club";
import { getPublicCatalogue } from "@/lib/leads/queries";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ShopCatalogue } from "@/components/public/ShopCatalogue";

export const metadata: Metadata = {
  title: "Pro shop — The Champions Club",
  description: "Rackets, balls, shoes and kit. Order online, collect at the club or get it delivered.",
};

export default async function ShopPage() {
  const club = await getDefaultClub();
  if (!club) notFound();
  const user = await getCurrentUser();
  const [products, member] = await Promise.all([
    getPublicCatalogue(club.id),
    user ? prisma.member.findFirst({ where: { user: { id: user.userId }, clubId: club.id }, select: { firstName: true, plan: { select: { name: true, shopDiscountPct: true } } } }) : null,
  ]);

  return (
    <>
      <nav className="pub-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>Shop</span>
      </nav>
      <header className="pub-head">
        <span className="eyebrow">Pro shop</span>
        <h1>The same shelf the counter sells from.</h1>
        <p>
          Stock here is live — what you see is what is in the shop. Order online and collect at the desk, or have it delivered.
          {member?.plan?.shopDiscountPct ? ` Your ${member.plan.name} discount of ${member.plan.shopDiscountPct}% is applied at checkout.` : " Members get their plan discount automatically when signed in."}
        </p>
      </header>

      <ShopCatalogue
        products={products.map((p) => ({ ...p }))}
        member={member ? { firstName: member.firstName, discountPct: member.plan?.shopDiscountPct ?? 0 } : null}
      />
    </>
  );
}
