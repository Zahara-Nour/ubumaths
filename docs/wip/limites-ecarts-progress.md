---
title: Écarts voisins des limites (V67-V71)
date: 2026-10-26
status: PR 1 (#1844) et PR 2 (#1852) mergées, PR 3 en cours
---

## Reprendre ici

_Mis à jour le 2026-10-27, après #1852._

- **État** : PR 1 (#1844) et PR 2 (#1852) mergées ; PR 3 (V70 + V71) codée, revue Opus faite (frères corrigés), tests verts. Rien en prod.
- **Prochaine action** : PR 3 ouverte, CI, merge ; puis versement (fin de chantier).
- **Reste** : PR 3 seulement. Revue `code-reviewer` en Opus.
- **En attente de David** : rien. Paramètre k pris positif (`e^{kx}` en +∞ → +∞) : **chantier à part `limites-parametres`** (décidé par David le 2026-10-27), hors de ce chantier.
- **Pièges** : une limite FAUSSE est pire qu'un refus ; rejouer la sonde de la phase 0 sur `main` avant de coder ; le repli numérique de `classifyLimitValue` classe 10²⁰ « fini » et eˣ « inconnu » ; une constante flottante proche de 1 (ou de 0) peut être exacte : comparer en exact (`exactConstantRational`) ; refus restants : `x^3e^{-x^2+x}`, `x^2e^{-\sqrt{x}}` en +∞, `x^{\frac{4}{2}}` en −∞.

---

## Phase 0 (validée par David le 2026-10-26)

| Écart | Cas                                                                       | Aujourd'hui          | Attendu                                                                          |
| ----- | ------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| V67   | `\frac{(x-3)^2}{x^2}`, `\frac{(x-3)^3}{x^3}`, `\frac{x^2}{(x-3)^2}` en −∞ | non supportée        | 1                                                                                |
| V67   | `\frac{(2x+1)^3}{x^3}` en −∞                                              | non supportée        | 8                                                                                |
| V67   | `\frac{(x+1)^2}{x}` en −∞                                                 | non supportée        | −∞                                                                               |
| V68   | `(x-3)^2e^{-x}`, `(x^2-6x+9)e^{-x}` en +∞                                 | non supportée        | 0                                                                                |
| V68   | `e^{x^2-x}` / `e^{x-x^2}` en +∞                                           | non supportée        | +∞ / 0                                                                           |
| V69   | `(x-3)^{3/2}`, `(x-3)^{1/2}`, `x^{3/2}` en −∞                             | non supportée        | « n'existe pas » hors du domaine, comme `\sqrt{x-3}` (convention q pair : u ≥ 0) |
| V69   | `(\sqrt{x+1}-\sqrt{x})^{-1}`, `\frac{1}{\sqrt{x+1}-\sqrt{x}}` en +∞       | non supportée        | +∞                                                                               |
| V70   | `(\cos x-1)^{-1}` en 0                                                    | `\dfrac{1}{0}` exact | −∞                                                                               |
| V70   | `(x-\sin x)^{-1}` en 0                                                    | `\dfrac{1}{0}` exact | pas de limite (−∞ / +∞)                                                          |
| V70   | `(x-\sin x)^{-2}` en 0 ; `(\sin x-x)^{-1}` en 0⁺                          | `\dfrac{1}{0}` exact | +∞ ; −∞                                                                          |
| V71   | `\frac{1}{x\sin\frac{1}{x}}` en 0 et 0⁺                                   | −∞ (faux)            | refus honnête (« je ne sais pas »), pas « pas de limite »                        |
| V71   | `\frac{x}{\sin x}` en +∞                                                  | non supportée        | inchangé                                                                         |

**Décisions** : V71 = garde minimale (ne pas conclure sur le signe d'une base contenant sin/cos d'un argument → ±∞) ; si elle casse des cas justes, garder V71 noté et s'arrêter. Pas de mise en commun 2.45 / 2.46 (7 ms, pas une PR).

**Pistes de cause (à confirmer)** : V70 — la substitution directe accepte 0^{-n} ; V67 — chemin +∞ (L'Hôpital / terme dominant) pas symétrique en −∞ ; V68 — composition d'exp par `classifyWithSign` (ne lève pas ∞ − ∞), croissances comparées aveugles à un polynôme en puissance ; V69 — domaine de u^{p/q} non lu, conjugué absent sous quotient / puissance.

---

## Journal

- **2026-10-26** — Écarts relevés en sondant V66 et par la revue de #1839 ; phase 0 et découpage en 3 PR validés par David.
- **2026-10-26** — Sonde rejouée sur `main` : identique au tableau. PR 1 :
  - **V67** — cause : `powExtended` ne savait pas (−∞)ⁿ (« Unhandled case ») → l'évaluation exacte de `x^2` en −∞ échouait, ∞/∞ non détecté, L'Hôpital jamais tenté. Ajout du cas n entier (exposant non entier laissé au domaine).
  - **V69 domaine** — `undefinedTowardInfinity` sonde la base de u^a, a non entier hors p/q impair (`nonIntegerPowerBase`).
  - **V69 conjugué** — `findConjugate` connaît √A − √B ; stratégie 2.85 `tryReciprocalByConjugate` (N/D, D^{−n}) en ±∞.
  - **Régression trouvée et corrigée** — `\ln(x^2)-\ln(x^2+x)` en −∞ : x² + x devenait « +∞ − ∞ » exact (inconnu) ; `isPositiveNear` interroge le moteur entier quand le signe est inconnu. Corrige aussi `\ln(x^2)-\ln(x^2-x)` en +∞ (sans valeur sur `main`).
  - Tests : `quotients-moins-infini-et-conjugue.test.ts`, 18 rouges sur `main`.
  - Revue Opus (#1844) : rien de faux. Appliqué : `isSqrt` exige `base === undefined` — ∛A − ∛B (et ∛A − b, déjà avant) pris pour un conjugué de racine carrée par `tryRationalization` en un point fini, réécriture fausse (−1/4 au lieu de −1/12) masquée par L'Hôpital. Non traité (refus, pas faux) : `x^{\frac{4}{2}}` en −∞ « non supportée » au lieu de +∞.
- **2026-10-27** — Sonde rejouée sur `main` : identique au tableau, plus des voisins (`(x-3)e^{-x}`, `(x-3)^2e^{x}` en −∞, `e^{-x^2+3x}`, `(x+1)^2e^{-2x}`). PR 2 (V68), trois causes :
  - **eᵘ** — la composition classe u en exact, qui ne lève pas +∞ − ∞ → stratégie 2.47 `tryExponentialOfUnboundedLimit` (a^u, `\exp u`, u → ±∞ par le moteur entier).
  - **Produit 0 × ∞** — réécrit en quotient seulement si un facteur en était un → `productOverExponential` : f·a^u = f/a^{−u} quand a^u → 0.
  - **∞/∞ non vu** — `x^2-6x+9` exact = +∞ − ∞, puis repli numérique « fini » (10²⁰) → `determinateExactLimit` (indeterminate.ts) demande le terme dominant (`limitByGeneralizedDegree`, cas infini seulement).
  - Tests : `exponentielles-croissances-comparees.test.ts`, 15 rouges sur `main` ; `extrema-globaux` : l'exemple « limite inconnue » `x^4e^{-x}` est désormais calculé → remplacé par `x^2e^{-\sqrt{x}}` (assertion explicite qu'elle reste inconnue) + test `x^4e^{-x}` (min global 0, max local 4), rouge sur `main`.
  - Suites : `limits` 1226, mathAST + atelier + grapheur + math 32548, questions + ubumark 9350, verts.
  - Revue Opus (#1852) : une valeur FAUSSE — base égale à 1 écrite avec des racines (`(\sqrt{3}^2-2)^{x}` en +∞ rendait 0, flottant 0,9999999999999996). Corrigé : `exponentialParts` compare la base à 1 en exact (`exactConstantRational`), sinon refuse |a − 1| < 10⁻⁹ ; 4 tests. Récursion bornée par `nestedProducts`, aucun ∞/∞ déclaré à tort (~160 cas sondés). **Hors diff, défaut ancien** : `e^{kx}` en +∞ rend +∞ (k pris positif), sur `main` aussi — à traiter avec le suivi du signe (PR 3 ou chantier à part).
  - Mergée (#1852), CI verte sur e9acf322b.
- **2026-10-27** — Sonde rejouée sur `main` : identique au tableau. PR 3 (worktree `ubumaths-wt-limites-ecarts`, branche `fix/limites-ecarts-v70`) :
  - **V70** — `hasVanishingDenominator` ne voyait que les fractions : u^{−n} (exposant constant < 0) compte désormais, la substitution ne rend plus « 1/0 ». Stratégie 7.5 `tryNegativePowerAsReciprocal`, en dernier recours (x^{−1}, x^{−2} gardent l'analyse gauche / droite) : u^{−n} = 1/uⁿ, message et raison du résultat imbriqué transmis.
  - **V71** — `classifyAtFinitePoint` signait le zéro de x·sin(1/x) sur 3 points tombés du même côté. Garde `oscillatesUnboundedNear` : sin/cos d'argument > 10⁶ au point ET changement de signe sur 400 points (10⁻⁵ à 10⁻³) → zéro sans signe. Première version sans le test dense : cassait `\frac{1}{x(2+\sin\frac{1}{x})}` en 0⁺ (+∞ juste) — resserrée.
  - Voisins : `(e^x-1)^{-1}`, `(\ln x)^{-1}`, `(x^2-1)^{-3}`, `(x\sin x)^{-1}`, `(\sin x)^{-2}` désormais calculés ; deux valeurs FAUSSES de `main` devenues refus : `\sin x(1-\cos x)^{-1}` en 0⁺ (rendait 0, vaut +∞), `\frac{1}{x\cos\frac{1}{x}}` en 0⁺ (rendait −∞). Refus restants : `x^{-1}\sin x` en 0 (vaut 1), `\frac{\sin\frac{1}{x}}{x}` (sans limite).
  - Tests : `puissances-negatives-et-signe.test.ts`, 34 dont 17 rouges sur `main`.
  - Revue Opus (52 sondes, branche contre `main`) : rien de faux introduit, aucune régression. Trois valeurs FAUSSES déjà sur `main`, frères de V71, corrigées : `\frac{1}{x\sin\frac{1}{\sqrt{x}}}`, `\frac{1}{x\sin(\ln x)}`, `\frac{1}{x\tan\frac{1}{x}}` en 0⁺ (−∞) → refus. La garde lit la croissance de |u| entre 10⁻⁶ et 10⁻⁸ (> π) au lieu d'un seuil 10⁶, et couvre `tan` ; sin(10¹⁵x) n'est pas pris (décroît). Non traité (refus ou approché, pas faux) : `\frac{1}{e^{-1/x}\sin\frac{1}{x}}` en 0⁺ (+∞ faux, déjà sur main, e^{−1/x} = 0 en flottant sur la fenêtre), `\frac{x^2}{x\sin\frac1x}` « approché 0 » ; u^{−p/q} non entier et produit f·u^{−n} (`x^{-1}\sin x`, `(1-x)^{-1}\ln x`) refusés — pistes de suite.
