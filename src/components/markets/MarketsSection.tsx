"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import DEPS from "@/data/departements.json";
import { formatHours } from "@/lib/rules/markets";
import { DAYS, formatDateFr } from "@/lib/rules/paris-time";
import { store } from "@/lib/storage";
import { useCart } from "../cart/CartProvider";
import { ZoneCheck } from "./ZoneCheck";
import type { OccView, TownPin, WeeklyView } from "./types";

// Projection identique à la maquette
const C0 = Math.cos((46.5 * Math.PI) / 180), MK = 453.54;
const MX = (lo: number) => (lo - 2.55) * C0 * MK;
const MY = (la: number) => (47.1 - la) * MK + 60;
const W = 640, H = 567;

const RIV: [string, [number, number][], [number, number]][] = [
  ["Loire", [[4.07, 45.95], [4.06, 46.1], [4.04, 46.28], [3.99, 46.43], [3.96, 46.5], [3.84, 46.58], [3.73, 46.61], [3.6, 46.72], [3.47, 46.82], [3.3, 46.9], [3.15, 46.98], [3.05, 47.05], [2.98, 47.12]], [3.92, 46.46]],
  ["Allier", [[3.45, 45.92], [3.43, 46.05], [3.41, 46.13], [3.34, 46.25], [3.31, 46.36], [3.33, 46.47], [3.33, 46.57], [3.27, 46.66], [3.16, 46.73], [3.07, 46.84], [3.08, 46.96]], [3.24, 46.32]],
];
function smooth(pts: [number, number][]) {
  const P = pts.map(([lo, la]) => [MX(lo), MY(la)]);
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
const RIVER_PATHS = RIV.map(([n, pts, l]) => ({ n, d: smooth(pts), x: MX(l[0]), y: MY(l[1]) }));
const LABPOS: Record<string, [number, number, "start" | "middle" | "end"]> = {
  Moulins: [-12, 5, "end"], "Bourbon-l'Archambault": [0, -40, "middle"], Marcigny: [12, 5, "start"], Decize: [-12, 5, "end"],
  "Cercy-la-Tour": [12, 5, "start"], Nevers: [12, 5, "start"], "Dompierre-sur-Besbre": [0, 20, "middle"],
};
const DEPLAB: Record<string, [number, number]> = {
  "03": [150, 405], "58": [400, -20], "71": [575, 240], "18": [40, 95], "63": [150, 480], "42": [540, 470], "23": [22, 440], "21": [600, -35], "69": [628, 410], "89": [300, -45],
};
const DEPNAME: Record<string, string> = Object.fromEntries((DEPS as { c: string; n: string }[]).map((d) => [d.c, d.n]));

type View = { z: number; x: number; y: number };
const clamp = (v: View): View => {
  const z = Math.min(5, Math.max(1, v.z));
  return { z, x: Math.min(0, Math.max(W - W * z, v.x)), y: Math.min(0, Math.max(H - H * z, v.y)) };
};

export function MarketsSection(props: {
  weekly: WeeklyView[];
  pins: TownPin[];
  baseTown: string;
  upcoming: OccView[];
  specials: OccView[];
  servedDeps: string[];
  radiusKm: number;
  phone: string;
}) {
  const { weekly, pins, baseTown, upcoming, specials, radiusKm, phone } = props;
  const served = new Set(props.servedDeps);
  const router = useRouter();
  const { toast } = useCart();
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const [sel, setSel] = useState<string | null>(null);
  const [width, setWidth] = useState(640);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ ptrs: Map<number, { x: number; y: number }>; start: { view: View; ptrs: Map<number, { x: number; y: number }> } | null; moved: boolean }>({ ptrs: new Map(), start: null, moved: false });
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mScale = Math.min(1.6, Math.max(1, 560 / (width || 640)));
  const pinOf = (t: string) => pins.find((p) => p.town === t);
  const days = [1, 2, 3, 4, 5, 6, 0].map((d) => [d, weekly.filter((m) => m.weekday === d)] as const).filter((x) => x[1].length);

  const zoomAt = (f: number, cx = 320, cy = 283, from: View = view) => {
    const z = Math.min(5, Math.max(1, from.z * f));
    setView(clamp({ z, x: cx - ((cx - from.x) * z) / from.z, y: cy - ((cy - from.y) * z) / from.z }));
  };

  const select = (t: string, center = false) => {
    setSel(t);
    if (center) {
      const p = pinOf(t);
      if (p) {
        const x = MX(p.lon), y = MY(p.lat), sx = view.x + x * view.z, sy = view.y + y * view.z;
        if (sx < 60 || sx > 580 || sy < 120 || sy > 540) setView(clamp({ ...view, x: 320 - x * view.z, y: 330 - y * view.z }));
      }
    }
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  // position de la fiche du marché au-dessus du point
  useLayoutEffect(() => {
    const pop = popRef.current, box = boxRef.current;
    if (!pop || !box || !sel) return;
    if (innerWidth <= 560) {
      pop.style.left = "";
      pop.style.top = "";
      return;
    }
    const p = pinOf(sel);
    if (!p) return;
    const k = box.clientWidth / 640;
    const px = (view.x + MX(p.lon) * view.z) * k, py = (view.y + MY(p.lat) * view.z) * k;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.min(box.clientWidth - w - 12, Math.max(12, px - w / 2));
    let top = py - 48 - h;
    if (top < 12) top = Math.min(box.clientHeight - h - 12, py + 14);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  });

  const toVB = () => 640 / (svgRef.current?.clientWidth || 640);
  const onDown = (e: React.PointerEvent) => {
    const d = drag.current;
    d.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    d.moved = false;
    d.start = { view: { ...view }, ptrs: new Map([...d.ptrs].map(([k, v]) => [k, { ...v }])) };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.ptrs.has(e.pointerId) || !d.start) return;
    d.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const f = toVB();
    if (d.ptrs.size === 1 && d.start.ptrs.has(e.pointerId)) {
      const s0 = d.start.ptrs.get(e.pointerId)!, dx = (e.clientX - s0.x) * f, dy = (e.clientY - s0.y) * f;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
        d.moved = true;
        try {
          svgRef.current?.setPointerCapture(e.pointerId);
        } catch {}
      }
      if (d.moved) setView(clamp({ ...d.start.view, x: d.start.view.x + dx, y: d.start.view.y + dy }));
    } else if (d.ptrs.size === 2) {
      const [a, b] = [...d.ptrs.values()], [a0, b0] = [...d.start.ptrs.values()];
      if (!b0) return;
      d.moved = true;
      const dist = Math.hypot(a.x - b.x, a.y - b.y), d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y), r = svgRef.current!.getBoundingClientRect();
      zoomAt(dist / d0, ((a.x + b.x) / 2 - r.left) * f, ((a.y + b.y) / 2 - r.top) * f, d.start.view);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    d.ptrs.delete(e.pointerId);
    d.start = { view: { ...view }, ptrs: new Map([...d.ptrs].map(([k, v]) => [k, { ...v }])) };
    setTimeout(() => (d.moved = false), 0);
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect(), f = 640 / el.clientWidth;
      setView((v) => {
        const z = Math.min(5, Math.max(1, v.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
        const cx = (e.clientX - r.left) * f, cy = (e.clientY - r.top) * f;
        return clamp({ z, x: cx - ((cx - v.x) * z) / v.z, y: cy - ((cy - v.y) * z) / v.z });
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const nextDates = (t: string) => {
    const d = upcoming.filter((o) => o.town === t).slice(0, 2);
    const multi = weekly.filter((m) => m.town === t).length > 1;
    return d.length ? d.map((o) => formatDateFr(o.date) + (multi || o.special ? `, ${formatHours(o.hours)}` : "")) : ["à confirmer sur la page Facebook"];
  };

  const goTo = (t: string) => {
    select(t, true);
    boxRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  };

  const home = sel === baseTown;
  const slots = sel ? weekly.filter((m) => m.town === sel) : [];
  const selPin = sel ? pinOf(sel) : null;
  const hideLabels = mScale / view.z > 1.05;

  return (
    <div className="mk">
      <div>
        <ul className="sched">
          {days.map(([d, list]) => (
            <li key={d}>
              <div className="day">{DAYS[d]}</div>
              <div>
                {list.map((m) => (
                  <button key={m.id} type="button" className={sel === m.town ? "on" : ""} onClick={() => goTo(m.town)}>
                    <span>
                      {m.town}
                      <small>{m.place}</small>
                    </span>
                    <span className="when">{formatHours(m.hours)}</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
          <li>
            <div className="day">Et aussi</div>
            <div>
              <button type="button" className={home ? "on" : ""} onClick={() => goTo(baseTown)}>
                <span>
                  {baseTown} et alentours<small>Appelez-moi au {phone}, je vous livre à domicile</small>
                </span>
                <span className="when">Livraison</span>
              </button>
            </div>
          </li>
        </ul>
        <p className="small muted" style={{ marginTop: 12 }}>
          Calendrier indicatif : les lieux et horaires à jour sont publiés sur la page Facebook de la cave.
        </p>
      </div>
      <div>
        <div className="mapwrap">
          <div className="mapbox" ref={boxRef}>
            <svg
              ref={svgRef}
              viewBox="0 0 640 567"
              role="group"
              aria-label="Carte interactive des marchés autour de Dompierre-sur-Besbre"
              className={hideLabels ? "nolab" : ""}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={(e) => {
                if (!drag.current.moved && !(e.target as Element).closest(".pin")) setSel(null);
              }}
              onDoubleClick={(e) => {
                const r = svgRef.current!.getBoundingClientRect(), f = toVB();
                zoomAt(1.6, (e.clientX - r.left) * f, (e.clientY - r.top) * f);
              }}
            >
              <g transform={`translate(${view.x},${view.y}) scale(${view.z})`}>
                <g transform="translate(0,60)">
                  {(DEPS as { c: string; n: string; d: string }[]).map((d) => (
                    <path key={d.c} className={`dep ${served.has(d.c) ? "in" : "out"}`} d={d.d} />
                  ))}
                  {(DEPS as { c: string; n: string }[])
                    .filter((d) => DEPLAB[d.c])
                    .map((d) => (
                      <text key={d.c} className={`deplab ${served.has(d.c) ? "" : "out"}`} x={DEPLAB[d.c][0]} y={DEPLAB[d.c][1]} textAnchor="middle" style={{ fontSize: (served.has(d.c) ? 15 : 13) / view.z + "px" }}>
                        {d.n}
                      </text>
                    ))}
                </g>
                {RIVER_PATHS.map((r) => (
                  <path key={r.n} className="river" d={r.d} />
                ))}
                {RIVER_PATHS.map((r) => (
                  <text key={r.n} className="rivlab" x={r.x} y={r.y} style={{ fontSize: 13 / view.z + "px" }}>
                    {r.n}
                  </text>
                ))}
                <g>
                  {pins.map((p) => {
                    const [dx, dy, an] = LABPOS[p.town] || [12, 5, "start"];
                    const on = sel === p.town;
                    return (
                      <g
                        key={p.town}
                        className={`pin${on ? " on" : ""}`}
                        transform={`translate(${MX(p.lon)},${MY(p.lat)})`}
                        tabIndex={0}
                        role="button"
                        aria-label={p.town === baseTown ? `${p.town}, livraison à domicile` : `Marché de ${p.town}`}
                        aria-pressed={on}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!drag.current.moved) select(p.town);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            select(p.town);
                          }
                        }}
                      >
                        <g transform={`scale(${((on ? 1.25 : 1) * mScale) / view.z})`}>
                          <circle className="ring" cx="0" cy="-24" r="16" fill="none" />
                          <path className="body" d="M0,0C-3,-8 -13,-13 -13,-24A13,13 0 1 1 13,-24C13,-13 3,-8 0,0Z" />
                          <path d="M-1.6,-33h3.2v4c0,1.4 2.6,2.2 2.6,4.6v6.6q0,.8 -.8,.8h-6.8q-.8,0 -.8,-.8v-6.6c0,-2.4 2.6,-3.2 2.6,-4.6z" fill="#fff" />
                          <text className="lab" x={dx} y={dy - (dy === 5 ? 19 : 0)} textAnchor={an}>
                            {p.town}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>
            <p className="maphint" style={{ opacity: sel ? 0 : 1 }}>Touchez un point pour voir le marché</p>
            <div className="mapctl">
              <button type="button" aria-label="Zoomer" onClick={() => zoomAt(1.4)}>+</button>
              <button type="button" aria-label="Dézoomer" onClick={() => zoomAt(1 / 1.4)}>−</button>
              <button type="button" aria-label="Recentrer la carte" onClick={() => setView({ z: 1, x: 0, y: 0 })}>⤾</button>
            </div>
          </div>
          {sel && (
            <div className="pop" ref={popRef} role="dialog" aria-label={home ? baseTown : `Marché de ${sel}`} aria-live="polite">
              <button className="x" type="button" aria-label="Fermer" onClick={() => setSel(null)}>×</button>
              <h3>{home ? baseTown : `Marché de ${sel}`}</h3>
              <dl>
                <dt>Département</dt>
                <dd>{selPin ? DEPNAME[selPin.department] || selPin.department : ""}</dd>
                {slots.map((m) => (
                  <div key={m.id} style={{ display: "contents" }}>
                    <dt>{DAYS[m.weekday]}</dt>
                    <dd>{m.place}, {formatHours(m.hours)}</dd>
                  </div>
                ))}
                {home && (
                  <>
                    <dt>Livraison</dt>
                    <dd>Je vous livre à domicile, appelez-moi au {phone}</dd>
                  </>
                )}
                <dt>{home ? "Marchés exceptionnels" : "Prochaines dates"}</dt>
                <dd>
                  {nextDates(sel).map((l, i) => (
                    <span key={i} style={{ display: "block" }}>{l}</span>
                  ))}
                </dd>
              </dl>
              <div className="row">
                {home ? (
                  <a className="btn green" href="/vins">Choisir mes vins</a>
                ) : (
                  <button
                    className="btn green"
                    type="button"
                    onClick={() => {
                      store.set("prefTown", sel);
                      router.push("/vins");
                      toast(`Commande à retirer au marché de ${sel} : choisissez vos bouteilles`);
                    }}
                  >
                    Commander pour ce marché
                  </button>
                )}
                <a className="btn ghost" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((slots[0] ? slots[0].place + ", " : "") + sel)}`} rel="noopener" target="_blank">
                  Itinéraire
                </a>
              </div>
            </div>
          )}
        </div>
        <div className="next">
          <h3>Prochains marchés</h3>
          <ul>
            {upcoming.slice(0, 5).map((m) => (
              <li key={m.key}>
                <button type="button" onClick={() => goTo(m.town)}>
                  <b>{formatDateFr(m.date)}</b> · {m.town}, {formatHours(m.hours)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {specials.length > 0 && (
          <div className="next fetes">
            <h3>Marchés de Noël et des fêtes</h3>
            <ul>
              {specials.map((m) => (
                <li key={m.key}>
                  <button type="button" onClick={() => goTo(m.town)}>
                    <b>{formatDateFr(m.date)}</b> · {m.town}, {m.place}, {formatHours(m.hours)}
                    {m.note ? (
                      <>
                        <br />
                        <span className="small">{m.note}</span>
                      </>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ZoneCheck radiusKm={radiusKm} />
      </div>
    </div>
  );
}
