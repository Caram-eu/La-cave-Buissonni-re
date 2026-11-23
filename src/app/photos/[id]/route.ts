import { db } from "@/lib/server/db";

/** Photos de bouteilles stockées dans la base (incluses dans les sauvegardes). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response("Introuvable", { status: 404 });
  const p = await db.productPhoto.findUnique({ where: { id } });
  if (!p) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(p.data), {
    headers: { "content-type": p.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
