# Transpileur LaTeX → Markdown

> Documentation exhaustive du transpileur LaTeX vers Custom Markdown pour le système d'exercices.
>
> **Statut**: Phase 5/10 - Block Converters (Complétée)
> **Dernière mise à jour**: 2025-11-21

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture Générale](#architecture-générale)
3. [API Publique](#api-publique)
4. [Conversions Supportées](#conversions-supportées)
5. [Structure de Dossiers](#structure-de-dossiers)
6. [Algorithmes](#algorithmes)
7. [Edge Cases](#edge-cases)
8. [Limitations](#limitations)
9. [Guide de Contribution](#guide-de-contribution)

---

## Vue d'ensemble

### Objectif

Convertir du code LaTeX (complet ou fragmentaire) en Custom Markdown compatible avec le système de parsing markdown existant (`src/lib/exercises/markdown-parser/`) pour le système d'exercices.

### Contexte

Le système d'exercices d'UbuMaths supporte un format Markdown enrichi avec:

- Formules mathématiques LaTeX (inline `$...$` et display `$$...$$`)
- Nodes personnalisées (blockquotes, code blocks, listes)

Le transpileur LaTeX→Markdown permet aux instructeurs d'importer des documents LaTeX existants et de les convertir en format compatible.

### Workflow

```
LaTeX Source
   ↓
transpileLatexToMarkdown()
   ↓
Custom Markdown Text
   ↓
markdown-parser.parse()
   ↓
AST (pour le système d'exercices)
```

### Principes de Design

1. **Conversion prévisible**: Chaque construction LaTeX a une traduction Markdown définissable
2. **Préservation des maths**: Les formules LaTeX passent inchangées
3. **Graceful degradation**: Commandes non supportées → commentaires HTML `<!-- LaTeX: ... -->`
4. **Pas de dépendances externes**: Tokenizer/parser custom, zéro dépendance npm
5. **100% TypeScript**: Types stricts, aucun `any`

### Cas d'Usage

- **Professeurs**: Import de documents LaTeX existants
- **Copy-paste**: Fragments LaTeX (équations, sections) collés directement
- **Batch conversion**: Conversion de multiples documents

---

## Architecture Générale

### Composants Principaux

```
Input (LaTeX)
    ↓
[Tokenizer] → Tokens (LatexToken[])
    ↓
[Orchestrateur] → Appelle convertisseurs appropriés
    ↓
[Convertisseurs Spécialisés]
├── Simple (headings, formatting, hrule)
├── Lists (itemize, enumerate)
├── Blocks (quote, verbatim, code, images)
└── Tables (tabular)
    ↓
Output (Markdown String)
```

### Stratégie de Conversion

**Approche**: Token-by-token avec déduction du contexte

1. **Tokenize**: Convertir LaTeX en liste plate de tokens typés
2. **Orchestrate**: Parcourir tokens, appeler convertisseurs appropriés
3. **Convert**: Chaque convertisseur retourne du markdown
4. **Concatenate**: Joindre tous les segments

### Gestion des Erreurs

Deux niveaux:

1. **Parse errors**: Syntaxe LaTeX invalide
   - Exemple: `{brace non fermé`
   - Traitement: Inclure le texte brut, ajouter warning

2. **Unsupported commands**: Commandes LaTeX reconnues mais non converties
   - Exemple: `\customcommand{arg}`
   - Traitement: Wrapper en `<!-- LaTeX: \customcommand{arg} -->`, ajouter warning

---

## API Publique

### `transpileLatexToMarkdown(latex, options?)`

**Signature**:

```typescript
function transpileLatexToMarkdown(latex: string, options?: LatexToMarkdownOptions): TranspileResult;
```

**Description**: Convertit une chaîne LaTeX en Markdown.

**Exemple**:

```typescript
import { transpileLatexToMarkdown } from '$lib/exercises/transpilers';

const latex = `
\\section{Introduction}
\\textbf{Bold} et \\textit{italic} text.
$E = mc^2$
`;

const result = transpileLatexToMarkdown(latex);

console.log(result.markdown);
// # Introduction
// **Bold** et *italic* text.
// $E = mc^2$

console.log(result.warnings);
// [] - Pas d'avertissements
```

---

### Types TypeScript

#### `LatexToMarkdownOptions`

```typescript
interface LatexToMarkdownOptions {
	/**
	 * Préserver les commentaires LaTeX (%) comme commentaires HTML.
	 * @default false
	 *
	 * Exemple:
	 * Input:  text % this is a comment
	 * false:  text
	 * true:   text <!-- comment: this is a comment -->
	 */
	preserveComments?: boolean;

	/**
	 * Délimiteurs mathématiques à utiliser en sortie.
	 * @default 'dollar'
	 *
	 * 'dollar':   $...$ et $$...$$
	 * 'brackets': \(...\) et \[...\]
	 */
	mathDelimiters?: 'dollar' | 'brackets';
}
```

#### `TranspileResult`

```typescript
interface TranspileResult {
	/**
	 * Le markdown généré.
	 * Compatible avec markdown-parser existant.
	 */
	markdown: string;

	/**
	 * Avertissements rencontrés lors de la conversion.
	 * (vide si tout s'est bien passé)
	 */
	warnings: TranspileWarning[];
}
```

#### `TranspileWarning`

```typescript
interface TranspileWarning {
	/** Type d'avertissement */
	type: 'unsupported-command' | 'unsupported-environment' | 'parse-error' | 'malformed-input';

	/** Message descriptif */
	message: string;

	/** Numéro de ligne (si disponible, 0-based) */
	line?: number;

	/** Commande/environnement problématique */
	command?: string;

	/** Contexte additionnel */
	context?: string;
}
```

#### `LatexToken`

```typescript
type LatexToken =
	| { type: 'text'; content: string }
	| { type: 'command'; name: string; args: string[] }
	| { type: 'environment'; name: string; content: string }
	| { type: 'math'; mode: 'inline' | 'display'; content: string }
	| { type: 'comment'; content: string }
	| { type: 'whitespace'; content: string }
	| { type: 'special'; char: string };
```

---

## Conversions Supportées

### Table Récapitulative

| LaTeX                             | Markdown                           | Phase | Notes                      |
| --------------------------------- | ---------------------------------- | ----- | -------------------------- |
| `$x^2$`                           | `$x^2$`                            | 3     | Inline math - pass-through |
| `\[x^2\]`                         | `$$x^2$$`                          | 3     | Display math               |
| `\section{...}`                   | `# ...`                            | 3     | Level 1 heading            |
| `\subsection{...}`                | `## ...`                           | 3     | Level 2 heading            |
| `\textbf{...}`                    | `**...**`                          | 3     | Bold text                  |
| `\textit{...}`                    | `*...*`                            | 3     | Italic text                |
| `\texttt{...}`                    | `` `...` ``                        | 3     | Monospace text             |
| `\hrule`                          | `---`                              | 3     | Horizontal rule            |
| `\begin{itemize}`                 | `- item`                           | 4     | Bullet list                |
| `\begin{enumerate}`               | `1. item`                          | 4     | Numbered list              |
| `\begin{quote}`                   | `> ...`                            | 5     | Blockquote                 |
| `\begin{verbatim}`                | ` ``` `                            | 5     | Code block (no language)   |
| `\begin{lstlisting}[language=X]`  | ` ```x `                           | 5     | Code block with language   |
| `\begin{minted}{lang}`            | ` ```lang `                        | 5     | Code block with language   |
| `\includegraphics{path}`          | `![](path)`                        | 5     | Image (no alt text)        |
| `\begin{figure}...\caption{text}` | `![text](path)`                    | 5     | Image with caption         |
| `\begin{center}`                  | `<div style="text-align: center">` | 5     | Centered content           |
| `\begin{tabular}`                 | `\| col \| col \|`                 | 6     | Table (TODO)               |

---

### Phase 3: Triviales et Faciles

#### Formules Mathématiques (Pass-through)

| LaTeX     | Markdown  | Notes                               |
| --------- | --------- | ----------------------------------- |
| `$x^2$`   | `$x^2$`   | Inline math - pass-through          |
| `\(x^2\)` | `$x^2$`   | Alias inline math                   |
| `\[x^2\]` | `$$x^2$$` | Display math - délimiteurs changent |
| `$$x^2$$` | `$$x^2$$` | Display math - pass-through         |

**Règle**: Les contenus mathématiques ne sont jamais parsés. Ils sont préservés exactement comme fournis.

#### Headings (Sections)

| LaTeX                   | Markdown     | Notes                      |
| ----------------------- | ------------ | -------------------------- |
| `\section{Titre}`       | `# Titre`    | Level 1                    |
| `\subsection{Titre}`    | `## Titre`   | Level 2                    |
| `\subsubsection{Titre}` | `### Titre`  | Level 3                    |
| `\paragraph{Titre}`     | `#### Titre` | Level 4 (rarement utilisé) |

**Règle**: Whitespace pré/post est nettoyé. Les arguments imbriqués sont récursivement convertis.

**Exemples**:

```latex
\section{Introduction to \textbf{Mathematics}}
```

devient:

```markdown
# Introduction to **Mathematics**
```

#### Text Formatting (Basique)

| LaTeX           | Markdown     | Notes               |
| --------------- | ------------ | ------------------- |
| `\textbf{text}` | `**text**`   | Bold                |
| `\textit{text}` | `*text*`     | Italic              |
| `\texttt{text}` | `` `text` `` | Monospace           |
| `\textup{text}` | `text`       | Upright (no-op)     |
| `\emph{text}`   | `*text*`     | Emphasis (= italic) |

**Règle**: Imbrication supportée. Exemple: `\textbf{\textit{bold-italic}}` → `***bold-italic***`

#### Hrule (Ligne Horizontale)

| LaTeX    | Markdown            |
| -------- | ------------------- |
| `\hrule` | `---`               |
| `\hline` | `---` (dans tables) |

---

### Phase 4: Listes

#### Itemize (Listes à Puces)

**LaTeX**:

```latex
\begin{itemize}
  \item Premier item
  \item Deuxième item
\end{itemize}
```

**Markdown**:

```markdown
- Premier item
- Deuxième item
```

**Règles**:

- `\item` optionnel (certains dialectes LaTeX) → erreur parse
- Imbrication supportée (convertie en indentation)
- Espaces blancs pré/post ignorés

#### Enumerate (Listes Numérotées)

**LaTeX**:

```latex
\begin{enumerate}
  \item Premier item
  \item Deuxième item
\end{enumerate}
```

**Markdown**:

```markdown
1. Premier item
2. Deuxième item
```

**Règles**:

- Les numéros LaTeX `\item[label]` sont ignorés, renuméroté automatiquement
- Imbrication supportée
- Remise à zéro à chaque niveau d'imbrication

---

### Phase 5: Blocs Spécialisés

#### Quote & Quotation (Blockquotes)

**LaTeX**:

```latex
\begin{quote}
Lorem ipsum dolor sit amet.
Multi-line quote works too.
\end{quote}
```

Ou:

```latex
\begin{quotation}
Another quote type with similar conversion.
\end{quotation}
```

**Markdown**:

```markdown
> Lorem ipsum dolor sit amet.
> Multi-line quote works too.
```

**Règles**:

- Chaque ligne devient `> ...`
- Both `quote` and `quotation` environments convert identically
- Empty lines preserved (create paragraph breaks in quote)
- Imbrication non supportée (pas standard LaTeX)
- Internal LaTeX commands are processed (e.g., `\textbf{bold}` inside quote)

#### Verbatim (Code Brut)

**LaTeX**:

```latex
\begin{verbatim}
def hello():
    print("Hello")
\end{verbatim}
```

**Markdown**:

````markdown
```
def hello():
    print("Hello")
```
````

**Règles**:

- Aucun parsing interne (contrairement à lstlisting)
- Whitespace préservé exactement

#### Lstlisting (Code avec Couleurs)

**LaTeX**:

```latex
\begin{lstlisting}[language=python]
def hello():
    print("Hello")
\end{lstlisting}
```

Ou avec plusieurs options:

```latex
\begin{lstlisting}[language=python,linewidth=0.8\textwidth]
def hello():
    print("Hello")
\end{lstlisting}
```

**Markdown**:

````markdown
```python
def hello():
    print("Hello")
```
````

**Règles**:

- `language=` extracté et utilisé pour fence
- Language tag normalized (Python → python, Java → java, C++ → cpp, etc.)
- Autres options ignorées (caption, label, linewidth, etc.) → warnings
- Whitespace préservé exactement
- Empty lines preserved

#### Minted (Code Blocks Alternative)

**LaTeX**:

```latex
\begin{minted}{python}
def hello():
    print("Hello")
\end{minted}
```

**Markdown**:

````markdown
```python
def hello():
    print("Hello")
```
````

**Règles**:

- Language extracted from required argument `{lang}`
- Language tag normalized (same as lstlisting)
- Whitespace preserved exactly

#### Images (includegraphics)

**LaTeX - Without Options**:

```latex
\includegraphics{images/diagram.png}
```

**LaTeX - With Options**:

```latex
\includegraphics[width=0.8\textwidth,angle=90]{images/diagram.png}
```

**Markdown**:

```markdown
![](images/diagram.png)
```

**Règles**:

- Options (width, height, scale, angle, etc.) parsed but not converted → warnings
- Texte alternatif non supporté (LaTeX n'en a pas par défaut)
- Chemin de fichier préservé exactement
- Supported options: `width`, `height`, `scale`, `angle`, `clip`, `draft`

#### Figures (Avec Caption)

**LaTeX**:

```latex
\begin{figure}
  \includegraphics[width=0.8\textwidth]{diagram.png}
  \caption{A sample diagram showing the process}
\end{figure}
```

**Markdown**:

```markdown
![A sample diagram showing the process](diagram.png)
```

**Règles**:

- Figure environment extracts `\caption{...}` as alt text
- `\includegraphics` path extracted and used as image source
- Other content (labels, references) ignored → warnings
- Caption text processed for LaTeX commands (e.g., `\textbf` inside caption)
- Multiple images per figure: only first `\includegraphics` used

#### Alignment Blocks (center, flushleft, flushright)

**LaTeX**:

```latex
\begin{center}
  Centered text
\end{center}
```

Ou:

```latex
\begin{flushleft}
  Left-aligned text
\end{flushleft}
```

Ou:

```latex
\begin{flushright}
  Right-aligned text
\end{flushright}
```

**Markdown**:

```markdown
<div style="text-align: center">
  Centered text
</div>
```

**Règles**:

- `\begin{center}` → `<div style="text-align: center">`
- `\begin{flushleft}` → `<div style="text-align: left">`
- `\begin{flushright}` → `<div style="text-align: right">`
- Closing tag: `</div>`
- Internal content processed for LaTeX commands
- HTML wrapping allows markdown-parser to preserve styling

---

### Phase 6: Tables

#### Tabular (Tableaux)

**LaTeX**:

```latex
\begin{tabular}{|l|c|r|}
\hline
Gauche & Centre & Droite \\
\hline
A & B & C \\
D & E & F \\
\hline
\end{tabular}
```

**Markdown**:

```markdown
| Gauche | Centre | Droite |
| ------ | ------ | ------ |
| A      | B      | C      |
| D      | E      | F      |
```

**Règles**:

- Spec de colonnes `{|l|c|r|}` → séquence de colonnes
- `\hline` → separateur visual
- `\\` → fin de ligne
- `&` → séparateur de cellules
- `\multicolumn` non supporté → warning

---

### Phase 7-8: Commandes Avancées

(À documenter pendant les phases d'implémentation)

---

### Commandes Non Supportées

Les commandes/environnements non reconnus sont wrappés ainsi:

```markdown
<!-- LaTeX: \unknowncommand{args} -->
```

Exemple:

```latex
\unknowncommand{arg1}{arg2}
```

devient:

```markdown
<!-- LaTeX: \unknowncommand{arg1}{arg2} -->
```

Avec warning:

```typescript
{
  type: 'unsupported-command',
  message: 'Command \\unknowncommand not supported',
  command: 'unknowncommand'
}
```

---

## Structure de Dossiers

```
src/lib/exercises/transpilers/
├── latex-to-markdown/
│   ├── index.ts                    # Orchestrateur principal
│   ├── types.ts                    # Types TypeScript
│   ├── tokenizer.ts                # Tokenizer LaTeX
│   ├── converters/
│   │   ├── index.ts                # Re-exports
│   │   ├── simple.ts               # Headings, formatting, hrule
│   │   ├── lists.ts                # itemize, enumerate
│   │   ├── blocks.ts               # quote, verbatim, lstlisting, images
│   │   └── tables.ts               # tabular
│   └── __tests__/
│       ├── index.test.ts           # Tests principaux
│       ├── tokenizer.test.ts       # Tests tokenizer
│       ├── converters.test.ts      # Tests convertisseurs
│       └── integration.test.ts     # Tests d'intégration
└── index.ts                         # Re-export principal

src/lib/exercises/markdown-parser/  # Existant (utilisation seulement)
```

---

## Algorithmes

### Tokenizer LaTeX

**Pseudo-code**:

```
tokens = []
i = 0

while i < latex.length:
  if latex[i] == '$':
    mathContent = extractMathContent(latex, i)
    tokens.push({ type: 'math', content: mathContent })
    i = nextIndexAfterMath

  else if latex[i] == '\':
    command = extractCommand(latex, i)
    if command.name == 'begin':
      envContent = extractEnvironment(latex, i)
      tokens.push({ type: 'environment', name, content })
      i = nextIndexAfterEnvironment
    else:
      args = extractArgs(latex, i)
      tokens.push({ type: 'command', name, args })
      i = nextIndexAfterCommand

  else if latex[i] == '%':
    comment = extractComment(latex, i)
    tokens.push({ type: 'comment', content: comment })
    i = nextIndexAfterComment

  else if isWhitespace(latex[i]):
    ws = extractWhitespace(latex, i)
    tokens.push({ type: 'whitespace', content: ws })
    i = nextIndexAfterWhitespace

  else:
    tokens.push({ type: 'text', content: latex[i] })
    i++

return tokens
```

### Fonctions Utilitaires

#### `findMatchingBrace(latex, startIndex): [int, int]`

Trouve l'indice de la brace fermante correspondant à une brace ouverte.

**Exemple**:

```
Input:  "\textbf{hello {nested} world}", startIndex=7
Output: [7, 29]  // Indices de { et }
```

**Règles**:

- Gère l'imbrication de braces
- Gère l'échappement `\{` et `\}`
- Lance une erreur si pas de match trouvé

#### `extractEnvironment(latex, startIndex): { name, content, endIndex }`

Extrait un environnement `\begin{name}...\end{name}`.

**Exemple**:

```
Input:  \begin{itemize}\item test\end{itemize}
Output: {
  name: 'itemize',
  content: '\item test',
  endIndex: 38
}
```

---

## Edge Cases

### À Tester et Documenter

#### Braces Imbriquées

```latex
\textbf{outer \textit{inner} text}
```

**Expected**: `**outer *inner* text**`

#### Espaces Multiples

```latex
\section{  Multiple   spaces  }
```

**Expected**: `# Multiple spaces` (normalisés à un espace)

#### Math Imbriquée (Non-Supportée)

```latex
\textbf{$x^2$}
```

**Expected**: `**$x^2$**` (math préservée exactement)

#### Caractères Spéciaux dans Arguments

```latex
\textbf{100\% discount}
```

**Expected**: `**100\% discount**` (échappement préservé)

#### Environnements Vides

```latex
\begin{itemize}
\end{itemize}
```

**Expected**: `` (liste vide) avec warning

#### Commentaires Partiels

```latex
text % comment with \command{}
more text
```

**Expected**: `text` (ligne 1), `more text` (ligne 2)

- Commande dans commentaire = ignorée

#### Fragmentation (Commandes Non Fermées)

```latex
\begin{itemize}
\item test
% Oups, pas de \end{itemize}
```

**Expected**: Warning + traitement gracieux (wrapper dans commentaire HTML)

#### Whitespace Significatif

```latex
Ligne 1
Ligne 2

Ligne 4 (après paraphe)
```

**Expected**: Préserver structure paragraphes (double newline)

#### Commandes avec Arguments Optionnels

```latex
\includegraphics[width=0.8\textwidth]{file.png}
```

**Expected**: Ignorer `[...]`, utiliser `{file.png}`

---

## Limitations

### Commandes Non Supportées

Les packages suivants ne sont **jamais** supportés:

- **amsmath**: `align`, `equation*`, `gather`, `multline`, etc.
  - LaTeX standard `\[...\]` supporté comme alternative

- **tikz** / **pgfplots**: Graphiques vectoriels
  - Alternative: `\includegraphics` pour images raster

- **fancyhdr** / **geometry**: Mise en page
  - Ignoré (pas pertinent en markdown)

- **babel** / **polyglossia**: Support multilingue
  - Partiellement supporté (commandes de langue ignorées)

### Limitations Intentionnelles

1. **Pas de conversion de références**: `\ref`, `\cite`, `\label` ignorés
2. **Pas de conversion de footnotes**: `\footnote{}` → wrapper HTML
3. **Pas de conversion de pagebreaks**: `\newpage`, `\pagebreak` ignorés
4. **Pas de gestion du préambule**: `\documentclass`, `\usepackage` ignorés
5. **Pas de macros utilisateur**: `\newcommand` non supporté

---

## Guide de Contribution

### Pattern pour Ajouter une Nouvelle Conversion

#### 1. Identifier le Type de Conversion

- **Simple**: Commande simple avec arguments, pas de contenu dynamique
- **Environment**: `\begin{...}...\end{...}` avec contenu structuré
- **Complex**: Imbrication, cas spéciaux, logique conditionnelle

#### 2. Créer la Fonction dans le Fichier Approprié

**Exemple (Simple)**:

```typescript
// src/lib/exercises/transpilers/latex-to-markdown/converters/simple.ts

/**
 * Convertit \textbf{...} en **...**
 * @param content Le contenu entre les braces
 * @returns Markdown bold
 */
export function convertTextbf(content: string): string {
	return `**${content}**`;
}
```

**Exemple (Environment)**:

```typescript
// src/lib/exercises/transpilers/latex-to-markdown/converters/lists.ts

/**
 * Convertit \begin{itemize}...\end{itemize} en liste markdown
 * @param content Le contenu entre begin et end
 * @returns Markdown list
 */
export function convertItemize(content: string): string {
	// Parse les \item{}
	// Retourner markdown list
}
```

#### 3. Intégrer dans l'Orchestrateur Principal

```typescript
// src/lib/exercises/transpilers/latex-to-markdown/index.ts

const COMMAND_HANDLERS: Record<string, (args: string[]) => string> = {
	textbf: (args) => convertTextbf(args[0]),
	textit: (args) => convertTextit(args[0])
	// ... autres commandes
};

const ENV_HANDLERS: Record<string, (content: string) => string> = {
	itemize: convertItemize,
	enumerate: convertEnumerate
	// ... autres environnements
};
```

#### 4. Écrire les Tests

```typescript
// src/lib/exercises/transpilers/latex-to-markdown/__tests__/converters.test.ts

describe('convertTextbf', () => {
	it('should convert \\textbf{text} to **text**', () => {
		const result = transpileLatexToMarkdown('\\textbf{bold}');
		expect(result.markdown).toBe('**bold**');
		expect(result.warnings).toHaveLength(0);
	});

	it('should handle nested formatting', () => {
		const result = transpileLatexToMarkdown('\\textbf{\\textit{nested}}');
		expect(result.markdown).toBe('***nested***');
	});

	it('should handle math inside formatting', () => {
		const result = transpileLatexToMarkdown('\\textbf{$x^2$}');
		expect(result.markdown).toBe('**$x^2$**');
	});

	// Edge cases...
});
```

#### 5. Documenter dans cette Page

Ajouter une entrée dans la table [Conversions Supportées](#conversions-supportées) et documenter les règles, exemples, et limitations.

### Checklist pour PR

- [ ] Code implémenté et TypeScript strict (0 `any`)
- [ ] Tests (95%+ de couverture pour cette fonctionnalité)
- [ ] Intégration dans `index.ts`
- [ ] Documentation complète (cette page)
- [ ] Edge cases testés
- [ ] Warnings appropriés générés

---

## Ressources

### Fichiers Connexes

- **Markdown Parser**: `src/lib/exercises/markdown-parser/` - Utilise la sortie de ce transpileur
- **Exercise System**: `src/lib/exercises/` - Contexte d'utilisation
- **Tests**: `src/lib/exercises/__tests__/`

### Progress

- **Tracker**: `.claude/latex-transpiler-progress.md`
- **Branch**: `feature/audit-trail`

### Références

- [LaTeX Reference](https://www.latex-project.org/help/documentation/)
- [CommonMark Spec](https://spec.commonmark.org/)

---

**Dernière mise à jour**: 2025-11-21 par Claude Code

**Maintainers**: Claude Code (@claude)

**Status**: Phase 0/10 - Setup Documentation (Complétée)
