# Garde-fous git — journal

## Reprendre ici

_Mis à jour le 2026-10-22, après #1605._

- **État** : CLOS. #1605 mergée (4 garde-fous + message du pre-push) ; `git-workflow.md` réécrit
  (tableau « qui applique quoi », `couvre:`), `CLAUDE.md` corrigé ; journal archivé.
- **Prochaine action** : aucune.
- **En attente de David** : rien.
- **Piège resté ouvert** : le hook refuse `git -C ""` même dans un heredoc ou un texte entre
  guillemets (le test est fait avant leur retrait) — passer par un fichier de script.
- **Worktree / branche** : retirés.

## Choix de David (2026-10-22)

1. Garde-fous ajoutés : suppression de branche chaînée à `gh pr merge` (#1601), `pull --rebase`
   d'une autre branche sur une branche déjà poussée (#1603), `2>/dev/null` sur `git add`.
   Pas de règle commitlint « aucune mention Claude » ; pas de `git push --delete` dans `ask`.
2. `git commit --no-verify` / `-n` refusé.
3. Exception squash de git-workflow § 6 supprimée.
4. `CLAUDE.md` : `pnpm format <ses fichiers>` à la place du glob.

## Analyse de git-workflow.md (contradictions à corriger dans le commit doc)

- C1 en-tête « Claude prend en charge… → déploiement » ; C2 § 3 étape 1 crée la branche dans le
  dépôt principal (→ worktree) ; C3 squash ; C4 revue ≠ CLAUDE.md § Planning 4 ; C5 `--no-verify`
  « plus nécessaire » ; C6 glob prettier dans CLAUDE.md.
- H3 liste du hook recopiée → tableau « règle → qui l'applique » ; H4 pre-push non décrit ;
  H5 avertissement prettier périmé (lint-staged + pre-push) ; H6 raison de « pas d'amend » fausse.
- Doublons : § 10 entier, § 5 (→ base-de-donnees.md), § 4 (→ CLAUDE.md), `pull --rebase` ×3.
- Structure : deux séries « règle 1-4 », incidents avant les règles, § 9 → § 9, `docs/<slug>`,
  date périmée, pas de `couvre:`.
