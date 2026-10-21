# Mathoux animés — journal

> Branche `feat/mathoux-anim`, worktree `../ubumaths-wt-mathoux-anim`. Démarré le 2026-10-21.
> Même idée que les Palotins animés (`palotins-svg-progress.md`), mais en CSS dans `MathouAvatar.svelte`
> (SVG inline : pas de fichier à générer, « réduire les animations » respecté par `@media`).
> Démo : https://claude.ai/artifact/2FLaS3M52bNHzZtxkoKJK1

## Reprendre ici

_Mis à jour le 2026-10-21, morphing de croissance._

- **État** : `MathouAvatar.svelte` animé au repos ; naissance (apparition lente + auréole + ondes +
  confettis + étoiles, **validée**) ; croissance = **morphing** (`growFrom`, `blendStages`,
  1,4 s) avec bond simultané et confettis (pas d’auréole ni d’étoiles), attributs du grand matou en fondu à la fin (à juger). Démo à jour.
  **Rien n'est encore branché** (Chatterie, annonce).
- **Décidé par David** : Chatterie animée comme la démo (tous, décalés) ; gestes communs ; rythmes
  au cas par cas avec lui ; auréole de naissance gardée.
- **Prochaine action** : avis sur le morphing, puis phase 0 (naissance / croissance / étoile sur la
  carte d'annonce ; pas de réveil visible) à faire valider, puis branchement + tests.
- **Pièges en cours** : démo = vrai composant monté (`node_modules/.cache/mathoux-demo/build-client.mjs`
  → `bundle.js`, puis `page2.py` du scratchpad) ; `smoke.mjs` / `frames.mjs` = vérif Playwright.
  `StageTemplate.young` devenu `youth` (0..1).
- **Worktree / branche** : `../ubumaths-wt-mathoux-anim` · `feat/mathoux-anim`.

## Au repos (proposé)

Chaton vif (souffle 2,8 s, clignement 4,2 s, queue 1,6 s, oreille 3,5 s) ; matou (3,6 s, 6 s, 4 s,
7 s) ; grand matou lent (5 s, clignement à demi 9 s, gloire 60 s, oreille immobile) ; sieste
(souffle ample 5,5 s, « Zzz » qui montent, queue immobile) ; silhouette immobile. Décalage par race
(`--mathou-phase`).

## Réactions (proposé)

`apparition` (naissance), `bond` (il grandit), `etirement` (réveil), rejouées par `{#key reactionKey}`.
