"use client";

import { useState } from "react";

export type TickerItem = { key: string; day: string; town: string; place: string; hours: string; special: boolean };

/**
 * Bandeau vert qui fait défiler les prochains marchés.
 * Accessibilité : bouton pause (WCAG 2.2.2), arrêt au survol et au focus,
 * bandeau fixe si le visiteur a demandé de réduire les animations.
 */
export function MarketTicker({ items, cutoffHour }: { items: TickerItem[]; cutoffHour: number }) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;
  const content = (hidden: boolean) => (
    <ul className="tk-list" aria-hidden={hidden || undefined}>
      {items.map((m) => (
        <li key={m.key}>
          <a href="/#marches" tabIndex={hidden ? -1 : undefined}>
            {m.special && <span className="tk-star">Marché exceptionnel · </span>}
            <b>{m.day}</b> · {m.town}, {m.place} ({m.hours})
          </a>
        </li>
      ))}
      <li>
        <a href="/vins" tabIndex={hidden ? -1 : undefined}>Commandez en ligne jusqu&apos;à {cutoffHour} h la veille du marché</a>
      </li>
    </ul>
  );
  // vitesse constante quelle que soit la longueur du texte
  const seconds = Math.max(25, items.length * 7);
  return (
    <div className={`ticker${paused ? " paused" : ""}`} role="region" aria-label="Prochains marchés">
      <span className="tk-label">Prochains marchés</span>
      <div className="tk-viewport">
        <div className="tk-track" style={{ animationDuration: `${seconds}s` }}>
          {content(false)}
          {content(true)}
        </div>
      </div>
      <button type="button" className="tk-btn" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Relancer le défilement des marchés" : "Mettre en pause le défilement des marchés"}>
        {paused ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
        )}
      </button>
    </div>
  );
}
