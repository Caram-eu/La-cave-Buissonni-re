# Liste de vérification avant mise en ligne

À cocher dans l'ordre. Le mode d'emploi détaillé est dans [LISEZMOI.md](LISEZMOI.md).
Les mentions légales encore vides sont aussi listées en direct dans l'administration (tableau de bord et Réglages > « À compléter avant mise en ligne »).

## 1. Décisions à prendre

- [ ] Hébergement choisi : option A (Vercel + Neon) ou option B (serveur OVH).
- [ ] Gestion du domaine `lacavebuissonniere.fr` : qui y a accès (registraire, identifiants) ? Que devient l'ancien site ?
- [ ] Date de mise en ligne.

## 2. Comptes à créer

- [ ] Hébergement : Vercel (offre Pro) + Neon, ou VPS OVHcloud.
- [ ] Brevo (envoi des e-mails), avec le domaine `lacavebuissonniere.fr` authentifié (SPF, DKIM, DMARC).
- [ ] Adresse `contact@lacavebuissonniere.fr` créée chez le gestionnaire du domaine, pour recevoir les réponses des clients.
- [ ] Comptes clients de Guillaume et de Léo sur le site, puis accès administrateur donné (`npm run admin -- ajouter …`).
- [ ] Plus tard, pour le paiement en ligne : clés d'API SumUp.
- [ ] Après la mise en ligne : Google Search Console (envoyer `https://lacavebuissonniere.fr/sitemap.xml`) et fiche d'établissement Google.

## 3. Mentions légales à compléter (Administration > Réglages > Informations légales)

- [ ] SIRET, RCS et numéro de TVA **vérifiés sur le Kbis**, puis case « vérifiés » cochée.
- [ ] Numéro de la petite licence à emporter et commune de délivrance.
- [ ] Hébergeur : nom, adresse, téléphone (fournis par Vercel ou OVH).
- [ ] Médiateur de la consommation : nom, adresse, site. **L'adhésion à un médiateur est obligatoire** pour vendre aux particuliers : à souscrire si ce n'est pas fait.
- [ ] Durée de validité de la carte cadeau.
- [ ] Service d'envoi d'e-mails (ex. « Brevo (Sendinblue SAS), Paris ») et lieu de stockage des données (ex. « Union européenne, Francfort »).
- [ ] Encadré officiel sur la garantie légale de conformité, **copié tel quel depuis Légifrance** (Code de la consommation, article D. 211-2).
- [ ] Relecture des CGV, de la politique de confidentialité et des mentions légales par Guillaume ; idéalement par un juriste ou une chambre de commerce (le site ne remplace pas un conseil juridique).

## 4. Contenu à mettre à jour

- [ ] Marchés 2026 vérifiés (jours, lieux, horaires) et dates passées de 2025 effacées (Administration > Marchés).
- [ ] Marchés de Noël et dates exceptionnelles de l'année ajoutés.
- [ ] Nouvelle carte des vins importée (Administration > Produits > Importer).
- [ ] Vrais best-sellers et nouveautés indiqués (pastilles), produits indisponibles marqués.
- [ ] Photos des bouteilles ajoutées (facultatif : le dessin s'affiche sinon).
- [ ] Montants de la carte cadeau confirmés (Réglages > Règles de vente).
- [ ] Coordonnées et moyens de paiement vérifiés (Réglages).

## 5. Réglages techniques

- [ ] Toutes les variables de la partie 6 du LISEZMOI renseignées chez l'hébergeur, en particulier `SITE_URL`, `CRON_SECRET` (long et aléatoire) et `BREVO_API_KEY`.
- [ ] `MAIL_OUTBOX_DIR` **absent** en production (sinon les e-mails ne partent pas).
- [ ] Le domaine affiche le site en **HTTPS** (cadenas dans le navigateur), avec et sans `www`.
- [ ] `https://lacavebuissonniere.fr/api/sante` répond `{"ok":true}`.
- [ ] La tâche du soir est programmée (Vercel « Cron Jobs », ou `crontab -l` sur OVH) et répond (voir la date du dernier rappel envoyé).
- [ ] Les sauvegardes fonctionnent, et **une restauration a été testée** (LISEZMOI, partie 11).

## 6. Tests à passer

Automatiques (dans le dossier du projet, ou onglet « Actions » de GitHub) :

- [ ] `npm test` : tests unitaires et d'intégration, tous verts.
- [ ] `npm run build && npm run test:e2e` : parcours complets sur ordinateur et mobile, tous verts.

À la main, sur le site en ligne, avec un vrai téléphone :

- [ ] Créer un compte client (la case « 18 ans » est obligatoire).
- [ ] Commander pour un retrait au marché : e-mail de confirmation reçu par le client, alerte reçue par Guillaume avec le téléphone du client.
- [ ] Le soir de la veille du marché, le rappel arrive au client.
- [ ] Commander en livraison avec une adresse à moins de 100 km : acceptée ; avec une adresse lointaine (ex. Lyon) : refusée avec proposition de retrait ou d'expédition.
- [ ] Mot de passe oublié : l'e-mail arrive en boîte de réception (pas en indésirables) ; note mail-tester.com d'au moins 9/10.
- [ ] Demande de devis : l'alerte arrive à Guillaume.
- [ ] Administration sur téléphone : confirmer une commande, imprimer la fiche de préparation, rendre un produit indisponible, ajouter une photo prise au téléphone, créer une carte cadeau et l'utiliser sur une commande.
- [ ] Annuler la commande de test : le montant de la carte cadeau lui est rendu.
- [ ] Supprimer les comptes et commandes de test (ou les marquer annulées) avant d'annoncer le site.
- [ ] Lighthouse (Chrome > outils de développement > Lighthouse, mode mobile) sur l'accueil, « Nos vins » et une fiche produit : 90 ou plus partout, sauf le référencement de « Mon compte » et du panier, volontairement exclus des moteurs de recherche.
- [ ] Navigation au clavier seul (touche Tab) sur l'accueil, la carte des marchés et une commande ; essai avec le lecteur d'écran du téléphone (VoiceOver ou TalkBack).

## 7. Après la mise en ligne

- [ ] Annoncer le site (Facebook, stand, e-mail aux clients) et remplacer l'adresse du stand si besoin.
- [ ] Vérifier chaque semaine, dans l'administration, l'encadré « E-mails non partis » et les commandes nouvelles.
- [ ] Mettre à jour les marchés exceptionnels et la carte à chaque saison.
- [ ] Option B : mises à jour du serveur une fois par trimestre et copie des sauvegardes hors du serveur.
