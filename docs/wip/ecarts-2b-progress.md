---
title: Écarts, lot 2b (V32, V27, V64) — journal
date: 2026-11-01
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-01, à l'ouverture._

- **État** : V32 corrigé (étapes du 1er degré écrites comme la réponse, `shown-steps.ts`) · **Prochaine action** : V27 (coefficient dans une somme, intégration pédagogique), puis V64 (règle arctan à coefficient) · **En attente de David** : rien · **Pièges en cours** : ne pas toucher `pedagogical-simplify/`, `simplify`, `tidy` (chantier `fusion-moteurs`) · **Worktree / branche** : `../ubumaths-wt-ecarts-2b` / `fix/ecarts-2b`

---

## Sonde de départ (2026-11-01, Atelier)

- V32 : la ligne de `.résoudre 3x=-\pi` était déjà juste (`-\dfrac{\pi}{3}`) ; la division et l'étape « Solution » écrivaient `-\dfrac{1}{3}\pi`. Le second degré était déjà juste.
- V27 : `.intégrer e^{2x}+1/x` → ligne `\dfrac{1}{2}e^{2x}+\ln|x|`, dernière étape `\dfrac{e^{2x}}{2}+\ln|x|`.
- V64 : `2/(x^2+a^2)`, `a/(x^2+a^2)`, `1/(x^2+a^4)`, `1/(x^2+a^2+1)` refusés ; `1/(x^2+2x+a^2)` refusé (honnête : signe de a²−1 inconnu) ; `(x+1)^a` de 0 à 1 refusé avec « donne-lui une valeur » ; `sqrt(a) x` de 0 à 1 rendu sans condition.

## V32

`stepsAsShown` réécrivait la borne finale des inéquations (`x < c`), pas la forme résolue des équations ; et le rendu de « Solution » lit `step.before`. Toute occurrence de la forme résolue finale passe maintenant par `exactValueToShow`. Test : `resoudre-etapes-5f4.test.ts` (rouge sans le correctif).
