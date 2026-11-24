# La Cave Buissonnière : mémoire du projet

Site marchand de La Cave Buissonnière (Guillaume Plantard, EI, caviste ambulant).
Piloté par **Léo**, non-développeur : expliquer simplement, en français, questions en liste numérotée,
pas d'emoji, pas de flatterie. Le cahier des charges complet est dans `sources/PROMPT.md`,
la maquette validée dans `sources/maquette/index.html` (référence pour le design, les textes et les comportements).

## Méthode
Étapes testables ; à la fin de chaque étape : tests, captures d'écran, puis attendre l'accord de Léo.
1. Socle, site public et catalogue — FAIT, validé
2. Panier et commande — FAIT, validé. Inclut le minimum des comptes
   (création avec case 18 ans, connexion, déconnexion), indispensable pour commander.
3. Comptes — FAIT, validé : mot de passe oublié (lien 1 h, usage unique), informations
   et marché habituel modifiables, changement de mot de passe, export JSON, suppression (mot de passe
   demandé, commandes conservées sans lien au compte), purge des comptes inactifs 3 ans (`purgeExpiredData`,
   à planifier chaque jour à l'étape 7). E-mails écrits dans `MAIL_OUTBOX_DIR` tant que Brevo n'est pas branché.
4. Administration — FAIT, validé : `/admin` (réservé `User.isAdmin`, 404 sinon).
   Accès donné par `npm run admin -- ajouter email` (Guillaume et Léo, après création de leur compte).
   Commandes (filtres, statuts, notes, export CSV), fiche de préparation imprimable, produits (édition,
   copie, masquage, dispo, pastilles, photo stockée en base `ProductPhoto` servie par `/photos/[id]`),
   import/export de la carte CSV ou .xlsx (`src/lib/rules/catalog-import.ts`, colonne « Adresse » = slug),
   marchés habituels et exceptionnels/annulés, devis, lettre d'information (export CSV pour Brevo),
   cartes cadeaux (création + code + e-mail, déduction au marché), réglages (règles, contacts,
   informations légales → liste « À compléter »).
5. E-mails et paiement — FAIT, validé. Expéditeur contact@lacavebuissonniere.fr (choix de Léo).
   `src/lib/emails.ts` (modèles), `src/lib/server/mail.ts` (Brevo, journal `EmailLog` sans contenu, 1 nouvelle
   tentative, jamais bloquant), `src/lib/server/notify.ts` (confirmation + alerte, devis, rappels la veille,
   `dailyTasks`), route `/api/taches/quotidiennes` (Bearer CRON_SECRET, à planifier chaque soir après 19 h).
   SumUp codé « comme si » (`src/lib/server/payment.ts`), testé avec un faux service : désactivé tant que
   SUMUP_API_KEY / SUMUP_MERCHANT_CODE ne sont pas installées. Brevo testé avec un faux service (pas de compte).
6. Pages légales, référencement, accessibilité — FAIT, validé.
   Pages `/mentions-legales`, `/cgv` (formulaire de rétractation), `/confidentialite`, `/cookies` alimentées par
   les réglages : un champ vide n'est jamais montré aux visiteurs (liste « À compléter » dans l'admin).
   Encadré officiel de garantie (D. 211-2) : à coller depuis Légifrance dans Réglages (`legal.warrantyText`),
   NE PAS le rédiger de mémoire. Version des CGV acceptée = date du texte + empreinte des réglages cités
   (`cgvVersion`, src/lib/legal.ts) : changer `CGV_VERSION` à chaque modification du texte.
   `sitemap.xml`, `robots.txt` (dynamiques), JSON-LD LiquorStore + Product. Audit axe WCAG 2.1 AA :
   0 défaut sur 26 pages x 2 tailles (aussi dans les tests e2e). Lighthouse mobile : accessibilité,
   bonnes pratiques 100 ; SEO 100 (66 voulu sur /compte et /panier, non indexés) ; performance 86-99
   selon pages et mesures (accueil 86-92). Aperçu vidéo en WebP préchargé, police Cabin Sketch réduite
   (original dans sources/), logos WebP pour l'en-tête et le pied de page (logo.png gardé pour les e-mails).
7. Déploiement et documentation — FAIT (en attente de validation). Rien n'est en ligne : hébergeur et domaine
   pas encore choisis. `LISEZMOI.md` (mode d'emploi non-développeur), `VERIFICATION.md` (liste avant mise en ligne).
   Option A : `vercel.json` (région cdg1, cron 18:10 UTC = 19 h 10 / 20 h 10 Paris), `scripts/vercel-build.sh`
   (migrations avec DIRECT_URL, Neon pooler + `pgbouncer=true` pour DATABASE_URL).
   Option B : `Dockerfile` (étages deps, outils, migrations, site ; image testée en conteneur : migrations au
   démarrage, santé, utilisateur non root), `deploy/ovh/` (compose site + PostgreSQL + Caddy HTTPS, profil
   `outils` pour seed/admin, sauvegarde/restauration testées, tâche du soir, crontab). `/api/sante`.
   CI GitHub Actions `.github/workflows/tests.yml`. Limite des actions serveur : 4 Mo (photos 3 Mo, réduites
   dans le navigateur à 1 600 px ; cartes 3 Mo) — sous le plafond de 4,5 Mo de Vercel.

## Décisions de Léo (22 novembre 2026)
- Domaine lacavebuissonniere.fr : décision reportée.
- Date de mise en ligne : aucune pour l'instant, peut-être en 2027 (23 nov. 2026).
- Paiement au retrait : espèces et carte bancaire, **pas de chèque** (confirmé le 23 nov. 2026).
- Paiement en ligne : **SumUp** (choix de Léo, 23 nov. 2026), à brancher dans `src/lib/server/payment.ts`.
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
  pour prévenir le client si un marché est annulé ; confirmé par Léo le 23 nov. 2026).
- Bandeau vert défilant des prochains marchés en haut de toutes les pages (demande de Léo, 23 nov.) :
  `src/components/layout/MarketTicker.tsx`, 8 marchés sur 14 jours, marchés du jour terminés masqués,
  bouton pause obligatoire (WCAG 2.2.2), fixe si « animations réduites ».
- Administration : Guillaume et Léo (23 nov. 2026). Limite d'inscriptions : 20 par heure et par IP
  (IP souvent partagées : opérateurs mobiles, Wi-Fi de salle des fêtes).
- Les évolutions futures passeront par Léo, via des sessions Claude : tout doit rester dans ce dépôt.
- Branches (24 nov. 2026) : `main` créée au niveau de l'étape 1 à la demande de Léo ; les étapes 2 à 7 arrivent
  par la demande de fusion n° 1 (que Léo valide lui-même). Vercel mettra en ligne `main`. Évolutions futures :
  une branche de travail + une demande de fusion vers `main`, jamais d'envoi direct sur `main`.

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
- Formulaires avec action serveur : `action={x} onSubmit={keepFormSubmit(x)}` (React 19 vide sinon les champs
  après une erreur ; l'attribut `action` évite un envoi GET avec les champs dans l'URL avant le chargement du JS).

## Commandes
- `npm run dev` : site local sur http://localhost:3000
- `npm test` : tests unitaires et d'intégration (base `cave_test`, jamais la base du site)
- `npm run build && npm run test:e2e` : test de bout en bout Playwright (base `cave_test`, port 3100)
- Dans l'environnement cloud de Claude, lancer le serveur avec `NODE_USE_ENV_PROXY=1` pour que Node
  passe par le proxy et joigne l'IGN (inutile en production). Prisma refuse `migrate reset` lancé
  par un assistant : ne pas contourner, utiliser `migrate deploy`.
- `npx prisma migrate dev` puis `npm run db:seed` : base locale et chargement des données
- `npm run db:seed -- --marches` : remplace aussi les marchés par ceux de `donnees/marches.json`
- Docker dans l'environnement cloud de Claude : `dockerd` démarre, mais apt (deb.debian.org) est bloqué par le proxy ;
  tester avec une variante du Dockerfile basée sur `node:22-bookworm` (complète) et le certificat du proxy.
