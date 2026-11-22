"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { store } from "@/lib/storage";

export type Cart = Record<string, number>;

type AddInfo = { slug: string; name: string; color: string; qty?: number; from?: HTMLElement | null };

type Ctx = {
  cart: Cart;
  count: number;
  ready: boolean;
  glassColor: string;
  add: (i: AddInfo) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  toast: (msg: string) => void;
};

const CartCtx = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("CartProvider manquant");
  return c;
};

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** La bouteille vole vers le verre, s'incline et verse (désactivé si l'utilisateur réduit les animations). */
function fly(from: HTMLElement, onDone: () => void) {
  const glass = document.getElementById("glass");
  if (!glass) return onDone();
  // on fait voler la bouteille elle-même (dessin ou photo), pas tout son cadre
  const art = from.querySelector<HTMLElement | SVGElement>("svg, img") ?? from;
  const a = art.getBoundingClientRect();
  const b = glass.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "flyer";
  f.appendChild(art.cloneNode(true));
  Object.assign(f.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px", transformOrigin: "50% 50%" });
  const first = f.firstElementChild as HTMLElement | null;
  if (first) first.style.cssText = "width:100%;height:100%";
  document.body.appendChild(f);
  const sx = a.left + a.width / 2, sy = a.top + a.height / 2, ex = b.left + b.width / 2, ey = b.top - 4;
  const cx = (sx + ex) / 2, cy = Math.max(12, Math.min(sy, ey) - 160), T = 850, t0 = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - t0) / T);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const x = (1 - e) ** 2 * sx + 2 * (1 - e) * e * cx + e * e * ex;
    const y = (1 - e) ** 2 * sy + 2 * (1 - e) * e * cy + e * e * ey;
    const s = 1 - 0.8 * e, rot = -150 * Math.max(0, (e - 0.45) / 0.55);
    f.style.transform = `translate(${x - sx}px,${y - sy}px) scale(${s}) rotate(${rot}deg)`;
    f.style.opacity = String(t > 0.92 ? (1 - t) / 0.08 : 1);
    if (t < 1) requestAnimationFrame(frame);
    else {
      f.remove();
      onDone();
    }
  };
  requestAnimationFrame(frame);
}

function splash(color: string) {
  const glass = document.getElementById("glass");
  if (!glass) return;
  const b = glass.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const d = document.createElement("div");
    d.className = "drop";
    d.style.background = color;
    d.style.left = b.left + b.width / 2 - 4 + "px";
    d.style.top = b.top + 4 + "px";
    document.body.appendChild(d);
    const ang = -Math.PI / 2 + (i - 3.5) * 0.32, dist = 26 + Math.random() * 22;
    d.animate(
      [
        { transform: "translate(0,0) rotate(45deg) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist + 30}px) rotate(45deg) scale(.3)`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 250, easing: "cubic-bezier(.2,.7,.4,1)" },
    ).onfinish = () => d.remove();
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [ready, setReady] = useState(false);
  const [glassColor, setGlassColor] = useState("#7a1f3d");
  const [msg, setMsg] = useState("");
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setCart(store.get<Cart>("cart", {}));
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === "lcb_cart" && setCart(store.get<Cart>("cart", {}));
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: Cart) => {
    store.set("cart", next);
    setCart(next);
  }, []);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 4500);
  }, []);

  const add = useCallback(
    ({ slug, name, color, qty = 1, from }: AddInfo) => {
      const done = () => {
        const cur = store.get<Cart>("cart", {});
        save({ ...cur, [slug]: Math.min(99, (cur[slug] || 0) + qty) });
        setGlassColor(color);
        const g = document.getElementById("glass");
        if (g) {
          g.classList.remove("clink");
          void g.getBoundingClientRect();
          g.classList.add("clink");
        }
        if (!reducedMotion()) splash(color);
        toast(qty > 1 ? `${qty} × « ${name} » ajoutés au panier` : `« ${name} » est dans votre panier`);
      };
      if (reducedMotion() || !from) done();
      else fly(from, done);
    },
    [save, toast],
  );

  const setQty = useCallback(
    (slug: string, qty: number) => {
      const next = { ...store.get<Cart>("cart", {}) };
      if (qty <= 0) delete next[slug];
      else next[slug] = Math.min(99, qty);
      save(next);
    },
    [save],
  );

  const clear = useCallback(() => save({}), [save]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <CartCtx.Provider value={{ cart, count, ready, glassColor, add, setQty, clear, toast }}>
      {children}
      <div id="toast" className={shown ? "show" : ""} role="status" aria-live="polite">
        <span>{msg}</span>
        <Link className="btn green" href="/panier" onClick={() => setShown(false)}>
          Voir le panier
        </Link>
        <button className="btn ghost" type="button" onClick={() => setShown(false)}>
          Poursuivre
        </button>
      </div>
    </CartCtx.Provider>
  );
}
