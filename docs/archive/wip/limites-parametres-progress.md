---
title: Limites à paramètre (k, a, λ…) — signe inconnu lu comme positif
date: 2026-10-27
status: clos (2026-10-27, #1869 mergée) — C versé aux Points ouverts du README mathAST
---

## Reprendre ici

_Mis à jour le 2026-10-27, après #1869 : chantier CLOS, journal archivé._

- **État** : CLOS. Choix A livré par #1869 (mergée le 2026-10-27, pas encore en prod) ; worktree et branche retirés.
- **Suite** : choix C (discussion selon le signe du paramètre) = futur chantier, cas de départ versés aux Points ouverts de `docs/systeme/mathast/README.md`.

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
  - Revue Opus (≈ 125 sondes, branche contre `main`) : **valeurs fausses introduites** — mon « 0 sans signe » était un 0 exact, neutre dans l'addition : 0⁺ − k·0⁺ restait 0⁺, `\frac{1}{x-kx}` en 0⁺ → +∞ (faux pour k > 1), `\ln(x-kx)`, `e^{\frac{1}{x-kx}}`, `\frac{1}{kx+x^2}` en 0⁻… (7 cas, refusés sur `main`). Corrigé : k·0±, k/∞, 0±/k lèvent aussi ; corrige au passage 4 valeurs fausses de `main` (`\frac{1}{kx+x^2}` en 0⁺, `\frac{1}{kx+x}`, `\frac{1}{kx^2+x^3}`, `\ln(kx+x^2)`). Régressions corrigées : polynôme lu P/1 dans `tryDominantTerm` (`x^2+kx` en +∞ → +∞), λ (nœud `greek`) traité comme k, k² coefficient, (x + 2)² au dénominateur. `\frac{k}{x}` en +∞ → 0 par le terme dominant.
  - Non traités : `\frac{k^2+1}{x}` en 0⁺ refusé (k² + 1 > 0 non vu, mineur) ; substitution directe à paramètre (question à David).
  - Suites : 42 027 verts ; tests 40 dans le fichier limits + 4 atelier.
  - Contre-revue Opus (80 sondes) : **valeur fausse** — degré ÉCRIT ≠ degré réel : `x(x+k)-x^2` en +∞ (= kx) → −∞, `(x+k)^2-x^2`, `x^2-(x-k)^2`… (`0·c > 0` faux → « negative ») ; aussi sur `main` sans paramètre pour des quotients (`\frac{x^3-x^3+x^2}{x}` → −∞). Garde : coefficient dominant nul en haut ou en bas → refus. Régressions acceptées (refus, pas faux) : `x^2+kx`, `x+kx^2`, `x\ln x+kx` en 0⁺ (0 sur `main`, k·0⁺ lève).
  - Suites : 42 041 verts.

**Décision (David, 2026-10-27, sur recommandation)** : la substitution directe qui suppose k ≠ 0 / k > 0 n'est PAS refusée dans cette PR ; elle va à C (discussion par cas).

**Cas de départ de C** : `\frac{1}{x^2+k}` en 0 → 1/k (+∞ si k = 0) ; `\ln(x+k)` en 0⁺ → ln k (k ≤ 0 : pas défini) ; `\frac{x}{kx+x^2}` en 0⁺ → 1/k (k = 0 : +∞) ; refus à rattraper (valent 0 pour tout k) : `x^2+kx`, `x+kx^2`, `x\ln x+kx` en 0⁺, `\frac{k^2+1}{x}` en 0⁺ (+∞). Piste : un « zéro de côté inconnu » ABSORBANT dans l'addition (pas le 0 exact, neutre : cause des valeurs fausses de la revue 1). Option intermédiaire évoquée : « = 1/k (si k ≠ 0) » dans l'atelier.
