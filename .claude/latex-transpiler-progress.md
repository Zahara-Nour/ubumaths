# LaTeX→Markdown Transpiler - Progress Tracker

## État Actuel
- **Phase**: 7/10 - Fallback Converter
- **Statut**: Completed
- **Dernière mise à jour**: 2025-11-21

---

## Spécifications du Projet

### Objectif
Créer un transpileur LaTeX → Custom Markdown qui préserve les formules mathématiques LaTeX.

### Choix de Design
1. **Output**: Custom Markdown (texte) - sera parsé par le markdown-parser existant
2. **Commandes non supportées**: Wrapper en `<!-- LaTeX: \command{} -->`
3. **Packages**: Standard seulement (pas amsmath, tikz)
4. **Source**: Documents complets + fragments (copier-coller)

### Conversions Supportées

| LaTeX | Markdown | Difficulté | Phase |
|-------|----------|------------|-------|
| `$...$` | `$...$` | Triviale | 3 |
| `\[...\]` | `$$...$$` | Triviale | 3 |
| `\section{...}` | `# ...` | Facile | 3 |
| `\subsection{...}` | `## ...` | Facile | 3 |
| `\subsubsection{...}` | `### ...` | Facile | 3 |
| `\textbf{...}` | `**...**` | Facile | 3 |
| `\textit{...}` | `*...*` | Facile | 3 |
| `\texttt{...}` | `` `...` `` | Facile | 3 |
| `\hrule` | `---` | Facile | 3 |
| `\begin{itemize}` | `- item` | Moyenne | 4 |
| `\begin{enumerate}` | `1. item` | Moyenne | 4 |
| `\begin{quote}` | `> ...` | Moyenne | 5 |
| `\begin{verbatim}` | ` ``` ` | Moyenne | 5 |
| `\begin{lstlisting}` | ` ```lang ` | Moyenne | 5 |
| `\includegraphics{...}` | `![](src)` | Moyenne | 5 |
| `\begin{tabular}` | `| col | col |` | Difficile | 6 |

---

## Phases

### Phase 0: Setup Documentation ⏳
- [x] Créer `.claude/latex-transpiler-progress.md`
- [x] Créer `docs/claude/latex-to-markdown.md`

**État**: Complétée

---

### Phase 1: Architecture & Types
- [x] Définir `LatexToMarkdownOptions`
- [x] Définir `TranspileResult` et types d'erreurs
- [x] Définir types tokens LaTeX
- [x] Créer `src/lib/exercises/transpilers/latex-to-markdown/types.ts`
- [x] Créer structure de dossiers
- [x] Créer `src/lib/exercises/transpilers/index.ts` avec re-exports
- [x] Créer 68 tests unitaires pour validation des types

**État**: Complétée

---

### Phase 2: Tokenizer LaTeX
- [x] Implémenter tokenizer basique (caractères, commandes, environnements)
- [x] Implémenter `findMatchingBrace()` avec gestion d'imbrication
- [x] Implémenter `extractEnvironment()` pour `\begin{...}\end{...}`
- [x] Implémenter gestion des commentaires `%`
- [x] Implémenter gestion des espaces significatifs/non significatifs
- [x] Tests exhaustifs du tokenizer (56 tests)

**État**: Complétée

---

### Phase 3: Conversions Triviales & Faciles
- [x] Passer les formules math en pass-through (`$...$` → `$...$`)
- [x] Convertir `\[...\]` → `$$...$$`
- [x] Implémenter `\section{...}` → `# ...`
- [x] Implémenter `\subsection{...}` → `## ...`
- [x] Implémenter `\subsubsection{...}` → `### ...`
- [x] Implémenter `\textbf{...}` → `**...**`
- [x] Implémenter `\textit{...}` → `*...*`
- [x] Implémenter `\texttt{...}` → `` `...` ``
- [x] Implémenter `\hrule` → `---`
- [x] Tests exhaustifs (96 tests)

**État**: Complétée

---

### Phase 4: Listes (itemize, enumerate, description)
- [x] Parser `\begin{itemize}...\end{itemize}`
- [x] Parser `\begin{enumerate}...\end{enumerate}`
- [x] Parser `\begin{description}...\end{description}`
- [x] Gérer imbrication de listes
- [x] Gérer `\item` avec labels optionnels
- [x] Tests exhaustifs (54 tests)

**État**: Complétée

---

### Phase 5: Blocs (quote, verbatim, code, images)
- [x] Implémenter `\begin{quote}...\end{quote}` → `> ...`
- [x] Implémenter `\begin{quotation}...\end{quotation}` → `> ...`
- [x] Implémenter `\begin{verbatim}...\end{verbatim}` → triple backticks
- [x] Implémenter `\begin{lstlisting}[language=...]...\end{lstlisting}` → triple backticks avec langue
- [x] Implémenter `\begin{minted}{lang}...\end{minted}` → triple backticks avec langue
- [x] Implémenter `\begin{figure}...\caption{text}...\end{figure}` → `![text](file)`
- [x] Implémenter `\includegraphics[options]{file}` → `![](file)`
- [x] Implémenter `\begin{center}` et `\begin{flushleft}` / `\begin{flushright}`
- [x] Language normalization for code blocks (Python → python, Java → java, etc.)
- [x] `\includegraphics` options parsing (width, scale, angle, etc.)
- [x] Figure caption extraction using nested brace counting
- [x] Tests exhaustifs (117 tests)

**État**: Complétée

---

### Phase 6: Tables (tabular)
- [x] Parser `\begin{tabular}{colspec}...\end{tabular}`
- [x] Parser alignement de colonnes `{|l|c|r|}`, `{p{width}}`, `{*{n}{spec}}`, `{@{...}}`
- [x] Parser cellules avec `&` et lignes avec `\\`
- [x] Convertir en markdown table `| col | col |`
- [x] Gérer hlines, \cline, \toprule, \midrule, \bottomrule
- [x] Détecter header row via première \hline
- [x] Gérer \multicolumn avec extraction d'alignement
- [x] Convertir contenu de cellules (bold, italic, code, math)
- [x] Tests exhaustifs (54 tests)
- [x] Support pour tabular, table, array, longtable, tabularx, tabulary

**État**: Complétée

---

### Phase 7: Fallback Converter
- [x] Implémenter `fallback.ts` avec gestion des commandes/environnements non supportés
- [x] Créer registre des commandes supportées (SUPPORTED_COMMANDS)
- [x] Créer registre des environnements supportés (SUPPORTED_ENVIRONMENTS)
- [x] Implémenter wrapping en commentaires HTML `<!-- LaTeX: ... -->`
- [x] Implémenter option `fallbackToText` pour retourner le contenu sans wrapper
- [x] Implémenter évasion des caractères spéciaux (-- → em-dash)
- [x] Implémenter fonctions d'extension du registre (`addSupportedCommand()`, etc.)
- [x] Implémenter générateurs d'avertissements typés
- [x] Tests exhaustifs (113 tests)

**État**: Complétée

---

### Phase 8: Commandes Avancées (CURRENT)
- [ ] Implémenter `\emph{...}` → `*...*`
- [ ] Implémenter `\textup{}`, `\textsl{}`, `\textsc{}`
- [ ] Implémenter `\url{...}` → `[...](link)`
- [ ] Implémenter `\href{url}{text}` → `[text](url)`
- [ ] Implémenter footnotes/références (adapter au markdown)
- [ ] Tests exhaustifs

**État**: Pas commencée

---

### Phase 9: Optimisations & Edge Cases
- [ ] Optimiser perfs (tokenizer, convertisseurs)
- [ ] Tester edge cases identifiés
- [ ] Tester avec documents réels
- [ ] Performance profiling

**État**: Pas commencée

---

### Phase 10: Documentation & Tests Complets
- [ ] Réviser `docs/claude/latex-to-markdown.md`
- [ ] Augmenter couverture de tests à 95%+
- [ ] Documenter limitations et packages non supportés

**État**: Pas commencée

---

## Décisions de Design Prises

### 🆕 2025-11-21 - Phase 7 (Fallback Converter)
1. **HTML Comment Wrapping**: Commandes/environnements non supportés wrappés dans `<!-- LaTeX: ... -->` pour préservation
   - Permet aux utilisateurs de voir le LaTeX original
   - Facilite l'ajout de support futur (migration facile)
   - Format standardisé et lisible
2. **Registre Extensible**: Deux `Set<string>` pour tracked supported commands/environments
   - `SUPPORTED_COMMANDS`: 50+ commandes (headings, formatting, escapes, etc.)
   - `SUPPORTED_ENVIRONMENTS`: 20+ environnements (lists, blocks, tables, math)
   - Permet l'extension runtime avec `addSupportedCommand()` et `addSupportedEnvironment()`
3. **Option fallbackToText**: Nouvelle option dans `LatexToMarkdownOptions`
   - Quand `true`, retourne le contenu sans wrapper HTML
   - Utile pour extraire du texte pur de commandes non supportées
   - Commandes: première argument retournée | Environnements: contenu trimé retourné
4. **Évasion de Caractères**: Protection contre XSS via `escapeForHtmlComment()`
   - Remplace `--` avec em-dash Unicode (`\u2014`)
   - Escapes `<!--` et `-->` avec caractères spéciaux (`\u2039!--` et `--\u203A`)
   - Prévient la rupture de la syntaxe HTML comment
5. **Avertissements Typés**: Fonction `createFallbackWarning()`
   - Génère les bons types d'avertissements (`unsupported-command` vs `unsupported-environment`)
   - Inclut position (line/column) si disponible
   - Messages descriptifs avec le nom complet de la commande
6. **Fonctions d'Util**: `reconstructCommand()` et `reconstructEnvironment()`
   - Reconstruit la forme LaTeX originale pour le wrapping
   - Supporte options `[...]` et arguments `{...}`
   - Préserve la structure originale exactement
7. **Factory Patterns**: `createCommandFallbackConverter()` et `createEnvironmentFallbackConverter()`
   - Permet la réutilisation et composition
   - Facilite l'injection de dépendances
   - Prépare pour des patterns plus complexes (Phase 8+)
8. **Test Coverage**: 113 tests exhaustifs couvrant:
   - Support checks (isSupportedCommand, isSupportedEnvironment)
   - Registry operations (add, remove, get lists)
   - HTML comment formatting et escaping
   - fallbackToText option behavior
   - Warning generation et position tracking
   - Edge cases (nested braces, special characters, empty content)

### 2025-11-21 - Phase 6 (Table Converter)
1. **Column Spec Parsing**: Column spec `{|l|c|r|}` parsed with support for:
   - Basic alignments: `l` (left), `c` (center), `r` (right)
   - Paragraph columns: `p{width}` treated as left-aligned
   - Repeat specs: `*{n}{spec}` recursively parsed for repeated columns
   - Column separators: `@{...}` skipped (not converted to Markdown)
   - Borders: `|` character tracked but not output (Markdown doesn't support custom borders)
2. **Brace Depth Tracking**: Cell content parsing uses brace depth counter to properly handle:
   - Nested braces in formatting commands
   - Balanced `{...}` in multicolumn arguments
   - Escaped characters `\{` and `\}`
3. **Booktabs Support**: Recognized special rules:
   - `\toprule` marks start of header (similar to \hline)
   - `\midrule` indicates header/data separation
   - `\bottomrule` end of table (equivalent to final \hline)
4. **Header Detection Algorithm**: First `\hline` after first data row = header marker
   - Sets `hasHeader = true` and `headerRowIndex = 0`
   - Subsequent rows become data rows
   - If no \hline found, creates empty header row (Markdown requirement)
5. **Multicolumn Handling**: `\multicolumn{n}{spec}{content}` parsed with:
   - Column count extracted (not convertible to Markdown)
   - Alignment extracted from spec (`l`, `c`, `r`)
   - Content processed for formatting commands
   - Warning issued (colspan not supported in Markdown)
6. **Cell Content Formatting**: Cell text converted with support for:
   - `\textbf{...}` → `**...**`
   - `\textit{...}` / `\emph{...}` → `*...*`
   - `\texttt{...}` → `` `...` ``
   - Escaped chars: `\&`, `\%`, `\#`, `\$`, `\_`, `\{`, `\}`
   - Math mode detected (contains `$` or common commands) → preserved as-is
   - Unknown commands removed from non-math content
7. **Row/Cell Normalization**:
   - Column count enforced (fill or trim rows to match spec)
   - Whitespace trimmed from cells
   - Empty lines within cells converted to single space
8. **Table Environment Support**: All table variants handled:
   - `tabular`: Basic LaTeX tables
   - `table`: Wrapper environment (caption extracted if present)
   - `array`: Math mode variant (treated as tabular)
   - `longtable`: Multi-page tables (treated as single table in Markdown)
   - `tabularx`: Paragraph-width columns (treated as tabular)
   - `tabulary`: Column width distribution (treated as tabular)
9. **Alignment Row Generation**: Markdown alignment row generated from column specs:
   - Left: `:---`
   - Center: `:---:`
   - Right: `---:`
10. **Test Coverage**: 54 comprehensive tests covering:
    - Column spec parsing (simple, borders, paragraph columns, repeats, complex specs, @ separators)
    - Table content parsing (simple rows, headers, multiline cells, hlines, clines, booktabs)
    - Cell content conversion (formatting commands, escapes, math preservation)
    - Multicolumn handling and various table environments

### 2025-11-21 - Phase 5 (Block Converters)
1. **Quote Environments**: Both `\begin{quote}` and `\begin{quotation}` convert to blockquote markdown (`> ...`) - each line gets `> ` prefix
2. **Code Block Environments**: Three types handled:
   - `\begin{verbatim}` → triple backticks (no language, no parsing)
   - `\begin{lstlisting}[language=X]` → triple backticks with language tag (extracted from options)
   - `\begin{minted}{lang}` → triple backticks with language tag (extracted from required argument)
3. **Language Normalization**: Language tags normalized (Python → python, Java → java, JavaScript → javascript) using `normalizeLanguage()` helper
4. **Whitespace Preservation**: Verbatim blocks preserve exact whitespace and indentation
5. **Figure Captions**: `\caption{text}` inside `\begin{figure}...\end{figure}` extracted as alt text using nested brace counting
6. **Image Handling**: `\includegraphics{file}` or `\includegraphics[options]{file}` converted to markdown image syntax
7. **Image Options Parsing**: Width, scale, angle, height options extracted but not converted (Markdown doesn't support these)
8. **Alignment Blocks**: `\begin{center}`, `\begin{flushleft}`, `\begin{flushright}` wrapped in HTML div with style attribute
9. **Whitespace Normalization**: Empty lines in blocks preserved to maintain paragraph structure
10. **Test Coverage**: 117 comprehensive tests covering all block types, nesting, options, and edge cases

### 2025-11-21 - Phase 4 (List Converters)
1. **Recursive List Handling**: List converters use recursive approach for nested lists - each indentation level incremented by 2 spaces
2. **List Item Parsing**: `parseListItems()` correctly extracts items by finding `\item` commands while skipping items inside nested environments (nested lists, math, etc.)
3. **Indentation Strategy**: 2 spaces per nesting level (standard Markdown) - matches `getIndent(level)` utility
4. **Description Lists**: Converted to `**Term**: Definition` format (bold term followed by colon and definition on same line)
5. **List Environment Detection**: `isListEnvironment()` identifies itemize, enumerate, description environments
6. **Converter Registry**: `getListConverter()` returns appropriate converter function based on environment name
7. **Test Coverage**: 54 comprehensive tests covering all list types, nesting levels, and edge cases

### 2025-11-21 - Phase 3 (Simple Converters)
1. **Converter Registry**: Command converters grouped in `simpleCommandConverters` object for easy lookup and composition
2. **Math Pass-through**: Inline (`$...$`) and display (`$$...$$`) math preserved as-is (no content parsing)
3. **Heading Levels**: Headings (section, subsection, etc.) mapped to Markdown heading levels (h1-h5)
4. **Text Formatting**: Bold, italic, code, underline, small-caps using Markdown + minimal HTML
5. **Special Characters**: 30+ escape sequences (\\&, \\%, \\$, \\ldots, \\quad, etc.) with proper mappings
6. **Dash Conversion**: LaTeX dashes (---, --) converted to Unicode em-dash (U+2014) and en-dash (U+2013)
7. **Helper Functions**: `isHeadingCommand()`, `isFormattingCommand()`, `isHorizontalRuleCommand()`, `isEscapeCommand()` for pattern matching
8. **Test Coverage**: 96 comprehensive tests covering all converter functions and edge cases

### 2025-11-21 - Phase 2 (Tokenizer LaTeX)
1. **Token Types Handled**: 11 token types implemented (text, command, environment, math-inline, math-display, comment, newline, group, whitespace, special, verbatim)
2. **Special Verbatim Handling**: Verbatim environments (verbatim, lstlisting, minted, Verbatim) don't parse nested content
3. **Line Tracking**: All tokens include line and column numbers for error reporting
4. **Nested Structure Support**: `findMatchingBrace()` and `findMatchingBracket()` handle proper nesting with escape awareness
5. **Command Parsing**: Supports star variants (`\section*`), optional arguments `[opt]`, and multiple required arguments `{arg1}{arg2}`
6. **Math Delimiters**: Supports `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` with proper delimiter differentiation
7. **Windows Line Endings**: Properly handles `\r\n` by skipping `\r`
8. **Test Coverage**: 56 comprehensive tests covering all token types and edge cases

### 2025-11-21 - Phase 1 (Architecture & Types)
1. **Token Types**: Discriminated union avec champ `type` (11 types: text, command, environment, math-inline, math-display, comment, newline, group, whitespace, special, verbatim)
2. **Token Extension**: Tous les tokens héritent de `BaseToken` avec position tracking (start, end, line, column)
3. **Converter Pattern**: Fonctions converters prennent `(token, context)` et retournent string
4. **Context Type**: `ConversionContext` inclut indentLevel, inListItem, inTable, inMath, inVerbatim, environmentStack, options, warnings
5. **Warning System**: 8 types d'avertissements: unsupported-command, unsupported-environment, parse-error, nested-too-deep, malformed-table, unclosed-group, mismatched-environment, invalid-math
6. **Table Support**: Types complets avec support borders, alignments, multirow/multicol
7. **Test Coverage**: 68 tests unitaires pour validation exhaustive des types

### 2025-11-21 - Phase 0
1. **Output Format**: Custom Markdown texte (pas AST) pour compatibilité avec `markdown-parser` existant
2. **Strategy**: Tokenize LaTeX → Convertisseurs spécialisés → Markdown texte
3. **Unsupported**: Wrapper en commentaires HTML `<!-- LaTeX: ... -->`
4. **Packages**: Standard LaTeX seulement, pas amsmath/tikz/pgfplots

---

## Edge Cases Identifiés

(À remplir au fur et à mesure)

### À Tester
- [ ] Braces imbriquées: `\textbf{outer \textit{inner} text}`
- [ ] Espaces multiples: `\section{  Multiple   spaces  }`
- [ ] Caractères spéciaux: `\textbf{$x^2$ et \& et \%}`
- [ ] Environnements vides: `\begin{itemize}\end{itemize}`
- [ ] Commentaires partiels: `text % comment with \command{}`
- [ ] Fragmentation: `\begin{itemize}` sans `\end{itemize}` correspondant

---

## Pour Reprendre Après Crash

1. **Lire ce fichier** pour l'état actuel (section État Actuel)
2. **Vérifier le dernier commit** sur la branche `feature/audit-trail`
3. **Identifier la dernière phase complétée** (marquer avec ✅ ci-dessus)
4. **Continuer à partir des** tâches non cochées ([ ])
5. **Consulter** `docs/claude/latex-to-markdown.md` pour les détails d'implémentation

---

## Ressources Utiles

- **Markdown Parser**: `src/lib/exercises/markdown-parser/`
- **Tests**: `src/lib/exercises/__tests__/`
- **Documentation**: `docs/claude/latex-to-markdown.md`
- **Branche**: `feature/audit-trail`

---

**Dernière mise à jour**: 2025-11-21 par Claude Code
