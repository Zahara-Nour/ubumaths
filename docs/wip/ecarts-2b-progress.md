---
title: Écarts, lot 2b (V32, V27, V64) — journal
date: 2026-11-01
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-01, avant la PR._

- **État** : V32, V27, V64 corrigés et commités, doc mathAST à jour · **Prochaine action** : PR, revue `code-reviewer` (opus : intégration), merge · **En attente de David** : restes de V64 (voir § V64) · **Pièges en cours** : ne pas toucher `pedagogical-simplify/`, `simplify`, `tidy` (chantier `fusion-moteurs`) · **Worktree / branche** : `../ubumaths-wt-ecarts-2b` / `fix/ecarts-2b`

---

## Sonde de départ (2026-11-01, Atelier)

- V32 : la ligne de `.résoudre 3x=-\pi` était déjà juste (`-\dfrac{\pi}{3}`) ; la division et l'étape « Solution » écrivaient `-\dfrac{1}{3}\pi`. Le second degré était déjà juste.
- V27 : `.intégrer e^{2x}+1/x` → ligne `\dfrac{1}{2}e^{2x}+\ln|x|`, dernière étape `\dfrac{e^{2x}}{2}+\ln|x|`.
- V64 : `2/(x^2+a^2)`, `a/(x^2+a^2)`, `1/(x^2+a^4)`, `1/(x^2+a^2+1)` refusés ; `1/(x^2+2x+a^2)` refusé (honnête : signe de a²−1 inconnu) ; `(x+1)^a` de 0 à 1 refusé avec « donne-lui une valeur » ; `sqrt(a) x` de 0 à 1 rendu sans condition.

## V32

`stepsAsShown` réécrivait la borne finale des inéquations (`x < c`), pas la forme résolue des équations ; et le rendu de « Solution » lit `step.before`. Toute occurrence de la forme résolue finale passe maintenant par `exactValueToShow`. Test : `resoudre-etapes-5f4.test.ts` (rouge sans le correctif).

## V27

`lnCoefficientForm` (somme de ln, coefficient devant) généralisé en `coefficientFirstForm` (`pedagogical-integration/pipeline.ts`) : tout terme « rationnel × appel ou e^u » d'une somme rangée par `tidy` repasse coefficient devant, comme un terme seul ; les puissances (`x^3/3`, `(2x+1)^4/8`) gardent leur écriture de terme seul. Test : `primitive-ecriture.test.ts` (4 cas, rouges sans le correctif). La ligne du moteur écrit encore `\dfrac{1}{3}x^3` là où les étapes écrivent `\dfrac{x^3}{3}` : écart de l'autre moteur, hors périmètre (`fusion-moteurs`).

## V64

`isArctanPattern` (`integration/integrators/basic.ts`) : numérateur sans la variable (k), a² lu en `a^2`, `a^{2m}`, `n·a^{2m}` (n carré parfait), plusieurs termes constants. Calculés : `3/(x^2+a^2)`, `a/(x^2+a^2)` → arctan(x/a), `1/(x^2+a^4)`, `1/(x^2+4a^2)`, `-2/(a^2+x^2)`, `a/(x^2+1)` ; vérifiés F′ = f en nombres pour a ∈ {0,5 ; 2 ; −3} (`parametre-v61.test.ts`, 6 rouges sans le correctif).

Restes, à David :

- `1/(x^2+a^2+1)` : a = √(a²+1) juste, mais la ligne rationalise en `\dfrac{\arctan(\dfrac{x\sqrt{a^2+1}}{a^2+1})\sqrt{a^2+1}}{a^2+1}` → refus gardé.
- `1/(x^2+2x+a^2)`, `1/(x^2+b)` : signe inconnu, refus honnête (discussion selon le signe = futur chantier C de `limites-parametres`).
- `(x+1)^a` et `1/(x+1)^a` de 0 à 1 : l'atelier refuse « Le résultat dépend de a » ; `sqrt(a) x` / `ln(a) x` de 0 à 1 rendus sans « (a ⩾ 0) » / « (a > 0) » (les conditions de l'atelier ne lisent que les dénominateurs).
