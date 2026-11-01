---
title: Écarts, lot 3 — conditions de √ et ln à paramètre dans l'Atelier — journal
date: 2026-11-01
status: phase 0 en attente de David
---

## Reprendre ici

_Mis à jour le 2026-11-01, phase 0 soumise._

- **État** : phase 0 écrite (comportements + 4 questions Q1-Q4), rien codé · **Prochaine action** : réponses de David, puis tests rouges (`src/lib/atelier/__tests__/`), puis `introducedConditions` (`src/lib/atelier/calcul.ts`) · **En attente de David** : Q1-Q4 ci-dessous · **Pièges en cours** : ne pas toucher `pedagogical-simplify/`, `simplify`, `tidy` (`fusion-moteurs`) ; sonde non suivie `src/lib/atelier/__tests__/sonde-conditions.test.ts`, à transformer en vrai test · **Worktree / branche** : `ubumaths-wt-ecarts-conditions` / `fix/ecarts-conditions`

---

## Origine

Lot 2b (#2097), décision de David : `sqrt(a) x` et `ln(a) x` de 0 à 1 rendus sans « (a ⩾ 0) » / « (a > 0) » → à corriger. Les conditions de l'Atelier (`introducedConditions`) ne lisent que les dénominateurs.

## Mesure sur main (af4425219)

| Saisie                                               | Aujourd'hui                        |
| ---------------------------------------------------- | ---------------------------------- |
| `.intégrer \sqrt{a} x de 0 à 1`                      | ½√a — sans condition               |
| `.intégrer \ln(a) x de 0 à 1`                        | ½ ln a — sans condition            |
| `.intégrer \sqrt{a-1} x de 0 à 1`                    | ½√(a−1)                            |
| `.intégrer \ln(a+2) x de 0 à 1`                      | ½ ln(a+2)                          |
| `.intégrer \ln(a^2) x de 0 à 1`                      | ln\|a\| — sans « a ≠ 0 »           |
| `.intégrer \sqrt{a}\ln(a) x de 0 à 1`                | ½√a ln a                           |
| `.intégrer \sqrt{a^2+1} x de 0 à 1`                  | ½√(a²+1) (juste : toujours défini) |
| `.intégrer \sqrt[3]{a} x de 0 à 1`                   | ½∛a (juste : toujours défini)      |
| `.intégrer \sqrt{a} x` (primitive)                   | ½√a x² + C — √a déjà sur la ligne  |
| `.intégrer e^{\sqrt{a} x}`                           | √a e^{√a x}/a + C (a ≠ 0)          |
| `.dériver \sqrt{a} x`                                | √a — √a déjà sur la ligne          |
| `.intégrer \sqrt{a x} de 0 à 1`, `\ln(a x) de 1 à 2` | refus « dépend de a » (inchangé)   |

## Phase 0 — comportements voulus

Règle (celle de V61, étendue) : une intégrale **bornée** dit toutes les conditions de son intégrande, qui n'est plus sur la ligne ; une primitive ou une dérivée ne redit pas une condition déjà visible dans la saisie, mais dit celles que le **résultat** introduit.

- **Nominal** :
  - `\sqrt{a} x de 0 à 1` → ½√a **(a ⩾ 0)** ;
  - `\ln(a) x de 0 à 1` → ½ ln a **(a > 0)** ;
  - `\sqrt{a-1} x de 0 à 1` → **(a ⩾ 1)** ; `\ln(a+2) x de 0 à 1` → **(a > −2)** ;
  - `\sqrt{a}\ln(a) x de 0 à 1` → **(a > 0)** (les deux fusionnées, pas « a ⩾ 0, a > 0 »).
- **Limite** :
  - toujours vraies, rien dit : `\sqrt{a^2+1}`, `\ln(a^2+1)`, `\sqrt[3]{a}` ;
  - `\ln(a^2) x de 0 à 1` → ln\|a\| **(a ≠ 0)** ;
  - primitive `.intégrer \sqrt{a} x` et `.dériver \sqrt{a} x` : inchangées (√a est sur la ligne) ;
  - argument non reconnu (`\sqrt{a^3-a}`) → forme brute **(a³ − a ⩾ 0)**.
- **Erreur / refus** : `\sqrt{a x}`, `\ln(a x)` avec bornes → refus actuel inchangé ; aucune ligne qui ne disait rien de faux ne change d'autre façon.

## Questions à David

- **Q1** — La règle « primitive/dérivée : on ne redit pas ce que la saisie montre » s'applique aussi à √ et ln (seules les intégrales bornées gagnent la condition) ? _Reco : oui, c'est la règle de Q3 / V61._
- **Q2** — `\sqrt{a}` **au dénominateur** (`\dfrac{x}{\sqrt{a}} de 0 à 1`, `e^{\sqrt a x}` → divisé par √a ou a) : fusionner « a ⩾ 0 » et « a ≠ 0 » en **a > 0** ? _Reco : oui._
- **Q3** — `\log` (base 10) et `\log_b` traités comme `\ln` (argument > 0) ? _Reco : oui, même règle._
- **Q4** — `\dfrac{1}{\ln(a)}` donne aujourd'hui « ln(a) ≠ 0 » brut : l'écrire **a > 0, a ≠ 1** dans ce lot, ou laisser ? _Reco : laisser (hors du point demandé, cas rare), noté._
