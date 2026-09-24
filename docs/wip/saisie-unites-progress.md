# Saisie des unités par l'élève — progression

> Spécification validée par David le 2026-09-24. Worktree `../ubumaths-wt-saisie-unites`, branche `feat/saisie-unites` (une PR par phase).
> Notation de référence : `docs/ref/notation-unites.md`.

## Constat de départ (mesuré le 2026-09-24)

- La correction des trous avec unité (`blank.unit.expected` → `validateQuantityAnswer`) attend `5\unit{km}`. Aucun champ élève ne sait produire `\unit` (seule la page `admin/debug/mathfield` a une macro et des boutons).
- Vrai MathLive (Chromium, `typedText`) : `5 km` → `5km` → lu **5 sans unité**, en silence. `5\,\mathrm{km}`, `5\text{ km}`, `20\degree C` idem ; `90\frac{km}{h}` → valeur illisible.
- Le message de `validateQuantityAnswer` (`incompatible_units`, `wrong_unit`…) est calculé puis PERDU : `validateSingleBlank` ne garde que `isCorrect`.
- Deux lecteurs d'unités divergents : `questions/units/parser.ts` (`parseUnitExpression`) lit encore `kg/m.s` = kg·m⁻¹·s et accepte `m²` ; `mathAST/units/parser.ts` refuse `kg/m.s` (#409) et refuse `m²`.
- Les élèves saisissent dans `FillBlanksInput` → `MathPrompt` (`<math-field readonly>` + `\placeholder`). `MathInput.svelte` n'est utilisé nulle part. Aucun clavier virtuel personnalisé en prod.

## Phases

| Phase | Contenu                                                                                                     | Agent                     | État                                    |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------- |
| 1     | Une seule règle : la correction lit les unités avec le lecteur mathAST (+ exposants Unicode `m²`)           | pedagogy-expert (Opus)    | en cours                                |
| 2     | A — lecture tolérante dans les trous avec unité (`5km`, `5\,\mathrm{km}`, `20\degree C`, `90\frac{km}{h}`…) | pedagogy-expert (Opus)    | à faire — mesurer le vrai clavier AVANT |
| 3     | Messages à l'élève (grandeur, unité imposée, manquante, ambiguë)                                            | pedagogy-expert (Opus)    | à faire                                 |
| 4     | B — onglet « Unités » du clavier virtuel, filtré par grandeur, insère `\unit{…}`                            | frontend-developer (Opus) | à faire                                 |
| —     | code-reviewer en fin de chantier                                                                            | code-reviewer             | à faire                                 |

Hors périmètre (décidé) : réponses littérales avec unité (« 2x cm ») — chantier séparé.

## Messages validés (Phase 3)

| Situation                   | Message                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Grandeur différente         | « Cette unité ne mesure pas la bonne grandeur. Pour un produit d'unités, écris m·s. » |
| Unité imposée non respectée | « Donne ta réponse en km. »                                                           |
| Unité manquante             | « N'oublie pas l'unité. »                                                             |
| Unité ambiguë               | « Écris kg/(m·s) ou kg·m⁻¹·s⁻¹. »                                                     |

## Journal

- 2026-09-24 — worktree créé, spécification validée.
