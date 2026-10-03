# Séries : fonctions par question + avertissement « valeur négative sans parenthèses »

Branche `feat/serie-fonctions-avertissement` (worktree `ubumaths-wt-serie`). Décisions de David du 2026-10-03.

## 1. Séries d'automatismes : chaque question garde SES fonctions déclarées

- Cause : `buildSerie` laissait les formules maison `~…~` telles quelles ; l'écran et le PDF les
  relisaient avec `exercises.generic_functions` = union des `shared.genericFunctions` de tous les modèles.
- Rendu vérifié : une formule `$…$` n'est JAMAIS relue avec la liste (écran : `expressionToLatex`
  en `latex` = texte tel quel ; PDF : `toLocaleDecimal` + `convertLatexToTypstMath`, purement textuel).
- Solution : au moment de figer, chaque `~…~` / `~~…~~` devient `$…$` / `$$…$$` (LaTeX lu avec la
  liste DU modèle de la question). Plus de liste au niveau de l'exercice (`genericFunctions` retiré).
- Séries existantes (prod, lecture seule) : `c9266ff6` et `fc1b2aaa` (« Évolutions — série 1/2 »,
  topic Automatismes, category `automatisme`) : 0 formule `~…~`, `generic_functions` null. Le figé
  n'est pas réécrit : le changement ne vaut que pour les séries construites désormais.

## 2. Avertissement : valeur négative citée sans parenthèses

- `src/lib/questions/validators/negative-substitution.ts` ; `checkTemplate` (utilisé par
  `pnpm question:specs`) gagne `warnings` (n'affecte ni `passed` ni `reasons`).
- Signalé dans une formule : `{{a}}` nu, a négatif sur un tirage, après `-`/`+`/`\times`/`\cdot`/`*`/`^`,
  ou devant `^` (sauf `^\circ`) ; collé à un chiffre/lettre/`)` seulement si a prend aussi des
  valeurs positives (terme signé toujours négatif = voulu).
- Mesures : 209 JSON du dépôt → verdicts identiques à `main`, 0 avertissement ; 815 modèles de
  prod → 0 avertissement (2424 citations examinées ; 32 contextes suspects tous dans des blocs
  ` ```courbe `, hors formules).

## État

- [x] Tests rouges écrits puis verts (série à deux modèles ; 27 cas d'avertissement)
- [x] Implémentation points 1 et 2
- [x] Mesures (JSON du dépôt, prod, séries existantes : main = branche à l'octet)
- [x] Doc `docs/ref/fiches-exercices.md`
- [x] Suites worksheets/questions/ubumark/migration (9799 verts), `check:incremental` 0, `lint:fast`
