---
title: Limites à paramètre (k, a, λ…) — signe inconnu lu comme positif
date: 2026-10-27
status: choix A (David, 2026-10-27), PR 1 en cours
---

## Reprendre ici

_Mis à jour le 2026-10-27, choix A codé._

- **État** : choix A codé et testé (22 rouges sur `main`) ; suites larges et revue à faire.
- **Prochaine action** : suites larges, `check:incremental`, revue Opus, PR.
- **En attente de David** : rien. **C (discussion selon le signe) plus tard** ; B (`avec k > 0`) non demandé.
- **Pièges** : une limite FAUSSE est pire qu'un refus ; `\sqrt{kx}` mal sondé (variable `t` par erreur dans la sonde) — à resonder ; garder justes les cas où le signe ne décide pas (`\frac{e^{kx}-1}{x}` en 0 → k).
- **Worktree / branche** : `../ubumaths-wt-limites-parametres`, `fix/limites-parametres`.

---

## Phase 0 (2026-10-27)

### Exposition

- **Modèles de questions** : aucun ne passe de lettre-paramètre au moteur — `{{k}}` est remplacé par un nombre avant (vérifié en lecture sur la prod : 23 modèles qui parlent de limite).
- **Grapheur** : remplace ses paramètres par leur valeur avant `evaluateLimit` (`analysis.ts`, « Replace the parameters ») — non exposé.
- **Atelier** (`.limite`, tableau de variations, domaine) : exposé — un élève ou le prof qui tape `e^{-kx}` reçoit la valeur fausse.

### Cause

`normal/normalize-extended.ts` : `getSignOfNormalForm` rend `null` pour une forme qui contient une lettre (`k`, `−k`, `k²`), et six branches lisent `null` comme « positif » :
∞ × u (`// For now, assume positive`), 0± × u, u / 0±, u / ∞, ∞ / u, 0± / u. Donc `−k·(+∞)` = +∞ : ce n'est pas seulement « k pris positif », `−k` l'est aussi. Le suivi du signe (`classifyWithSign`), la composition, L'Hôpital et le produit passent tous par `tryEvaluateLimitExact` → `normalizeExtended`.

Mécanisme existant réutilisable : hypothèses de l'énoncé (ADR 0012, `assumptions.ts` : `positive`, `nonnegative`, `nonzero`…, `AssumptionOracle.isPositive`) déjà acceptées par `normalizeExtended(…, { assumptions })` ; `avec k > 0` de l'atelier (`atelier/hypotheses.ts`, tidy-conditions) pour `.simplifier`, `.factoriser`, `.développer`.

### Sonde sur `main` (k, λ de signe inconnu)

| Cas                                                                             | `main`              | Juste                                      |
| ------------------------------------------------------------------------------- | ------------------- | ------------------------------------------ |
| `e^{kx}` en +∞                                                                  | +∞                  | dépend de k                                |
| `e^{-kx}` en +∞                                                                 | +∞                  | dépend de k ; **faux même pour k > 0** (0) |
| `e^{-\lambda x}`, `e^{-k^2x}` en +∞                                             | +∞                  | 0 si λ > 0 ; **faux pour tout k ≠ 0**      |
| `1-e^{-\lambda t}` en +∞ (t)                                                    | −∞                  | 1 si λ > 0 ; **faux pour tout λ**          |
| `(x^2-x)e^{-kx}`, `xe^{-kx}` en +∞                                              | +∞                  | dépend de k                                |
| `e^{kx}`, `x^2e^{kx}` en −∞                                                     | 0                   | dépend de k                                |
| `kx^2+x`, `\frac{x^2}{kx+1}` en +∞ ; `kx+1` en −∞                               | +∞ ; +∞ ; −∞        | dépend de k                                |
| `\frac{k}{x}`, `\frac{1}{kx}` en 0⁺                                             | +∞                  | dépend de k                                |
| `\ln(kx)` ; `\ln x+kx` en +∞                                                    | +∞                  | dépend de k                                |
| `e^{\lambda x}`, `e^{k^2x}` en +∞                                               | +∞                  | dépend (k² : juste si k ≠ 0)               |
| `\frac{k}{x}` en +∞ ; `x-k`, `(x-k)^2`, `\frac{1}{x-k}`, `\frac{x}{x+k}` en +∞  | 0 ; +∞ ; +∞ ; 0 ; 1 | juste (le signe ne décide pas)             |
| `\frac{kx+1}{x+2}` en +∞ ; `\frac{e^{kx}-1}{x}`, `\frac{\sin(kx)}{x}` en 0      | k ; k ; k           | juste                                      |
| `kx`, `-kx`, `ax+b`, `x^k`, `k^x`, `me^x`, `\lambda e^{-\lambda x}`, `kxe^{-x}` | non supportée       | refus                                      |

### Question de comportement (à David)

- **A — refus honnête** quand le signe d'un paramètre décide de la limite (« la limite dépend du signe de k ») ; les cas où il ne décide pas restent calculés. Corrige toutes les valeurs fausses.
- **B — A + hypothèse lue** : `.limite e^{-kx} en +∞ avec k > 0` → 0, par l'`avec` de l'atelier et l'oracle de l'ADR 0012.
- **C — B + discussion** : sans hypothèse, réponse par cas (k > 0 : …, k = 0 : …, k < 0 : …).

**Décision (David, 2026-10-27)** : **A** pour l'instant ; **C plus tard**.

## Journal

- **2026-10-27** — Phase 0 écrite, choix A. PR 1 :
  - `normalize-extended.ts` : un signe inconnu devant ±∞ (∞ × k, k/0±, ∞/k) lève au lieu d'être lu positif (`unknownSign`) ; devant 0± (k·0⁺, k/∞, 0⁺/k), la valeur reste 0, sans signe.
  - `algebraic.ts`, `tryDominantTerm` : `extractLeadingCoeff` lisait une lettre-paramètre comme 1, et changeait un coefficient inconnu en 0 (produit) ou le sautait (somme) — avec la garde, `(kx+1)/(x+2)` passait de k à 1, puis 0. Désormais `null`, propagé ; coefficient littéral EN HAUT seulement (bas numérique ≠ 0) : degré inférieur → 0, même degré → rapport exact (`symbolicLeadingCoefficient` : `(kx+1)/(x+2)` → k, `(kx²+1)/(2x²)` → k/2). Coefficient littéral en bas → refus (`x/(kx+1)` → 1/k faux pour k = 0).
  - Atelier (`limit.ts`) : le refus nomme le paramètre — « Je ne sais pas calculer cette limite : elle peut dépendre du signe de k. » (λ écrit λ, `lettersText`).
  - Tests : `parametre-de-signe-inconnu.test.ts` + 4 dans `limite-commande.test.ts`, 22 rouges sur `main`.
