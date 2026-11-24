# Site de La Cave Buissonnière : mode d'emploi

Ce document explique, sans jargon, comment faire tourner le site, le mettre en ligne et l'utiliser au quotidien.
Les mots techniques indispensables sont expliqués la première fois qu'ils apparaissent.

Sommaire

1. Ce que contient ce dossier
2. Lancer le site sur son ordinateur
3. Mettre le site en ligne : deux options
4. Option A : Vercel et Neon (recommandée, sans serveur à entretenir)
5. Option B : serveur OVH avec Docker (le moins cher, hébergeur français)
6. Les réglages secrets (variables d'environnement)
7. Relier le nom de domaine
8. Donner l'accès à l'administration
9. Ajouter un produit ou importer une nouvelle carte
10. Ajouter ou annuler un marché
11. Faire une sauvegarde
12. Coût mensuel estimé
13. En cas de problème
14. Faire évoluer le site

Avant la mise en ligne, suivez aussi la liste **[VERIFICATION.md](VERIFICATION.md)**.

---

## 1. Ce que contient ce dossier

| Dossier ou fichier | Rôle |
|---|---|
| `src/` | Le code du site (pages, règles de vente, administration, e-mails). |
| `prisma/` | La description de la base de données et ses mises à jour successives. |
| `donnees/` | La carte des vins et les marchés de départ, chargés une seule fois au démarrage. |
| `public/` | Logo, photos, polices, vidéo de présentation. |
| `deploy/ovh/` | Les fichiers de l'option B (serveur OVH). |
| `tests/` | Les vérifications automatiques (plus de 100). |
| `sources/` | La maquette validée, le cahier des charges, la carte d'origine en PDF. |
| `CLAUDE.md` | La mémoire du projet pour les sessions Claude (décisions, choix techniques). |
| `.env.example` | La liste des réglages secrets à remplir (voir partie 6). |

---

## 2. Lancer le site sur son ordinateur

Utile pour essayer une modification avant de la mettre en ligne. Comptez 30 minutes la première fois.

**À installer une fois :**

- **Node.js 22** : le moteur qui fait tourner le site. Téléchargement sur nodejs.org (version « LTS »).
- **PostgreSQL 16** : la base de données. Téléchargement sur postgresql.org. Notez le mot de passe choisi à l'installation.
- **Git** : l'outil qui récupère le code depuis GitHub (git-scm.com).

**Puis, dans un terminal (« Invite de commandes » sous Windows, « Terminal » sur Mac) :**

```bash
git clone https://github.com/caram-eu/la-cave-buissonni-re.git
cd la-cave-buissonni-re
npm install                      # télécharge les briques du site (quelques minutes)
cp .env.example .env             # crée le fichier de réglages (sous Windows : copy .env.example .env)
```

Ouvrez le fichier `.env` avec un éditeur de texte et vérifiez la ligne `DATABASE_URL`
(remplacez le deuxième `postgres` par le mot de passe PostgreSQL choisi à l'installation).
Ajoutez la ligne `MAIL_OUTBOX_DIR="boite-locale"` : les e-mails seront écrits dans ce dossier au lieu d'être envoyés.

```bash
npx prisma migrate deploy        # crée les tables de la base
npm run db:seed                  # charge la carte des vins et les marchés
npm run dev                      # lance le site
```

Le site est alors visible à l'adresse **http://localhost:3000**. `Ctrl + C` dans le terminal l'arrête.

Pour vérifier que tout fonctionne : `npm test` (tests automatiques, il faut une base `cave_test`, voir `CLAUDE.md`).

---

## 3. Mettre le site en ligne : deux options

| | Option A : Vercel + Neon | Option B : serveur OVH + Docker |
|---|---|---|
| Principe | Deux services spécialisés qui s'occupent de tout | Un petit serveur loué, sur lequel tout tourne |
| Entretien technique | Aucun (mises à jour et sécurité gérées par Vercel et Neon) | Mises à jour du serveur à faire régulièrement (1 heure par trimestre environ) |
| Mise en ligne d'une modification | Automatique à chaque envoi sur GitHub | Une commande sur le serveur |
| Sauvegardes | Automatiques chez Neon (historique de quelques jours selon l'offre) + export manuel | Script quotidien fourni, à copier aussi ailleurs |
| Données | Union européenne (Paris et Francfort), sociétés américaines | France, société française |
| Coût estimé | 20 à 40 € par mois | 8 à 15 € par mois |

**Recommandation : l'option A**, parce qu'il n'y a aucun serveur à surveiller : c'est le choix le plus sûr pour un site entretenu par des non-développeurs.
L'option B est pertinente si vous voulez réduire le coût ou garder les données chez un hébergeur français ; elle demande d'être à l'aise avec un terminal.

---

## 4. Option A : Vercel et Neon

**Vercel** héberge le site. **Neon** héberge la base de données. Les deux ont une offre de départ et une interface en anglais.

### 4.1 Créer la base de données chez Neon

1. Créez un compte sur **neon.tech** (connexion possible avec le compte GitHub).
2. Créez un projet : nom `cave-buissonniere`, version PostgreSQL 16, région **AWS Europe Central (Frankfurt)**.
3. Dans « Connection Details », copiez deux adresses :
   - celle **avec** `-pooler` dans le nom : ce sera `DATABASE_URL` (ajoutez `&pgbouncer=true` à la fin) ;
   - celle **sans** `-pooler` (décochez « Connection pooling ») : ce sera `DIRECT_URL`.

### 4.2 Mettre le site sur Vercel

1. Créez un compte sur **vercel.com** avec le compte GitHub qui a accès au dépôt. Prenez l'offre **Pro** : l'offre gratuite « Hobby » est réservée aux usages non commerciaux.
2. « Add New… » > « Project » > importez le dépôt `la-cave-buissonni-re`. La branche principale (`main`) sera celle mise en ligne.
3. Avant de cliquer sur « Deploy », ouvrez « Environment Variables » et ajoutez les réglages de la partie 6 (`DATABASE_URL`, `DIRECT_URL`, `SITE_URL`, `CRON_SECRET`, `BREVO_API_KEY`, `MAIL_FROM`…).
4. Cliquez sur « Deploy ». La construction dure 2 à 3 minutes. Le fichier `vercel.json` du dépôt règle déjà :
   - la région **Paris** (`cdg1`) ;
   - la mise à jour automatique de la base à chaque mise en ligne ;
   - la **tâche du soir** (rappels de la veille et nettoyage), chaque jour à 19 h 10 en hiver et 20 h 10 en été, après l'heure limite de commande.
5. Une seule fois, chargez la carte et les marchés de départ depuis votre ordinateur (partie 2 installée), en mettant dans votre `.env` l'adresse `DIRECT_URL` de Neon comme `DATABASE_URL` :
   ```bash
   npm run db:seed
   ```

Ensuite, chaque modification envoyée sur GitHub (branche `main`) est mise en ligne automatiquement.

---

## 5. Option B : serveur OVH avec Docker

**Docker** permet de faire tourner le site, la base et le certificat HTTPS dans des « boîtes » prêtes à l'emploi, sans rien installer d'autre.

1. Louez un **VPS** chez OVHcloud (gamme VPS, 2 Go de mémoire suffisent), système **Debian 12** ou **Ubuntu 24.04**, centre de données en France (Gravelines, Roubaix ou Strasbourg).
2. Connectez-vous au serveur (OVH envoie l'adresse et le mot de passe par e-mail) :
   ```bash
   ssh debian@ADRESSE_DU_SERVEUR
   ```
3. Réglez le serveur à l'heure de Paris, installez Docker, puis récupérez le site.
   Le dépôt GitHub étant privé, GitHub demandera un identifiant : utilisez votre nom d'utilisateur GitHub et, comme mot de passe,
   un **jeton d'accès** en lecture seule (GitHub > Settings > Developer settings > Personal access tokens > « Fine-grained », accès « Contents : Read » à ce seul dépôt).
   ```bash
   sudo timedatectl set-timezone Europe/Paris
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER && exit        # puis reconnectez-vous
   sudo mkdir -p /opt/cave && sudo chown $USER /opt/cave
   git clone https://github.com/caram-eu/la-cave-buissonni-re.git /opt/cave
   cd /opt/cave/deploy/ovh
   cp .env.exemple .env && nano .env            # remplissez les réglages (partie 6), Ctrl+O puis Ctrl+X
   ```
4. Reliez d'abord le nom de domaine au serveur (partie 7), puis lancez tout :
   ```bash
   docker compose up -d --build                 # 5 à 10 minutes la première fois
   docker compose run --rm outils npm run db:seed   # une seule fois : carte et marchés de départ
   ```
   Le certificat HTTPS est obtenu et renouvelé automatiquement.
5. Programmez la tâche du soir et la sauvegarde de nuit :
   ```bash
   crontab -e        # collez le contenu de deploy/ovh/crontab.exemple, enregistrez
   ```
6. Pour mettre en ligne une nouvelle version du site :
   ```bash
   cd /opt/cave && git pull && cd deploy/ovh && docker compose up -d --build
   ```
7. Une fois par trimestre, mettez le serveur à jour : `sudo apt update && sudo apt upgrade -y`, puis redémarrez-le si demandé.

---

## 6. Les réglages secrets (variables d'environnement)

Ce sont des informations confidentielles (mots de passe, clés) que le site lit au démarrage. **Elles ne doivent jamais être envoyées sur GitHub ni par e-mail.**
Sur Vercel : « Settings » > « Environment Variables ». Sur OVH : fichier `deploy/ovh/.env`.

| Nom | À quoi ça sert | Où l'obtenir | Obligatoire |
|---|---|---|---|
| `DATABASE_URL` | Adresse de la base de données | Neon (adresse avec `-pooler`, + `&pgbouncer=true`) ; sur OVH, construite automatiquement | Oui |
| `DIRECT_URL` | Adresse directe de la base, pour ses mises à jour | Neon (adresse sans `-pooler`) ; inutile sur OVH | Option A |
| `POSTGRES_PASSWORD` | Mot de passe de la base | À inventer (long, aléatoire) | Option B |
| `DOMAINE` | Nom de domaine pour le certificat HTTPS | Ex. `lacavebuissonniere.fr` | Option B |
| `SITE_URL` | Adresse publique du site (liens des e-mails, plan du site) | Ex. `https://lacavebuissonniere.fr` | Oui |
| `CRON_SECRET` | Protège la tâche du soir | À inventer : `openssl rand -hex 24` ou un générateur de mots de passe (32 caractères) | Oui |
| `BREVO_API_KEY` | Envoi des e-mails | Brevo > menu du compte > « SMTP & API » > « Clés API » | Oui |
| `MAIL_FROM` | Adresse d'expédition | `contact@lacavebuissonniere.fr` (adresse du domaine, à déclarer dans Brevo) | Oui |
| `MAIL_FROM_NAME` | Nom de l'expéditeur | `La Cave Buissonnière` | Non |
| `ALERT_EMAIL` | Reçoit les alertes de commandes et de devis | Par défaut : l'e-mail des réglages du site | Non |
| `SUMUP_API_KEY` | Paiement en ligne | Tableau de bord SumUp > Développeurs > clés d'API | Seulement pour le paiement en ligne |
| `SUMUP_MERCHANT_CODE` | Identifiant marchand SumUp | Tableau de bord SumUp > Profil | Seulement pour le paiement en ligne |

Le paiement en ligne s'active ensuite dans l'administration (Réglages > Paiement en ligne). Il reste désactivé tant que les deux clés SumUp ne sont pas installées.

---

## 7. Relier le nom de domaine

Le domaine `lacavebuissonniere.fr` se règle chez l'entreprise où il a été acheté (le « registraire » : OVH, Gandi, Ionos…), dans la partie « Zone DNS ».

- **Option A (Vercel)** : dans Vercel, « Settings » > « Domains », ajoutez `lacavebuissonniere.fr` et `www.lacavebuissonniere.fr`. Vercel affiche les deux lignes à créer dans la zone DNS (en général un enregistrement `A` vers `76.76.21.21` et un `CNAME` `www` vers `cname.vercel-dns.com` ; recopiez exactement ce que Vercel indique).
- **Option B (OVH)** : créez un enregistrement `A` pour `lacavebuissonniere.fr` et un pour `www` vers l'adresse IP du serveur.

Comptez de quelques minutes à quelques heures avant que le changement soit visible partout.

**E-mails** : dans Brevo, « Expéditeurs, domaines et IP dédiées » > « Domaines » > ajoutez `lacavebuissonniere.fr`. Brevo indique 3 ou 4 lignes à ajouter dans la même zone DNS (SPF, DKIM, DMARC). **Sans elles, les e-mails du site arriveront en indésirables ou seront refusés.**
Pour vérifier : envoyez un e-mail du site (mot de passe oublié) à l'adresse proposée par mail-tester.com, la note doit être d'au moins 9/10.

Si l'ancien site existe encore sur ce domaine, prévenez son gestionnaire avant de changer la zone DNS : l'ancien site cessera d'être visible.

---

## 8. Donner l'accès à l'administration

L'administration se trouve à l'adresse **/admin** (ex. `https://lacavebuissonniere.fr/admin`). Elle n'est accessible qu'aux comptes autorisés ; pour les autres, la page n'existe pas.

1. La personne (Guillaume, Léo) crée d'abord un compte client normal sur le site (« Mon compte »).
2. On lui donne ensuite l'accès, avec son adresse e-mail :
   - **Option A**, depuis votre ordinateur (partie 2, `DATABASE_URL` réglé sur l'adresse `DIRECT_URL` de Neon) :
     `npm run admin -- ajouter guillaume@exemple.fr`
   - **Option B**, sur le serveur : `cd /opt/cave/deploy/ovh && docker compose run --rm outils npm run admin -- ajouter guillaume@exemple.fr`
3. La personne se reconnecte : un bouton « Accéder à l'administration » apparaît dans « Mon compte ».

`npm run admin -- liste` affiche les administrateurs, `npm run admin -- retirer adresse` retire un accès.

---

## 9. Ajouter un produit ou importer une nouvelle carte

**Un produit** : Administration > Produits > « Ajouter un produit ». Remplissez la fiche, enregistrez, puis ajoutez la photo
(prise directement avec le téléphone : elle est réduite automatiquement). Sans photo, la bouteille dessinée s'affiche.
Pour un nouveau millésime, ouvrez l'ancien produit et cliquez sur « Dupliquer » : la copie est masquée tant que vous ne l'avez pas vérifiée.

Les boutons « Disponible / Indisponible » et « Masquer » de la liste agissent tout de suite sur le site.

**Une nouvelle carte (chaque saison)** :

1. Administration > Produits > « Télécharger la carte (CSV) » : vous obtenez la carte actuelle, qui sert de modèle.
2. Ouvrez-la dans Excel ou LibreOffice. Changez les prix et millésimes, ajoutez des lignes, supprimez celles qui ne sont plus à la carte.
   **Ne modifiez pas la colonne « Adresse »** : elle relie chaque ligne à sa fiche (laissez-la vide pour un nouveau produit).
   Colonnes obligatoires : Domaine, Cuvée, Catégorie, Région, Prix TTC.
3. Enregistrez (format CSV ou Excel `.xlsx`), puis Administration > Produits > « Importer une nouvelle carte ».
4. Cliquez sur « Vérifier le fichier » : le site affiche ce qui va changer et les lignes à corriger, avec leur numéro. **Rien n'est modifié à ce stade.**
5. Cliquez sur « Importer cette carte ». Les références absentes du fichier sont masquées (jamais supprimées : les commandes passées les gardent, et elles peuvent être réaffichées). Les photos sont conservées.

---

## 10. Ajouter ou annuler un marché

Administration > Marchés.

- **Marché habituel** (chaque semaine) : « Ajouter un marché habituel » (ville, département, jour, lieu, horaires au format `8h-12h30`). La ville est placée seule sur la carte.
- **Marché exceptionnel** (Noël, foire) : « Marché exceptionnel ou annulé » > « Marché exceptionnel », avec la date. Il apparaît dans le bandeau, la carte et l'encadré « Marchés de Noël et des fêtes ».
- **Marché annulé** (congés, météo) : même formulaire > « Marché annulé ». Il n'est plus proposé aux clients ; si des commandes étaient prévues ce jour-là, un avertissement l'indique : prévenez les clients (Administration > Commandes, filtre par marché).
- **Marchés 2026** : les dates de départ datent de 2025. Effacez les dates passées (bouton « Effacer les dates passées »), vérifiez les marchés habituels et ajoutez les marchés de Noël de l'année.

---

## 11. Faire une sauvegarde

La base contient tout : clients, commandes, carte, photos, marchés, réglages.

- **Option A** : Neon garde automatiquement un historique de quelques jours (durée selon l'offre) et permet de revenir à un instant précis (« Restore »). En plus, une fois par mois, faites une copie sur votre ordinateur :
  ```bash
  pg_dump "ADRESSE_DIRECT_URL_DE_NEON" --no-owner | gzip > cave-$(date +%F).sql.gz
  ```
  et gardez ce fichier en lieu sûr (disque externe, espace de stockage personnel). **Il contient des données personnelles : ne le partagez pas.**
- **Option B** : la sauvegarde tourne chaque nuit (`deploy/ovh/sauvegarde.sh`, 30 jours conservés dans `deploy/ovh/sauvegardes/`). Ces fichiers sont sur le même serveur : copiez-les ailleurs régulièrement, par exemple avec `scp debian@ADRESSE:/opt/cave/deploy/ovh/sauvegardes/*.gz .` depuis votre ordinateur.
  Pour restaurer : `./restauration.sh sauvegardes/cave-AAAA-MM-JJ_HHMM.sql.gz` (une sauvegarde de l'état actuel est faite juste avant, par sécurité).

**Testez une restauration au moins une fois** avant la mise en ligne : une sauvegarde jamais restaurée n'est pas une sauvegarde fiable.

---

## 12. Coût mensuel estimé

Estimations au **novembre 2026, à vérifier sur les sites des fournisseurs** : leurs tarifs changent régulièrement.

| Poste | Option A | Option B |
|---|---|---|
| Hébergement du site | Vercel Pro : environ 20 $ par mois et par membre (1 suffit) | VPS OVH : environ 5 à 10 € par mois |
| Base de données | Neon : offre gratuite au départ, puis environ 5 à 20 € par mois si le site grandit | Comprise dans le VPS |
| E-mails | Brevo : gratuit jusqu'à 300 e-mails par jour (largement suffisant) | Idem |
| Nom de domaine | Environ 10 à 15 € **par an** | Idem |
| Paiement en ligne (si activé) | SumUp : commission sur chaque paiement, pas d'abonnement (voir la grille SumUp) | Idem |
| **Total** | **environ 20 à 40 € par mois** | **environ 8 à 15 € par mois** |

---

## 13. En cas de problème

| Symptôme | Que faire |
|---|---|
| Le site ne s'affiche plus | Ouvrez `/api/sante` (ex. `https://lacavebuissonniere.fr/api/sante`). `{"ok":true}` : le site et la base fonctionnent, le problème vient sans doute du domaine. Sinon : Vercel > « Deployments » ou, sur OVH, `docker compose ps` et `docker compose logs site`. |
| Un client n'a pas reçu son e-mail | Le tableau de bord de l'administration affiche un encadré « E-mails non partis ». Vérifiez la clé Brevo et l'authentification du domaine (partie 7). Prévenez le client par téléphone. |
| Les rappels de la veille ne partent pas | Vérifiez `CRON_SECRET` et la tâche du soir (Vercel > « Settings » > « Cron Jobs », ou `crontab -l` sur OVH). |
| Une adresse est refusée à la livraison alors qu'elle est dans la zone | Le site interroge le service public de l'IGN ; s'il ne répond pas, il utilise la liste des communes à moins de 100 km. Vérifiez le rayon dans Administration > Réglages. |
| Mot de passe administrateur oublié | « Mot de passe oublié » comme un client. |

---

## 14. Faire évoluer le site

Le site a été construit avec Claude (Anthropic). Pour une évolution, ouvrez une session Claude Code sur ce dépôt GitHub et décrivez la demande en français :
le fichier `CLAUDE.md` lui donne le contexte (décisions prises, règles du site, choix techniques), sans avoir à tout réexpliquer.

Quelques règles pour que le site reste fiable :

- toute modification passe par GitHub, jamais directement sur le serveur ;
- les tests automatiques (`npm test` et `npm run test:e2e`) doivent passer avant chaque mise en ligne ; sur GitHub, l'onglet « Actions » les lance à chaque envoi ;
- si le texte des CGV change, la date `CGV_VERSION` de `src/lib/legal.ts` doit changer aussi (les commandes enregistrent la version acceptée).
