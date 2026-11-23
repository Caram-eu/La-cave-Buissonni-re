"use client";

import { useEffect, useId, useRef, useState } from "react";
import { zoneFromCommunes, type Commune, type ZoneResult } from "@/lib/rules/zone";

let cache: Promise<Commune[]> | null = null;
export const loadCommunes = () => (cache ??= fetch("/api/communes").then((r) => (r.ok ? r.json() : [])).catch(() => []));

export function zoneMessage(z: ZoneResult | null, radiusKm: number): { cls: string; text: string } {
  if (!z) return { cls: "", text: "" };
  if (z.status === "inconnue")
    return { cls: "no", text: `Commune introuvable : elle est sans doute à plus de ${radiusKm} km de Dompierre. Choisissez-la dans la liste, ou optez pour l'expédition.` };
  if (z.status === "ambigu") return { cls: "no", text: `Plusieurs communes portent ce nom : ${z.candidates.join(", ")}. Choisissez la vôtre dans la liste.` };
  if (z.status === "ok") return { cls: "ok", text: `Livrable : ${z.name} est à ${z.km} km de Dompierre.` };
  return { cls: "no", text: `Hors zone : ${z.name} est à ${z.km} km de Dompierre. La livraison se fait jusqu'à ${radiusKm} km : choisissez le retrait au marché ou l'expédition.` };
}

/** Champ commune avec suggestions et vérification de la zone de livraison. */
export function useZone(radiusKm: number) {
  const [list, setList] = useState<Commune[]>([]);
  const [value, setValue] = useState("");
  const [res, setRes] = useState<ZoneResult | null>(null);
  const seq = useRef(0);
  const load = () => loadCommunes().then(setList);
  useEffect(() => {
    const v = value.trim();
    const n = ++seq.current;
    if (v.length < 2) return setRes(null);
    const local = list.length ? zoneFromCommunes(v, list, radiusKm) : null;
    if (local && local.status !== "inconnue") return setRes(local);
    // commune absente de la liste : on interroge le serveur (géocodage IGN)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/zone?commune=${encodeURIComponent(v)}`);
        const d = (await r.json()) as ZoneResult;
        if (n === seq.current) setRes(d);
      } catch {
        if (n === seq.current) setRes({ status: "inconnue" });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [value, list, radiusKm]);
  return { list, value, setValue, res, load };
}

export function CommuneOptions({ id, list }: { id: string; list: Commune[] }) {
  return (
    <datalist id={id}>
      {list.map((c) => (
        <option key={c[0] + c[1]} value={`${c[0]} (${c[1]})`} />
      ))}
    </datalist>
  );
}

export function ZoneCheck({ radiusKm }: { radiusKm: number }) {
  const id = useId();
  const z = useZone(radiusKm);
  const m = zoneMessage(z.res, radiusKm);
  return (
    <div className="zcheck">
      <label htmlFor={id + "c"}>
        <b>Suis-je livrable à domicile ?</b>
      </label>
      <p className="small muted">Je livre à domicile jusqu&apos;à {radiusKm} km autour de Dompierre-sur-Besbre.</p>
      <input className="field" id={id + "c"} list={id + "l"} placeholder="Tapez votre commune" autoComplete="address-level2" value={z.value} onFocus={z.load} onChange={(e) => z.setValue(e.target.value)} />
      <CommuneOptions id={id + "l"} list={z.list} />
      <span className={`zone-res ${m.cls}`} aria-live="polite">{m.text}</span>
    </div>
  );
}
