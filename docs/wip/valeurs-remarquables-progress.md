# Chantier `valeurs-remarquables` — `cos(π/3) → 1/2` dans `réduire`, avec une étape

## Reprendre ici

_Mis à jour le 2026-10-26, phase 0 validée (« je valide »)._

- **État** : phase 0 validée, rien codé.
- **Prochaine action** : tests rouges (Atelier `runInput`), puis règle `trigRules` dans `réduire` (`intent-rules.ts`).
- **En attente de David** : `.domaine 1/(x − cos(π/3))` → `ℝ \ {1/2}` ? (laissé ouvert, rien ne change d'ici là).
- **Pièges** : la ligne affichée est `latex`, pas `output` (texte hérité, `Simplified: x/2` alors que la ligne montre `cos(π/3) x`).
- **Worktree / branche** : `../ubumaths-wt-valeurs-remarquables`, `fix/valeurs-remarquables`.

## Contexte

Décision S4 de simplify-carte (David, 2026-10-22) : les identités enseignées, valeurs remarquables comprises, vont dans `réduire` avec une étape nommée, jamais dans `tidy`. Lot reporté en Q3 du § 33 (journal archivé `docs/archive/wip/simplify-carte-progress.md`), resté dans les Points ouverts du README mathAST.

## 1. Phase 0 (2026-10-26)

### Sonde (Atelier `runInput`, ligne `latex`, test jetable supprimé)

| ligne tapée                                        | ligne affichée          | étape                                        |
| -------------------------------------------------- | ----------------------- | -------------------------------------------- |
| `.simplifier x cos(π/3)`                           | `cos(π/3) x`            | « On met chaque terme au propre »            |
| `.simplifier cos(π/3)/x`                           | `1/(2x)`                | aucune                                       |
| `.simplifier sin(\frac{\pi}{4})x`                  | `√2x/2`                 | aucune                                       |
| `.simplifier x cos(60°)`                           | `x/2`                   | « au propre » (`tidy` calcule en degrés)     |
| `.simplifier tan(π/4)x`, `cos(0)x`, `sin(π)x+1`    | `x`, `x`, `1`           | aucune                                       |
| `.simplifier 2sin(π/6)+x`                          | `x + 2sin(π/6)`         | rangement                                    |
| `.simplifier sin(−π/6)x`                           | `−sin(π/6) x`           | « sin est impaire », puis s'arrête           |
| `.simplifier cos(7π/3)x`                           | `cos(7π/3) x`           | périodicité non appliquée                    |
| `.simplifier tan(π/2)x`, `cos(π/5)x`, `sin(π/12)x` | gardés                  | —                                            |
| `.développer (x+cos(π/3))²`                        | `x² + 2cos(π/3)x + 1/4` | b² calculé, pas 2ab                          |
| `.dériver sin(π/3)x²`                              | `2sin(π/3)x`            | —                                            |
| `.résoudre cos(π/3)x=1`                            | `x = 2`                 | « On divise par 1/2 », la ligne dit cos(π/3) |
| `.domaine 1/(x−cos(π/3))`                          | `ℝ \ {cos(π/3)}`        | —                                            |
| `cos(π/3)` seul / `x + cos(π/3)`                   | `1/2` / gardé           | valeur exacte / `tidy`                       |

Table existante : `pattern/rule-sets/trig.ts` (`trigRules` : sin, cos, tan aux multiples de π/6, π/4, π/3, angle réduit mod 2π), absente des règles de `réduire` (`intent-rules.ts` : parité et périodicité seulement).

### Comportements validés (David, 2026-10-26, « je valide »)

- **Nominal** : `.simplifier x cos(π/3)` → `x/2`, étape « On utilise une valeur remarquable : cos(π/3) = 1/2 » ; `sin(−π/6)x` → `−x/2` (impaire, puis valeur) ; `cos(7π/3)x` → périodicité puis `x/2` ; `2sin(π/6) + x` → `x + 1` ; les cas calculés en silence (`cos(π/3)/x`, `sin(π/4)x`, `tan(π/4)x`, `cos(0)`, `sin(π)`) prennent la même étape.
- **Limite** : angle hors table (`cos(π/5)`, `sin(π/12)`) gardé ; `cos(x + π/3)` gardé ; plusieurs valeurs dans une ligne → une étape qui les liste.
- **Erreur** : `tan(π/2)` gardé, jamais une valeur.
- **Q1** : `.simplifier` avec étape ; `.développer` cohérent (les deux termes calculés, ou aucun) ; `.résoudre` aligné (ligne et titre d'étape disent la même valeur). `.dériver`, `.factoriser` gardent l'écriture. `.domaine` (`ℝ \ {1/2}` ?) : **non tranché**, inchangé.
- **Q2** : ligne tapée seule (`tidy`) gardée (S4) ; `tidy` ne calcule plus `cos(60°)` en silence.
- **Q3** : degrés, même règle et même étape (« cos(60°) = 1/2 »).
- **Q4** : règle active dès que `enableTrig` l'est, pas d'autre réglage de niveau.

## Historique
