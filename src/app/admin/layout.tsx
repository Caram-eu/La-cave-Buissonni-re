import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";

export const metadata: Metadata = { title: { default: "Administration", template: "%s | Administration" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [orders, quotes] = await Promise.all([db.order.count({ where: { status: "NOUVELLE" } }), db.quote.count({ where: { status: "nouvelle" } })]);
  return (
    <div className="adm">
      <AdminNav counts={{ "/admin/commandes": orders, "/admin/devis": quotes }} />
      {children}
    </div>
  );
}
