# Chantier correction-cases-unite — rapprocher la correction des cases à unité de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-19, phase 0 en cours (aucune PR)._

- **État** : phase 0 — mesure synthétique faite (sonde `src/lib/questions/units/__tests__/mesure-phase0.test.ts`, 79 cas) ; aucune donnée de prod lue.
- **Prochaine action** : lecture prod des réponses aux cases à unité (`test_answers`), sous la forme validée par David → oracle `tests/fixtures/correction-cases-unite/`.
- **En attente de David** : accord sur la lecture prod (forme, filtres, ce qui entre dans le dépôt).
- **Pièges en cours** : la route `tidy` (`valueIn`) rend `null` sur toute température (°C, K, °F) ; `extractValue` (parser.ts) lit `2\sqrt{2}` comme 2.
- **Worktree / branche** : `../ubumaths-wt-correction-cases-unite` · `refactor/correction-cases-unite`.

## Historique

### 2026-10-19 — phase 0, mesure synthétique

Lancer la sonde : `MESURE_OUT=<fichier.md> pnpm test:server src/lib/questions/units/__tests__/mesure-phase0.test.ts`.

Constats (verdict actuel vs route `tidy` = `valueIn(arbre élève, unité attendue)` en rationnels) :

- Conversions, unités composées (km/h ↔ m/s, m.s⁻¹, cm², L ↔ cm³, ha, t), durées composées,
  notation scientifique, fractions de nombres, virgule, groupement : mêmes valeurs des deux côtés.
- Températures : `tidy` ne sait pas (`valueIn` → `null`) ; l'actuel les gère (`convertAffine`),
  arrondi °C ↔ K compris.
- **Pas de ComputeEngine** malgré le nom `ce-integration.ts` et ses commentaires (ainsi que l'ADR
  0026 et `grandeurs.md`) : `evaluateQuantityValue` appelle `evaluateExpression` (`$lib/math`) =
  `parseLatex` + `evaluate` de mathAST en mode décimal. Il n'est appelé que si `extractValue` rend
  une chaîne (`5\times3`) : rare côté élève. Le vrai écart avec `tidy` : lecture de la valeur par
  regex maison (`extractValue`), calcul en flottants, unité lue à part (`\unit{}` + parseur d'unité)
  au lieu d'un arbre avec nœud `unit`.
- **Faux juste mesuré** : attendu `2\sqrt{2}\unit{m}`, élève `2 m` → JUSTE (`extractValue` prend
  le premier nombre). Attendu `\pi\unit{m}` → « Erreur de configuration ». À vérifier sur les vraies
  données : existe-t-il des cases à unité dont l'attendu n'est pas un nombre décimal ?
- Élève `\sqrt{2}m` → « N'oublie pas l'unité » ; `2\pi m` → « Unité inconnue : \pi m ».
- Comparaison sans tolérance : actuel = flottants à 1e-12 relatif ; `tidy` = égalité exacte.
