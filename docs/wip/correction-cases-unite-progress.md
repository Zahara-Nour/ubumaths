# Chantier correction-cases-unite — rapprocher la correction des cases à unité de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-19, phase 0 (aucune PR)._

- **État** : oracle figé (`tests/fixtures/correction-cases-unite/oracle.json`, 1 724 réponses, test `oracle-cases-unite.test.ts`) ; route `tidy` mesurée dessus : 0 verdict changé sur 1 324 comparables.
- **Prochaine action** : David tranche entre les options (cf. 2026-10-19, options) ; puis phase 0 comportements → tests → code.
- **En attente de David** : choix d'option ; message « Pour un produit d'unités, écris m·s. » sur « 5 kg » (garder ?).
- **Pièges en cours** : `valueIn` rend `null` sur les températures ; `extractValue` lit `2\sqrt{2}` comme 2 (aucun modèle publié ne l'atteint) ; `ORACLE_MAJ=1` réécrit l'oracle.
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

### 2026-10-19 — oracle : option A choisie par David

- 25 modèles publiés à case à unité exportés de la prod (`scripts/export-question-templates.ts`,
  lecture seule) dans `tests/fixtures/correction-cases-unite/modeles/`.
- Périmètre réel : 6e-4e — longueurs, aires (cm² à hm²), durées (h + min), vitesse (km.h⁻¹), L,
  €, kg. **Aucune** température, **aucune** précision (`precision`), **aucune** unité imposée.
  Attendus : `{{eval:…;[unité]}}`, `{{eval:a[h]+b[min]}}`, `{{d}}` (variable à unité).

### 2026-10-19 — oracle figé, route `tidy` mesurée

- `oracle-cases-unite.test.ts` : 25 modèles × graines 1-8 × batterie (juste MathLive / clavier /
  collé, point décimal, sans unité, valeur fausse, autre grandeur, convertie, convertie arrondie,
  non convertie, facteur 10 pour une aire, durée composée, heures décimales, « 2,5 h = 2 h 50 »).
  Verdicts via `validateAnswer` (le parcours de l'élève). 1 724 entrées.
- Route `tidy` (`valueIn`, rationnels exacts) sur les mêmes réponses : **0 verdict différent**
  sur 1 324 comparables ; les 400 autres (sans unité, autre grandeur) sont jugées avant la valeur.
- `ce-integration.ts` : seul `compareQuantities` sert hors tests ; `evaluateQuantityValue` (via
  lui), `convertQuantity`, `normalizeToBaseUnits`, `isValidQuantity`, `getUnitFromQuantity`,
  `getValueFromQuantity` : morts.
- Message `wrongMagnitude` : « … Pour un produit d'unités, écris m·s. » affiché aussi pour « 5 kg »
  quand une longueur est attendue (200 entrées).
