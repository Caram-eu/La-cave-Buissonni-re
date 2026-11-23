import type { MetadataRoute } from "next";
import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Plan du site pour les moteurs de recherche : pages publiques et fiches des produits visibles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const products = await db.product.findMany({ where: { hidden: false }, select: { slug: true, updatedAt: true }, orderBy: { sortOrder: "asc" } });
  const pages: MetadataRoute.Sitemap = [
    { url: `${site}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/vins`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site}/evenements`, changeFrequency: "monthly", priority: 0.7 },
    ...["mentions-legales", "cgv", "confidentialite", "cookies"].map((p) => ({ url: `${site}/${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
  return [...pages, ...products.map((p) => ({ url: `${site}/vins/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 }))];
}
