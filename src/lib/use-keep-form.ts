"use client";

import { startTransition } from "react";

/**
 * Envoie un formulaire à une action serveur sans que React vide les champs
 * (par défaut, React 19 réinitialise le formulaire après l'envoi, même en cas d'erreur).
 */
export function keepFormSubmit(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
