/** Minuscules et sans accents : "Côtes du Rhône" -> "cotes du rhone" */
export function normalize(t: string): string {
  return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function searchWords(q: string): string[] {
  return normalize(q).split(/\s+/).filter(Boolean);
}

/** Découpe un texte en segments à surligner pour les mots recherchés (2 lettres ou plus). */
export function highlight(text: string, q: string): { t: string; m: boolean }[] {
  const words = searchWords(q).filter((w) => w.length > 1);
  if (!words.length || !text) return [{ t: text, m: false }];
  const chars = [...text];
  // normalize() garde une lettre par caractère pour l'alphabet latin accentué
  const n = chars.map((c) => normalize(c) || c).join("");
  if (n.length !== chars.length) return [{ t: text, m: false }];
  const marks = new Array(chars.length).fill(false);
  for (const w of words) {
    let i = n.indexOf(w);
    while (i > -1) {
      for (let k = i; k < i + w.length; k++) marks[k] = true;
      i = n.indexOf(w, i + 1);
    }
  }
  const out: { t: string; m: boolean }[] = [];
  chars.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.m === marks[i]) last.t += c;
    else out.push({ t: c, m: marks[i] });
  });
  return out;
}
