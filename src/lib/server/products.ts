import "server-only";
import type { Product } from "@prisma/client";
import { db } from "./db";
import type { ProductView } from "../catalog";

export function toView(p: Product): ProductView {
  return {
    slug: p.slug, kind: p.kind, name: p.name, category: p.category, color: p.color, domain: p.domain, label: p.label,
    region: p.region, appellation: p.appellation, grapes: p.grapes, vintage: p.vintage, volumeCl: p.volumeCl,
    priceCents: p.priceCents, noAddedSulfites: p.noAddedSulfites, sugar: p.sugar, style: p.style, isBeer: p.isBeer,
    bottleLabel: p.bottleLabel, boxKind: p.boxKind, tag: p.tag, discountEligible: p.discountEligible,
    available: p.available, photoUrl: p.photoUrl,
  };
}

export async function visibleProducts(): Promise<ProductView[]> {
  const rows = await db.product.findMany({ where: { hidden: false }, orderBy: { sortOrder: "asc" } });
  return rows.map(toView);
}

export async function productBySlug(slug: string) {
  const p = await db.product.findUnique({ where: { slug } });
  return p && !p.hidden ? toView(p) : null;
}
