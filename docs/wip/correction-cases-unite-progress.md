# Chantier correction-cases-unite — rapprocher la correction des cases à unité de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-19, phase 0 de la PR 2 validée._

- **État** : PR 1 mergée (#1543). PR 2 (valeur lue en arbre) : phase 0 validée par David, tests rouges en cours.
- **Prochaine action** : tests rouges → `parser.ts` lit la valeur par `parseLatex` → `tidy` → `rationalOf` ; chemin « valeur en chaîne » de `quantity-comparison.ts` retiré ; oracle à 0 changement ; revue `code-reviewer` opus.
- **En attente de David** : rien.
- **Pièges en cours** : la normalisation élève rend `2,5` (l'arbre refuse `,`) ; `valueIn` → `null` sur les températures (PR 3) ; messages d'unité validés par David (ne pas reformuler) ; pas de `timeout` sur ce Mac.
- **Worktree / branche** : `../ubumaths-wt-correction-cases-unite` · `refactor/correction-cases-unite-lecture`.

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

### 2026-10-19 — décisions de David

- Option 2, par morceaux : PR 1 nettoyage (+ oracle), PR 2 valeur lue en arbre (mathAST), PR 3
  comparaison exacte `tidy`/`valueIn`, températures gardées via la conversion actuelle.
- Revue : `code-reviewer` Sonnet pour la PR 1, Opus pour les PR 2 et 3.
- Option B (enregistrer les réponses des élèves) : pas maintenant (mémoire
  `project_enregistrer-reponses-eleves`).

### 2026-10-19 — PR 1 (nettoyage)

- Message c validé par David : le conseil « Pour un produit d'unités, écris m·s. » ne s'ajoute
  au refus de grandeur que si les lettres collées, lues comme un produit, mesurent la grandeur
  attendue (`gluedProductMatches`, `validator.ts`). Oracle : 200 messages « autre grandeur »
  changés, 0 verdict.
- `ce-integration.ts` → `quantity-comparison.ts` ; `convertQuantity`, `normalizeToBaseUnits`,
  `isValidQuantity`, `getUnitFromQuantity`, `getValueFromQuantity` retirés avec leurs tests.
- ADR 0026, `grandeurs.md`, `questions.md`, commentaires : plus de « ComputeEngine ».
- Hors périmètre, vu en passant : « Compute Engine » reste dans les commentaires de
  `answer-validator.ts`, `validation-rule-evaluator.ts`, `questions/index.ts`, `feedback.ts`.

### 2026-10-19 — #1543 mergée

- Revue : oracle qui se réécrivait si son fichier manquait → corrigé (preuve `ENOENT`) ;
  explosion des découpes de lettres collées → inatteignable (seule une écriture lue comme UNE
  unité arrive là, `semaine` = 7 lettres), borne à 8 gardée en défense.

### 2026-10-19 — PR 2, phase 0 validée par David

- Valeur lue en arbre (`parseLatex` → `tidy` → `rationalOf`) : exacte (`1{,}5\cdot10^{-2}` → 3/200),
  `null` si non rationnelle (`2\sqrt{2}`, `\pi`, `5x`). Comparaison inchangée (flottants) jusqu'à la PR 3.
- Oracle : 0 verdict, 0 message changé (attendus publiés tous décimaux).
- Attendu non rationnel → « Erreur de configuration » (aujourd'hui `2 m` jugé JUSTE pour `2\sqrt{2} m`).
- Élève sans unité, valeur illisible (`\sqrt{2}`) → « N'oublie pas l'unité. » comme aujourd'hui.
- Hors PR (noté pour plus tard, PR 2 bis possible) : découpage « nombre | unité » de `student-input.ts`
  — `2\sqrt{2} m`, `3+2 m` → « Unité inconnue », `(-3) m` → « N'oublie pas l'unité ».
