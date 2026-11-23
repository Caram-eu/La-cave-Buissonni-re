import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

type Req = { method: string; url: string; headers: IncomingMessage["headers"]; body: unknown };

/** Petit serveur HTTP local qui imite un service externe (Brevo, SumUp) pour les tests. */
export async function fakeService(handler: (r: Req) => { status: number; json?: unknown }) {
  const requests: Req[] = [];
  const server: Server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const r: Req = { method: req.method!, url: req.url!, headers: req.headers, body: raw ? JSON.parse(raw) : null };
      requests.push(r);
      const out = handler(r);
      res.writeHead(out.status, { "content-type": "application/json" });
      res.end(out.json === undefined ? "" : JSON.stringify(out.json));
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, requests, close: () => new Promise<void>((ok) => server.close(() => ok())) };
}
