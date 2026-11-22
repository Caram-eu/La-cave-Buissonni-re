/** Stockage local du navigateur, protégé contre les navigateurs qui le bloquent. */
const mem: Record<string, unknown> = {};
export const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem("lcb_" + k);
      return v ? (JSON.parse(v) as T) : d;
    } catch {
      return k in mem ? (mem[k] as T) : d;
    }
  },
  set(k: string, v: unknown) {
    mem[k] = v;
    try {
      localStorage.setItem("lcb_" + k, JSON.stringify(v));
    } catch {}
  },
  remove(k: string) {
    delete mem[k];
    try {
      localStorage.removeItem("lcb_" + k);
    } catch {}
  },
};
