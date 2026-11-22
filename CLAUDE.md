# La Cave Buissonnière : mémoire du projet

Site marchand de La Cave Buissonnière (Guillaume Plantard, EI, caviste ambulant).
Piloté par **Léo**, non-développeur : expliquer simplement, en français, questions en liste numérotée,
pas d'emoji, pas de flatterie. Le cahier des charges complet est dans `sources/PROMPT.md`,
la maquette validée dans `sources/maquette/index.html` (référence pour le design, les textes et les comportements).

## Méthode
Étapes testables ; à la fin de chaque étape : tests, captures d'écran, puis attendre l'accord de Léo.
1. Socle, site public et catalogue — FAIT (en attente de validation)
2. Panier et commande
3. Comptes
4. Administration
5. E-mails
6. Pages légales et référencement (+ test Playwright de bout en bout)
7. Déploiement et LISEZMOI.md

## Décisions de Léo (22 novembre 2026)
- Domaine lacavebuissonniere.fr : décision reportée.
- Paiement au retrait : espèces et carte bancaire, **pas de chèque** pour l'instant.
- Paiement en ligne : à rendre disponible (prestataire à choisir : Stripe ou SumUp).
- Hébergeur, budget, médiateur, licence : inconnus pour l'instant (mentions « à compléter »).
- Marchés 2026 et nouvelle carte 2026 : Léo les fournira ; la carte sera importée plus tard.
- Stock : seulement disponible / indisponible (champ `Product.available`).
- Photos des bouteilles : fournies plus tard (champ `Product.photoUrl`, dessin SVG en repli).
- Prix Domaine Colin Vieilles Vignes Blanc : garder celui du PDF, 13,56 €.
- Remise 5 % dès 6 : **ne s'applique pas aux bières (coffret compris), jus, sirops, eaux**, ni aux
  éthylotests et cartes cadeaux (`Product.discountEligible`, catégories dans `NO_DISCOUNT_CATEGORIES`).
- Carte cadeau : **pas d'achat en ligne**. Présentée sur le site, achetée sur les marchés.
- Compte obligatoire pour commander.
- Les évolutions futures passeront par Léo, via des sessions Claude : tout doit rester dans ce dépôt.

## Technique
- Next.js 15 (App Router, TypeScript 5 : TypeScript 7 n'est pas compatible avec Next 15), Prisma 6 + PostgreSQL, Zod 4, Vitest.
- CSS : `src/app/globals.css` reprend le CSS de la maquette (sélecteurs `nav` limités à `header nav`).
- Règles métier pures et testées dans `src/lib/rules/` (heure de Paris, marchés, remise, zone, recherche).
  Le serveur recalcule toujours prix, remise, zone et heure limite : ne jamais faire confiance au navigateur.
- Montants en centimes. Dates de marché en chaînes `AAAA-MM-JJ` (jour calendaire à Paris).
- Réglages modifiables (rayon, remise, heure limite, contacts...) : table `Setting`, valeurs par défaut
  dans `src/lib/settings-defaults.ts`, lecture par `getSettings()`.
- Géocodage : API IGN `data.geopf.fr/geocodage/search`, secours `donnees/communes-100km.json`.

## Commandes
- `npm run dev` : site local sur http://localhost:3000
- `npm test` : tests unitaires
- `npx prisma migrate dev` puis `npm run db:seed` : base locale et chargement des données
- `npm run db:seed -- --marches` : remplace aussi les marchés par ceux de `donnees/marches.json`
