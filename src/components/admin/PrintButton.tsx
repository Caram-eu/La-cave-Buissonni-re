"use client";

export function PrintButton() {
  return <button className="btn sm green noprint" type="button" onClick={() => print()}>Imprimer la fiche</button>;
}
