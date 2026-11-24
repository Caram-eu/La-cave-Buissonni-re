import "server-only";
import ExcelJS from "exceljs";
import { parseCsv } from "../csv";
import { mapCatalog, type ImportedProduct, type ImportResult } from "../rules/catalog-import";
import { NO_DISCOUNT_CATEGORIES } from "../settings-defaults";
import { db } from "./db";

const MAX_BYTES = 3 * 1024 * 1024;

/** Lit un fichier CSV ou Excel (.xlsx, première feuille) et le transforme en lignes de texte. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.size > MAX_BYTES) throw new Error("Fichier trop gros (3 Mo maximum).");
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name) || buf.subarray(0, 2).toString() === "PK") {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const v = row.getCell(c).value as unknown;
        let t = "";
        if (v === null || v === undefined) t = "";
        else if (typeof v === "number") t = String(v).replace(".", ",");
        else if (typeof v === "object" && v && "result" in v) t = String((v as { result: unknown }).result ?? "");
        else if (typeof v === "object" && v && "richText" in v) t = (v as { richText: { text: string }[] }).richText.map((x) => x.text).join("");
        else if (typeof v === "object" && v && "text" in v) t = String((v as { text: unknown }).text);
        else t = String(v);
        cells.push(t);
      }
      rows.push(cells);
    });
    return rows;
  }
  if (/\.xls$/i.test(file.name)) throw new Error("Ancien format Excel (.xls) : enregistrez le fichier en .xlsx ou en CSV.");
  return parseCsv(buf.toString("utf8"));
}

export async function analyseImport(file: File): Promise<ImportResult & { created: number; updated: number; missing: { slug: string; name: string }[] }> {
  const r = mapCatalog(await readSpreadsheet(file), NO_DISCOUNT_CATEGORIES);
  const existing = await db.product.findMany({ where: { kind: "PRODUIT" }, select: { slug: true, name: true, domain: true, vintage: true, hidden: true } });
  const known = new Set(existing.map((p) => p.slug));
  const inFile = new Set(r.products.map((p) => p.slug));
  return {
    ...r,
    created: r.products.filter((p) => !known.has(p.slug)).length,
    updated: r.products.filter((p) => known.has(p.slug)).length,
    missing: existing.filter((p) => !p.hidden && !inFile.has(p.slug)).map((p) => ({ slug: p.slug, name: `${p.domain}, ${p.name} ${p.vintage}`.trim() })),
  };
}

/** Applique la nouvelle carte. Les produits absents peuvent être masqués (jamais supprimés : ils restent dans l'historique). */
export async function applyImport(products: ImportedProduct[], hideMissing: boolean) {
  let order = 0;
  await db.$transaction(async (tx) => {
    for (const p of products) {
      const { present, ...data } = p;
      const has = (k: string) => (present as string[]).includes(k);
      const update = {
        name: data.name, domain: data.domain, category: data.category, region: data.region, priceCents: data.priceCents,
        isBeer: data.isBeer, discountEligible: data.discountEligible, hidden: false, sortOrder: order,
        ...(has("color") ? { color: data.color } : {}), ...(has("label") ? { label: data.label } : {}),
        ...(has("appellation") ? { appellation: data.appellation } : {}), ...(has("grapes") ? { grapes: data.grapes } : {}),
        ...(has("vintage") ? { vintage: data.vintage } : {}), ...(has("volumeCl") ? { volumeCl: data.volumeCl } : {}),
        ...(has("noAddedSulfites") ? { noAddedSulfites: data.noAddedSulfites } : {}), ...(has("sugar") ? { sugar: data.sugar } : {}),
        ...(has("style") ? { style: data.style } : {}), ...(has("tag") ? { tag: data.tag } : {}), ...(has("available") ? { available: data.available } : {}),
      };
      await tx.product.upsert({ where: { slug: data.slug }, create: { ...data, sortOrder: order }, update });
      order++;
    }
    if (hideMissing) await tx.product.updateMany({ where: { kind: "PRODUIT", slug: { notIn: products.map((p) => p.slug) } }, data: { hidden: true } });
  }, { timeout: 60000 });
  return { count: products.length };
}
