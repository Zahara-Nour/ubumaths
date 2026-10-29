# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-10-29, PR 3 ouverte._

- **État** : #1979 et #1980 mergées ; migration `slug` appliquée en prod par David (675 adresses, 0 doublon, aucune fausse version). PR 3 (`feat/glossaire-pages`) : pages `/glossaire/<slug>`, liens dans `/glossaire`, sitemap.
- **Prochaine action** : revue `code-reviewer` + CI verte → merger PR 3. Rien en prod tant que David ne lance pas `deploy:prod`.
- **En attente de David** : `deploy:prod` quand il veut (robots.txt + pages du glossaire).
- **Pièges en cours** : les types générés exigent `slug` à l'insertion → `slug: ''` (écrasé par le trigger) dans `admin.ts` et les tests ; un `default` en base l'éviterait (migration à proposer). Données structurées toujours reportées.
- **Worktree / branche** : `../ubumaths-wt-seo` · `feat/glossaire-pages`.

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
