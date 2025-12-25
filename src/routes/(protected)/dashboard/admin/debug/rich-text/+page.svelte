<script lang="ts">
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import {
		Copy,
		Check,
		RotateCcw,
		Play,
		Eye,
		Code,
		Settings,
		Beaker,
		ArrowRightLeft
	} from 'lucide-svelte';
	import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';
	import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';
	import type { MathTemplateLevel, RichTextMode } from '$lib/components/rich-text/types';

	// ============================================
	// Side-by-side comparison state
	// ============================================
	let chatMessages = $state<Array<{ timestamp: Date; content: unknown }>>([]);
	let formHtmlContent = $state('');
	let formJsonContent = $state<unknown>(null);

	function handleChatSend(content: unknown) {
		chatMessages = [...chatMessages, { timestamp: new Date(), content }];
	}

	function clearChatMessages() {
		chatMessages = [];
	}

	// ============================================
	// Playground state
	// ============================================
	let playgroundMode = $state<RichTextMode>('form');
	let playgroundMathTemplates = $state<MathTemplateLevel>('full');
	let showSendButtonSelect = $state<'auto' | 'true' | 'false'>('auto');
	let playgroundShowClearButton = $state(true);
	let playgroundMinHeight = $state('150px');
	let playgroundDisabled = $state(false);

	// Derived: convert select value to actual prop value
	let playgroundShowSendButton = $derived(
		showSendButtonSelect === 'auto' ? undefined : showSendButtonSelect === 'true'
	);

	let playgroundHtmlValue = $state('');
	let playgroundJsonValue = $state<unknown>(null);
	let playgroundSentMessages = $state<Array<{ timestamp: Date; content: unknown }>>([]);

	function handlePlaygroundSend(content: unknown) {
		playgroundSentMessages = [...playgroundSentMessages, { timestamp: new Date(), content }];
	}

	function resetPlayground() {
		playgroundMode = 'form';
		playgroundMathTemplates = 'full';
		showSendButtonSelect = 'auto';
		playgroundShowClearButton = true;
		playgroundMinHeight = '150px';
		playgroundDisabled = false;
		playgroundHtmlValue = '';
		playgroundJsonValue = null;
		playgroundSentMessages = [];
	}

	// Computed: effective showSendButton value
	let effectiveShowSendButton = $derived(playgroundShowSendButton ?? playgroundMode === 'chat');

	// ============================================
	// Content loading examples
	// ============================================
	const exampleContents = {
		simple: "<p>Texte simple avec du <strong>gras</strong> et de l'<em>italique</em>.</p>",
		math: `<h3>Formule mathématique</h3>
<p>L'équation du second degré : <span data-math-inline>ax^2 + bx + c = 0</span></p>
<p>Sa solution est donnée par : <span data-math-inline>x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}</span></p>`,
		emojis: `<h3>Feedback élève ⭐</h3>
<p>Excellent travail ! 👏 Tu as bien compris les fractions. 🎯</p>
<p>Points forts :</p>
<ul><li>✅ Calcul correct</li><li>✅ Présentation soignée</li></ul>
<p>Continue comme ça ! 💪🔥</p>`,
		complex: `<h2>Template de question</h2>
<p>Ce template génère des <strong>équations du second degré</strong> avec des coefficients aléatoires.</p>
<h3>Formule utilisée</h3>
<p>Formule générale : <span data-math-inline>ax^2 + bx + c = 0</span></p>
<p>Discriminant : <span data-math-inline>\\Delta = b^2 - 4ac</span></p>
<h3>Paramètres</h3>
<ul>
<li><code>a</code> : coefficient de x² (entier de 1 à 5)</li>
<li><code>b</code> : coefficient de x (entier de -10 à 10)</li>
<li><code>c</code> : terme constant (entier de -20 à 20)</li>
</ul>
<blockquote><p>⚠️ Le discriminant doit être positif pour avoir des solutions réelles.</p></blockquote>
<p>Difficulté : ⭐⭐⭐ | Niveau : 1ère</p>`,
		taskList: `<h3>Todo list</h3>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="true">Réviser les fractions</li>
<li data-type="taskItem" data-checked="true">Faire les exercices 1-5</li>
<li data-type="taskItem" data-checked="false">Préparer le contrôle</li>
</ul>`
	};

	function loadExample(key: keyof typeof exampleContents) {
		if (playgroundMode === 'form') {
			playgroundHtmlValue = exampleContents[key];
		}
	}

	// ============================================
	// Markdown Examples by Category
	// ============================================
	const MARKDOWN_EXAMPLES: Record<string, { label: string; content: string }> = {
		// Complete example (existing)
		complete: {
			label: 'Exemple complet',
			content: `# Test Import/Export

## Formatage de texte

Texte avec **gras**, *italique* et \`code inline\`.

## Templates

- Variable : {{testVar}}
- Aléatoire (range) : {{1..10}}
- Aléatoire (liste) : {{rouge|vert|bleu}}
- Expression : {{eval:a+b}}
- Champ réponse : {{blank:1}} + {{blank:2}} = {{blank:3}}

## Mathématiques

Math LaTeX inline : $x^2 + y^2 = r^2$

Math custom inline : ~2/3 + 1/4~

Math LaTeX bloc (seul sur sa ligne) :

$$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

Math custom bloc (seul sur sa ligne) :

~~(a+b)^2 = a^2 + 2ab + b^2~~

## Listes

Liste à puces :
- Premier élément
- Deuxième élément
  - Sous-élément 2.1
  - Sous-élément 2.2
    - Sous-sous-élément 2.2.1
- Troisième élément

Liste numérotée :
1. Étape 1
2. Étape 2
   1. Sous-étape 2.1
   2. Sous-étape 2.2
3. Étape 3

## Hardbreaks dans les listes

Liste avec hardbreaks (backslash) :
1. Première ligne\\
   Deuxième ligne du même item
2. Item simple
3. Ligne A\\
   Ligne B\\
   Ligne C

Liste à puces avec hardbreaks :
- Item avec\\
  continuation
- Item normal
- Multiple\\
  lignes\\
  ici

## Citation

> Ceci est une citation.\\
> Elle peut s'étendre sur plusieurs lignes.

## Bloc de code

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

## Liens

Lien simple : [Ubumaths](https://ubumaths.fr)

Lien avec titre : [Documentation](https://docs.example.com "Lire la documentation")

Texte avec lien au milieu : Visitez [notre site](https://example.com) pour plus d'infos.

Plusieurs liens : [Premier](https://first.com) et [Second](https://second.com)

## Titres

### Titre niveau 3
#### Titre niveau 4

## Images

Image simple :

![Photo random](https://picsum.photos/200/100 "Image depuis Picsum")

Image small alignée à droite :

![Small right](https://picsum.photos/150/100){size=small align=right}

Image medium centrée avec caption :

![Medium centered](https://picsum.photos/300/150){size=medium align=center caption="Une belle image"}

Image large :

![Large image](https://picsum.photos/400/200){size=large}

Image avec width personnalisé (60%) :

![Custom width](https://picsum.photos/350/175){width=60% align=center}

### Images cliquables (Linked Images)

Image simple cliquable :

[![Click me](https://picsum.photos/200/100)](https://ubumaths.fr)

Image cliquable avec attributs :

[![Logo cliquable](https://picsum.photos/300/150 "Notre logo")](https://example.com "Visitez notre site"){size=medium align=center}

## Tableaux

Tableau simple :

| Nom | Prénom | Age |
|-----|--------|-----|
| Dupont | Jean | 25 |
| Martin | Marie | 30 |
| Bernard | Pierre | 28 |

Tableau avec formatage et alignement :

| Opération | Expression | Résultat |
|:----------|:----------:|----------:|
| Addition | $2 + 3$ | $5$ |
| Soustraction | $7 - 4$ | $3$ |
| Multiplication | $3 \\times 4$ | $12$ |

Tableau de données :

| Niveau | Difficulté | Score max |
|--------|------------|-----------|
| 1 | Facile | 100 |
| 2 | Moyen | 200 |
| 3 | Difficile | 300 |

## Tableaux de Variations

Tableau de variations simple :

\`\`\`variation
variable: x
domain: -inf, 0, +inf

sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  0: 3, top
  +inf: -inf, bottom
\`\`\`

Tableau avec asymptote :

\`\`\`variation
variable: x
domain: -inf, 1, +inf

sign: f'(x)
  -inf,1: +
  1: ||
  1,+inf: +

variation: f(x)
  -inf: 0, bottom
  1: ||, +inf, -inf
  +inf: 0, top
\`\`\`

Tableau complet avec deux lignes de signes :

\`\`\`variation
variable: x
domain: -inf, -1, 0, 2, +inf

sign: f'(x)
  -inf,-1: +
  -1: 0
  -1,0: -
  0: 0
  0,2: -
  2: 0
  2,+inf: +

sign: f''(x)
  -inf,0: +
  0: 0
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  -1: 4, top
  0: 2, center
  2: -2, bottom
  +inf: +inf, top
\`\`\`

## Arbres de Probabilité

Arbre simple (urne avec boules) :

\`\`\`probtree
root: Urne
outcomes: true

Rouge:3/5
  Rouge:2/4, P(RR)=6/20
  Bleue:2/4, P(RB)=6/20
Bleue:2/5
  Rouge:3/4, P(BR)=6/20
  Bleue:1/4, P(BB)=2/20
\`\`\`

Arbre avec probabilités symboliques :

\`\`\`probtree
root: $\\Omega$

$A$:p
  $B$:q
  $\\bar{B}$:1-q
$\\bar{A}$:1-p
  $B$:q
  $\\bar{B}$:1-q
\`\`\`

Arbre à 3 couleurs (urne avec boules rouges, bleues et vertes) :

\`\`\`probtree
root: Urne
intersection: true

Rouge:3/9
  Rouge:2/8
  Bleue:4/8
  Verte:2/8
Bleue:4/9
  Rouge:3/8
  Bleue:3/8
  Verte:2/8
Verte:2/9
  Rouge:3/8
  Bleue:4/8
  Verte:1/8
\`\`\`

### Arbre exercice (à compléter)

\`\`\`probtree
root: Urne

Rouge:3/5
  Rouge:...
  Bleue:...
Bleue:...
  Rouge:...
  Bleue:...
\`\`\`

## Hashtags et Mentions

Hashtag simple : #mathematiques

Hashtag avec tiret : #equation-second-degre

Mention simple : @professeur

Mention avec point : @classe.3eme

Texte mixte : Exercice de #fractions pour @alice niveau #facile

## Vidéos

Vidéo HTML5 basique :

!video[Demo video](https://www.w3schools.com/html/mov_bbb.mp4)

Vidéo avec options de lecture :

!video[Animation](https://www.w3schools.com/html/mov_bbb.mp4){size=medium autoplay loop muted}

YouTube embed :

!video[Big Buck Bunny](https://www.youtube.com/watch?v=aqz-KE-bpKQ){size=large}

YouTube format court :

!video[Test YouTube](https://youtu.be/aqz-KE-bpKQ){size=medium align=center}`
		},

		// Lists examples
		lists_simple: {
			label: 'Listes simples',
			content: `# Listes simples

## Liste a puces

- Premier element
- Deuxieme element
- Troisieme element

## Liste numerotee

1. Etape 1
2. Etape 2
3. Etape 3`
		},

		lists_nested: {
			label: 'Listes imbriquees',
			content: `# Listes imbriquees

## Liste a puces imbriquee

- Niveau 1
  - Niveau 2
    - Niveau 3
    - Autre niveau 3
  - Autre niveau 2
- Autre niveau 1

## Liste numerotee imbriquee

1. Premier
   1. Sous-premier
   2. Sous-deuxieme
      1. Sous-sous-premier
2. Deuxieme
   1. Sous-premier`
		},

		lists_mixed: {
			label: 'Listes mixtes',
			content: `# Listes mixtes

## Puces dans numerotee

1. Premiere etape
   - Point A
   - Point B
2. Deuxieme etape
   - Point C
   - Point D

## Numerotee dans puces

- Categorie A
  1. Item 1
  2. Item 2
- Categorie B
  1. Item 3
  2. Item 4`
		},

		lists_with_blocks: {
			label: 'Listes avec blocs',
			content: `# Listes avec blocs (complet)

## Blocs de code dans listes

- Item avec texte puis code :

  \`\`\`javascript
  console.log("Hello");
  \`\`\`
- Item normal apres code

1. Etape avec code inline \`const x = 5\` et bloc :

   \`\`\`python
   def hello():
       print("Hello")
   \`\`\`
2. Etape suivante

## Math dans listes

- Fraction simple : ~1/2 + 1/3~
- Equation complete : $ax^2 + bx + c = 0$
- Math bloc dans item :

  $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
- Item apres math bloc

1. Theoreme : $a^2 + b^2 = c^2$
2. Formule avec custom syntax :

   ~~(a+b)^2 = a^2 + 2ab + b^2~~
3. Suite normale

## Citations dans listes

- Citation simple :

  > Une citation dans une liste
- Citation multiligne :

  > Premiere ligne de citation
  > Deuxieme ligne de citation
  > Troisieme ligne

1. Point avec citation :

   > Citation numerotee
2. Point suivant

## Tableaux dans listes

- Tableau simple :

  | A | B |
  |---|---|
  | 1 | 2 |
- Item apres tableau

## Combinaisons complexes

1. Code puis citation :

   \`\`\`sql
   SELECT * FROM users;
   \`\`\`

   > Note importante sur la requete
2. Math puis code :

   La formule $E = mc^2$ s'implemente ainsi :

   \`\`\`javascript
   const E = m * c * c;
   \`\`\`
3. Plusieurs blocs :

   > Citation d'introduction

   Texte explicatif avec $x^2$.

   \`\`\`python
   x = 42
   \`\`\`

## Imbrication avec blocs

- Niveau 1 avec code :

  \`\`\`js
  let a = 1;
  \`\`\`
  - Niveau 2 avec math : $a + b$
    - Niveau 3 avec citation :

      > Citation profonde
  - Niveau 2 avec code :

    \`\`\`js
    let b = 2;
    \`\`\`
- Retour niveau 1

1. Premier niveau :

   > Citation niveau 1
   1. Sous-niveau :
      - Puce avec $math$
      - Puce avec \`code\``
		},

		lists_block_first: {
			label: 'Listes bloc en premier (CommonMark)',
			content: `# Listes avec bloc en premier (CommonMark)

Quand un item de liste commence directement par un bloc (code, citation, math), sans paragraphe avant, le marqueur de liste est seul sur sa ligne, suivi du bloc indente.

## Code bloc en premier

-
  \`\`\`python
  def hello():
      print("Hello")
  \`\`\`
-
  \`\`\`javascript
  const x = 42;
  \`\`\`

  Texte apres le code

1.
   \`\`\`sql
   SELECT * FROM users;
   \`\`\`
2.
   \`\`\`bash
   npm install
   \`\`\`

   Puis executez le script

## Citation en premier

-
  > Citation qui commence l'item
  > sur plusieurs lignes
-
  > Autre citation

  Suivi de texte normal

1.
   > Citation numerotee
2.
   > Deuxieme citation
   > encore multiligne

   Avec texte apres

## Math bloc en premier

-
  $$E = mc^2$$
-
  $$\\int_0^1 x^2 dx = \\frac{1}{3}$$

  Integrale de base

1.
   $$a^2 + b^2 = c^2$$
2.
   $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

   Somme de Gauss

## Custom math bloc en premier

-
  ~~(a+b)^2 = a^2 + 2ab + b^2~~
-
  ~~x^2 - 1 = (x-1)(x+1)~~

  Identite remarquable

## Melanges blocs en premier

-
  \`\`\`js
  let a = 1;
  \`\`\`

  Puis une citation :

  > Citation apres code
-
  > Citation d'abord

  Puis du code :

  \`\`\`python
  x = 42
  \`\`\`
-
  $$E = mc^2$$

  Avec du \`code inline\` et $math inline$.

## Imbrication blocs en premier

-
  \`\`\`js
  let outer = true;
  \`\`\`
  -
    > Citation niveau 2
    -
      $$nested = true$$

1.
   > Citation niveau 1
   1.
      \`\`\`python
      nested_code = True
      \`\`\``
		},

		// Code blocks examples
		code_inline: {
			label: 'Code inline',
			content: `# Code inline

Utilisez \`console.log()\` pour afficher dans la console.

La fonction \`map()\` transforme chaque element.

Le fichier \`package.json\` contient les dependances.`
		},

		code_blocks: {
			label: 'Blocs de code',
			content: `# Blocs de code

## JavaScript

\`\`\`javascript
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
\`\`\`

## Python

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

## SQL

\`\`\`sql
SELECT name, age
FROM users
WHERE age > 18
ORDER BY name;
\`\`\`

## Sans langage

\`\`\`
Texte brut
sans coloration syntaxique
\`\`\``
		},

		code_in_lists: {
			label: 'Code dans listes',
			content: `# Code dans les listes

1. Premiere etape - declarer une variable :
   \`\`\`javascript
   const x = 5;
   \`\`\`

2. Deuxieme etape - utiliser la variable :
   \`\`\`javascript
   console.log(x * 2);
   \`\`\`

- Utiliser \`let\` pour les variables modifiables
- Utiliser \`const\` pour les constantes`
		},

		// Math examples
		math_inline: {
			label: 'Math inline LaTeX',
			content: `# Math inline LaTeX

L'equation $ax^2 + bx + c = 0$ est une equation du second degre.

La solution est $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$ ou $\\Delta = b^2 - 4ac$.

Le theoreme de Pythagore : $a^2 + b^2 = c^2$.

Integrale : $\\int_0^1 x^2 dx = \\frac{1}{3}$.`
		},

		math_block: {
			label: 'Math bloc LaTeX',
			content: `# Math bloc LaTeX

Formule de la derivee :

$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

Formule d'Euler :

$$e^{i\\pi} + 1 = 0$$

Somme de Gauss :

$$\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$$`
		},

		math_custom: {
			label: 'Math syntaxe custom',
			content: `# Math syntaxe custom

## Inline avec tilde simple

La fraction ~1/2~ est egale a ~0.5~.

Calculer ~3/4 + 1/8~.

## Bloc avec double tilde

Expression developpee :

~~(a+b)^2 = a^2 + 2ab + b^2~~

Identite remarquable :

~~a^2 - b^2 = (a-b)(a+b)~~`
		},

		math_in_lists: {
			label: 'Math dans listes',
			content: `# Math dans les listes

## Formules importantes

1. Derivee de $x^n$ : $nx^{n-1}$
2. Integrale de $x^n$ : $\\frac{x^{n+1}}{n+1} + C$
3. Derivee de $e^x$ : $e^x$

## Exercices

- Calculer ~2/3 + 1/4~
- Simplifier

  ~~x^2 + 2x + 1~~
- Resoudre $ax + b = 0$`
		},

		// Images & Media
		images_basic: {
			label: 'Images basiques',
			content: `# Images basiques

Image simple :

![Photo aleatoire](https://picsum.photos/300/200)

Image avec titre :

![Paysage](https://picsum.photos/400/250 "Un beau paysage")`
		},

		images_attributes: {
			label: 'Images avec attributs',
			content: `# Images avec attributs

## Tailles

Petite image :

![Small](https://picsum.photos/200/100){size=small}

Image moyenne :

![Medium](https://picsum.photos/300/150){size=medium}

Grande image :

![Large](https://picsum.photos/400/200){size=large}

## Alignement

A droite :

![Right](https://picsum.photos/150/100){align=right}

Centree :

![Center](https://picsum.photos/200/100){align=center}

## Avec caption

![Image avec caption](https://picsum.photos/300/150){size=medium align=center caption="Ceci est une legende"}

## Largeur personnalisee

![Custom width](https://picsum.photos/350/175){width=60% align=center}`
		},

		videos: {
			label: 'Videos',
			content: `# Videos

## Video HTML5

!video[Demo video](https://www.w3schools.com/html/mov_bbb.mp4)

## Video avec options

!video[Animation](https://www.w3schools.com/html/mov_bbb.mp4){size=medium autoplay loop muted}

## YouTube

!video[Big Buck Bunny](https://www.youtube.com/watch?v=aqz-KE-bpKQ){size=large}

## YouTube format court

!video[Test YouTube](https://youtu.be/aqz-KE-bpKQ){size=medium align=center}`
		},

		// Blockquotes
		quotes_simple: {
			label: 'Citations simples',
			content: `# Citations simples

> Ceci est une citation simple.

Texte normal entre les citations.

> Une autre citation
> qui continue sur plusieurs lignes.`
		},

		quotes_nested: {
			label: 'Citations imbriquees',
			content: `# Citations imbriquees

> Premiere niveau de citation
> > Deuxieme niveau
> > > Troisieme niveau
> > Retour au deuxieme
> Retour au premier`
		},

		quotes_in_lists: {
			label: 'Citations dans listes',
			content: `# Citations dans les listes

1. Premier point avec citation :
   > Citation importante a retenir

2. Deuxieme point

- Element avec citation longue :
  > Cette citation
  > s'etend sur
  > plusieurs lignes`
		},

		// Tables
		tables_simple: {
			label: 'Tableaux simples',
			content: `# Tableaux simples

| Nom | Age | Ville |
|-----|-----|-------|
| Alice | 25 | Paris |
| Bob | 30 | Lyon |
| Claire | 28 | Marseille |`
		},

		tables_aligned: {
			label: 'Tableaux avec alignement',
			content: `# Tableaux avec alignement

| Gauche | Centre | Droite |
|:-------|:------:|-------:|
| texte | texte | texte |
| aligné | aligné | aligné |
| à gauche | au centre | à droite |

## Tableau mathematique

| Operation | Expression | Resultat |
|:----------|:----------:|----------:|
| Addition | $2 + 3$ | $5$ |
| Soustraction | $7 - 4$ | $3$ |
| Multiplication | $3 \\times 4$ | $12$ |`
		},

		tables_formatted: {
			label: 'Tableaux avec formatage',
			content: `# Tableaux avec formatage

| Fonction | Description | Exemple |
|----------|-------------|---------|
| \`map()\` | Transforme les elements | \`[1,2].map(x => x*2)\` |
| \`filter()\` | Filtre les elements | \`[1,2,3].filter(x => x>1)\` |
| \`reduce()\` | Reduit a une valeur | \`[1,2,3].reduce((a,b) => a+b)\` |

| Niveau | **Difficulte** | *Score* |
|--------|----------------|---------|
| 1 | Facile | 100 |
| 2 | **Moyen** | 200 |
| 3 | ***Difficile*** | 300 |`
		},

		tables_horizontal: {
			label: 'Tableaux transposes',
			content: `# Tableaux transposes

La directive \`:table-h\` transpose un tableau : les colonnes deviennent des lignes. Les en-tetes (premiere ligne) deviennent la premiere colonne.

## Comparaison : sans et avec transposition

**Sans \`:table-h\` (tableau vertical classique) :**

| Eleve | Note | Mention |
|-------|------|---------|
| Alice | 18 | TB |
| Bob | 14 | B |
| Claire | 16 | TB |

**Avec \`:table-h\` (meme tableau transpose) :**

:table-h
| Eleve | Note | Mention |
|-------|------|---------|
| Alice | 18 | TB |
| Bob | 14 | B |
| Claire | 16 | TB |

Le markdown est identique, seule la directive change l'affichage.

## Tableau transpose avec math

:table-h
| Fonction | Derivee | Primitive |
|----------|---------|-----------|
| $x^n$ | $nx^{n-1}$ | $\\frac{x^{n+1}}{n+1}$ |
| $e^x$ | $e^x$ | $e^x$ |
| $\\ln(x)$ | $\\frac{1}{x}$ | $x\\ln(x) - x$ |

## Cas d'usage typique

Pour afficher des proprietes par sujet (personnes, variables, etc.), on ecrit un tableau ou chaque ligne est un sujet :

:table-h
| Nom | Age | Ville |
|-----|-----|-------|
| Alice | 25 | Paris |
| Bob | 30 | Lyon |
| Claire | 28 | Nice |

Resultat : les attributs (Nom, Age, Ville) sont en premiere colonne, chaque personne occupe une colonne.`
		},

		// Templates
		templates_variables: {
			label: 'Templates - Variables',
			content: `# Variables dans les templates

Bonjour {{prenom}} {{nom}} !

Vous avez {{age}} ans et habitez a {{ville}}.

Votre email est {{email}}.`
		},

		templates_random: {
			label: 'Templates - Aleatoire',
			content: `# Valeurs aleatoires

## Range numerique

Un nombre entre 1 et 10 : {{1..10}}

Un nombre entre 100 et 999 : {{100..999}}

## Liste de valeurs

Couleur : {{rouge|vert|bleu|jaune}}

Fruit : {{pomme|poire|orange|banane}}

Animal : {{chat|chien|lapin}}`
		},

		templates_eval: {
			label: 'Templates - Eval',
			content: `# Expressions evaluees

## Calculs

Le double de a : {{eval:a*2}}

La somme : {{eval:a+b+c}}

Le produit : {{eval:a*b}}

## Conditions

Resultat : {{eval:x>0?"positif":"negatif"}}

Parite : {{eval:n%2==0?"pair":"impair"}}`
		},

		templates_blank: {
			label: 'Templates - Champs reponse',
			content: `# Champs de reponse

## Calcul a completer

{{blank:1}} + {{blank:2}} = {{blank:3}}

## Phrase a trous

Le {{blank:sujet}} mange une {{blank:objet}}.

## Exercice

Resoudre : $2x + {{blank:a}} = {{blank:b}}$

Donc $x = {{blank:result}}$`
		},

		// Formatting
		formatting_text: {
			label: 'Formatage texte',
			content: `# Formatage de texte

## Basique

Texte en **gras** (bold avec asterisques).

Texte en __gras__ (bold avec underscores).

Texte en *italique* (emphasis avec asterisque).

Texte en _italique_ (emphasis avec underscore).

Texte -/-barre-/- (strikethrough).

Texte ==surligne== (highlight).

## Combine

Texte ***gras et italique*** (bold+italic avec asterisques).

Texte ___gras et italique___ (bold+italic avec underscores).

Note: Les formatages imbriques (ex: **gras avec *italique* dedans**) ne sont pas supportes.

## Code inline

Utilisez la fonction \`calculate()\` pour obtenir le resultat.`
		},

		formatting_links: {
			label: 'Liens',
			content: `# Liens

## Lien simple

Visitez [Ubumaths](https://ubumaths.fr) pour apprendre les maths.

## Lien avec titre

Consultez la [documentation](https://docs.example.com "Documentation complete").

## Plusieurs liens

Entre [premier lien](https://first.com) et [second lien](https://second.com).

## Lien email

Contactez-nous : [email](mailto:contact@example.com)`
		},

		formatting_headings: {
			label: 'Titres',
			content: `# Titre niveau 1

Texte d'introduction.

## Titre niveau 2

Contenu de la section.

### Titre niveau 3

Sous-section.

#### Titre niveau 4

Detail supplementaire.

##### Titre niveau 5

Encore plus de detail.

###### Titre niveau 6

Le plus petit titre.`
		}
	};

	// Select items for markdown examples dropdown (grouped)
	const markdownExampleItems = [
		{ value: 'complete', label: 'Exemple complet' },
		{ value: '_sep_lists', label: '--- Listes ---', disabled: true },
		{ value: 'lists_simple', label: 'Listes simples' },
		{ value: 'lists_nested', label: 'Listes imbriquees' },
		{ value: 'lists_mixed', label: 'Listes mixtes' },
		{ value: 'lists_with_blocks', label: 'Listes avec blocs' },
		{ value: 'lists_block_first', label: 'Bloc en premier (CommonMark)' },
		{ value: '_sep_code', label: '--- Code ---', disabled: true },
		{ value: 'code_inline', label: 'Code inline' },
		{ value: 'code_blocks', label: 'Blocs de code' },
		{ value: 'code_in_lists', label: 'Code dans listes' },
		{ value: '_sep_math', label: '--- Math ---', disabled: true },
		{ value: 'math_inline', label: 'Math inline LaTeX' },
		{ value: 'math_block', label: 'Math bloc LaTeX' },
		{ value: 'math_custom', label: 'Syntaxe custom (~, ~~)' },
		{ value: 'math_in_lists', label: 'Math dans listes' },
		{ value: '_sep_images', label: '--- Images & Media ---', disabled: true },
		{ value: 'images_basic', label: 'Images basiques' },
		{ value: 'images_attributes', label: 'Images avec attributs' },
		{ value: 'videos', label: 'Videos' },
		{ value: '_sep_quotes', label: '--- Citations ---', disabled: true },
		{ value: 'quotes_simple', label: 'Citations simples' },
		{ value: 'quotes_nested', label: 'Citations imbriquees' },
		{ value: 'quotes_in_lists', label: 'Citations dans listes' },
		{ value: '_sep_tables', label: '--- Tableaux ---', disabled: true },
		{ value: 'tables_simple', label: 'Tableaux simples' },
		{ value: 'tables_aligned', label: 'Tableaux avec alignement' },
		{ value: 'tables_formatted', label: 'Tableaux avec formatage' },
		{ value: 'tables_horizontal', label: 'Tableaux transposes' },
		{ value: '_sep_templates', label: '--- Templates ---', disabled: true },
		{ value: 'templates_variables', label: 'Variables {{var}}' },
		{ value: 'templates_random', label: 'Aleatoire {{1..10}}' },
		{ value: 'templates_eval', label: 'Eval {{eval:...}}' },
		{ value: 'templates_blank', label: 'Champs {{blank:n}}' },
		{ value: '_sep_formatting', label: '--- Formatage ---', disabled: true },
		{ value: 'formatting_text', label: 'Texte (gras, italique)' },
		{ value: 'formatting_links', label: 'Liens' },
		{ value: 'formatting_headings', label: 'Titres' }
	];

	// ============================================
	// Import/Export Markdown state
	// ============================================
	const INITIAL_MARKDOWN = MARKDOWN_EXAMPLES.complete.content;

	let selectedExample = $state('complete');
	let importMarkdown = $state(INITIAL_MARKDOWN);
	let editorJsonValue = $state<unknown>(markdownToTipTap(INITIAL_MARKDOWN));
	let exportMarkdown = $state(INITIAL_MARKDOWN);

	// Handler for example selection
	function handleExampleChange(value: string) {
		if (value && MARKDOWN_EXAMPLES[value]) {
			selectedExample = value;
			importMarkdown = MARKDOWN_EXAMPLES[value].content;
			isUpdatingFromImport = true;
			editorJsonValue = markdownToTipTap(importMarkdown);
			exportMarkdown = tipTapToMarkdown(editorJsonValue as import('@tiptap/core').JSONContent);
			queueMicrotask(() => {
				isUpdatingFromImport = false;
			});
		}
	}

	// Track if we're updating from import to avoid loops
	let isUpdatingFromImport = false;

	// Handler for import textarea changes
	function handleImportChange(event: Event) {
		const textarea = event.target as HTMLTextAreaElement;
		importMarkdown = textarea.value;
		isUpdatingFromImport = true;
		editorJsonValue = markdownToTipTap(importMarkdown);
		exportMarkdown = tipTapToMarkdown(editorJsonValue as import('@tiptap/core').JSONContent);
		// Reset flag after the update cycle
		queueMicrotask(() => {
			isUpdatingFromImport = false;
		});
	}

	// Watch editorJsonValue changes (from editor) and update export
	$effect(() => {
		// Access the value to track it
		const json = editorJsonValue;
		// Only update export if not coming from import (to avoid overwriting during import)
		if (!isUpdatingFromImport && json && typeof json === 'object') {
			exportMarkdown = tipTapToMarkdown(json as import('@tiptap/core').JSONContent);
		}
	});

	/**
	 * Normalize markdown for comparison
	 * - Trim each line
	 * - Remove ALL empty lines (compares content only, ignores whitespace between blocks)
	 * - Normalize table separator rows preserving alignment (:---, :---:, ---:)
	 *   Note: Both '---' and ':---' are treated as left-align for normalization
	 * - This makes "text\nlist" equivalent to "text\n\nlist"
	 */
	function normalizeMarkdown(md: string): string {
		return md
			.split('\n')
			.map((line) => {
				const trimmed = line.trimEnd();
				// Normalize table separator rows preserving alignment
				// Matches lines that only contain |, -, :, and spaces
				if (/^\|[\s:|-]+\|$/.test(trimmed) && trimmed.includes('-')) {
					// Extract cells and normalize each one
					const cells = trimmed.split('|').slice(1, -1); // Remove first/last empty from split
					const normalized = cells.map((cell) => {
						const c = cell.trim();
						const hasLeft = c.startsWith(':');
						const hasRight = c.endsWith(':');
						if (hasLeft && hasRight) return ':---:';
						if (hasRight) return '---:';
						// For left alignment, always use :--- for consistent comparison
						// (both '---' and ':---' represent left alignment in GFM)
						return ':---';
					});
					return '|' + normalized.join('|') + '|';
				}
				return trimmed;
			})
			.filter((line) => line !== '')
			.join('\n')
			.trim();
	}

	// Roundtrip validation
	let isRoundtripValid = $derived(
		normalizeMarkdown(importMarkdown) === normalizeMarkdown(exportMarkdown)
	);

	// ============================================
	// Diff computation for roundtrip failures
	// ============================================
	type DiffLine = {
		type: 'unchanged' | 'added' | 'removed' | 'modified';
		importLine?: string;
		exportLine?: string;
		lineNumber: number;
	};

	/**
	 * Compute line-by-line diff between import and export markdown
	 * Uses a simple algorithm comparing normalized lines
	 */
	function computeDiff(importMd: string, exportMd: string): DiffLine[] {
		const importLines = normalizeMarkdown(importMd).split('\n');
		const exportLines = normalizeMarkdown(exportMd).split('\n');
		const diff: DiffLine[] = [];

		const maxLen = Math.max(importLines.length, exportLines.length);

		for (let i = 0; i < maxLen; i++) {
			const importLine = importLines[i];
			const exportLine = exportLines[i];

			if (importLine === undefined && exportLine !== undefined) {
				// Line only in export (added)
				diff.push({ type: 'added', exportLine, lineNumber: i + 1 });
			} else if (exportLine === undefined && importLine !== undefined) {
				// Line only in import (removed)
				diff.push({ type: 'removed', importLine, lineNumber: i + 1 });
			} else if (importLine === exportLine) {
				// Lines are identical
				diff.push({ type: 'unchanged', importLine, exportLine, lineNumber: i + 1 });
			} else {
				// Lines differ (modified)
				diff.push({ type: 'modified', importLine, exportLine, lineNumber: i + 1 });
			}
		}

		return diff;
	}

	// Compute diff only when roundtrip fails
	let diffResult = $derived(!isRoundtripValid ? computeDiff(importMarkdown, exportMarkdown) : []);

	// Check if there are any differences to show
	let hasDifferences = $derived(diffResult.some((d) => d.type !== 'unchanged'));

	// Export view mode: 'diff' or 'raw'
	let exportViewMode = $state<'diff' | 'raw'>('diff');

	/**
	 * Convert diff result to a copyable text format (standard diff format)
	 */
	function diffToText(diff: DiffLine[]): string {
		const lines: string[] = [];
		for (const line of diff) {
			if (line.type === 'unchanged') {
				lines.push(`  ${line.exportLine || ''}`);
			} else if (line.type === 'removed') {
				lines.push(`- ${line.importLine || ''}`);
			} else if (line.type === 'added') {
				lines.push(`+ ${line.exportLine || ''}`);
			} else if (line.type === 'modified') {
				lines.push(`- ${line.importLine || ''}`);
				lines.push(`+ ${line.exportLine || ''}`);
			}
		}
		return lines.join('\n');
	}

	// Text content to copy based on view mode
	let exportCopyContent = $derived(
		exportViewMode === 'diff' && hasDifferences ? diffToText(diffResult) : exportMarkdown
	);

	// ============================================
	// Copy to clipboard
	// ============================================
	let copiedHtml = $state(false);
	let copiedJson = $state(false);
	let copiedMarkdown = $state(false);

	async function copyToClipboard(text: string, type: 'html' | 'json' | 'markdown') {
		await navigator.clipboard.writeText(text);
		if (type === 'html') {
			copiedHtml = true;
			setTimeout(() => (copiedHtml = false), 2000);
		} else if (type === 'json') {
			copiedJson = true;
			setTimeout(() => (copiedJson = false), 2000);
		} else {
			copiedMarkdown = true;
			setTimeout(() => (copiedMarkdown = false), 2000);
		}
	}

	// ============================================
	// Select items for MySelect
	// ============================================
	const modeItems = [
		{ value: 'form', label: 'Form (binding)' },
		{ value: 'chat', label: 'Chat (callback)' }
	];

	const mathTemplatesItems = [
		{ value: 'full', label: 'Full (9 templates)' },
		{ value: 'basic', label: 'Basic (4 templates)' },
		{ value: 'none', label: 'None (masqué)' }
	];

	const showSendButtonItems = [
		{ value: 'auto', label: 'Auto (mode-based)' },
		{ value: 'true', label: 'Toujours visible' },
		{ value: 'false', label: 'Toujours masqué' }
	];

	const minHeightItems = [
		{ value: '100px', label: '100px (défaut)' },
		{ value: '150px', label: '150px' },
		{ value: '200px', label: '200px' },
		{ value: '300px', label: '300px' }
	];
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="mb-2 text-3xl font-bold">RichTextEditor Debug</h1>
		<p class="text-muted-foreground">
			Page de test du composant unifié <code>RichTextEditor</code> avec support des modes
			<Badge variant="outline">chat</Badge> et <Badge variant="outline">form</Badge>.
		</p>
	</div>

	<Tabs.Root value="editor" class="w-full">
		<Tabs.List class="mb-6">
			<Tabs.Trigger value="editor" class="flex items-center gap-2">
				<Beaker class="h-4 w-4" />
				Editeur
			</Tabs.Trigger>
			<Tabs.Trigger value="import-export" class="flex items-center gap-2">
				<ArrowRightLeft class="h-4 w-4" />
				Import/Export
			</Tabs.Trigger>
		</Tabs.List>

		<!-- ============================================ -->
		<!-- Tab 1: Editor (existing content) -->
		<!-- ============================================ -->
		<Tabs.Content value="editor" class="space-y-8">
			<!-- ============================================ -->
			<!-- Section 1: Side-by-side comparison -->
			<!-- ============================================ -->
			<section>
				<div class="mb-4 flex items-center gap-2">
					<Eye class="h-5 w-5" />
					<h2 class="text-2xl font-semibold">Comparaison côte-à-côte</h2>
				</div>
				<p class="mb-6 text-muted-foreground">
					Les deux modes du composant unifié avec leurs comportements par défaut.
				</p>

				<div class="grid gap-6 lg:grid-cols-2">
					<!-- Chat Mode -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center justify-between">
								<span>Mode Chat</span>
								<Badge>mode="chat"</Badge>
							</Card.Title>
							<Card.Description>
								Callback <code>onSend</code>, contenu effacé après envoi, bouton Envoyer intégré
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<RichTextEditor mode="chat" onSend={handleChatSend} minHeight="120px" />

							<div>
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Messages envoyés ({chatMessages.length})</span>
									{#if chatMessages.length > 0}
										<Button size="sm" variant="ghost" onclick={clearChatMessages}>
											<RotateCcw class="mr-1 h-3 w-3" />
											Clear
										</Button>
									{/if}
								</div>
								{#if chatMessages.length === 0}
									<div
										class="rounded border border-dashed p-3 text-center text-sm text-muted-foreground"
									>
										Tapez du texte et cliquez sur Envoyer
									</div>
								{:else}
									<div class="max-h-48 space-y-2 overflow-y-auto">
										{#each chatMessages as msg, i (i)}
											<details class="rounded border bg-muted/30 p-2">
												<summary class="cursor-pointer text-xs">
													#{i + 1} - {msg.timestamp.toLocaleTimeString('fr-FR')}
												</summary>
												<pre class="mt-2 overflow-x-auto text-xs">{JSON.stringify(
														msg.content,
														null,
														2
													)}</pre>
											</details>
										{/each}
									</div>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Form Mode -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center justify-between">
								<span>Mode Form</span>
								<Badge variant="secondary">mode="form" (défaut)</Badge>
							</Card.Title>
							<Card.Description>
								Binding <code>bind:htmlValue</code>, contenu persistant, pas de bouton Envoyer
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<RichTextEditor
								mode="form"
								bind:htmlValue={formHtmlContent}
								bind:jsonValue={formJsonContent}
								minHeight="120px"
							/>

							<div class="grid gap-2">
								<details class="rounded border bg-muted/30 p-2">
									<summary class="cursor-pointer text-xs font-medium">
										HTML ({formHtmlContent.length} chars)
									</summary>
									<pre class="mt-2 max-h-32 overflow-auto text-xs">{formHtmlContent ||
											'(vide)'}</pre>
								</details>
								<details class="rounded border bg-muted/30 p-2">
									<summary class="cursor-pointer text-xs font-medium">JSON</summary>
									<pre class="mt-2 max-h-32 overflow-auto text-xs">{JSON.stringify(
											formJsonContent,
											null,
											2
										)}</pre>
								</details>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</section>

			<Separator />

			<!-- ============================================ -->
			<!-- Section 2: Configurable Playground -->
			<!-- ============================================ -->
			<section>
				<div class="mb-4 flex items-center gap-2">
					<Beaker class="h-5 w-5" />
					<h2 class="text-2xl font-semibold">Playground configurable</h2>
				</div>
				<p class="mb-6 text-muted-foreground">
					Testez toutes les combinaisons de props en temps réel.
				</p>

				<div class="grid gap-6 lg:grid-cols-3">
					<!-- Controls Panel -->
					<Card.Root class="lg:col-span-1">
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Settings class="h-4 w-4" />
								Contrôles
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div>
								<span class="mb-1 block text-sm font-medium">mode</span>
								<MySelect type="single" items={modeItems} bind:value={playgroundMode} />
							</div>

							<div>
								<span class="mb-1 block text-sm font-medium">mathTemplates</span>
								<MySelect
									type="single"
									items={mathTemplatesItems}
									bind:value={playgroundMathTemplates}
								/>
							</div>

							<div>
								<span class="mb-1 block text-sm font-medium">showSendButton</span>
								<MySelect
									type="single"
									items={showSendButtonItems}
									bind:value={showSendButtonSelect}
								/>
								<p class="mt-1 text-xs text-muted-foreground">
									Effectif : {effectiveShowSendButton ? 'visible' : 'masque'}
								</p>
							</div>

							<div>
								<span class="mb-1 block text-sm font-medium">minHeight</span>
								<MySelect type="single" items={minHeightItems} bind:value={playgroundMinHeight} />
							</div>

							<div class="space-y-2">
								<MyCheckbox bind:checked={playgroundShowClearButton} label="showClearButton" />
								<MyCheckbox bind:checked={playgroundDisabled} label="disabled" />
							</div>

							<Separator />

							<div>
								<p class="mb-2 text-sm font-medium">Charger un exemple</p>
								<div class="flex flex-wrap gap-1">
									<Button size="sm" variant="outline" onclick={() => loadExample('simple')}>
										Simple
									</Button>
									<Button size="sm" variant="outline" onclick={() => loadExample('math')}
										>Math</Button
									>
									<Button size="sm" variant="outline" onclick={() => loadExample('emojis')}>
										Emojis
									</Button>
									<Button size="sm" variant="outline" onclick={() => loadExample('complex')}>
										Complexe
									</Button>
									<Button size="sm" variant="outline" onclick={() => loadExample('taskList')}>
										Tasks
									</Button>
								</div>
								{#if playgroundMode === 'chat'}
									<p class="mt-1 text-xs text-muted-foreground">
										⚠️ Chargement disponible en mode form uniquement
									</p>
								{/if}
							</div>

							<Button variant="outline" class="w-full" onclick={resetPlayground}>
								<RotateCcw class="mr-2 h-4 w-4" />
								Reset tout
							</Button>
						</Card.Content>
					</Card.Root>

					<!-- Editor + Output -->
					<Card.Root class="lg:col-span-2">
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Play class="h-4 w-4" />
								Éditeur
							</Card.Title>
							<Card.Description>
								Props actifs :
								<code class="text-xs">
									mode="{playgroundMode}" mathTemplates="{playgroundMathTemplates}" showSendButton={'{'}
									{playgroundShowSendButton === undefined ? 'undefined' : playgroundShowSendButton}
									} showClearButton={'{'}
									{playgroundShowClearButton}
									} minHeight="{playgroundMinHeight}" disabled={'{'}
									{playgroundDisabled}
									}
								</code>
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							{#if playgroundMode === 'form'}
								<RichTextEditor
									mode="form"
									bind:htmlValue={playgroundHtmlValue}
									bind:jsonValue={playgroundJsonValue}
									mathTemplates={playgroundMathTemplates}
									showSendButton={playgroundShowSendButton}
									showClearButton={playgroundShowClearButton}
									minHeight={playgroundMinHeight}
									disabled={playgroundDisabled}
								/>
							{:else}
								<RichTextEditor
									mode="chat"
									onSend={handlePlaygroundSend}
									mathTemplates={playgroundMathTemplates}
									showSendButton={playgroundShowSendButton}
									showClearButton={playgroundShowClearButton}
									minHeight={playgroundMinHeight}
									disabled={playgroundDisabled}
								/>
							{/if}

							<Separator />

							<!-- Output Inspection -->
							<div>
								<h4 class="mb-2 flex items-center gap-2 text-sm font-medium">
									<Eye class="h-4 w-4" />
									Output
								</h4>

								{#if playgroundMode === 'form'}
									<div class="grid gap-2 md:grid-cols-2">
										<!-- HTML Output -->
										<div class="rounded border p-3">
											<div class="mb-2 flex items-center justify-between">
												<span class="text-xs font-medium"
													>HTML ({playgroundHtmlValue.length} chars)</span
												>
												<Button
													size="sm"
													variant="ghost"
													class="h-6 px-2"
													onclick={() => copyToClipboard(playgroundHtmlValue, 'html')}
												>
													{#if copiedHtml}
														<Check class="h-3 w-3 text-green-600" />
													{:else}
														<Copy class="h-3 w-3" />
													{/if}
												</Button>
											</div>
											<pre
												class="max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">{playgroundHtmlValue ||
													'(vide)'}</pre>
										</div>

										<!-- JSON Output -->
										<div class="rounded border p-3">
											<div class="mb-2 flex items-center justify-between">
												<span class="text-xs font-medium">JSON</span>
												<Button
													size="sm"
													variant="ghost"
													class="h-6 px-2"
													onclick={() =>
														copyToClipboard(JSON.stringify(playgroundJsonValue, null, 2), 'json')}
												>
													{#if copiedJson}
														<Check class="h-3 w-3 text-green-600" />
													{:else}
														<Copy class="h-3 w-3" />
													{/if}
												</Button>
											</div>
											<pre
												class="max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">{JSON.stringify(
													playgroundJsonValue,
													null,
													2
												)}</pre>
										</div>
									</div>

									<!-- Visual Render -->
									<div class="mt-2 rounded border p-3">
										<span class="mb-2 block text-xs font-medium">Rendu visuel</span>
										{#if playgroundHtmlValue}
											<div class="prose prose-sm max-w-none rounded bg-background p-2">
												{@html playgroundHtmlValue}
											</div>
										{:else}
											<p class="text-sm text-muted-foreground">(vide)</p>
										{/if}
									</div>
								{:else}
									<!-- Chat mode output -->
									<div class="rounded border p-3">
										<div class="mb-2 flex items-center justify-between">
											<span class="text-xs font-medium">
												Messages envoyés ({playgroundSentMessages.length})
											</span>
											{#if playgroundSentMessages.length > 0}
												<Button
													size="sm"
													variant="ghost"
													class="h-6 px-2"
													onclick={() => (playgroundSentMessages = [])}
												>
													<RotateCcw class="h-3 w-3" />
												</Button>
											{/if}
										</div>
										{#if playgroundSentMessages.length === 0}
											<p class="text-sm text-muted-foreground">Aucun message envoyé</p>
										{:else}
											<div class="max-h-60 space-y-2 overflow-y-auto">
												{#each playgroundSentMessages as msg, i (i)}
													<div class="rounded bg-muted/50 p-2">
														<div class="mb-1 flex items-center justify-between">
															<span class="text-xs text-muted-foreground">
																#{i + 1} - {msg.timestamp.toLocaleTimeString('fr-FR')}
															</span>
															<Button
																size="sm"
																variant="ghost"
																class="h-5 px-1"
																onclick={() =>
																	copyToClipboard(JSON.stringify(msg.content, null, 2), 'json')}
															>
																<Copy class="h-3 w-3" />
															</Button>
														</div>
														<pre class="overflow-x-auto text-xs">{JSON.stringify(
																msg.content,
																null,
																2
															)}</pre>
														<!-- Visual render of message -->
														<details class="mt-2">
															<summary class="cursor-pointer text-xs text-muted-foreground">
																Voir le rendu
															</summary>
															<div class="mt-1 rounded bg-background p-2">
																<RichTextDisplay content={msg.content} />
															</div>
														</details>
													</div>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</section>

			<Separator />

			<!-- ============================================ -->
			<!-- Section 3: Code Examples -->
			<!-- ============================================ -->
			<section>
				<div class="mb-4 flex items-center gap-2">
					<Code class="h-5 w-5" />
					<h2 class="text-2xl font-semibold">Exemples de code</h2>
				</div>
				<p class="mb-6 text-muted-foreground">
					Comment utiliser le composant unifié dans votre code.
				</p>

				<div class="grid gap-6 lg:grid-cols-2">
					<!-- Form Mode Example -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Badge variant="secondary">Form</Badge>
								Formulaires / CRUD
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<pre class="overflow-x-auto rounded bg-muted p-4 text-xs"><code
									>&lt;script lang="ts"&gt;
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

  let description = $state('');
  let jsonContent = $state&lt;unknown&gt;(null);

  // Pour éditer du contenu existant
  let existingHtml = $state('&lt;p&gt;Contenu...&lt;/p&gt;');
&lt;/script&gt;

&lt;!-- Création --&gt;
&lt;RichTextEditor bind:htmlValue=&#123;description&#125; /&gt;

&lt;!-- Avec JSON --&gt;
&lt;RichTextEditor
  bind:htmlValue=&#123;description&#125;
  bind:jsonValue=&#123;jsonContent&#125;
/&gt;

&lt;!-- Édition existante --&gt;
&lt;RichTextEditor bind:htmlValue=&#123;existingHtml&#125; /&gt;

&lt;!-- Options --&gt;
&lt;RichTextEditor
  bind:htmlValue=&#123;description&#125;
  mathTemplates="basic"
  showClearButton=&#123;false&#125;
  minHeight="200px"
/&gt;</code
								></pre>
						</Card.Content>
					</Card.Root>

					<!-- Chat Mode Example -->
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Badge>Chat</Badge>
								Messagerie / Temps réel
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<pre class="overflow-x-auto rounded bg-muted p-4 text-xs"><code
									>&lt;script lang="ts"&gt;
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

  async function handleSend(content: unknown) &#123;
    // content = JSON TipTap/ProseMirror
    await sendMessage(content);
  &#125;
&lt;/script&gt;

&lt;!-- Basic --&gt;
&lt;RichTextEditor
  mode="chat"
  onSend=&#123;handleSend&#125;
/&gt;

&lt;!-- Avec options --&gt;
&lt;RichTextEditor
  mode="chat"
  onSend=&#123;handleSend&#125;
  mathTemplates="none"
  minHeight="100px"
/&gt;</code
								></pre>
						</Card.Content>
					</Card.Root>

					<!-- Props Reference -->
					<Card.Root class="lg:col-span-2">
						<Card.Header>
							<Card.Title>Référence des Props</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="overflow-x-auto">
								<table class="w-full text-sm">
									<thead>
										<tr class="border-b">
											<th class="p-2 text-left font-medium">Prop</th>
											<th class="p-2 text-left font-medium">Type</th>
											<th class="p-2 text-left font-medium">Défaut</th>
											<th class="p-2 text-left font-medium">Description</th>
										</tr>
									</thead>
									<tbody>
										<tr class="border-b">
											<td class="p-2"><code>mode</code></td>
											<td class="p-2"><code>'chat' | 'form'</code></td>
											<td class="p-2"><code>'form'</code></td>
											<td class="p-2">Mode d'utilisation</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>value</code></td>
											<td class="p-2"><code>string</code></td>
											<td class="p-2"><code>''</code></td>
											<td class="p-2">Contenu HTML (bindable, mode form)</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>jsonValue</code></td>
											<td class="p-2"><code>unknown</code></td>
											<td class="p-2"><code>null</code></td>
											<td class="p-2">Contenu JSON TipTap (bindable, optionnel)</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>onSend</code></td>
											<td class="p-2"><code>(content: unknown) => void</code></td>
											<td class="p-2">-</td>
											<td class="p-2">Callback envoi (mode chat)</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>mathTemplates</code></td>
											<td class="p-2"><code>'full' | 'basic' | 'none'</code></td>
											<td class="p-2"><code>'full'</code></td>
											<td class="p-2">Niveau des templates math (9/4/0)</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>showSendButton</code></td>
											<td class="p-2"><code>boolean</code></td>
											<td class="p-2"><code>mode === 'chat'</code></td>
											<td class="p-2">Afficher le bouton Envoyer</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>showClearButton</code></td>
											<td class="p-2"><code>boolean</code></td>
											<td class="p-2"><code>true</code></td>
											<td class="p-2">Afficher le bouton Effacer</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>minHeight</code></td>
											<td class="p-2"><code>string</code></td>
											<td class="p-2"><code>'100px'</code></td>
											<td class="p-2">Hauteur minimum de l'éditeur</td>
										</tr>
										<tr class="border-b">
											<td class="p-2"><code>disabled</code></td>
											<td class="p-2"><code>boolean</code></td>
											<td class="p-2"><code>false</code></td>
											<td class="p-2">Désactiver l'éditeur</td>
										</tr>
									</tbody>
								</table>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</section>
		</Tabs.Content>

		<!-- ============================================ -->
		<!-- Tab 2: Import/Export Markdown -->
		<!-- ============================================ -->
		<Tabs.Content value="import-export" class="space-y-6">
			<div class="mb-4">
				<div class="flex items-center gap-4">
					<h2 class="text-2xl font-semibold">Import/Export Markdown</h2>
					{#if isRoundtripValid}
						<Badge class="h-8 bg-green-600 px-4 text-base hover:bg-green-600">
							<Check class="mr-2 h-5 w-5" />
							Roundtrip OK
						</Badge>
					{:else}
						<Badge variant="destructive" class="h-8 px-4 text-base">
							<span class="mr-2">✗</span>
							Roundtrip FAIL
						</Badge>
					{/if}
				</div>
				<p class="text-muted-foreground">
					Testez la conversion bidirectionnelle entre Markdown et le format TipTap JSON.
				</p>
			</div>

			<!-- Card 1: Import Markdown -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center justify-between">
						<span class="flex items-center gap-2">
							<Code class="h-4 w-4" />
							Import Markdown
						</span>
						<div class="flex items-center gap-2">
							<span class="text-sm font-normal text-muted-foreground">Exemple :</span>
							<MySelect
								type="single"
								items={markdownExampleItems}
								value={selectedExample}
								onValueChange={handleExampleChange}
								placeholder="Choisir un exemple"
								triggerClass="h-8 w-56 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
							/>
						</div>
					</Card.Title>
					<Card.Description>
						Collez ou tapez du Markdown ici pour le convertir en contenu riche
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<details open class="group">
						<summary class="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium">
							<span class="transition-transform group-open:rotate-90">&#9654;</span>
							Source Markdown
						</summary>
						<textarea
							class="h-48 w-full resize-y rounded-md border border-border bg-muted/50 p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
							value={importMarkdown}
							oninput={handleImportChange}
							placeholder="# Titre&#10;&#10;Texte avec **gras** et *italique*..."
							spellcheck="false"
							aria-label="Source Markdown"
						></textarea>
					</details>
				</Card.Content>
			</Card.Root>

			<!-- Card 2: RichTextEditor -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Eye class="h-4 w-4" />
						Editeur RichText
					</Card.Title>
					<Card.Description>
						Le contenu est synchronise avec l'import Markdown ci-dessus
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<RichTextEditor mode="form" bind:jsonValue={editorJsonValue} minHeight="200px" />
				</Card.Content>
			</Card.Root>

			<!-- Card 3: JSON Debug -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center justify-between">
						<span class="flex items-center gap-2">
							<Code class="h-4 w-4" />
							JSON Debug
						</span>
						<Button
							size="sm"
							variant="ghost"
							onclick={() => copyToClipboard(JSON.stringify(editorJsonValue, null, 2), 'json')}
						>
							{#if copiedJson}
								<Check class="mr-1 h-3 w-3 text-green-600" />
								Copié
							{:else}
								<Copy class="mr-1 h-3 w-3" />
								Copier
							{/if}
						</Button>
					</Card.Title>
					<Card.Description>Format TipTap JSON intermédiaire (pour debug)</Card.Description>
				</Card.Header>
				<Card.Content>
					<details>
						<summary class="mb-2 cursor-pointer text-sm font-medium"> Voir le JSON TipTap </summary>
						<pre
							class="max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-4 font-mono text-xs">{JSON.stringify(
								editorJsonValue,
								null,
								2
							)}</pre>
					</details>
				</Card.Content>
			</Card.Root>

			<!-- Card 4: Export Markdown with Diff View -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center justify-between">
						<span class="flex items-center gap-2">
							<Code class="h-4 w-4" />
							Export Markdown
							{#if !isRoundtripValid && hasDifferences}
								<Badge variant="outline" class="ml-2 text-xs">Diff View</Badge>
							{/if}
						</span>
						<Button
							size="sm"
							variant="ghost"
							onclick={() => copyToClipboard(exportCopyContent, 'markdown')}
						>
							{#if copiedMarkdown}
								<Check class="mr-1 h-3 w-3 text-green-600" />
								Copié
							{:else}
								<Copy class="mr-1 h-3 w-3" />
								Copier
							{/if}
						</Button>
					</Card.Title>
					<Card.Description>
						{#if !isRoundtripValid && hasDifferences}
							<span class="text-amber-600 dark:text-amber-400">
								⚠️ Différences détectées entre l'import et l'export
							</span>
						{:else}
							Resultat de la conversion du contenu de l'editeur vers Markdown
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if !isRoundtripValid && hasDifferences}
						<!-- Tabs for Diff/Raw view -->
						<div class="mb-4 flex gap-2">
							<Button
								size="sm"
								variant={exportViewMode === 'diff' ? 'default' : 'outline'}
								onclick={() => (exportViewMode = 'diff')}
							>
								Diff
							</Button>
							<Button
								size="sm"
								variant={exportViewMode === 'raw' ? 'default' : 'outline'}
								onclick={() => (exportViewMode = 'raw')}
							>
								Raw
							</Button>
						</div>

						{#if exportViewMode === 'diff'}
							<!-- Diff View -->
							<div class="mb-3 flex items-center gap-4 text-xs">
								<span class="flex items-center gap-1">
									<span class="inline-block h-3 w-3 rounded bg-red-200 dark:bg-red-900"></span>
									Supprimé (import)
								</span>
								<span class="flex items-center gap-1">
									<span class="inline-block h-3 w-3 rounded bg-green-200 dark:bg-green-900"></span>
									Ajouté (export)
								</span>
								<span class="flex items-center gap-1">
									<span class="inline-block h-3 w-3 rounded bg-amber-200 dark:bg-amber-900"></span>
									Modifié
								</span>
							</div>
							<div
								class="max-h-96 overflow-auto rounded-md border border-border bg-muted/30 font-mono text-sm"
							>
								{#each diffResult as line (line.lineNumber)}
									{#if line.type === 'unchanged'}
										<div class="flex border-b border-border/30 px-2 py-0.5">
											<span class="w-8 shrink-0 pr-2 text-right text-muted-foreground"
												>{line.lineNumber}</span
											>
											<span class="break-all whitespace-pre-wrap">{line.exportLine || ''}</span>
										</div>
									{:else if line.type === 'removed'}
										<div
											class="flex border-b border-border/30 bg-red-100 px-2 py-0.5 dark:bg-red-950"
										>
											<span class="w-8 shrink-0 pr-2 text-right text-red-600 dark:text-red-400"
												>-{line.lineNumber}</span
											>
											<span class="break-all whitespace-pre-wrap text-red-700 dark:text-red-300"
												>{line.importLine || ''}</span
											>
										</div>
									{:else if line.type === 'added'}
										<div
											class="flex border-b border-border/30 bg-green-100 px-2 py-0.5 dark:bg-green-950"
										>
											<span class="w-8 shrink-0 pr-2 text-right text-green-600 dark:text-green-400"
												>+{line.lineNumber}</span
											>
											<span class="break-all whitespace-pre-wrap text-green-700 dark:text-green-300"
												>{line.exportLine || ''}</span
											>
										</div>
									{:else if line.type === 'modified'}
										<!-- Show both old and new lines for modifications -->
										<div
											class="flex border-b border-border/30 bg-red-100 px-2 py-0.5 dark:bg-red-950"
										>
											<span class="w-8 shrink-0 pr-2 text-right text-red-600 dark:text-red-400"
												>-{line.lineNumber}</span
											>
											<span class="break-all whitespace-pre-wrap text-red-700 dark:text-red-300"
												>{line.importLine || ''}</span
											>
										</div>
										<div
											class="flex border-b border-border/30 bg-green-100 px-2 py-0.5 dark:bg-green-950"
										>
											<span class="w-8 shrink-0 pr-2 text-right text-green-600 dark:text-green-400"
												>+{line.lineNumber}</span
											>
											<span class="break-all whitespace-pre-wrap text-green-700 dark:text-green-300"
												>{line.exportLine || ''}</span
											>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							<!-- Raw View -->
							<textarea
								class="h-48 w-full resize-y rounded-md border border-border bg-muted/50 p-4 font-mono text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
								value={exportMarkdown}
								readonly
								aria-label="Markdown exporte brut"
							></textarea>
						{/if}
					{:else}
						<!-- Normal view when roundtrip is OK -->
						<textarea
							class="h-48 w-full resize-y rounded-md border border-border bg-muted/50 p-4 font-mono text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
							value={exportMarkdown}
							readonly
							aria-label="Markdown exporte"
						></textarea>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
