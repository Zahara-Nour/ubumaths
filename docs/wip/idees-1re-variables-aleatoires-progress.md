# Chantier `idees-1re-variables-aleatoires`

## Reprendre ici

_Mis à jour le 2026-11-26, migration de rangement prête (PR à ouvrir)._

- **État** : brouillon `505ee05a` en prod, sans nœud ni tag. Migration
  `20261126205931_…_rangement_tags.sql` (1SPE-355) générée, intégration verte, rouge vérifiée.
- **Prochaine action** : PR, merge, `db:migrate` depuis `main` (`migration list --linked` d'abord),
  puis vérification en prod (MCP) et relecture dans `/dev/modeles` avant publication.
- **En attente de David** : rien.
- **Pièges en cours** : second tag 1TECHNO-095 non posé par `migration-rangement.ts`
  (`outils-manquants.md` n° 66) ; la saisie scriptée des cases d'un tableau dans l'aperçu
  n'active pas « Valider » (jugement vérifié par les specs seulement).
- **Worktree / branche** : `../ubumaths-wt-idees-1re-variables-aleatoires-rangement`,
  `docs/idees-1re-variables-aleatoires-rangement`.

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
