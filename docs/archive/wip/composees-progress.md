---
title: Composées f(u(x)) d'une fonction à ensemble — journal du chantier
date: 2026-10-26
status: CLOS le 2026-10-26 (#1835 mergée, pas en prod) ; versé dans docs/systeme/atelier.md ; archivé
---

## Reprendre ici

_Mis à jour le 2026-10-26, après #1835._

- **État** : CLOS. #1835 mergée (pas encore en prod) ; doc versée dans `docs/systeme/atelier.md` ; journal archivé.
- **Prochaine action** : aucune. Restes : V65 (`.limite (x-3)^2 en +∞`, `ecarts-a-trier.md`) → `it.todo` N4 à activer quand il sera corrigé.
- **En attente de David** : chantier V65 ou non ; vérification manuelle (ligne #1835 de `verifications-manuelles.md`).

## Origine

Décision c) de la phase 0 de l'intervalle (2026-10-13, [archive](atelier-intervalle-phase0.md)) :
quand f porte un ensemble choisi (`f(x) = \sqrt{x} sur [0;+∞[`), `f(2x)` est **refusé** partout
où l'atelier étudie l'inconnue (`composedMessage`, `src/lib/atelier/interval.ts`). Règle
générale demandée : le domaine de f(u(x)) = {x : u(x) ∈ ensemble de f}.

## Ce qui refuse aujourd'hui

`citedIntervalDomain` rend `{ kind: 'composed' }` dès qu'une fonction à ensemble est appelée sur
une expression de l'inconnue. Trois branchements :

| Où                                                    | Fichier                        |
| ----------------------------------------------------- | ------------------------------ |
| `.résoudre`, `.variations`, `.intégrer`, `.évaluer`   | `calcul.ts` (~l. 2400)         |
| `.limite`                                             | `limit.ts` (~l. 207, 418)      |
| définition `g(x) = f(2x)` → g en erreur (héritage, d) | `interval.ts` `citedIntervals` |

Un calcul simple `f(2x)` n'est PAS refusé (expression, `outsideIntervalRefusal` ne juge que les nombres).

## Phase 0 — comportements (f(x) = x² sur [0 ; +∞[ sauf mention)

**Nominal**

- N1 `g(x) = f(2x)` → g hérite de [0 ; +∞[ (2x ≥ 0) ; carte, tracé, `.domaine g` suivent.
- N2 `g(x) = f(x − 3)` → [3 ; +∞[ ; `g(x) = f(−x)` → ]−∞ ; 0] (a < 0 : bornes échangées).
- N3 `.résoudre f(2x) = 4` → x = 1 (la solution −1 écartée, dernière étape « On ne garde que… »).
- N4 `.variations f(2x)` → tableau sur [0 ; +∞[.
- N5 `.limite f(2x) en −1` → refus « −1 n'est pas dans l'ensemble… » (comme f) ; `en 0` → `0^+`.
- N6 `.intégrer f(2x) de −1 à 1` → refus du segment qui sort ; `.évaluer f(2x) en x=−1` → refus.
- N7 f sur [0 ; 2] : `f(2x+1)` → [−1/2 ; 1/2] — bornes **exactes** (fractions, `π`, `√2`), jamais décimales.
- N8 f sur ℝ \ {1} : `f(2x)` → ℝ \ {1/2}.
- N9 plusieurs appels (`f(x) + f(2x)`) → intersection [0 ; +∞[ ∩ [0 ; +∞[.

**Limites**

- L1 u non affine (`f(x²)`, `f(\ln x)`, `f(1/x)`) → selon Q1.
- L2 u avec une autre lettre (`f(ax)`) → refus gardé (paramètre inconnu).
- L3 ensemble résultant vide (f sur [0 ; 1], `g(x) = f(x) + f(x+5)`) → g en erreur « n'est définie nulle part », message existant.
- L4 domaine naturel de u croisé (`f(\sqrt{x}−1)` si Q1 l'admet) : {x ∈ D_u : u(x) ∈ I}.

**Erreurs**

- E1 cas non su (selon Q1) → le refus actuel, message reformulé : dit QUELLE expression devrait être dans quel ensemble.

## Questions à David

- **Q1** Quelles u(x) ? (reco : affines `ax+b` d'abord, exactes ; polynômes plus tard si l'usage le demande)
- **Q2** `.domaine g` (g(x) = f(2x)) dit-il pourquoi ? (« ensemble hérité : 2x doit être dans [0 ; +∞[ »)
- **Q3** `.résoudre f(2x)=4` : une étape qui écrit l'ensemble de x (« 2x ∈ [0 ; +∞[ ⇔ x ∈ [0 ; +∞[ ») ?
- **Q4** Lots : un seul (moteur + 3 branchements) ou deux (définitions g, puis commandes) ?

**Réponses (2026-10-26)** : Q1 → u affine seulement (`ax+b`, a et b nombres), bornes exactes ;
toute autre u garde un refus. Q3 → oui, une étape « 2x doit être dans [0 ; +∞[, donc x ∈ [0 ; +∞[ ».
Q4 → une seule PR. Q2 (reformulée) → avec la condition : « g est définie sur [0 ; +∞[ (ensemble
hérité : 2x doit être dans [0 ; +∞[) ; sans cet héritage, elle le serait sur ℝ. »

## Implémentation (2026-10-26)

- `affinePreimage` (`interval.ts`) : u lue par `polynomialCoefficients(u, x, 1)`, vérifiée en deux
  points (un terme mal classé ne passe pas), coefficients nombres seulement ; bornes
  `exactValueToShow(evaluate((e − b)/a))`, échangées si a < 0 ; points exclus suivis ; un ensemble
  par conditions ou périodique → `null` (refus).
- `citedIntervalDomain` : la composée affine restreint (`conditions` sur le `restricted`), sinon
  `composed` avec l'argument et l'ensemble (E1). Même chose pour `f⁻¹(2x)` (`citedReciprocalInterval`).
- `citedIntervals` rend les conditions → `FunctionObject.inheritedConditions` → `.domaine g` (Q2).
- `solveSteps(…, within, conditions)` : étape « 2x doit être dans I, donc x est dans J » en tête (Q3).
  Sans étapes (`ln(2x) = 0`), le moteur répond seul, restreint par `dans`.
- Mesuré : `f(2x+1)` sur [0 ; 2] → [−1/2 ; 1/2] ; `k(−3x+1)` sur ]0 ; π] → [(1−π)/3 ; 1/3[ ;
  `f(x/3)` → [0 ; 6] ; `f(√2 x)` → [0 ; √2] ; ℝ \ {1} → ℝ \ {1/2} ; réunion avec a < 0 retournée.

## Revue (code-reviewer, 2026-10-26)

Aucun bloquant. Corrigés : u à valeur interdite simplifiée (`(x²−1)/(x−1)` → croisé avec
`computeDomain(u)`, [−1 ; +∞[ \ {1}) ; condition écrite dans la lettre de l'élève (`g(t) = f(2t)`
→ « 2t doit être… ») ; ids d'étapes de `.résoudre` restreint distincts, à partir de 1 (la dernière
reprenait l'id de la précédente, défaut antérieur) ; points exclus remis croissants quand a < 0.
Non retenu : `f⁻¹(2x)` sans ensemble de départ restreint ne restreint rien (comme `f(2x)` sans
ensemble), rien de faux mesuré.
