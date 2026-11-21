# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-11-21, après l'analyse des exports Search Console._

- **État** : #1979, #1980, #1990 en prod depuis le 2026-10-30. Search Console au 2026-11-16 : 657 pages indexées sur 703, 46 non indexées (27 détectées, 2 explorées, 17 « noindex »). Sur 28 jours : 4 452 affichages, 5 clics, 99 % sur le glossaire.
- **Les 17 « noindex »** (15 termes, 2 articles du Shtam) : saines aujourd'hui (706 adresses du sitemap chargées en prod, aucune en noindex). Cause non trouvée. David a lancé « Valider la correction » le 2026-11-21.
- **Décisions du 2026-11-21** (David suit mes recos) : faire passer chiph.re devant GitHub sur la recherche du nom du site ; titre du README sans le nom du site (fait). Dépôt gardé public.
- **Prochaine action** : PR de la page d'accueil (nom du site visible) et des titres du glossaire, une fois les deux questions ci-dessous tranchées. Puis titres et descriptions des outils et des pages d'exercices. Nouvel export Search Console vers le 2026-12-20.
- **En attente de David** : (1) où écrire le nom du site sur la page d'accueil ; (2) ajouter « maths » aux titres du glossaire, oui ou non ; (3) rediriger l'ancienne adresse Vercel vers chiph.re (tableau de bord Vercel) ; (4) le résultat de la validation Search Console.
- **Pièges en cours** : un nouveau fichier lu par l'intégration doit entrer dans `paths` de `nightly-integration.yml` (`pnpm check:integration-paths`). L'accueil porte déjà ses données structurées (WebSite + Organization) : ne pas les annoncer manquantes.
- **Worktree / branche** : aucun ; recréer `../ubumaths-wt-seo` pour la PR.

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
