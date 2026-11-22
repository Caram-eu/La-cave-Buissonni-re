import { highlight } from "@/lib/rules/text";

/** Texte avec les mots recherchés surlignés. */
export function Hl({ t, q }: { t: string; q: string }) {
  return (
    <>
      {highlight(t, q).map((s, i) => (s.m ? <mark key={i}>{s.t}</mark> : <span key={i}>{s.t}</span>))}
    </>
  );
}
