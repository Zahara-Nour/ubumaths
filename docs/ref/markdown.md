# Syntaxe Markdown et Templates - Documentation Technique

Ce document decrit la syntaxe complete du markdown custom et du systeme de templates utilises dans les Questions et Exercices d'UbuMaths.

---

## Table des matieres

1. [Systeme de Templates `{{}}`](#1-systeme-de-templates-)
   - [Variables](#11-variables-nomvariable)
   - [Nombres aleatoires](#12-nombres-aleatoires-random-ou-raccourci)
   - [Expressions evaluees](#13-expressions-evaluees-eval)
   - [References internes](#14-references-internes-)
2. [Markdown pour Questions et Exercices](#2-markdown-pour-questions-et-exercices)
   - [Expressions mathematiques LaTeX](#21-expressions-mathematiques-latex)
   - [Champs blancs (fill-in-the-blank)](#22-champs-blancs-fill-in-the-blank)
   - [Images avec attributs](#23-images-avec-attributs)
   - [Formatage inline](#24-formatage-inline)
   - [Structures de bloc](#25-structures-de-bloc)
3. [Types AST](#3-types-ast)
4. [Exemples complets](#4-exemples-complets)
5. [Fichiers sources](#5-fichiers-sources)

---

## 1. Systeme de Templates `{{}}`

Le systeme de templates permet de creer des questions et exercices parametres avec des valeurs variables. Les templates sont resolus dans l'ordre de declaration.

### 1.1 Variables `{{nomVariable}}`

Les variables permettent de referencer des valeurs definies prealablement.

**Syntaxe** : `{{nom_variable}}`

**Regles** :

- Les noms de variables utilisent des caracteres alphanumeriques et underscores : `\w+`
- Les variables sont resolues dans l'ordre de declaration
- Une variable peut referencer d'autres variables definies avant elle

**Exemples** :

```
Variables:
  a = 5
  b = 10
  sum = {{eval:a+b}}

Texte: Calcule {{a}} + {{b}} = {{sum}}
Rendu: Calcule 5 + 10 = 15
```

**Source** : `src/lib/shared/parameterization/types.ts`

---

### 1.2 Nombres aleatoires `{{random:...}}` ou raccourci

Genere des nombres aleatoires selon differentes specifications.

#### 1.2.1 Syntaxe generale

| Format       | Syntaxe           | Exemple            | Description       |
| ------------ | ----------------- | ------------------ | ----------------- |
| Avec prefixe | `{{random:spec}}` | `{{random:1..10}}` | Syntaxe explicite |
| Raccourci    | `{{spec}}`        | `{{1..10}}`        | Syntaxe courte    |

#### 1.2.2 Entiers

**Plage d'entiers** :

```
{{1..10}}           Entier entre 1 et 10 (inclusif)
{{random:1..10}}    Equivalent avec prefixe
{{-5..10}}          Plage negative vers positive (-5 a 10)
{{-10..-1}}         Plage de negatifs (-10 a -1)
```

**Entiers relatifs (excluant zero)** :

```
{{+-2..9}}           Union de {-9..-2} U {2..9} (exclut 0 et +-1)
{{+/-2..9}}         Syntaxe alternative
```

**Bornes variables** :

```
{{{{min}}..{{max}}}}      Bornes definies par variables
{{random:{{a}}..{{b}}}}   Equivalent avec prefixe
```

#### 1.2.3 Decimaux

**Par nombre de chiffres** :

```
{{2.3}}             2 chiffres avant, 3 chiffres apres (ex: 42.735)
{{1.2}}             1 chiffre avant, 2 apres (ex: 5.23)
{{{{before}}.{{after}}}}  Chiffres definis par variables
```

**Plage decimale avec pas** :

```
{{0.5..9.99:0.01}}  Decimal de 0.5 a 9.99, pas de 0.01
{{1.0..5.0:0.5}}    Decimal de 1.0 a 5.0, pas de 0.5
{{1..1.6}}          Auto-detection du pas (0.1 ici)
{{1.5..2.5}}        Auto-detection du pas (0.1)
```

#### 1.2.4 Exclusions

Permet d'exclure certaines valeurs de la generation.

**Syntaxe** : `{{spec!exclusions}}`

```
{{1..20!5}}               Exclure 5
{{1..20!5,7,9}}           Exclure 5, 7 et 9
{{1..20!7..9}}            Exclure plage 7 a 9
{{1..20!{{var}}}}         Exclure valeur d'une variable
{{1..20!{{a}},{{b}}}}     Exclure plusieurs variables
{{1..100!{{a}}..{{b}}}}   Exclure plage definie par variables
```

#### 1.2.5 Listes discretes

Permet de selectionner aleatoirement une valeur parmi une liste finie.

**Syntaxe** : `{{item1|item2|item3}}` ou `{{random:item1|item2|item3}}`

```
{{rouge|bleu|vert}}             Selection parmi 3 couleurs
{{1|2|5|10}}                    Selection parmi 4 nombres
{{pomme|poire|banane}}          Selection parmi des chaines
```

**Resolution de noms** :

Dans une liste discrete, chaque element est traite comme un "nom nu" :

- Si le nom correspond a une variable definie, sa valeur est utilisee
- Sinon, le nom est utilise comme valeur litterale

```
Variables:
  a = 5
  b = 10

{{a|b|15}}       Selectionne parmi {5, 10, 15} (a et b sont resolus)
{{x|y|z}}        Selectionne parmi {"x", "y", "z"} (noms litteraux)
```

**Exclusions** :

Comme pour les autres types aleatoires, les exclusions utilisent `!` :

```
{{a|b|c|d!a}}           Exclure la valeur de 'a' du resultat
{{1|2|3|4|5!3}}         Exclure le nombre 3
{{rouge|bleu|vert!x}}   Exclure la valeur de x (ou "x" si non defini)
```

**Notes** :

- Le separateur est le pipe `|` au niveau des accolades (profondeur 0)
- Les elements peuvent etre des nombres ou des chaines
- Minimum 2 elements requis pour constituer une liste
- Le type de retour est `number | string` selon les valeurs

#### 1.2.6 Specifications de type (RandomSpec)

| Type                | Description                     | Exemple              |
| ------------------- | ------------------------------- | -------------------- |
| `integer`           | Plage d'entiers                 | `{{1..10}}`          |
| `relative-integer`  | Entiers relatifs (excluant 0)   | `{{+-2..9}}`         |
| `decimal-by-digits` | Decimaux par nombre de chiffres | `{{2.3}}`            |
| `decimal-range`     | Plage decimale avec pas         | `{{0.5..9.99:0.01}}` |
| `discrete-list`     | Selection dans une liste finie  | `{{a\|b\|c}}`        |

**Source** : `src/lib/shared/parameterization/parser/random-parser.ts`

---

### 1.3 Expressions evaluees `{{eval:...}}`

Evalue des expressions mathematiques avec support complet des operations et fonctions.

#### 1.3.1 Syntaxe de base

```
{{eval:expression}}
{{eval:expression|modifiers}}
```

#### 1.3.2 Operations supportees

| Operation      | Syntaxe | Exemple            |
| -------------- | ------- | ------------------ |
| Addition       | `+`     | `{{eval:a+b}}`     |
| Soustraction   | `-`     | `{{eval:a-b}}`     |
| Multiplication | `*`     | `{{eval:a*b}}`     |
| Division       | `/`     | `{{eval:a/b}}`     |
| Puissance      | `^`     | `{{eval:a^2}}`     |
| Modulo         | `mod`   | `{{eval:a mod b}}` |

#### 1.3.3 Fonctions mathematiques

```
{{eval:sqrt(x)}}        Racine carree
{{eval:abs(x)}}         Valeur absolue
{{eval:sin(x)}}         Sinus
{{eval:cos(x)}}         Cosinus
{{eval:tan(x)}}         Tangente
{{eval:log(x)}}         Logarithme naturel
{{eval:log10(x)}}       Logarithme base 10
{{eval:exp(x)}}         Exponentielle
{{eval:floor(x)}}       Partie entiere inferieure
{{eval:ceil(x)}}        Partie entiere superieure
{{eval:round(x)}}       Arrondi
{{eval:max(a,b)}}       Maximum
{{eval:min(a,b)}}       Minimum
{{eval:gcd(a,b)}}       PGCD
{{eval:lcm(a,b)}}       PPCM
```

#### 1.3.4 References de variables dans les expressions

Dans les expressions `eval`, les variables peuvent etre referencees de deux facons :

**Syntaxe simple** (nom direct) :

```
{{eval:a+b}}                   Addition de deux variables
{{eval:(a^2+b^2)}}             Expression complexe
{{eval:sqrt(x^2+y^2)}}         Distance depuis origine
```

**Syntaxe explicite** (double accolades) :

```
{{eval:{{a}}+{{b}}}}           Addition avec syntaxe explicite
{{eval:2*{{a}}-{{b}}/3}}       Expression mixte
{{eval:({{a}}-{{b}})/({{c}}+{{d}})}}  Expression complexe
```

**Note** : Les deux syntaxes sont equivalentes. La syntaxe simple est plus lisible pour les expressions simples.

#### 1.3.5 Modifiers (modificateurs de sortie)

Les modifiers controlent le formatage du resultat. Syntaxe : `{{eval:expr|modifiers}}`

| Modifier | Alias        | Description                       | Exemple                         |
| -------- | ------------ | --------------------------------- | ------------------------------- |
| `d`      | `decimal`    | Force sortie decimale             | `{{eval:1/3\|d}}` -> `0.333...` |
| `+`      | `positive`   | Ajoute + aux positifs             | `{{eval:5\|+}}` -> `+5`         |
| `()`     | `bracket`    | Parentheses autour des negatifs   | `{{eval:-3\|()}}` -> `(-3)`     |
| `'`      | `derivative` | Prend la derivee avant evaluation | `{{eval:x^2\|'}}` -> `2x`       |

**Combinaison de modifiers** :

```
{{eval:a*b|d,+}}       Decimal avec signe positif
{{eval:a-b|d,()}}      Decimal avec negatifs entre parentheses
```

#### 1.3.6 Exemples avances

```
Formule quadratique:
{{eval:(-b+sqrt(b^2-4*a*c))/(2*a)}}

Distance entre deux points:
{{eval:sqrt((x2-x1)^2+(y2-y1)^2)}}

Pourcentage:
{{eval:(part/whole)*100}}

Simplification de fraction:
{{eval:numerator/gcd}} / {{eval:denominator/gcd}}
```

**Source** : `src/lib/shared/parameterization/parser/eval-parser.ts`

---

### 1.4 References de variables

Les variables sont referencees avec la syntaxe `{{nom}}` partout dans le systeme.

| Contexte                | Syntaxe   | Exemple                 |
| ----------------------- | --------- | ----------------------- |
| Texte normal            | `{{var}}` | `Calcule {{a}} + {{b}}` |
| Dans `eval` (simple)    | `var`     | `{{eval:a+b}}`          |
| Dans `eval` (explicite) | `{{var}}` | `{{eval:{{a}}+{{b}}}}`  |
| Dans `random`           | `{{var}}` | `{{{{min}}..{{max}}}}`  |
| Dans exclusions         | `{{var}}` | `{{1..20!{{a}}}}`       |

---

## 2. Markdown pour Questions et Exercices

### 2.1 Expressions mathematiques LaTeX

#### 2.1.1 Math inline

Syntaxe : `$expression$`

```markdown
Resoudre: $2x + 3 = 7$
La racine de $x^2 = 4$ est $x = \pm 2$
```

**Regles** :

- Ne peut pas contenir de retour a la ligne
- Les `$` litteraux s'echappent avec `\$`

#### 2.1.2 Math en bloc

Syntaxe : `$$expression$$`

```markdown
La formule quadratique:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

Integration:

$$\int_0^\pi \sin(x) dx = 2$$
```

**Regles** :

- Peut contenir des retours a la ligne
- Sera rendu centre sur sa propre ligne

#### 2.1.3 Combinaison avec templates

```markdown
Calcule: ${{a}} + {{b}}$
Derive: $f(x) = {{a}}x^2 + {{b}}x + {{c}}$
Resultat: ${{a}} + {{b}} = {{eval:a+b}}$
```

**Source** : `src/lib/exercises/parser/math-extractor.ts`

---

### 2.2 Champs blancs (fill-in-the-blank)

Syntaxe : `{{blank:N}}` ou N est un entier 1-based

```markdown
Complete la phrase: Le carre de {{blank:1}} est egal a {{blank:1}}.
Resous: {{blank:1}} + 5 = 10
Donne les deux solutions: x = {{blank:1}} et x = {{blank:2}}
```

**Utilisation** :

- L'index N identifie le champ (commence a 1)
- Plusieurs `{{blank:N}}` avec le meme N attendent la meme reponse
- Utilise dans les questions de type `fill_in_blanks`

**Source** : `src/lib/exercises/parser/markdown-parser.ts` (ligne 93)

---

### 2.3 Images avec attributs

#### 2.3.1 Syntaxe standard

```markdown
![texte alternatif](url.png)
![texte alternatif](url.png 'titre')
```

#### 2.3.2 Syntaxe etendue avec attributs

```markdown
![alt](url.png){attributs}
![alt](url.png 'titre'){attributs}
```

#### 2.3.3 Attributs disponibles

| Attribut  | Valeurs                                      | Description            |
| --------- | -------------------------------------------- | ---------------------- |
| `size`    | `inline`, `small`, `medium`, `large`, `full` | Taille semantique      |
| `width`   | `0-100%`                                     | Largeur en pourcentage |
| `align`   | `left`, `center`, `right`                    | Alignement             |
| `caption` | `"texte"`                                    | Legende de l'image     |

**Dimensions par classe de taille** :

| Classe   | HTML width        | LaTeX          | Description          |
| -------- | ----------------- | -------------- | -------------------- |
| `inline` | 1.5em             | 1em            | Inline avec le texte |
| `small`  | 25% (max 300px)   | 0.25\textwidth | Petit                |
| `medium` | 50% (max 600px)   | 0.5\textwidth  | Moyen                |
| `large`  | 75% (max 900px)   | 0.75\textwidth | Grand                |
| `full`   | 100% (max 1200px) | \textwidth     | Pleine largeur       |

**Exemples** :

```markdown
![Triangle](triangle.png){size=medium}
![Graphique](graph.png){size=large align=center}
![Figure 1](result.png){size=large align=center caption="Resultats de l'experience"}
![Schema](schema.png){width=60%}
![Icone](icon.png){size=inline}
```

**Source** : `src/lib/exercises/parser/markdown-parser.ts` (lignes 52-73)

---

### 2.4 Formatage inline

| Format   | Syntaxe                    | Rendu     |
| -------- | -------------------------- | --------- |
| Gras     | `**texte**` ou `__texte__` | **texte** |
| Italique | `*texte*` ou `_texte_`     | _texte_   |
| Code     | `` `code` ``               | `code`    |

**Exemples** :

```markdown
C'est **tres important** de comprendre les _concepts_.
La fonction `sqrt()` calcule la racine carree.
```

---

### 2.5 Structures de bloc

#### 2.5.1 Titres

```markdown
# Titre niveau 1

## Titre niveau 2

### Titre niveau 3

#### Titre niveau 4

##### Titre niveau 5

###### Titre niveau 6
```

#### 2.5.2 Listes non ordonnees

```markdown
- Item 1
- Item 2
  - Sous-item 2.1
  - Sous-item 2.2
- Item 3

* Bullet alternative
```

#### 2.5.3 Listes ordonnees

```markdown
1. Premier element
2. Deuxieme element
   1. Sous-element a
   2. Sous-element b
3. Troisieme element
```

#### 2.5.4 Tables GFM

```markdown
| En-tete 1 | En-tete 2 | En-tete 3 |
| :-------- | :-------: | --------: |
| Gauche    |  Centre   |    Droite |
| Donnee 1  | Donnee 2  |  Donnee 3 |
```

Alignements :

- `:---` ou `---` : gauche (defaut)
- `:---:` : centre
- `---:` : droite

#### 2.5.5 Citations (Blockquotes)

```markdown
> Ceci est une citation.
> Elle peut avoir plusieurs lignes.
>
> > Citations imbriquees possibles.
```

#### 2.5.6 Blocs de code

````markdown
```python
def hello():
    return "Hello World"
```

```javascript
function add(a, b) {
	return a + b;
}
```
````

**Note** : Le contenu des blocs de code n'est **pas** traite pour les templates ou le LaTeX. Les expressions `$...$` restent litterales.

#### 2.5.7 Ligne horizontale

```markdown
---
---

---
```

**Source** : `src/lib/exercises/parser/markdown-parser.ts`

---

## 3. Types AST

L'AST (Abstract Syntax Tree) represente la structure parsee du markdown.

### 3.1 Noeuds de bloc

| Type              | Description        | Proprietes principales                            |
| ----------------- | ------------------ | ------------------------------------------------- |
| `document`        | Racine du document | `children: BlockNode[]`                           |
| `paragraph`       | Paragraphe         | `children: InlineNode[]`                          |
| `heading`         | Titre              | `level: 1-6`, `children: InlineNode[]`            |
| `list`            | Liste              | `ordered: boolean`, `items: ListItemNode[]`       |
| `table`           | Table              | `header`, `rows`, `alignments`                    |
| `code-block`      | Bloc de code       | `code: string`, `language?: string`               |
| `blockquote`      | Citation           | `children: BlockNode[]`                           |
| `math-block`      | Math en bloc       | `latex: string`                                   |
| `image`           | Image              | `src`, `alt`, `sizeClass`, `alignment`, `caption` |
| `horizontal-rule` | Ligne horizontale  | -                                                 |

### 3.2 Noeuds inline

| Type          | Description   | Proprietes principales                 |
| ------------- | ------------- | -------------------------------------- |
| `text`        | Texte         | `content`, `bold?`, `italic?`, `code?` |
| `math-inline` | Math inline   | `latex: string`                        |
| `blank`       | Champ blanc   | `index: number`                        |
| `line-break`  | Saut de ligne | `hard?: boolean`                       |

**Source** : `src/lib/exercises/types.ts` (lignes 520-780)

---

## 4. Exemples complets

### 4.1 Question avec variables et aleatoire

```typescript
// Definition du template
const template = {
	type: 'numerical_exact',
	title: 'Addition simple',
	variations: [
		{
			variables: [
				{ name: 'a', expression: '{{2..9}}' },
				{ name: 'b', expression: '{{2..9!{{a}}}}' }, // b different de a
				{ name: 'sum', expression: '{{eval:a+b}}' }
			],
			statement: 'Calcule ${{a}} + {{b}}$',
			answer: '{{sum}}'
		}
	]
};

// Instance generee (exemple)
// Variables: a=5, b=7, sum=12
// Enonce: "Calcule $5 + 7$"
// Reponse: "12"
```

### 4.2 Question avec correction detaillee

```typescript
const template = {
	type: 'algebraic_transform',
	title: 'Factorisation',
	variations: [
		{
			variables: [
				{ name: 'a', expression: '{{2..5}}' },
				{ name: 'b', expression: '{{1..4}}' },
				{ name: 'sum', expression: '{{eval:a+b}}' },
				{ name: 'product', expression: '{{eval:a*b}}' }
			],
			statement: 'Factorise $x^2 + {{sum}}x + {{product}}$',
			answer: '(x+{{a}})(x+{{b}})',
			correction: {
				feedback: {
					correct: 'Excellent ! La factorisation est correcte.',
					incorrect: 'La reponse attendue etait $(x+{{a}})(x+{{b}})$'
				},
				steps: [
					'On cherche deux nombres dont la somme est ${{sum}}$ et le produit est ${{product}}$',
					'Ces nombres sont ${{a}}$ et ${{b}}$',
					'Donc: $x^2 + {{sum}}x + {{product}} = (x+{{a}})(x+{{b}})$'
				]
			}
		}
	]
};
```

### 4.3 Exercice parametre complet

```markdown
---
version: '1.0'
title: Theoreme de Pythagore
difficulty: 2
tags: [geometrie, triangles-rectangles]
grade_levels: ['4eme', '3eme']
---

# Enonce

Un triangle rectangle a pour cotes de l'angle droit:

- $a = {{a}}$ cm
- $b = {{b}}$ cm

Calcule la longueur de l'hypotenuse $c$.

![Triangle rectangle](triangle.png){size=medium align=center}

# Solution

On applique le theoreme de Pythagore:

$$c^2 = a^2 + b^2 = {{a}}^2 + {{b}}^2 = {{eval:a^2+b^2}}$$

$$c = \sqrt{{{eval:a^2+b^2}}} = {{eval:sqrt(a^2+b^2)|d}}\ \text{cm}$$

> **Remarque**: Verifiez toujours que le triangle est bien rectangle avant d'appliquer Pythagore.
```

### 4.4 Question QCM avec choix

```typescript
const template = {
	type: 'multiple_choice',
	title: 'Derivee',
	variations: [
		{
			variables: [
				{ name: 'n', expression: '{{2..5}}' },
				{ name: 'answer', expression: '{{eval:n}}' }
			],
			statement: 'Quelle est la derivee de $f(x) = x^{{n}}$ ?',
			choices: [
				{ content: '${{n}}x^{{{eval:n-1}}}$', isCorrect: true },
				{ content: '$x^{{{eval:n-1}}}$', isCorrect: false },
				{ content: '${{n}}x^{{n}}$', isCorrect: false },
				{ content: '${{eval:n+1}}x^{{{eval:n+1}}}$', isCorrect: false }
			]
		}
	]
};
```

### 4.5 Question fill-in-the-blank

```markdown
Complete les calculs:

1. ${{a}} \times {{b}} =$ {{blank:1}}
2. ${{c}} \div {{d}} =$ {{blank:2}}
3. $({{e}})^2 =$ {{blank:3}}
```

---

## 5. Fichiers sources

### Parsers

| Fichier                                                     | Fonction                             |
| ----------------------------------------------------------- | ------------------------------------ |
| `src/lib/shared/parameterization/parser/random-parser.ts`   | Parse `{{random:...}}` et raccourcis |
| `src/lib/shared/parameterization/parser/eval-parser.ts`     | Parse `{{eval:...}}` avec modifiers  |
| `src/lib/shared/parameterization/parser/variable-parser.ts` | Parse `{{variable}}`                 |
| `src/lib/exercises/parser/markdown-parser.ts`               | Parser markdown principal            |
| `src/lib/exercises/parser/math-extractor.ts`                | Extraction `$...$` et `$$...$$`      |
| `src/lib/exercises/parser/list-parser.ts`                   | Parse listes                         |
| `src/lib/exercises/parser/table-parser.ts`                  | Parse tables                         |
| `src/lib/exercises/parser/blockquote-parser.ts`             | Parse citations                      |
| `src/lib/exercises/parser/code-block-parser.ts`             | Parse blocs de code                  |

### Types

| Fichier                                    | Contenu                                            |
| ------------------------------------------ | -------------------------------------------------- |
| `src/lib/shared/parameterization/types.ts` | Types: Variable, RandomSpec, EvalModifiers         |
| `src/lib/exercises/types.ts`               | Types AST, Exercise, ExerciseInstance              |
| `src/lib/questions/types.ts`               | Types Question, QuestionTemplate, QuestionInstance |

### Tests (exemples de syntaxe)

| Fichier                                            | Tests pour                     |
| -------------------------------------------------- | ------------------------------ |
| `src/lib/questions/parser/random-parser.test.ts`   | Syntaxe random                 |
| `src/lib/questions/parser/eval-parser.test.ts`     | Syntaxe eval                   |
| `src/lib/exercises/parser/markdown-parser.test.ts` | Markdown, math, blanks, images |
| `src/lib/shared/parameterization/parser/*.test.ts` | Tous les parsers partages      |

---

## Resume syntaxique rapide

````
TEMPLATES:
  {{var}}                      Variable
  {{1..10}}                    Entier aleatoire 1-10
  {{-5..5}}                    Entier -5 a 5
  {{+-2..9}}                   Entiers relatifs (hors 0, +-1)
  {{2.3}}                      Decimal: 2 chiffres.3 chiffres
  {{0.5..9.99:0.01}}           Decimal avec pas
  {{1..20!5,7..9}}             Avec exclusions
  {{a|b|c}}                    Liste discrete (selection aleatoire)
  {{a|b|c!x}}                  Liste discrete avec exclusion
  {{eval:a+b}}                 Expression evaluee
  {{eval:sqrt(x)|d}}           Avec modifier decimal

MARKDOWN:
  $x^2$                        Math inline
  $$\int x dx$$                Math bloc
  {{blank:1}}                  Champ blanc
  ![alt](url){size=medium}     Image avec attributs
  **gras** *italique* `code`   Formatage inline
  # Titre                      Titres
  - item / 1. item             Listes
  | A | B |                    Tables
  > citation                   Citations
  ```lang                      Code blocks
  code
````

```

---

*Document genere pour UbuMaths - Derniere mise a jour: Novembre 2025*
```
