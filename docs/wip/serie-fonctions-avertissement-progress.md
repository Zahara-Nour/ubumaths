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

- `checkTemplate` (utilisé par `pnpm question:specs`) gagne `warnings` (n'affecte pas le verdict).

## État

- [x] Tests rouges écrits (série à deux modèles)
- [ ] Implémentation point 1
- [ ] Tests + implémentation point 2
- [ ] Mesures (JSON du dépôt, prod)
- [ ] Doc `docs/ref/fiches-exercices.md`
