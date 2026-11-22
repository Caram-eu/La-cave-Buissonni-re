"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Step = { path: string; label: string };
const KEY = "lcb_trail";

const FIXED: Record<string, string> = {
  "/": "La cave",
  "/vins": "Nos vins",
  "/evenements": "Événements",
  "/compte": "Mon compte",
  "/panier": "Panier",
  "/mentions-legales": "Mentions légales",
  "/cgv": "CGV",
  "/confidentialite": "Confidentialité",
  "/cookies": "Cookies",
};

function read(): Step[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(t: Step[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(t.slice(-30)));
  } catch {}
}

/** Flèche « Retour : [page précédente] » en haut de chaque page, comme dans la maquette. */
export function BackBar() {
  const path = usePathname();
  const router = useRouter();
  const [prev, setPrev] = useState<Step | null>(null);

  useEffect(() => {
    // le titre de la page est mis à jour juste après la navigation
    const id = setTimeout(() => {
      const label = FIXED[path] ?? document.title.split(" | ")[0];
      const t = read();
      if (t[t.length - 1]?.path !== path) t.push({ path, label });
      write(t);
      const p = t.length > 1 ? t[t.length - 2] : path === "/" ? null : path.startsWith("/vins/") ? { path: "/vins", label: "Nos vins" } : { path: "/", label: "La cave" };
      setPrev(p);
    }, 0);
    return () => clearTimeout(id);
  }, [path]);

  if (!prev) return null;
  return (
    <div className="backbar">
      <button
        className="back"
        type="button"
        onClick={() => {
          const t = read();
          t.pop(); // page actuelle : la précédente redevient la dernière du parcours
          write(t);
          router.push(prev.path);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Retour : {prev.label}</span>
      </button>
    </div>
  );
}
