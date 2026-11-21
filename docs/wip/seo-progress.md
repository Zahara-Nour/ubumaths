# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-11-21, après #2971._

- **État** : #2971 mergée, PAS encore en prod (attend un `deploy:prod`) : grand titre de l'accueil « Chiphre, les maths de la chandelle verte », titre d'onglet du glossaire « terme : définition (maths) | Chiphre ». Titre du README sans le nom du site. Search Console au 2026-11-16 : 657 pages indexées sur 703 ; sur 28 jours, 4 452 affichages, 5 clics, 99 % sur le glossaire.
- **Les 17 « noindex »** (15 termes, 2 articles du Shtam) : saines aujourd'hui, cause non trouvée. David a lancé « Valider la correction » le 2026-11-21.
- **Décisions du 2026-11-21** (réponses de David) : chiph.re doit passer devant GitHub sur la recherche du nom du site ; dépôt gardé public ; libellé du titre de l'accueil ; « maths » dans les titres du glossaire.
- **Prochaine action** : après la mise en prod, vérifier les deux titres sur chiph.re. Puis titres et descriptions des outils et des pages d'exercices. Nouvel export Search Console vers le 2026-12-20. Étoffer les 68 pages déjà en 1re ou 2e page : proposé, sans réponse de David (contenu pédagogique).
- **En attente de David** : (1) le résultat de la validation Search Console ; (2) la mise en prod.
- **Pièges en cours** : un nouveau fichier lu par l'intégration doit entrer dans `paths` de `nightly-integration.yml` (`pnpm check:integration-paths`). L'accueil porte déjà ses données structurées (WebSite + Organization) : ne pas les annoncer manquantes.
- **Worktree / branche** : aucun (retirés après #2971) ; recréer `../ubumaths-wt-seo` pour la suite.

## Plan (validé par David le 2026-10-29 : « on commence avec tes recos »)

1. `robots.txt` : bloquer les robots d'entraînement (GPTBot, ClaudeBot, CCBot, Google-Extended…),
   garder ceux de recherche et de réponse. Pas de `llms.txt` (aucun effet sur Google).
2. Glossaire en une page par terme (`/glossaire/<terme>`), pour que chaque définition soit une
   page d'arrivée sur Google. Phase 0 validée le 2026-10-29 :
   - page par terme principal : titre « X : définition », toutes les définitions avec leur niveau,
     exemples, histoire, synonymes, « Voir aussi » ;
   - homonymes : adresse avec le sens (`base-puissance`) ; forme dérivée → redirection vers son
     terme principal ; terme masqué ou inconnu → 404, absent du sitemap ;
   - **A1** : adresse enregistrée en base (colonne `slug`), figée au renommage ;
   - **B1** : plus de fenêtre dans `/glossaire`, un clic ouvre la page (`BackLink` vers le glossaire).
     PR 2 = migration seule (`db:types` lit la prod), PR 3 = le code.

## Historique

- 2026-10-29 : worktree ouvert, PR 1 écrite. Prod : 625 termes principaux visibles, 0 collision d'adresse.
- 2026-10-29 : #1979 mergée (test de la visite corrigé : il lisait tous les groupes de `robots.txt`).
- 2026-10-29 : #1980 mergée, migration appliquée en prod par David (`db push --include-all`, le mode auto le refuse). `security-auditor` : 0 bloquant, 2 mineurs appliqués (collision avec entrée masquée testée, `dictionary_slugify` retirée à anon). Test rouge sans la migration, 7/7 vert avec.
- 2026-10-29 : PR 3. Écarts à la phase 0 : les 6 renvois qui ont leur propre définition (« Thalès ») gardent leur page au lieu d'être redirigés (44 renvois nus redirigés) ; la page d'un terme montre tous les niveaux et ne suit plus le filtre de niveau de la liste.
- 2026-10-29 : #1990 mergée (revue : boucle de 308 hypothétique corrigée ; filtre `paths` de l'intégration complété).
- 2026-11-21 : exports Search Console analysés. Sortent en première page les expressions précises (« strictement positif », « compris entre », « tirage sans remise », « distance à zéro ») ; les mots courants (« calcul », « triangle », « médiatrice ») sont au-delà de la 5e page. 68 pages en 1re ou 2e page. Place moyenne : de 57 début novembre à 36 le 19.
- 2026-11-21 : sur la recherche du nom du site, les pages du dépôt GitHub passent devant. Fiche du dépôt : champ « site web » sur l'ancienne adresse Vercel, qui sert encore une copie du site (canonique vers chiph.re). Titre du README changé.
- 2026-11-21 : #2971 mergée (titre de l'accueil, titres d'onglet du glossaire). Rendu du titre vérifié à 320, 360, 390 et 1280 px : deux lignes au plus, sans défilement.
- 2026-11-21 : ancienne adresse Vercel redirigée vers chiph.re par David (308, vérifié sur l'accueil et sur une page du glossaire).
