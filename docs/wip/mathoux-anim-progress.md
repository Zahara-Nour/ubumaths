# Mathoux animés — journal

> Branche `feat/mathoux-anim`, worktree `../ubumaths-wt-mathoux-anim`. Démarré le 2026-10-21.
> Même idée que les Palotins animés (`palotins-svg-progress.md`), mais en CSS dans `MathouAvatar.svelte`
> (SVG inline : pas de fichier à générer, « réduire les animations » respecté par `@media`).
> Démo : https://claude.ai/artifact/2FLaS3M52bNHzZtxkoKJK1

## Reprendre ici

_Mis à jour le 2026-10-21, PR 1 prête (revues faites)._

- **État** : PR 1 = animations (repos, naissance, croissance en morphing, étoile, réveil) branchées
  sur la Chatterie, la vue prof et l'annonce (`previousStage`), + migration `20261021200000`
  (`student_mathoux.asleep`, additive, appliquée en local). Revues : `code-reviewer` (important
  corrigé : rendu du morphing testé) et `security-auditor` : **aucun bloquant**.
- **Prochaine action** : PR 1 → CI verte → merge → `db:migrate` (4 conditions réunies) →
  `db:types` → **PR 2** : écrire `asleep` (`memoryUpdates`, `rememberMathoux`), nouveauté `wake`
  (« X s'est réveillé ! », réaction `reveil`), `asleep` dans l'export RGPD (MÊME PR que l'écriture).
- **En attente de David** : rien (question d'accès tranchée le 2026-10-21 : personne ne lit rien
  de neuf ; découpage PR 1 animations + migration, PR 2 réveil).
- **Pièges en cours** : démo = vrai composant (`node_modules/.cache/mathoux-demo/`, `page2.py` du
  scratchpad). Lignes existantes `asleep = false` : pas de faux réveil au déploiement.
- **Worktree / branche** : `../ubumaths-wt-mathoux-anim` · `feat/mathoux-anim`.

## Au repos (proposé)

Chaton vif (souffle 2,8 s, clignement 4,2 s, queue 1,6 s, oreille 3,5 s) ; matou (3,6 s, 6 s, 4 s,
7 s) ; grand matou lent (5 s, clignement à demi 9 s, gloire 60 s, oreille immobile) ; sieste
(souffle ample 5,5 s, « Zzz » qui montent, queue immobile) ; silhouette immobile. Décalage par race
(`--mathou-phase`).

## Réactions (proposé)

`apparition` (naissance), `bond` (il grandit), `etirement` (réveil), rejouées par `{#key reactionKey}`.
