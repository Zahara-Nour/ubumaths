# Mathoux animés — journal

> Branche `feat/mathoux-anim`, worktree `../ubumaths-wt-mathoux-anim`. Démarré le 2026-10-21.
> Même idée que les Palotins animés (`palotins-svg-progress.md`), mais en CSS dans `MathouAvatar.svelte`
> (SVG inline : pas de fichier à générer, « réduire les animations » respecté par `@media`).
> Démo : https://claude.ai/artifact/2FLaS3M52bNHzZtxkoKJK1

## Reprendre ici

_Mis à jour le 2026-10-21, naissance retravaillée._

- **État** : animations au repos et réactions dans `MathouAvatar.svelte` ; naissance = apparition
  lente (1,5 s) + confettis + étoiles (« très bien », David) + auréole qui s'allume et deux ondes
  (à juger). Démo à jour ; **rien n'est encore branché** (Chatterie, annonce).
- **Décidé par David** : Chatterie animée comme la démo (tous, décalés) ; gestes communs à toutes
  les races pour l'instant ; rythmes revus au cas par cas avec lui.
- **Prochaine action** : avis sur l'auréole, puis phase 0 (proposée en séance : naissance /
  croissance / étoile → réaction sur la carte d'annonce ; pas de réveil visible) à faire valider.
- **Pièges en cours** : démo générée par `node_modules/.cache/mathoux-demo/` (build.mjs, render.ts)
  puis `page.py` du scratchpad ; ids `s1-` de `$props.id()` réécrits dans la page.
- **Worktree / branche** : `../ubumaths-wt-mathoux-anim` · `feat/mathoux-anim`.

## Au repos (proposé)

Chaton vif (souffle 2,8 s, clignement 4,2 s, queue 1,6 s, oreille 3,5 s) ; matou (3,6 s, 6 s, 4 s,
7 s) ; grand matou lent (5 s, clignement à demi 9 s, gloire 60 s, oreille immobile) ; sieste
(souffle ample 5,5 s, « Zzz » qui montent, queue immobile) ; silhouette immobile. Décalage par race
(`--mathou-phase`).

## Réactions (proposé)

`apparition` (naissance), `bond` (il grandit), `etirement` (réveil), rejouées par `{#key reactionKey}`.
