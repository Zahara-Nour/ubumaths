# Chantier `idees-1re-variables-aleatoires`

## Reprendre ici

_Mis à jour le 2026-11-26, après #3203 et la création du brouillon en prod._

- **État** : modèle neuf en prod en brouillon, id `505ee05a-b19a-4cd3-a409-509d51cf9fbd` (sans
  nœud ni tag). Id commité et poussé sur la branche `docs/idees-1re-variables-aleatoires-rangement`.
- **Prochaine action** : dans ce worktree, `pnpm install --prefer-offline` + `.env`/`.env.local`,
  puis `pnpm tsx scripts/questions/migration-rangement.ts --dir
scripts/questions/idees-1re-variables-aleatoires-neufs`, tests d'intégration, `security-auditor`,
  PR, merge, `db:migrate` (4 conditions ; `migration list --linked` d'abord).
- **En attente de David** : rien.
- **Pièges en cours** : second tag 1TECHNO-095 non posé par `migration-rangement.ts`
  (`outils-manquants.md` n° 66) ; la saisie scriptée des cases d'un tableau dans l'aperçu
  n'active pas « Valider » (jugement vérifié par les specs seulement).
- **Worktree / branche** : `../ubumaths-wt-idees-1re-variables-aleatoires-rangement`,
  `docs/idees-1re-variables-aleatoires-rangement` (sans `.env` ni `node_modules` pour l'instant).

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
