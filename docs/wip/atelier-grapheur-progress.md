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
- [x] Revue `code-reviewer` : rien de bloquant ; corrigé, tests d'abord (rouges vus) :
  - F1 une clé `undefined` (zod 4 la garde) effaçait le réglage et faisait
    jeter `serialize()` → écartée dans `readDisplayPatch` ;
  - F2 bornes ±1e9 partagées avec le grapheur (`COORDINATE_LIMIT`) ;
  - F3 `setDisplay` ne relance plus `recomputeAll` (seulement `revision++`) ;
  - F4 un nom qui pointait vers un nuage est retracé en courbe ;
  - F5 `settingsDiff` recopie sans proxy ; F9 patch vide = rien ;
  - F7 mesuré : sans compression, 8 fonctions aux réglages complets = 2 332
    caractères de lien (plafond 1 800) → rangement compact (couleur, style,
    écarts au défaut) : 1 351.
  - F6 **accepté, noté** : une fonction reçue par lien garde sa couleur même
    si une courbe de l'atelier l'a déjà ; les fonctions retirées gardent la
    leur et comptent dans le choix de la suivante. À revoir si ça gêne à
    l'usage.
- [x] PR #779, CI verte (un job relancé : port Postgres occupé sur le runner), mergée.

## Lot 2a — la carte modifiable

Branche `feat/atelier-carte-modifiable`, worktree `../ubumaths-wt-carte`.
Le lot 2 est coupé en deux PR (contenu inchangé) : 2a = champ + carte fermée,
2b = « Sur le graphique ».

### Mesure préalable — ce que MathLive écrit (Chromium, frappe réelle)

| Tapé       | MathLive rend                                         |
| ---------- | ----------------------------------------------------- |
| `f'(x)+1`  | `f^{\prime}\left(x\right)+1`                          |
| `x^2-3x+1` | `x^2-3x+1` (sort seul de l'exposant après un chiffre) |
| `sin(x)`   | `\sin\left(x\right)`                                  |
| `a*x`      | `a\cdot x`                                            |
| `1/2x`     | `\frac{1}{2x}` ⚠️ = 1/(2x)                            |

- [x] `f^{\prime}` était **refusé** par le parseur LaTeX → accepté
      (`^{\prime}`, `^{\prime\prime}`, `^\prime`), tests au niveau du
      parseur, preuve rouge (5 rouges avec l'ancien parseur).
- [x] En LaTeX, l'atelier ne transmettait pas ses noms de fonctions :
      `k(x)` tapé dans la carte se lisait k·x → corrigé (`parse.ts`).
- Suites mathAST + atelier + grapheur + questions : 21 145 verts.

## Lots suivants

2 carte modifiable · 3 Dériver → `f′` · 4 curseurs · 5 suites · 6 bascule.
