# La Cave Buissonnière : mémoire du projet

Site marchand de La Cave Buissonnière (Guillaume Plantard, EI, caviste ambulant).
Piloté par **Léo**, non-développeur : expliquer simplement, en français, questions en liste numérotée,
pas d'emoji, pas de flatterie. Le cahier des charges complet est dans `sources/PROMPT.md`,
la maquette validée dans `sources/maquette/index.html` (référence pour le design, les textes et les comportements).

## Méthode
Étapes testables ; à la fin de chaque étape : tests, captures d'écran, puis attendre l'accord de Léo.
1. Socle, site public et catalogue — FAIT, validé
2. Panier et commande — FAIT (en attente de validation). Inclut le minimum des comptes
   (création avec case 18 ans, connexion, déconnexion), indispensable pour commander.
3. Comptes : mot de passe oublié, marché habituel modifiable, export et suppression des données
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
- Téléphone obligatoire pour toute commande, y compris le retrait au marché (choix fait à l'étape 2,
  pour prévenir le client si un marché est annulé ; à confirmer par Léo).
- Bandeau vert défilant des prochains marchés en haut de toutes les pages (demande de Léo, 23 nov.) :
  `src/components/layout/MarketTicker.tsx`, 8 marchés sur 14 jours, marchés du jour terminés masqués,
  bouton pause obligatoire (WCAG 2.2.2), fixe si « animations réduites ».
- Les évolutions futures passeront par Léo, via des sessions Claude : tout doit rester dans ce dépôt.

## Technique
- Next.js 15 (App Router, TypeScript 5 : TypeScript 7 n'est pas compatible avec Next 15), Prisma 6 + PostgreSQL, Zod 4, Vitest.
- CSS : `src/app/globals.css` reprend le CSS de la maquette (sélecteurs `nav` limités à `header nav`).
- Règles métier pures et testées dans `src/lib/rules/` (heure de Paris, marchés, remise, zone, recherche).
  Le serveur recalcule toujours prix, remise, zone et heure limite : ne jamais faire confiance au navigateur.
- Montants en centimes. Dates de marché en chaînes `AAAA-MM-JJ` (jour calendaire à Paris).
- Réglages modifiables (rayon, remise, heure limite, contacts...) : table `Setting`, valeurs par défaut
  dans `src/lib/settings-defaults.ts`, lecture par `getSettings()`.
- Géocodage : API IGN `data.geopf.fr/geocodage/search` (`src/lib/server/zone.ts`) : commune d'abord
  (département, homonymes), puis adresse filtrée par `citycode` ; secours `donnees/communes-100km.json`.
  Ne jamais chercher l'adresse sans filtre de commune (l'IGN renvoie des rues homonymes ailleurs).
- Commande : `placeOrder` dans `src/lib/server/checkout.ts` revérifie tout (prix, remise, disponibilité,
  heure limite, zone, carte cadeau réservée dans la même transaction, CGV + version `CGV_VERSION`).
- Cartes cadeaux : saisies par Guillaume (admin, étape 4), montant réservé à la commande (solde décrémenté),
  débité à la remise, rendu si la commande est annulée (`GiftCardUse.status`).
- Paiement en ligne : emplacement `src/lib/server/payment.ts`, désactivé (`onlinePayment.enabled`).
- Sessions : cookie `lcb_me` httpOnly, seul le hash SHA-256 du jeton est en base ; mots de passe argon2id.
- Formulaires avec action serveur : utiliser `keepFormSubmit` (sinon React 19 vide les champs après une erreur).

## Commandes
- `npm run dev` : site local sur http://localhost:3000
- `npm test` : tests unitaires et d'intégration (base `cave_test`, jamais la base du site)
- `npm run build && npm run test:e2e` : test de bout en bout Playwright (base `cave_test`, port 3100)
- Dans l'environnement cloud de Claude, lancer le serveur avec `NODE_USE_ENV_PROXY=1` pour que Node
  passe par le proxy et joigne l'IGN (inutile en production). Prisma refuse `migrate reset` lancé
  par un assistant : ne pas contourner, utiliser `migrate deploy`.
- `npx prisma migrate dev` puis `npm run db:seed` : base locale et chargement des données
- `npm run db:seed -- --marches` : remplace aussi les marchés par ceux de `donnees/marches.json`
