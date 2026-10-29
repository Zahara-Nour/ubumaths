# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-10-29, PR 3 (#1990) en CI._

- **État** : #1979 et #1980 mergées ; migration `slug` en prod. #1990 (pages `/glossaire/<slug>`, liens, sitemap) : revue `code-reviewer` sans bloquant (boucle de 308 hypothétique corrigée : un seul saut, `redirectTargetOf`), CI en cours.
- **Prochaine action** : CI verte → merger #1990 → mettre à jour ce bloc → `git worktree remove` + `git branch -d`. Ensuite, le chantier seo continue selon David (Search Console, titres des outils…).
- **En attente de David** : `deploy:prod` quand il veut (robots.txt + pages du glossaire) ; avis sur les 2 écarts à la phase 0 (6 renvois à définition gardent leur page ; page d'un terme sans filtre de niveau) ; `default` en base pour `slug` (évite `slug: ''`), oui ou non.
- **Pièges en cours** : un nouveau fichier lu par l'intégration doit entrer dans `paths` de `nightly-integration.yml` (`pnpm check:integration-paths`). Données structurées toujours reportées.
- **Worktree / branche** : `../ubumaths-wt-seo` · `feat/glossaire-pages` ; serveur de test sur 5176.

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
