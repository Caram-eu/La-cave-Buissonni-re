import Link from "next/link";
import { ImportForm } from "@/components/admin/ImportForm";
import { COLUMNS } from "@/lib/rules/catalog-import";

export const metadata = { title: "Importer une carte" };

export default function ImportPage() {
  return (
    <>
      <p><Link href="/admin/produits">‹ Tous les produits</Link></p>
      <h1>Importer une nouvelle carte</h1>
      <div className="grid2">
        <div className="card"><ImportForm /></div>
        <div className="card">
          <h2>Comment faire</h2>
          <ol style={{ paddingLeft: 20 }}>
            <li><a href="/admin/produits/export">Téléchargez la carte actuelle</a> : c&apos;est le modèle, avec les bonnes colonnes.</li>
            <li>Ouvrez-la dans Excel ou LibreOffice : changez les prix et millésimes, ajoutez des lignes, supprimez celles qui ne sont plus à la carte.</li>
            <li>Enregistrez (CSV ou .xlsx), puis envoyez le fichier ici. Rien n&apos;est modifié tant que vous n&apos;avez pas cliqué sur « Importer cette carte ».</li>
          </ol>
          <p className="small muted" style={{ marginTop: 10 }}>Colonnes reconnues : {COLUMNS.map((c) => c.label + ("required" in c && c.required ? " (obligatoire)" : "")).join(", ")}. Laissez la colonne « Adresse » telle quelle : elle relie chaque ligne à sa fiche. Les photos sont conservées.</p>
        </div>
      </div>
    </>
  );
}
