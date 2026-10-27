---
title: Limites à paramètre (k, a, λ…) — signe inconnu lu comme positif
date: 2026-10-27
status: phase 0 écrite, en attente de David
---

## Reprendre ici

_Mis à jour le 2026-10-27, phase 0 écrite._

- **État** : relevé fait sur `main` (sonde de 41 cas), cause trouvée ; rien codé.
- **Prochaine action** : réponse de David à la question de comportement (A / B / C ci-dessous), puis tests rouges.
- **En attente de David** : le choix A, B ou C.
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
