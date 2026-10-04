---
title: Atelier — `/grapheur` passe par l'atelier, progression
date: 2026-10-04
phase0: docs/wip/atelier-grapheur-phase0.md (validée le 2026-10-04)
---

# `/grapheur` passe par l'atelier — progression

## Lot 1 — les réglages d'affichage appartiennent à l'objet

Branche `feat/atelier-reglages-affichage`, worktree `../ubumaths-wt-reglages`.

- [x] Tests rouges : `src/lib/atelier/__tests__/reglages-affichage.test.ts`
      — 23 rouges sur le comportement (`setDisplay` absent, aucun réglage) ;
      3 verts, tous des garde-fous de limite (fonction jamais tracée sans
      réglages, rien de rangé pour rien, jamais de case f′).
- [x] Implémentation — 26/26 ; suites atelier + grapheur + stores : 1 347
      serveur, 308 navigateur ; `check:incremental` 0 erreur ; `lint:fast` propre.
  - `display.ts` : `curveDisplaySchema` (une seule règle pour la carte, la
    sauvegarde et le lien), `newDisplay` (couple couleur/style libre, règle
    `getNextSlot` du grapheur), `readDisplayPatch`, `plainDisplay` (copie sans
    proxy, pour `structuredClone`).
  - `FunctionObject.display?` ; `setPlotted` l'attribue au premier tracé ;
    `update` le conserve ; `setDisplay` le modifie ; `adoptDisplay` le pose à
    la relecture (`restore`, `mergeInto`) AVANT le tracé.
  - Sauvegarde/lien : champ optionnel, version inchangée ; `.catch(undefined)`
    — un réglage abîmé est oublié, l'objet gardé.
  - `syncPlots` recopie les réglages en n'écrivant que ce qui diffère ;
    `showDerivative` toujours ramené à `false` (Q1).
  - Preuves rouges par neutralisation (copie de sauvegarde, pas de
    `git checkout`) : sans `.catch` → « réglage illisible » rougit ; diff
    forcé → « n'écrit rien » rougit.
- [ ] Revue, PR, CI, merge.

## Lots suivants

2 carte modifiable · 3 Dériver → `f′` · 4 curseurs · 5 suites · 6 bascule.
