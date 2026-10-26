---
title: Écarts voisins des limites (V67-V71)
date: 2026-10-26
status: PR 1 mergée (#1844), PR 2 à faire
---

## Reprendre ici

_Mis à jour le 2026-10-26, après #1844._

- **État** : PR 1 (V67 + V69) mergée, #1844 ; pas encore en prod. Pas de worktree en cours.
- **Prochaine action** : `git worktree add -b fix/limites-ecarts-v68 ../ubumaths-wt-limites-ecarts origin/main`, puis **PR 2 : V68** (exp, croissances comparées), tests rouges d'abord.
- **Reste** : PR 2 V68 · PR 3 V70 + V71 (substitution directe, suivi du signe). Revue `code-reviewer` en Opus sur chaque PR.
- **En attente de David** : rien.
- **Pièges** : une limite FAUSSE est pire qu'un refus ; rejouer la sonde de la phase 0 sur `main` avant de coder ; (−∞)ⁿ est désormais exact, donc `classifyWithSign` voit plus de formes +∞ − ∞ « inconnues » (`isPositiveNear` interroge alors le moteur entier) ; non traité : `x^{\frac{4}{2}}` en −∞ « non supportée ».

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
