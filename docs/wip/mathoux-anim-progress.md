# Mathoux animés — journal

> Branche `feat/mathoux-anim`, worktree `../ubumaths-wt-mathoux-anim`. Démarré le 2026-10-21.
> Même idée que les Palotins animés (`palotins-svg-progress.md`), mais en CSS dans `MathouAvatar.svelte`
> (SVG inline : pas de fichier à générer, « réduire les animations » respecté par `@media`).
> Démo : https://claude.ai/artifact/2FLaS3M52bNHzZtxkoKJK1

## Reprendre ici

_Mis à jour le 2026-10-21, démo publiée._

- **État** : animations au repos et réactions écrites dans `MathouAvatar.svelte` (props `animated`,
  `reaction`, `reactionKey`) ; démo publiée ; **rien n'est encore branché** (Chatterie, annonce).
- **Prochaine action** : retour de David sur la démo, puis phase 0 (comportements) et branchement.
- **En attente de David** : (1) combien de Mathoux animés à la fois sur la Chatterie (tous,
  décalés, ou au survol) ; (2) gestes propres à chaque race, ou communs seulement ; (3) où animer.
- **Pièges en cours** : démo générée par `node_modules/.cache/mathoux-demo/` (build.mjs compile le
  composant en SSR, render.ts sort les SVG) puis `page.py` du scratchpad ; `$props.id()` rend
  `s1-` à chaque rendu SSR isolé → ids réécrits dans la page.
- **Worktree / branche** : `../ubumaths-wt-mathoux-anim` · `feat/mathoux-anim`.

## Au repos (proposé)

Chaton vif (souffle 2,8 s, clignement 4,2 s, queue 1,6 s, oreille 3,5 s) ; matou (3,6 s, 6 s, 4 s,
7 s) ; grand matou lent (5 s, clignement à demi 9 s, gloire 60 s, oreille immobile) ; sieste
(souffle ample 5,5 s, « Zzz » qui montent, queue immobile) ; silhouette immobile. Décalage par race
(`--mathou-phase`).

## Réactions (proposé)

`apparition` (naissance), `bond` (il grandit), `etirement` (réveil), rejouées par `{#key reactionKey}`.
