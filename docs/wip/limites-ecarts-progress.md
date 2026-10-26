---
title: Écarts voisins des limites (V67-V71)
date: 2026-10-26
status: phase 0 validée, rien codé
---

## Reprendre ici

_Mis à jour le 2026-10-26, phase 0 validée (« je suis tes recos »)._

- **État** : rien codé, pas de worktree. Suite de #1839 (V66, [journal](../archive/wip/limite-puissance-progress.md)).
- **Prochaine action** : `git worktree add -b fix/limites-ecarts-v67 ../ubumaths-wt-limites-ecarts origin/main`, puis **PR 1 : V67 + V69**, tests rouges d'abord.
- **Ordre validé** : PR 1 V67 + V69 (quotients en −∞, conjugué, domaine de u^{p/q}) · PR 2 V68 (exp, croissances comparées) · PR 3 V70 + V71 (substitution directe, suivi du signe). Revue `code-reviewer` en Opus sur chaque PR.
- **En attente de David** : rien.
- **Pièges** : la sonde de `evaluateLimit` (tableau ci-dessous) a été faite sur la branche de #1839, à rejouer sur `main` ; une limite FAUSSE est pire qu'un refus (revue de #1839).

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
