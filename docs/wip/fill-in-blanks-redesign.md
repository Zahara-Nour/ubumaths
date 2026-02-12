# Fill-in-Blanks Redesign — Synthese de la session de reflexion

**Date** : 2026-02-10
**Objectif** : Redefinir le systeme fill-in-blanks pour unifier les 3 modes d'interaction de l'ancien systeme TinyMath.

---

## 1. Contexte : l'ancien systeme TinyMath

L'ancien systeme avait **3 modes d'interaction** distincts, determines par la structure de la question :

### Mode 1 — Result/Rewrite (369 questions, 58%)

L'expression est affichee, l'eleve donne le resultat. Le `=` et le format de reponse sont ajoutes dynamiquement.

```
expression: "10^&2*10^&3"
answerFormat: "10^?"
→ Flash : 10^2 × 10^3
→ Interactif : 10^2 × 10^3 = 10^{[___]}
```

Un seul MathField contenant `expression_latex + '=' + answerFormat_latex` avec les `?` remplaces par `\placeholder[N]{}`.

Sous-cas :

- **Avec answerFormat** (15 questions) : `10^?`, `?*10^?`, `&1^?` — contraint la forme visuelle de la reponse
- **Sans answerFormat** (354 questions) : defaut `?` — l'eleve tape librement apres le `=`

### Mode 2 — AnswerField (157 questions, 25%)

Le champ de reponse est une phrase en francais avec des `...` remplaces par des MathField.

```
answerField: '\text{Le double de }$$&1$$\text{ est }$$...$$\text{.}'
→ "Le double de 7 est [___]."
```

Tous les `...` etaient dans des zones `$$...$$` — ce sont des **trous math**, pas texte. Un seul MathField contenant le texte LaTeX + `\placeholder[N]{}`.

Sous-cas :

- **Mono-trou** (~142 questions) : `\text{...}$$...$$\text{.}` ou `$$x=...$$`
- **Multi-trous** (~15 questions) : chiffre centaines + dizaines + unites (2-4 answerFields)

### Mode 3 — Fill-in (107 questions, 17%)

L'expression contient des `?` que l'eleve doit completer.

```
expression: "(-&1)*?=[_-&1*&2_]"
→ (-3) × [___] = -12
```

Un seul MathField contenant l'expression avec `\placeholder[N]{}` a la place des `?`.

### Comment MathLive gerait les blancs

TinyMath utilisait le systeme natif de **prompts** de MathLive :

```javascript
// Construction : remplacer les marqueurs par des placeholders nommes
function addPlaceholder() {
	return `\\placeholder[${nfields++}]{}`;
}

// Injection dans un seul MathField
mathField.setValue(field);

// Lecture des reponses via l'API prompts
mathField.getPrompts().forEach((id) => {
	answers_latex[parseInt(id)] = mathField.getPromptValue(id);
	answers[parseInt(id)] = mathField.getPromptValue(id, 'ascii-math');
});
```

API MathLive utilisee :

- `\placeholder[id]{}` → `PromptAtom` (champ editable identifie)
- `\placeholder[id][correct]{}` / `\placeholder[id][incorrect]{}` → feedback visuel
- `\placeholder[id][locked]{}` → non editable
- `mf.getPromptValue(id)` → lire la valeur saisie
- `mf.setPromptValue(id, value)` → ecrire une valeur
- `mf.getPrompts()` → lister tous les prompts
- Source : `extern/mathlive/src/atoms/prompt.ts` et `extern/mathlive/src/atoms/placeholder.ts`

---

## 2. Etat actuel du nouveau systeme

### 7 types de questions definis (`src/lib/questions/types.ts:65-72`)

```typescript
type QuestionType =
	| 'numerical_exact' // 406 questions (64%) — fourre-tout
	| 'numerical_decimal' // 73 questions (11.5%)
	| 'numerical_rounded' // 0 questions
	| 'numerical_with_unit' // 0 questions
	| 'algebraic_transform' // 0 questions
	| 'fill_in_blanks' // 107 questions (17%)
	| 'multiple_choice'; // 47 questions (7.4%)
```

**Problemes identifies** :

- `numerical_exact` contient 406 questions tres heterogenes (calcul simple, transformations algebriques, phrases-reponses)
- 3 types jamais utilises (rounded, with_unit, algebraic_transform)
- Les 157 answerField sont classees `numerical_exact` alors qu'elles sont des fill-in-blanks
- Les 45 questions "developper/factoriser" sont classees `numerical_exact` au lieu de `algebraic_transform` (bug de detection)

### Le composant FillBlanksInput actuel (`src/lib/components/question-inputs/FillBlanksInput.svelte`)

Approche actuelle : split le statement sur `____` (4 underscores) et intercale des MathField separes.

```typescript
const segments = $derived(statement.split('____'));
```

**Probleme** : les questions migrees contiennent des `?` dans les variables expression, pas des `____`. Aucune etape du pipeline ne fait la conversion `?` → `____`. De plus, cette approche n'utilise pas le systeme natif de prompts de MathLive.

### ComputeEngine remplace par mathAST

`@cortexjs/compute-engine` n'est plus dans `package.json`. Tout passe par le moteur maison `mathAST` :

- `evaluateExpression()` → `mathAST/parser` + `mathAST/eval`
- `areEquivalent()` → `mathAST/normal` (normalisation structurelle + fallback numerique)
- `simplifyExpression()` → `mathAST/normal`
- Source : `src/lib/math/index.ts`

Le fichier `src/lib/questions/units/ce-integration.ts` porte un nom residuel "ce" mais importe depuis `$lib/math` (mathAST).

---

## 3. Decisions prises

### 3.1 Syntaxe des trous

| Type       | Syntaxe | Contexte                | Rendu                                    |
| ---------- | ------- | ----------------------- | ---------------------------------------- |
| Trou math  | `?`     | Dans `$...$`            | MathLive `\placeholder[N]{}`             |
| Trou texte | `[_]`   | Dans le texte hors math | Champ texte editable avec autocompletion |

### 3.2 Trous texte — specifications

| Aspect         | Decision                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| Scope          | Un seul mot                                                                                 |
| Autocompletion | Pool par question si defini, sinon dictionnaire global FR de vocabulaire math               |
| Declenchement  | Des 2-3 lettres tapees                                                                      |
| Saisie libre   | Oui, mais feedback visuel si le mot n'est pas dans le dictionnaire/pool                     |
| Validation     | Fuzzy : accents ignores, casse ignoree, distance de Levenshtein <= 1 → accepte sans warning |

### 3.3 Unification answerField → fill-in-blanks

Les 157 questions answerField deviennent des fill-in-blanks avec trous math. Le template de phrase `\text{Le double de }$$&1$$\text{ est }$$...$$\text{.}` devient un statement ubumark :

```
Le double de ${{a}}$ est $?$.
```

### 3.4 Convention de nommage `expression` (variable dont le nom commence par `expression`)

Une variable dont le nom commence par `expression` (ex: `expression1`) est une **convention de nommage** (pas un mode de rendu). Elle represente une expression mathematique que l'eleve doit evaluer. Le template decide si l'expression est en mode bloc (`$${{expression1}}$$`) ou inline (`${{expression1}}$`) selon le contexte.

#### Tagging AST des expressions

Le content-resolver detecte les variables dont le nom commence par `expression` pendant la resolution. Il insere un marqueur `<<expr:NAME>>` avant la valeur resolue dans le markdown :

```
Template :  $${{expression1}}$$
Resolu :    $$<<expr:expression1>>10^2 \times 10^3$$
```

Le parser ubumark reconnait `<<expr:NAME>>` au debut d'une zone math (inline ou bloc), cree le noeud avec l'attribut `expressionName`, et supprime le marqueur du contenu :

```typescript
// MathBlockNode ou MathInlineNode avec tag expression
{
  type: 'math-block',           // ou 'math-inline'
  expression: "10^2 \\times 10^3",  // marqueur supprime
  syntax: 'latex',
  expressionName: "expression1"      // tag ajoute par le parser
}
```

Les types AST `MathInlineNode` et `MathBlockNode` recoivent un champ optionnel `expressionName?: string`.

#### Dans le generateur

La variable est resolue normalement dans le statement (avec insertion du marqueur `<<expr:NAME>>`). En plus, le generateur extrait les metadonnees dans un champ `expressions` sur l'instance :

```typescript
// Champ ajoute sur QuestionInstance
expressions?: {
  name: string;           // "expression1"
  latex: string;          // "10^2 \\times 10^3"
  answerFormat?: string;  // "10^?" en LaTeX — absent si l'expression contient deja des ?
}[]
```

#### Pipeline de resolution answerFormat

Les `answerFormats` dans le template peuvent contenir des references de variables (ex: `"{{a}}^?"` pour l'ancien `&1^?`). Le generateur applique la meme pipeline que pour le contenu markdown :

1. **Resolution des variables** : `"{{a}}^?"` → `"5^?"` (via `resolveExpression()`)
2. **Conversion en LaTeX** : `"5^?"` → `"5^?"` (via `convertMathZonesToLatex()` — ici trivial, mais necessaire pour des cas comme `"{{a}}/{{b}}*?"` → `"\frac{5}{3} \times ?"`)
3. **Stockage dans l'instance** : `expressions[i].answerFormat = "5^?"` (en LaTeX, pret pour le composant)

Le composant recoit donc du LaTeX pret a l'emploi et n'a qu'a remplacer les `?` par `\placeholder[N]{}`.

#### Dans le composant

Le composant identifie les noeuds expression grace au tag `expressionName` sur les noeuds AST (pas de matching LaTeX). Puis :

- **Flash** : rend le statement tel quel (l'expression seule)
  ```
  $$10^2 \times 10^3$$
  ```
- **Interactif** : augmente le noeud math en y appendant `= answerFormat` avec `\placeholder`
  ```
  $$10^2 \times 10^3 = 10^{\placeholder[0]{}}$$
  ```

Si l'expression contient deja des `?` (107 questions fill-in dans l'expression, ex: `(-3) \times ? = -12`), `answerFormat` est absent et les `?` sont traites comme des trous standards (voir section 3.6).

### 3.5 Distinction answerFormat vs requiredForm

| Champ           | Role                                                                    | Concerne       | Exemple                                   |
| --------------- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| `answerFormats` | Forme **visuelle** de la zone de saisie a droite du `=`, per-expression | **UI**         | `{ "expression1": "10^?" }`, defaut `"?"` |
| `requiredForm`  | Contrainte sur la **structure** de la reponse                           | **Validation** | `product`, `sum`, pattern custom          |

Ce sont deux axes orthogonaux :

- `answerFormats: { "expression1": "10^?" }` → l'eleve voit `= 10^{[___]}`, ne remplit que l'exposant
- `requiredForm = "product"` → la reponse `2 × 6` est acceptee mais `12` refuse

Note : `requiredForm` est per-blank (voir section 3.7), pas per-question. `answerFormats` est per-expression sur le template (voir section 4.3).

### 3.6 Rendu unifie des trous

Le statement est toujours la source unique de rendu. Deux marqueurs universels de trous :

| Marqueur | Contexte                   | Flash                                 | Interactif                                          |
| -------- | -------------------------- | ------------------------------------- | --------------------------------------------------- |
| `?`      | Dans `$...$` (trou math)   | Rendu comme `?` visible               | Rendu comme `\placeholder[N]{}` (MathLive editable) |
| `[_]`    | Dans le texte (trou texte) | Rendu comme indicateur visuel de trou | Rendu comme `<input>` texte avec autocompletion     |

Regle supplementaire pour les expressions : si `instance.expressions` existe, le composant augmente le noeud math correspondant avec `= answerFormat[\placeholder]` en mode interactif (voir section 3.4).

### 3.7 Validation per-blank

Chaque trou est valide individuellement. Le type de trou determine le pipeline de validation.

#### Mode de validation infere (pas de champ `validationType`)

Le mode de validation est **infere du contexte**, sans champ explicite :

| Contexte                      | Mode                  | Fonction                                                                                                                            |
| ----------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ni `precision` ni `unit`      | **Equivalence**       | `areEquivalent()` (`src/lib/math/index.ts`) — normalisation structurelle + fallback numerique                                       |
| `precision` present           | **Approximate**       | `validateNumerical()` (`src/lib/utils/answer-validator.ts`) — evaluation numerique + comparaison selon precision                    |
| `unit.expected` present       | **Unite**             | `validateQuantityAnswer()` (`src/lib/questions/units/validator.ts`) — parsing LaTeX quantite, conversion unites, comparaison valeur |
| `precision` + `unit.expected` | **Unite + tolerance** | `validateQuantityAnswer()` avec tolerance derivee de `precision`                                                                    |
| Trou texte                    | **Fuzzy text**        | Matching accents/casse ignores, Levenshtein <= 1                                                                                    |

#### Structure template-side (QuestionVariation / SharedVariationDefaults)

**Defauts au niveau question** (sur `shared` ou variation) :

```typescript
// Defauts de validation appliques a tous les blanks math de la question
blankDefaults?: {
  precision?: PrecisionType;
  requiredForm?: RequiredForm;
  unit?: {
    expected: boolean;          // true = l'eleve doit fournir l'unite
    required?: string;          // unite imposee (ex: "m"). Si absent → libre
    requireSameSymbol?: boolean; // true = symbole exact (pas de conversion)
  };
}
```

**Blanks per-variation** (tableau positionnel, l'index = position du trou) :

```typescript
blanks?: {
  expectedAnswer: string;   // Expression template ("{{eval:{{a}}+{{b}}}}", "entier")
  prefilled?: string;       // Valeur pre-remplie (template expression)
  pool?: string[];           // Trou texte : autocompletion + solutionPool

  // Overrides per-blank (ecrasent blankDefaults si definis)
  precision?: PrecisionType;
  requiredForm?: RequiredForm;
  validationRules?: ValidationRule[];

  // Config unites (optionnel, override blankDefaults.unit)
  unit?: {
    expected: boolean;          // true = l'eleve doit fournir l'unite
    required?: string;          // unite imposee (ex: "m")
    requireSameSymbol?: boolean; // true = symbole exact
  };
}[]
```

Le `type` (`'math'` ou `'text'`) n'est pas specifie dans le template — il est infere par le generateur a partir du contexte (dans `$...$` = math, dans le texte = text).

#### Distinction trous avec/sans unite dans la syntaxe custom

| Syntaxe custom                                            | Rendu          | Blank attend                                                |
| --------------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| `$5[km] = ?[m]$`                                          | 5 km = [___] m | Nombre pur (`"5000"`) — l'unite est dans l'expression       |
| `$5[km] = ?$` + `unit.expected: true`                     | 5 km = [___]   | Nombre + unite (`"5000\unit{m}"`) — l'eleve fournit l'unite |
| `$5[km] = ?$` + `unit: { expected: true, required: "m" }` | 5 km = [___]   | Nombre + unite imposee — seule "m" est acceptee             |

Quand `unit.expected` est present, l'analyse dimensionnelle (`checkDimensionalConsistency()`) est executee **a la validation** sur l'expression complete (statement + reponse inseree) pour verifier la coherence des dimensions.

#### Structure instance-side (QuestionInstance)

Le generateur fusionne `blankDefaults` + overrides per-blank et infere `type` :

```typescript
blanks?: {
  expectedAnswer: string;        // Resolu (math: "10^5", texte: "entier")
  expectedAnswerLatex?: string;  // LaTeX pour flash back (trous math uniquement)
  type: 'math' | 'text';        // Infere du contexte par le generateur
  prefilled?: string;            // Resolu

  // Trou math — validation (fusionnee depuis blankDefaults + override)
  precision?: PrecisionType;
  requiredForm?: RequiredForm;
  validationRules?: ValidationRule[];

  // Config unites (fusionnee)
  unit?: {
    expected: boolean;
    required?: string;
    requireSameSymbol?: boolean;
  };

  // Trou texte — validation
  pool?: string[];           // pour autocompletion + solutionPool
}[]
```

#### Pipelines de validation

**Pipeline pour un trou texte** : fuzzy matching contre `expectedAnswer` (accents/casse ignores, Levenshtein <= 1). Si `pool` defini, solutionPool matching.

**Pipeline pour un trou math** :

1. `validationRules` custom si presentes → short-circuit. **Sinon** : validation selon le mode infere :
   - Si `unit.expected` : `validateQuantityAnswer()` (avec tolerance si `precision` present)
   - Si `precision` (sans unite) : `validateNumerical()` avec `precision`
   - Sinon : `areEquivalent()` (equivalence structurelle/symbolique)
2. Si `unit.expected` et reponse correcte : `checkDimensionalConsistency()` sur l'expression complete
3. `checkRequiredForm()` — si reponse correcte + `requiredForm` defini + LaTeX disponible
4. `applyConstraints()` — si reponse correcte + LaTeX disponible

**Donnees collectees par le composant** pour chaque trou math :

- Valeur ascii-math (via `getPromptValue(id, 'ascii-math')`)
- LaTeX (via `getPromptValue(id)`) — necessaire pour les etapes 2 et 3

#### Interface composant → parent

FillBlanksInput fournit **deux tableaux paralleles** au composant parent (FlashCard/QuestionCard) :

- `values: string[]` — ascii-math pour les trous math, texte brut pour les trous texte
- `valuesLatex: string[]` — LaTeX pour les trous math (string vide pour les trous texte)

Le parent passe les deux au validateur : `validateAnswer(values, instance, valuesLatex)`.

### 3.8 Source des reponses correctes

**Pour `fill_in_blanks`** : `blanks[]` est la seule source de verite. Le champ `solution` est **optionnel** (`solution?: string | string[]`) et absent pour `fill_in_blanks`. Les reponses pour le flash back se reconstruisent en remplacant chaque `?`/`[_]` par `blanks[i].expectedAnswer` dans le statement.

**Pour `multiple_choice` et `open_answer`** : `solution` reste la source de verite (presente et requise).

**Pas d'evaluation automatique** : l'ancien systeme TinyMath derivait la solution de l'expression (`math(expression).eval()`). Le nouveau systeme utilise `{{eval:...}}` dans les templates (ex: `expectedAnswer: '{{eval:{{a}}+{{b}}}}'`), resolu explicitement pendant la generation. Pas de magie implicite.

### 3.9 Lien expressions ↔ blanks

Pour les questions avec la convention `expression`, les `?` ne sont pas dans le statement — ils sont dans l'`answerFormat`, ajoutes par le composant en mode interactif. Mais la validation a besoin de `blanks[].expectedAnswer`.

**Decision : blanks explicites dans le template.** L'auteur specifie les blanks correspondant aux `?` de l'answerFormat.

```
// Exemple : expression simple (answerFormat defaut "?")
statement: "$${{expression1}}$$"
blanks: [{ expectedAnswer: "{{eval:{{expression1}}}}" }]

// Exemple : answerFormat avec forme (10^?)
statement: "$${{expression1}}$$"
answerFormats: { "expression1": "10^?" }
blanks: [{ expectedAnswer: "{{eval:{{a}}+{{b}}}}" }]

// Exemple : answerFormat multi-trous (?*10^?)
statement: "$${{expression1}}$$"
answerFormats: { "expression1": "?*10^?" }
blanks: [
  { expectedAnswer: "{{a}},{{b}}" },
  { expectedAnswer: "{{c}}" }
]
```

#### Ordre de numerotation des blanks : ordre naturel du document

Les blanks sont numerotes dans l'**ordre naturel d'apparition** dans le document rendu. Quand le composant rencontre un noeud expression (identifie par le tag `expressionName`), les `?` de son `answerFormat` sont comptes **a cet endroit du document**, pas a la fin.

```
// Exemple : expression + blanks dans le statement
Statement: $${{expression1}}$$ et $?+?=10$
answerFormats: { "expression1": "?" }
blanks: [
  { expectedAnswer: "{{eval:...}}" },  // blank 0 : le ? de expression1 (position naturelle)
  { expectedAnswer: "..." },           // blank 1 : premier ? de $?+?=10$
  { expectedAnswer: "..." }            // blank 2 : deuxieme ? de $?+?=10$
]
```

Cet ordre est plus intuitif que l'ancien schema (statement d'abord, answerFormats ensuite) car il suit la lecture gauche-a-droite du document final.

Le transformer de migration genere automatiquement ces blanks a partir des anciennes `solutionss`.

---

## 4. Decisions sur les questions en suspens

**Date** : 2026-02-11

### 4.1 Multi-trous : association trou ↔ reponse

**Decision : numerotation globale positionnelle (approche A).**

Tous les trous sont numerotes dans l'ordre d'apparition, quel que soit leur type (math ou texte). Le type est deduit automatiquement du contexte (dans `$...$` = math, hors math = texte).

```
Statement : $? + ?$ est un nombre [_].
blanks: [
  { expectedAnswer: '3', type: 'math' },
  { expectedAnswer: '7', type: 'math' },
  { expectedAnswer: 'entier', type: 'text' }
]
→ trou 0 (math) = '3', trou 1 (math) = '7', trou 2 (texte) = 'entier'
```

Les trous nommes (`?:id`, `[_:id]`) ne sont pas implementes en v1. Le positionnel couvre les 633 questions actuelles. Extension possible plus tard sans casser l'existant.

#### Indexation 0-based partout

**Decision : tout est 0-based.** L'index d'un trou correspond a sa position dans le tableau `blanks[]`.

| Element                  | Base    | Exemple                       |
| ------------------------ | ------- | ----------------------------- |
| `blanks[]` (tableau)     | 0-based | `blanks[0]` = premier trou    |
| `BlankNode.index` (AST)  | 0-based | `{{blank:0}}` = premier trou  |
| `InputState.index`       | 0-based | `index: 0` = premier trou     |
| `\placeholder[N]{}` (ML) | 0-based | `\placeholder[0]{}` = premier |

Mapping direct : `blanks[i]` ↔ `BlankNode.index === i` ↔ `InputState.index === i` ↔ `\placeholder[i]{}`. Aucune conversion `+1`/`-1` necessaire.

Note : `BlankNode.index` et `InputState.index` etaient precedemment 1-based. Ce changement simplifie le code et elimine les bugs off-by-one. La syntaxe `{{blank:N}}` utilisee par l'editeur TipTap passe aussi en 0-based — le prof ne voit jamais le numero brut (il voit des chips visuels).

### 4.2 Mixite des types de trous

**Decision : mixte autorise.**

Un meme statement peut contenir des trous math (`$?$`) ET des trous texte (`[_]`).

```
// Template
statement: "$f(x) = ?$ est une fonction [_]."
blanks: [
  { expectedAnswer: '2x+1' },
  { expectedAnswer: 'affine' }
]

// Instance (apres generation)
blanks: [
  { expectedAnswer: '2x+1', type: 'math' },
  { expectedAnswer: 'affine', type: 'text' }
]
```

L'implementation le supporte naturellement avec la numerotation globale. Pas de cas d'usage immediat dans les 633 questions actuelles, mais des cas futurs prevus. Aucune restriction artificielle n'est ajoutee.

### 4.3 Ou stocker answerFormat

**Decision : per-expression, sur `shared`, overridable par variation.**

```typescript
// Dans SharedVariationDefaults ou QuestionVariation
answerFormats?: Record<string, string>;

// Exemple : une expression
answerFormats: { "expression1": "10^?" }

// Exemple : deux expressions simultanees
answerFormats: { "expression1": "10^?", "expression2": "?*10^?" }
```

La cle est le nom de la variable expression. Si une expression n'a pas d'entree, le defaut est `"?"` (champ libre apres le `=`).

Le generateur copie le format correspondant dans chaque `instance.expressions[i].answerFormat` (voir section 3.4).

### 4.4 Refonte des types de questions

**Decision : 3 types UI purs. Validation separee du type.**

| Type              | Mode d'interaction                                  | Couvre                                                 |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `fill_in_blanks`  | Trous dans le statement (`?`, `[_]`, `{{blank:N}}`) | Result/rewrite + answerField + fill-in (586 questions) |
| `multiple_choice` | Choix parmi des propositions                        | 47 questions                                           |
| `open_answer`     | Champ reponse separe, sans trou dans le statement   | Flash cards pures, questions orales                    |

Les 7 types actuels sont reduits a 3. Les types `numerical_exact`, `numerical_decimal`, `numerical_rounded`, `numerical_with_unit`, `algebraic_transform` disparaissent. La distinction exact/decimal/tolerance releve de la **validation**, pas du mode d'interaction UI. La validation est configuree per-blank (`validationType`, `precision`, `requiredForm` — voir section 3.7).

Pour `fill_in_blanks`, le champ `solution` est **optionnel** et absent — `blanks[]` est la seule source de verite (voir section 3.8). `solution` reste requis pour `multiple_choice` et `open_answer`.

### 4.5 Dictionnaire de vocabulaire mathematique

**Decision : dictionnaire riche, source unique pour l'application.**

Structure d'une entree :

```typescript
interface MathTerm {
	term: string; // le mot
	tags: string[]; // ['geometrie', 'triangles'] — tags au lieu d'une categorie unique
	definition: string; // markdown, peut contenir du LaTeX ($...$)
	image?: string; // chemin vers une image (optionnel)
	level: GradeCode; // niveau d'introduction (reutilise le systeme de grades existant)
	synonyms?: string[]; // termes equivalents
}
```

Choix architecturaux :

- **Tags au lieu de categorie unique** : un terme peut appartenir a plusieurs themes (ex: "Pythagore" → `['geometrie', 'triangles', 'calcul']`). Resout le probleme des termes a cheval sur plusieurs domaines.
- **`level` = niveau d'introduction** (pas le niveau le plus pertinent). Utilise `GradeCode` du systeme existant (`src/lib/types/grades.ts`).
- **Emplacement** : `src/lib/data/math-dictionary-fr.ts`
- **Usages multiples** : autocompletion fill-in, glossaire, listes de vocabulaire par niveau/theme, aide contextuelle.
- **Pool par question** : une question peut definir `blanks[i].pool` pour restreindre l'autocompletion a un sous-ensemble de mots.

Vues derivees :

- `getTermsForLevel('4')` → tous les termes introduits en 4e ou avant
- `getTermsByTag('geometrie')` → tous les termes avec ce tag
- `getTermsByTagAndLevel('geometrie', '4')` → intersection
- `getAllTerms()` → liste plate pour validation fuzzy

### 4.6 Migration des 369 questions result/rewrite

**Decision : migration 100% automatique dans le transformer.**

Le transformer (`question-transformer.ts`) :

1. Detecte les questions result/rewrite
2. Change le type en `fill_in_blanks`
3. Extrait l'`answerFormat` depuis les donnees TinyMath (si present) → `shared.answerFormats: { "expression1": "10^?" }`
4. Si pas d'answerFormat source → pas d'entree (defaut `"?"` applique par le generateur)

Pas de passe manuelle. Validation par script apres migration pour verifier la coherence.

### 4.7 Composant FillBlanksInput a refaire

**Decision : un seul chemin de rendu (parcours AST unifie).**

Le composant parcourt l'AST ubumark du statement noeud par noeud et route vers les bons elements DOM :

- `TextNode` → `<span>`
- `BlankNode` / `[_]` → `<input>` texte avec autocompletion (interactif) ou indicateur visuel (flash)
- `MathInlineNode`/`MathBlockNode` contenant `?` → `<MathField>` avec `\placeholder[N]{}` (interactif) ou `?` visible (flash)
- `MathInlineNode`/`MathBlockNode` sans `?` → `<MathField>` en lecture seule

Pour les questions avec `instance.expressions` : en mode interactif, le composant identifie les noeuds expression **grace au tag `expressionName`** sur les noeuds AST (voir section 3.4) et augmente leur contenu avec `= answerFormat[\placeholder]`.

Le parser ubumark existant produit deja l'AST necessaire (`BlankNode`, `MathInlineNode`, `MathBlockNode`, `TextNode`). Le composant n'a qu'a mapper les noeuds vers les bons elements DOM selon le mode (flash vs interactif).

#### Interface de sortie

Le composant fournit **deux tableaux paralleles** au parent :

- `values: string[]` — ascii-math pour les trous math, texte brut pour les trous texte
- `valuesLatex: string[]` — LaTeX pour les trous math (string vide pour les trous texte)

Le parent passe les deux au validateur pour supporter `checkRequiredForm()` et `applyConstraints()` (voir section 3.7).

#### Flash back (RESOLU)

Pour le flash back (affichage de la reponse), le composant augmente le noeud math expression avec `= reponseResolue` au lieu de `= answerFormat[\placeholder]`.

Le generateur fournit `blanks[i].expectedAnswerLatex` pour chaque trou, via la meme pipeline de conversion que pour `answerFormat` :

1. **Resolution des variables** : `expectedAnswer: "{{eval:{{a}}+{{b}}}}"` → `"5"`
2. **Conversion en LaTeX** : `"5"` → `"5"` (via le meme pipeline custom → LaTeX)
3. **Stockage** : `blanks[i].expectedAnswerLatex = "5"`

En mode flash back, le composant :

- Trous dans le statement (`?`) : remplace par `expectedAnswerLatex` en lecture seule
- Trous dans les expressions : construit `expression = answerFormatResolu` ou chaque `?` de l'answerFormat est remplace par `expectedAnswerLatex` correspondant
- Trous texte (`[_]`) : affiche `expectedAnswer` dans un `<span>` stylise

Exemple : answerFormat `"10^?"`, blank `expectedAnswerLatex: "5"` → flash back : `$$10^2 \times 10^3 = 10^{5}$$`

### 4.8 Syntaxe des trous texte : `[_]` et `{{blank:N}}` coexistent

**Decision : les deux syntaxes sont maintenues.**

| Syntaxe       | Contexte                          | Utilisateur              | Numerotation         |
| ------------- | --------------------------------- | ------------------------ | -------------------- |
| `[_]`         | Templates de questions, migration | Developpeur / systeme    | Positionnelle (auto) |
| `{{blank:N}}` | Editeur riche TipTap              | Prof qui cree l'exercice | Explicite (N)        |

Raison : `{{blank:N}}` est utilise par l'extension TipTap `BlankField` (`src/lib/extensions/blank-extension.ts`) pour l'edition visuelle avec chips, popover, navigation clavier. Le numero explicite est necessaire pour le round-trip markdown ↔ TipTap JSON et le reordonnancement dans l'editeur.

`[_]` est un sucre syntaxique positionnel pour les cas simples. Le parser ubumark produit le meme `BlankNode` dans les deux cas.

**Restriction : les deux syntaxes ne doivent pas etre melangees dans le meme statement.** Un statement utilise soit `[_]` (positionnelle), soit `{{blank:N}}` (explicite), pas les deux. En pratique, `[_]` est utilise dans les templates textuels et la migration, `{{blank:N}}` dans l'editeur TipTap.

---

## 5. Fichiers de reference

### Systeme de questions

- `src/lib/questions/types.ts` — Types (QuestionTemplate, QuestionInstance, QuestionType)
- `src/lib/questions/generator/instance-generator.ts` — Generation d'instances
- `src/lib/questions/generator/content-resolver.ts` — Resolution markdown → LaTeX
- `src/lib/utils/answer-validator.ts` — Validation des reponses
- `src/lib/questions/constraint-validators.ts` — 11 validateurs de contraintes
- `src/lib/questions/required-form-validator.ts` — Validation de forme structurelle
- `src/lib/questions/validation-rule-evaluator.ts` — Regles de validation dynamiques

### Composants UI

- `src/lib/components/questions/FlashCard.svelte` — Carte interactive avec flip
- `src/lib/components/questions/QuestionCard.svelte` — Carte simple
- `src/lib/components/question-inputs/FillBlanksInput.svelte` — Composant actuel (a refaire)
- `src/lib/components/question-inputs/MathInput.svelte` — Input MathLive
- `src/lib/components/question-inputs/MultipleChoiceInput.svelte` — Choix multiples
- `src/lib/components/MathField.svelte` — Wrapper MathLive

### Migration

- `src/lib/migration/question-transformer.ts` — Transformation TinyMath → nouveau format
- `src/lib/migration/old-question-types.ts` — Types de l'ancien systeme
- `docs/wip/question-migration-status.md` — Etat de la migration (633 questions, import pending)

### MathLive

- `extern/mathlive/src/atoms/placeholder.ts` — PlaceholderAtom (symbole visuel)
- `extern/mathlive/src/atoms/prompt.ts` — PromptAtom (champ editable avec id, correctness, locked)
- `extern/mathlive/src/core/parser.ts:1559-1593` — Parsing de `\placeholder[id]{}`
- `extern/mathlive/src/public/mathfield-element.ts` — API publique (getPromptValue, setPromptValue, getPrompts)

### Ancien systeme (reference)

- `extern/new-tinymath/apps/ubumaths/src/lib/ui/Question.svelte` — Ancien composant question
- `extern/new-tinymath/apps/ubumaths/src/types/type.ts` — Anciens types (4 modes d'interaction)
- `extern/new-tinymath/apps/ubumaths/src/lib/questions/generateQuestion.ts` — Ancien generateur

---

## 6. Statistiques des 633 questions migrees

### Par type detecte (actuel)

| Type              | Count | %     |
| ----------------- | ----- | ----- |
| numerical_exact   | 406   | 64.1% |
| fill_in_blanks    | 107   | 16.9% |
| numerical_decimal | 73    | 11.5% |
| multiple_choice   | 47    | 7.4%  |

### Par mode d'interaction reel (ancien systeme)

| Mode           | Count | %   | Nouveau traitement                                                                       |
| -------------- | ----- | --- | ---------------------------------------------------------------------------------------- |
| Result/rewrite | 369   | 58% | Convention `expression` (variable dont le nom commence par `expression`) + answerFormats |
| AnswerField    | 157   | 25% | Statement avec `$?$`                                                                     |
| Fill-in        | 107   | 17% | Expression avec `?` dans la formule                                                      |

### Par theme

| Theme            | Questions |
| ---------------- | --------- |
| Entiers          | 228       |
| Decimaux         | 83        |
| Calcul litteral  | 68        |
| Fractions        | 58        |
| Grandeurs        | 45        |
| Fonctions        | 39        |
| Relatifs         | 36        |
| Proportionnalite | 28        |
| Puissances       | 21        |
| Suites           | 15        |
| Racines carre    | 10        |
| Probabilites     | 2         |

---

## 7. Prochaines etapes

~~1. Trancher les questions en suspens (4.1 a 4.7)~~ **FAIT** (2026-02-11)

~~1bis. Corriger les erreurs du doc de redesign~~ **FAIT** (2026-02-12) — voir corrections 1-4

~~1ter. Design review : identifier et resoudre les lacunes~~ **FAIT** (2026-02-12) — 6 gaps identifies, tous resolus. Decisions : tag AST `<<expr:NAME>>`, indexing naturel, solution optionnel, interface values+valuesLatex, pas de mix `[_]`/`{{blank:N}}`, flash back via `expectedAnswerLatex` + meme pipeline que answerFormat, pipeline answerFormat documente (resolution variables + conversion LaTeX)

2. Definir les types TypeScript mis a jour

   - `QuestionType` : 3 types (`fill_in_blanks`, `multiple_choice`, `open_answer`)
   - Structure `blanks[]` positionnelle avec validation per-blank (`precision`, `requiredForm`, `unit`)
   - Pas de champ `validationType` — mode infere : `precision` → approximate, `unit.expected` → unites, defaut → equivalence
   - Champ `expressions[]` sur `QuestionInstance` pour la convention expression
   - `answerFormats?: Record<string, string>` sur shared/variation
   - `solution` optionnel (`solution?: string | string[]`), absent pour `fill_in_blanks` (blanks seule source de verite)

3. Ajouter le support de `[_]` et `<<expr:NAME>>` dans le parser ubumark

   - `[_]` : sucre syntaxique positionnel → meme `BlankNode` que `{{blank:N}}`
   - `<<expr:NAME>>` : marqueur d'expression → `expressionName` sur `MathInlineNode`/`MathBlockNode`
   - Ajout de `expressionName?: string` sur les types AST `MathInlineNode` et `MathBlockNode`
   - Detection des `?` dans les noeuds math pour les trous math

4. Implementer le nouveau FillBlanksInput

   - Un seul chemin de rendu : parcours AST unifie (pas deux modes)
   - `?` → `?` visible (flash) ou `\placeholder[N]{}` (interactif)
   - `[_]` → indicateur visuel (flash) ou `<input>` texte (interactif)
   - Si `instance.expressions` : augmenter le noeud math avec `= answerFormat[\placeholder]` en interactif
   - Integration dans FlashCard.svelte et QuestionCard.svelte

5. Adapter le pipeline de generation

   - `instance-generator` : detecter les variables `expression`, extraire metadonnees dans `instance.expressions[]`
   - `instance-generator` : copier `answerFormats` du template vers `expressions[i].answerFormat`
   - `instance-generator` : construire `blanks[]` avec type et config de validation per-blank

6. Adapter la validation

   - `answer-validator` : validation per-blank (pipeline complet pour chaque trou math, fuzzy matching pour trous texte)
   - Chaque trou math : validationRules ou validateNumerical/areEquivalent, puis checkRequiredForm, puis applyConstraints

7. Mettre a jour le transformer de migration

   - Reclasser les 369 result/rewrite en `fill_in_blanks`
   - Extraire `answerFormat` → `shared.answerFormats: { "expression1": "..." }`
   - Reclasser les 157 answerField en `fill_in_blanks`

8. Creer le dictionnaire de vocabulaire mathematique FR

   - `src/lib/data/math-dictionary-fr.ts`
   - ~200-300 termes pour v1
   - Fonctions utilitaires (getTermsForLevel, getTermsByTag, etc.)

9. Tests + import en DB
