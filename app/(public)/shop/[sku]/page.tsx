import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultClub } from "@/lib/club";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { CATEGORY_LABEL } from "@/lib/public/labels";

interface Props {
  params: Promise<{ sku: string }>;
}

async function load(sku: string) {
  const club = await getDefaultClub();
  if (!club) return null;
  const product = await prisma.product.findFirst({
    where: { clubId: club.id, sku, isActive: true, isForShop: true },
    select: { id: true, sku: true, name: true, description: true, category: true, price: true, stockQty: true, imageUrl: true, taxRatePct: true },
  });
  return product;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sku } = await params;
  const p = await load(sku);
  return p ? { title: `${p.name} — Pro shop`, description: p.description ?? `${p.name} at The Champions Club pro shop.` } : { title: "Product" };
}

export default async function ProductPage({ params }: Props) {
  const { sku } = await params;
  const p = await load(sku);
  if (!p) notFound();

  return (
    <>
      <nav className="pub-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> <Link href="/shop">Shop</Link> <span aria-hidden="true">/</span>{" "}
        <span>{p.name}</span>
      </nav>
      <div className="pub-split" style={{ marginTop: 20 }}>
        <div className="prod" style={{ maxWidth: 560 }}>
          <div className="img" style={{ aspectRatio: "1 / 1" }}>
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span aria-hidden="true">{p.name.slice(0, 2).toUpperCase()}</span>}
          </div>
        </div>
        <div className="pub-card pub-side">
          <span className="cat">{CATEGORY_LABEL[p.category] ?? p.category}</span>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.15 }}>{p.name}</h1>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--ink)" }}>
            {formatPaise(p.price)} <small style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>incl. {p.taxRatePct}% GST</small>
          </p>
          {p.description && <p className="pub-note" style={{ fontSize: 14 }}>{p.description}</p>}
          <p className="pub-note">{p.stockQty > 0 ? `${p.stockQty} in stock at the club` : "Out of stock — ask the desk for an ETA"}</p>
          <Link href={`/shop?add=${p.sku}`} className="btn btn-primary" aria-disabled={p.stockQty <= 0}>
            Add to bag
          </Link>
          <p className="pub-note">
            SKU {p.sku}. Collect at the front desk or choose delivery at checkout.
          </p>
        </div>
      </div>
    </>
  );
}
