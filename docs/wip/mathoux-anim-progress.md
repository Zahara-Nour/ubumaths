# Mathoux animés — journal

> Branche `feat/mathoux-anim`, worktree `../ubumaths-wt-mathoux-anim`. Démarré le 2026-10-21.
> Même idée que les Palotins animés (`palotins-svg-progress.md`), mais en CSS dans `MathouAvatar.svelte`
> (SVG inline : pas de fichier à générer, « réduire les animations » respecté par `@media`).
> Démo : https://claude.ai/artifact/2FLaS3M52bNHzZtxkoKJK1

## Reprendre ici

_Mis à jour le 2026-10-21, après #1582._

- **État** : #1582 mergée (animations + migration) ; `db:migrate` fait, colonne `asleep` vérifiée
  en prod (table vide). Vérification manuelle notée.
- **Prochaine action** : **PR 2** (branche `feat/mathoux-reveil`, worktree
  `../ubumaths-wt-mathoux-reveil`) : `db:types`, écrire `asleep` (`memoryUpdates`,
  `rememberMathoux`, fusion au conflit), nouveauté `wake` (« X s'est réveillé ! », réaction
  `reveil`, entre croissance et étoile), pas de réveil pour un Mathou « de la seule mémoire »,
  `asleep` dans l'export RGPD (même PR).
- **En attente de David** : rien.
- **Pièges en cours** : la démo (`node_modules/.cache/mathoux-demo/`) partait du worktree supprimé.
- **Worktree / branche** : `../ubumaths-wt-mathoux-reveil` · `feat/mathoux-reveil`.

## Au repos (proposé)

Chaton vif (souffle 2,8 s, clignement 4,2 s, queue 1,6 s, oreille 3,5 s) ; matou (3,6 s, 6 s, 4 s,
7 s) ; grand matou lent (5 s, clignement à demi 9 s, gloire 60 s, oreille immobile) ; sieste
(souffle ample 5,5 s, « Zzz » qui montent, queue immobile) ; silhouette immobile. Décalage par race
(`--mathou-phase`).

## Réactions (proposé)

`apparition` (naissance), `bond` (il grandit), `etirement` (réveil), rejouées par `{#key reactionKey}`.
