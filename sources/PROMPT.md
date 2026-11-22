# Projet : site de vente en ligne de La Cave Buissonnière

## Ton rôle

Tu es un développeur web senior, en charge de construire le site marchand réel de **La Cave Buissonnière**, prêt à être mis en ligne. La personne qui te pilote n'est pas développeuse : explique tes choix simplement, en français, et pose tes questions sous forme de liste numérotée.

## L'entreprise

- **La Cave Buissonnière**, Guillaume Plantard, entrepreneur individuel (EI), sommelier-conseil et caviste ambulant depuis le 16 novembre 2017.
- Lieu-dit Le Cros, 03290 Dompierre-sur-Besbre. 06 12 33 57 70. lacavebuissonniere@gmail.com. SIREN 832 692 230, RCS Cusset, TVA FR06 832 692 230 (à vérifier sur le Kbis).
- Il vend des **vins naturels** (bio et biodynamie), des **bières artisanales**, des jus et sirops, sur les **marchés** de l'Allier, de la Nièvre et de la Saône-et-Loire, avec un camion réfrigéré (11 à 13 °C).
- Ses prestations : **réunions-ventes et dégustations à domicile**, **ateliers** (initiation à la dégustation, accords mets et vins), **mariages et événements** (accords selon le budget, reprise des bouteilles non ouvertes), **coffrets cadeaux** et **carte cadeau**.
- Un domaine existe déjà : **www.lacavebuissonniere.fr** (visible sur son stand). Demande qui le gère avant de prévoir la mise en ligne.

## Ce que contient ce dossier

| Dossier | Contenu |
|---|---|
| `maquette/` | La **maquette validée** : `index.html` (site complet en une page, à ouvrir dans un navigateur), logo, photos, polices, vidéo de présentation de 30 s. C'est la référence pour le design, les textes et les comportements. |
| `donnees/produits.json` | Les **164 références** de la carte, déjà nettoyées : domaine, label (Bio, Biodynamie), région, appellation, cépages, millésime (`NM` = non millésimé), contenance en cl, prix TTC, `ssa` = sans sulfites ajoutés, `su` = sucres résiduels, `st` = style, `tag` = Nouveauté ou Best-seller. |
| `donnees/marches.json` | Les **marchés habituels** (jour, lieu, horaires, coordonnées) et les **marchés exceptionnels** (dates précises). |
| `donnees/communes-100km.json` | Les 1 770 communes situées à moins de 100 km de Dompierre : `[nom, département, distance en km]`. Sert de secours si le géocodage ne répond pas. |
| `sources/` | La carte des cuvées d'origine (PDF) et le mail envoyé aux clients. Ce sont les sources des règles commerciales. |

**Commence par ouvrir `maquette/index.html` et lire tout son code** (HTML, CSS et JavaScript) : toutes les pages, règles et textes y sont déjà définis. Le site final doit avoir le même aspect et les mêmes fonctions, avec un vrai serveur, une vraie base de données et de vrais e-mails.

## Identité visuelle (à reprendre de la maquette)

- Thème **clair uniquement** : fond blanc, ardoise `#2d3e46`, vert `#89ba13`, rouge vin `#7a1f3d` pour les accents (Best-seller, remises).
- Polices fournies dans `maquette/fonts/` : Cabin Sketch (marque), Kalam (titres), Nunito Sans (texte).
- Bouteilles dessinées en SVG et hachurées comme sur le logo, couleur selon le type de vin. Le site doit aussi accepter de **vraies photos de bouteilles** envoyées depuis l'administration ; le dessin sert alors de solution de repli.
- **Vidéo de présentation** (`maquette/video/presentation.mp4`, 30 s) : à reprendre telle quelle en haut de l'accueil, avec son image d'aperçu (`poster.jpg`). Comme dans la maquette, elle ne démarre jamais seule : le visiteur la lance lui-même. Sa **musique est une composition originale au style chill et lo-fi** (piano électrique doux, batterie feutrée, environ 80 BPM), créée pour le projet et libre de droits ; la piste seule est dans `sources/musique-video-chill.wav`. N'ajoute aucune autre musique (pas de lecture automatique de son sur le site).
- **Animation d'ajout au panier** : la bouteille vole vers l'icône du panier (un verre), s'incline, verse, le verre se remplit et quelques gouttes éclaboussent. À désactiver si l'utilisateur a choisi de réduire les animations.
- Sur mobile, le menu tient sur une seule ligne et une **flèche « Retour : [page précédente] »** est présente en haut de chaque page.

## Pages publiques

1. **La cave (accueil)**
   - Accroche, vidéo de présentation, prestations, portrait de Guillaume avec un texte à la première personne, photos de marché.
   - **Marchés de la semaine** : liste par jour, carte interactive (fond des départements dessiné en SVG, marqueur par ville, fiche du marché au clic avec les prochaines dates calculées, bouton « Commander pour ce marché », lien itinéraire), encadré « Prochains marchés », bloc « Marchés de Noël et des fêtes » (affiché seulement s'il reste des dates à venir), outil « Suis-je livrable à domicile ? ».
2. **Nos vins**
   - Grande barre de recherche sans tenir compte des accents, avec surlignage des mots trouvés.
   - Filtres par type, par région et « sans sulfites ajoutés ». Tri par région (avec titres de région), par prix, Best-sellers d'abord, Nouveautés d'abord. Chargement progressif par lots de 36.
   - Pastilles « Nouveauté » et « ★ Best-seller ». Encadrés : commande à l'avance, −5 % dès 6 bouteilles, livraison et expédition.
3. **Fiche produit** : une adresse par produit, par exemple `/vins/fabien-jouves-les-escures-2024`. Elle affiche toutes les caractéristiques, un choix de quantité avec la remise calculée en direct, et les autres cuvées du même domaine.
4. **Événements** : mariages, fêtes et entreprises, dégustations à domicile (réunion-vente, ateliers), coffrets et carte cadeau, calculateur « Combien de bouteilles prévoir ? », **formulaire de demande de devis**.
5. **Mon compte** :
   - création de compte avec case obligatoire « Je certifie avoir 18 ans ou plus », connexion, mot de passe oublié ;
   - marché habituel (avec l'option « Aucun »), historique des commandes, suppression du compte.
6. **Panier** : quantités, remise, puis validation en 3 étapes (panier, retrait ou livraison, confirmation).
7. **Pages légales** : mentions légales, CGV avec formulaire de rétractation, confidentialité, cookies. Reprends les textes de la maquette. Les éléments **surlignés en jaune (classe `todo`) restent à compléter** : affiche-les dans une liste « À compléter avant mise en ligne » dans l'administration, et pas aux visiteurs.

## Règles commerciales (à coder et à tester)

- **Remise** : −5 % sur une ligne dès 6 bouteilles de la **même référence**. Elle ne s'applique ni aux cartes cadeaux ni aux éthylotests.
- **Limite de commande** : jusqu'à **19 h la veille** du marché choisi, heure de Paris. Les marchés dont la limite est passée ne sont plus proposés.
- **Modes de remise** :
  - **Retrait sur un marché** : gratuit, avec choix de la date, de la ville, du lieu et de l'horaire.
  - **Livraison à domicile** : jusqu'à **100 km de Dompierre-sur-Besbre**, en distance à vol d'oiseau. Vérifie l'adresse avec l'API de géocodage de l'IGN (`https://data.geopf.fr/geocodage/search`, l'ancienne `api-adresse.data.gouv.fr` est fermée), et utilise `communes-100km.json` en secours. Hors zone, la commande est bloquée et le site propose le retrait ou l'expédition. Le jour et les frais sont convenus par téléphone.
  - **Expédition UPS** : à domicile ou en point relais, sous 72 h, départs le **mardi et le mercredi**. Procédure et frais confirmés par téléphone. Le téléphone du client est obligatoire.
  - Le client peut annuler sans frais si les frais de livraison ou d'expédition annoncés ne lui conviennent pas. Le rayon (100 km), la remise (5 %, 6 bouteilles) et l'heure limite (19 h) doivent être **réglables dans l'administration**.
- **Paiement** : au retrait ou à la livraison, comme aujourd'hui. Prévois l'emplacement d'un paiement en ligne (Stripe, SumUp ou équivalent) **désactivé par défaut**.
- **Carte cadeau** : montants 20, 30, 50 et 100 € (à confirmer), avec un **code unique** généré et envoyé par e-mail, et un solde utilisable sur une commande. Le bénéficiaire choisit parmi les vins, les articles de cave et les prestations.
- **Éthylotests** : produit en vente (obligation légale pour la vente d'alcool en ligne) et message de prévention sur la page de commande.
- **Bouton final** libellé exactement « **Commander avec obligation de paiement** ». La case d'acceptation des CGV est obligatoire, et la version des CGV acceptée est enregistrée avec la date.
- Le client doit pouvoir aussi **commander par e-mail ou SMS** : affiche ces coordonnées à côté du panier.

## Administration (pour Guillaume, utilisable sur téléphone)

- **Commandes** :
  - liste filtrable par date et par marché ;
  - statuts : nouvelle, confirmée, préparée, remise, annulée ;
  - **fiche de préparation imprimable par marché** (quelles bouteilles charger dans le camion) ;
  - export CSV.
- **Produits** :
  - ajouter, modifier, masquer, dupliquer ;
  - photo ;
  - pastilles Nouveauté et Best-seller ;
  - disponibilité (« sur le camion » ou « sur commande ») ;
  - **import d'une nouvelle carte à partir d'un fichier CSV ou Excel**, puisqu'il refait sa carte chaque saison.
- **Marchés** : marchés habituels (jour, lieu, horaires) et marchés exceptionnels ou annulés (dates de Noël, congés). Les dates de `marches.json` sont celles de 2025 : prévois de les mettre à jour.
- **Demandes de devis** et **inscriptions à la lettre d'information**.
- **Cartes cadeaux** : liste, solde, utilisation.
- **Réglages** : informations légales, textes de bandeau, rayon, remise, heure limite.

## E-mails automatiques

Envoi via un service européen (Brevo, Mailjet ou équivalent) :

- **Au client** : confirmation de commande avec récapitulatif, rappel la veille du retrait, carte cadeau, réinitialisation du mot de passe.
- **À Guillaume** : chaque nouvelle commande (avec le téléphone du client) et chaque demande de devis.
- Expéditeur et réponses : lacavebuissonniere@gmail.com, ou une adresse du domaine si possible.

## Exigences techniques

- **Stack proposée** : Next.js (App Router, TypeScript), Tailwind ou CSS modules, PostgreSQL avec Prisma, authentification par e-mail et mot de passe (Auth.js ou Lucia), validation avec Zod.
  - Si tu penses qu'une solution plus simple à maintenir pour un non-développeur est meilleure (par exemple WooCommerce ou Shopify personnalisés), **dis-le et compare avant de coder**.
- **Hébergement dans l'Union européenne** (RGPD) : par exemple Vercel (région Paris) avec une base Neon ou Supabase en Europe, ou un VPS OVH avec Docker. Fournis les deux options de déploiement.
- **Sécurité** :
  - mots de passe hachés (argon2 ou bcrypt), protection CSRF, limitation du nombre de tentatives sur les connexions et les formulaires ;
  - contrôles côté serveur de toutes les règles (prix, remise, zone, heure limite) : **ne jamais faire confiance au prix envoyé par le navigateur** ;
  - aucun secret dans le code.
- **RGPD** :
  - uniquement des cookies strictement nécessaires (bandeau d'information, sans consentement requis tant qu'aucun outil de statistiques n'est ajouté) ;
  - export et suppression des données d'un client ;
  - durées de conservation de la politique de confidentialité.
- **Accessibilité** WCAG 2.1 AA, responsive dès 360 px, Lighthouse 90 ou plus partout.
- **Référencement** : métadonnées par page, plan du site (`sitemap.xml`), données structurées schema.org (`Product` sur les fiches, `LocalBusiness` avec les marchés).
- **Tests** :
  - tests unitaires des règles (remise, heure limite, calcul des prochains marchés, zone de livraison, carte cadeau) ;
  - un test de bout en bout avec Playwright : création de compte, ajout au panier, commande retrait, commande livraison hors zone refusée.
- **Script d'initialisation** qui charge `produits.json` et `marches.json` dans la base.

## Livrables

1. Le code dans un dépôt Git propre, avec des commits clairs.
2. Un **`LISEZMOI.md` en français pour un non-développeur** :
   - lancer le site sur son ordinateur ;
   - le mettre en ligne pas à pas, avec la liste des variables d'environnement et où les obtenir ;
   - relier le nom de domaine ;
   - ajouter un produit ou importer une nouvelle carte ;
   - ajouter un marché ;
   - faire une sauvegarde ;
   - coût mensuel estimé de l'hébergement et des services.
3. Une **liste de vérification avant mise en ligne** : mentions à compléter, tests à passer, comptes à créer.

## Méthode de travail

1. Lis la maquette, les données et les sources. Résume en 10 lignes ce que tu as compris.
2. Pose-moi les questions ouvertes (liste ci-dessous) **avant de coder**, et propose ton plan par étapes avec la stack retenue.
3. Construis par étapes testables :
   - site public et catalogue ;
   - panier et commande ;
   - comptes ;
   - administration ;
   - e-mails ;
   - pages légales et référencement ;
   - déploiement.
4. À la fin de chaque étape, lance les tests, montre-moi ce qui marche (captures ou adresse de prévisualisation) et attends mon accord pour la suite.

## Questions à me poser au début

1. Qui gère le domaine lacavebuissonniere.fr et le site actuel ?
2. Moyens de paiement acceptés au retrait (espèces, chèque, carte) ? Paiement en ligne souhaité dès le départ ?
3. Hébergeur choisi, et budget mensuel maximal ?
4. Nom du médiateur de la consommation, numéro de la petite licence à emporter et commune de délivrance ?
5. Planning des marchés 2026 confirmé, et dates des marchés de Noël 2026 ?
6. Vrais best-sellers, montants et durée de validité de la carte cadeau ?
7. Gestion du stock : un nombre de bouteilles par référence, ou seulement « disponible » ou « indisponible » ?
8. Photos des bouteilles : Guillaume peut-il les fournir ?
9. Le prix de 13,56 € (Domaine Colin, Vieilles Vignes Blanc) est-il correct ?
