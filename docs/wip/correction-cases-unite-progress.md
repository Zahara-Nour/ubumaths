# Chantier correction-cases-unite — rapprocher la correction des cases à unité de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-21 : phase 0 de la PR 2 bis validée (version finale en bas du journal)._

- **État** : PR 1-3 mergées (#1543, #1545, #1547). PR 2 bis en cours (tests puis code). Rien en prod.
- **Prochaine action** : tests rouges des cas de la « phase 0 finale » du 2026-10-21, puis code dans `questions/units`.
- **En attente de David** : rien.
- **PR suivante (validée)** : corriger le test « nombre simple » (`isSimpleNumberLatex`) : `(−3)` perfectible « parenthèses inutiles », `.5` et `5,` refusés (BIPM) — cases avec et sans unité, mesurée sur les modèles publiés.
- **Pièges en cours** : `3+2 m` réduit par `tidy` reste « 3 + 2 m » et `validateQuantityAnswer` le croit juste → exiger une seule grandeur ; le mode « attendu modèle » des cases sans unité est inutilisable après conversion (`1/2 h` pour 30 min refusé) ; messages d'unité validés (ne pas reformuler).
- **Worktree / branche** : `../ubumaths-wt-correction-cases-unite` · `refactor/correction-cases-unite-decoupage` ; sondes non suivies dans `src/lib/questions/units/__tests__/tmp/`.

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

### 2026-10-19 — #1545 mergée (PR 2)

- `parser.ts` : `extractValue` → `readExactValue` (`parseLatex` → `tidy` → `rationalOf`) ;
  `Quantity.value` = `number` ; `evaluateQuantityValue` et `evaluation_failed` retirés.
- `readsAsNumber` (évaluation en un réel fini) : `\sqrt{2}`, `\pi` sans unité → « N'oublie pas
  l'unité. » ; `abc`, `\infty` → « Réponse invalide ».
- Revue opus : rien de bloquant. Corrigé : `\infty` pris pour un nombre ; `\num{5}`, `5\text{ }`
  attendus de nouveau lus (`stripLatexSpacing`). Accepté : `checkUnit` muet sur une valeur non
  rationnelle (case fausse de toute façon).
- Écart de phase 0 tranché par David (suit ma reco) : saisies mal découpées avec unité écrite
  (`\sqrt{2} m`, `(5) m`, `.5 m`, `5,`) → « Réponse invalide : vérifier le format. » au lieu de
  « N'oublie pas l'unité. » (faux : l'unité y est). Verdicts inchangés.

### 2026-10-19 — PR 3, phase 0 validée par David

- Méthode A (revient sur « `valueIn` + températures via `convertAffine` ») : égalité stricte
  par `exactConversion` (mathAST/units/exact.ts), coefficient ET décalage exacts — températures
  comprises (°C : décalage 5463/20, °F : 5/9 et 45967/100). Plus de `FLOAT_NOISE` dans l'égalité.
- Sonde : 406 unités simples lisibles (préfixes compris), 0 sans conversion exacte.
- Changent : `\frac{1}{3}` m contre 0,333333333333333 m (juste → faux) ; 20,000000000001 °C
  contre 20 °C (juste → faux). Oracle attendu : 0 verdict, 0 message changé.
- Inchangé : tolérance et arrondis (`precision`) en flottants (aucun modèle publié) ; valeurs
  affichées en nombres décimaux ; `180°` contre `\pi` rad → « Erreur de configuration ».
- Unité sans conversion exacte (inatteignable) : test d'invariant + refus visible (comme des unités
  incompatibles), pas de repli en flottants.

### 2026-10-19 — #1547 mergée (PR 3)

- `exactBaseValue` (parser.ts) + `exactlyEqual` (quantity-comparison.ts) ; `FLOAT_NOISE` retiré.
- Revue opus : aucun bloquant. Appliqué : invariant renforcé (coefficient et décalage exacts =
  ceux des flottants, sur toutes les unités simples lisibles) ; commentaire de l'étiquette
  `incompatible_units` du refus sans conversion exacte (seul `isEqual` est lu).

### 2026-10-20 — PR 2 bis, phase 0 (en cours) ; #1552 mergée

- Vérifié dans mathAST (arbres) : `3+2\unit{m}` = addition(3, 2 m) ; `2\times3\unit{m}` = 2 × (3 m) ;
  `2\unit{m}\times3\unit{m}` = (2 m) × (3 m) → 6 m² ; `10^{3}\unit{m}`, `\frac{1}{2}\unit{m}`, `\sqrt{2}\unit{m}` :
  le facteur entier porte l'unité. Correction de David : `3+2 m` est 3 + (2 m), `2×3 m` est 2 × (3 m).
- #1552 : dans l'atelier, `2 m*3 m` donnait `2[m]*3 m` (m pris pour une lettre) → (2 m) × (3 m).

### 2026-10-21 — PR 2 bis, phase 0 (à valider)

Tranché par David le 2026-10-21 (suit ma reco) :

- Calcul écrit mais non effectué, de la bonne grandeur → FAUX `bad_form`, comme une case sans unité
  (`2\times3` pour 6 : « Ta réponse n'est pas écrite sous la forme demandée. », mesuré).
- Découpage #411 (`normalizeStudentQuantity`) gardé pour tout ce qu'il lit ; seconde lecture en arbre
  seulement quand il échoue. Le code de la carte de l'Atelier (`definitionFromField`) n'est pas repris :
  `5m` y est un produit, dans une case 5 mètres.

Seconde lecture (nouvelle fonction dans `questions/units`) : marquer les unités (`\operatorname{\mathrm{u}}`,
`\mathrm{u}`, `\min`, degré ; lettres nues juste après un chiffre ou une parenthèse si elles forment une
unité connue) en `\unit{u}` → `parseLatex` (lecture ADR 0031) → contrôle des dimensions (`quantityProblem`)
→ `tidy` → doit donner UNE grandeur (nombre rationnel × unité), comparée par la correction existante.

Comportements (mesurés par sonde le 2026-10-21, sauf « nouveau ») :

| Cas                                | Saisie                                                                                    | Attendu | Aujourd'hui                         | Après                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | ------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| A nominal                          | `6 m`, `6m`, `2,5 km`, `90 km/h`, `1,5·10³ m`, `12 500 m`, `−1/2 m`                       | idem    | JUSTE                               | inchangé                                                                             |
| A nominal                          | `6/2 m`                                                                                   | 3 m     | perfectible (fraction)              | inchangé                                                                             |
| B calcul, bonne grandeur           | `2×3 m`, `2×3m`, `3 m + 2 m`, `3m+2m`, `(3+2) m`, `10^3 m`, `2^3 m`, `1/2×4 m`, `2,5×2 m` | 6 m…    | FAUX « Unité inconnue : .3 m » etc. | FAUX `bad_form`, « Ta réponse n'est pas écrite sous la forme demandée. »             |
| B                                  | `2 m × 3 m`                                                                               | 6 m²    | « Unité inconnue : m.3 m »          | idem B                                                                               |
| B                                  | `3 h + 30 min`                                                                            | 210 min | « Unité inconnue : h +30 min »      | idem B                                                                               |
| C calcul, valeur fausse            | `2×3 m`                                                                                   | 7 m     | « Unité inconnue : .3 m »           | « Valeur incorrecte. »                                                               |
| C calcul, autre grandeur           | `2×3 kg`                                                                                  | 6 m     | « Unité inconnue »                  | « Cette unité ne mesure pas la bonne grandeur. »                                     |
| D nombre + grandeur (déjà tranché) | `3+2 m`                                                                                   | 5 m     | « Unité inconnue : +2 m »           | « On ne peut pas ajouter un nombre sans unité et une longueur. » (`quantityProblem`) |
| D irrationnel (déjà tranché)       | `2√2 m`, `3π m`                                                                           | 3 m     | « Unité inconnue : \sqrt{2} m »     | « Valeur incorrecte. »                                                               |
| E déjà tranché                     | `(−3) m`                                                                                  | −3 m    | « Réponse invalide »                | JUSTE perfectible, « Il y a des parenthèses inutiles. »                              |
| E déjà tranché                     | `.5 m`                                                                                    | 0,5 m   | « Réponse invalide »                | inchangé (refus, BIPM §5.4.4)                                                        |
| erreur                             | `3x m` (lettre)                                                                           | 3 m     | « Unité inconnue : x m »            | « Réponse invalide : vérifier le format. »                                           |
| erreur                             | `5xyz` (aucune unité)                                                                     | 5 m     | « Unité inconnue : xyz »            | inchangé                                                                             |

- Cohérence assumée : `10^3 m` refusé (`bad_form`) alors que `1,5·10³ m` est juste — comme sans unité
  (`10^{3}` pour 1000 : `bad_form`, mesuré).
- Oracle des 25 modèles publiés : 0 changement attendu (aucune saisie élève en prod).
- Exécution : tests rouges puis code par moi (2-3 fichiers de `questions/units`) ; revue `code-reviewer`
  en opus (correction des réponses).

### 2026-10-21 — PR 2 bis, phase 0 finale (validée par David)

Revient sur la phase 0 ci-dessus. Principe de David : **une fois l'unité séparée, la partie numérique est jugée
comme une case sans unité.** Mesuré : le mode « attendu modèle » des cases sans unité est inutilisable après
conversion (`1/2 h` pour 30 min, `−1/2 m`, `1,5·10³ m` deviendraient faux) ; le mode « nombre simple » (cases à
arrondi, `rulesSuffice`) est ce que la case à unité applique déjà au nombre (`isQuantityValueLatex`), notation
scientifique en plus. Validé : mode « nombre simple » + notation scientifique.

- Découpage #411 gardé ; s'il échoue (pas de découpage, ou unité illisible), seconde lecture en arbre :
  unités marquées → `parseLatex` → dimensions (`quantityProblem`) → `tidy` → UNE grandeur, comparée par
  `validateQuantityAnswer` (conversion, unité imposée, arrondi inchangés).
- Partie numérique pour la forme = la saisie, unités retirées (`2\times3`, `3+2`, `10^{3}`, `(-3)`).

| Saisie                                                                                           | Attendu       | Aujourd'hui                                     | Après                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `6 m`, `6m`, `2,5 km`, `1/2 h` (30 min), `1,5·10³ m`, `−1/2 m`                                   | —             | JUSTE                                           | inchangé                                                                |
| `6/2 m`                                                                                          | 3 m           | perfectible (fraction)                          | inchangé                                                                |
| `2×3 m`, `3 m + 2 m`, `(3+2) m`, `10^3 m`, `2^3 m`, `2 m × 3 m` (6 m²), `3 h + 30 min` (210 min) | même grandeur | « Unité inconnue : … » / message général        | FAUX `bad_form` « Ta réponse n'est pas écrite sous la forme demandée. » |
| `2×3 m`                                                                                          | 7 m           | « Unité inconnue : .3 m »                       | « Valeur incorrecte. »                                                  |
| `2×3 kg`                                                                                         | 6 m           | « Unité inconnue »                              | « Cette unité ne mesure pas la bonne grandeur. »                        |
| `3+2 m`                                                                                          | 5 m           | « Unité inconnue : +2 m »                       | « On ne peut pas ajouter un nombre sans unité et une longueur. »        |
| `2√2 m`, `3π m`                                                                                  | 3 m           | « Unité inconnue : … »                          | « Valeur incorrecte. »                                                  |
| `3x m`                                                                                           | 3 m           | « Unité inconnue : x m »                        | « Réponse invalide : vérifier le format. »                              |
| `(−3) m`                                                                                         | −3 m          | « Réponse invalide »                            | FAUX `bad_form` (mode nombre simple ; corrigé à la PR suivante)         |
| `.5 m`, `5, m`                                                                                   | 0,5 m, 5 m    | « Réponse invalide » / « Unité inconnue : , m » | JUSTE (idem, PR suivante)                                               |
| `5xyz`                                                                                           | 5 m           | « Unité inconnue : xyz »                        | inchangé                                                                |

- Limite : unité imposée + calcul à deux unités (`3 h + 30 min`, `min` imposée) → message d'unité imposée
  (la grandeur réduite est en h), pas « forme demandée ».
- Oracle des 25 modèles publiés : 0 changement attendu.
