# Chantier correction-cases-unite — rapprocher la correction des cases à unité de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-19, phase 0 en cours (aucune PR)._

- **État** : phase 0 — mesure synthétique faite (sonde `src/lib/questions/units/__tests__/mesure-phase0.test.ts`, 79 cas) ; aucune donnée de prod lue.
- **Prochaine action** : selon le choix de David, construire l'oracle autrement (la prod n'a pas de réponses aux cases à unité).
- **En attente de David** : source de l'oracle (cf. 2026-10-19, lecture prod).
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

### 2026-10-19 — lecture prod (accord de David, comptages seulement)

- `test_answers` : 22 lignes en tout ; `question_instance` n'y garde ni `blanks` ni attendu
  (clés : statement, templateId, domain, theme, level, seed…) → 0 case à unité.
- `evaluation_attempt_questions` : 0 ligne.
- Seules les évaluations notées et les séries enregistrent une réponse ; l'entraînement corrige
  dans le navigateur sans rien garder. **Aucune réponse réelle d'élève à une case à unité en base.**
- `question_templates` : ~25 modèles publiés mentionnent `"unit"` (filtre texte grossier).
- Aucun contenu lu, rien d'écrit dans le dépôt.
