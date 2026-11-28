# Chantier `idees-1re-variables-aleatoires`

## Reprendre ici

_Mis à jour le 2026-11-27 : chantier clos, journal archivé._

- **État** : clos ; #3203 et #3206 mergées et migrées, `505ee05a` publié, rubrique 1P2 « publiée »
  dans `idees-ailleurs-repartition.md`, aucun modèle réservé · **Prochaine action** : aucune ·
  **En attente de David** : rien · **Piège durable** : second tag 1TECHNO-095 non posé
  (`outils-manquants.md` n° 66) · **Worktree / branche** : aucun.

## Historique

- 2026-11-26 : rubrique prise (commit direct sur `main`). La rubrique n'a qu'un exercice (1P20-1, trois
  situations). 21 modèles publiés sur les points 1SPE-347 à 358, aucun brouillon ; aucun ne fait
  remplir la loi entière.

- 2026-11-26 : page à cocher publiée ; David : « je valide » (aucun verdict coché : lu comme un oui
  à F1 et à mes recommandations Q1, Q2). Modèle neuf `f1-loi-de-x-tableau-a-completer` : v0 cartes
  (32 ou 52), v1 loterie (prix déduit), v2 deux tirs ; grades 1_SPE + 1_TECHNO, tag 1SPE-355.
  Specs : une violation `reducedFractions` comptée **par case** non réduite ; message réécrit
  `P \left( X = 2 \right)`. Essai local : brouillon créé (id local retiré du fichier), aperçu
  vu (`pnpm voir`), sans erreur de console. PR #3203 mergée (CI verte).
- 2026-11-26 : David a créé le brouillon en prod (`505ee05a`, vérifié par MCP : brouillon, sans
  nœud). L'id, écrit dans le dépôt principal, a été déplacé sur la branche de rangement.
- 2026-11-26 : migration de rangement générée (relevé en prod : `505ee05a` rangé sous « Probabilités >
  Variables aléatoires > loi d'une variable aléatoire », 1SPE-355). `migrations-rangement-tags`
  vert (145) ; rouge avec un corps vide (3 échecs d'assertion : nœud absent, gardes muettes).
- 2026-11-26 : `security-auditor` sans finding bloquant ; #3206 mergée (CI verte). `db:migrate` non
  lancé : une migration d'une autre session (`20261126200955`) partirait avec.

- 2026-11-26 : migration `20261126205931` jouée en prod (avec `20261126200955` de la session Tle
  techno) ; `migration list --linked` sans écart ; nœud et tag vérifiés par MCP.
- 2026-11-27 : relecture validée par David ; il a lancé `publier-lot.ts --publier` ; `505ee05a`
  `published` en prod (vérifié par MCP).
- 2026-11-27 : chantier clos sur le go de David ; journal, fiche et relevé archivés.
