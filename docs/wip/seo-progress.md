# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-10-30, après la mise en prod v0.57.1._

- **État** : #1979 (`robots.txt`), #1980 (colonne `slug`), #1990 (pages `/glossaire/<slug>`) EN PROD (v0.57.1), vérifié le 2026-10-30 : page 200 + titre + canonique, `/glossaire/multiplier` → `/glossaire/multiplication`, 631 pages dans `sitemap.xml`, robots IA exclus.
- **Décisions du 2026-10-30** (David suit mes recos) : les 6 renvois à définition gardent leur page ; page d'un terme sans filtre de niveau ; pas de `default` en base pour `slug` (à glisser dans une future migration du dictionnaire).
- **Prochaine action** : David resoumet `sitemap.xml` dans Search Console. Dans 2-3 semaines : analyser un export Search Console (pages indexées, requêtes, impressions sans clic). Puis titres/descriptions des outils et pages d'exercices. Données structurées : reportées, seulement sur demande.
- **En attente de David** : l'export (ou un accès en lecture) Search Console.
- **Pièges en cours** : un nouveau fichier lu par l'intégration doit entrer dans `paths` de `nightly-integration.yml` (`pnpm check:integration-paths`).
- **Worktree / branche** : aucun (retirés après #1990) ; recréer `../ubumaths-wt-seo` pour la suite.

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
