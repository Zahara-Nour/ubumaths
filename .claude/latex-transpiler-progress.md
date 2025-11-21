# LaTeX→Markdown Transpiler - Progress Tracker

## État Actuel
- **Phase**: 0/10 - Setup Documentation
- **Statut**: En cours
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
- [ ] Définir `LatexToMarkdownOptions`
- [ ] Définir `TranspileResult` et types d'erreurs
- [ ] Définir types tokens LaTeX
- [ ] Créer `src/lib/exercises/transpilers/latex-to-markdown/types.ts`
- [ ] Créer structure de dossiers
- [ ] Créer `src/lib/exercises/transpilers/index.ts` avec re-exports

**État**: Pas commencée

---

### Phase 2: Tokenizer LaTeX
- [ ] Implémenter tokenizer basique (caractères, commandes, environnements)
- [ ] Implémenter `findMatchingBrace()` avec gestion d'imbrication
- [ ] Implémenter `extractEnvironment()` pour `\begin{...}\end{...}`
- [ ] Implémenter gestion des commentaires `%`
- [ ] Implémenter gestion des espaces significatifs/non significatifs
- [ ] Tests exhaustifs du tokenizer

**État**: Pas commencée

---

### Phase 3: Conversions Triviales & Faciles
- [ ] Passer les formules math en pass-through (`$...$` → `$...$`)
- [ ] Convertir `\[...\]` → `$$...$$`
- [ ] Implémenter `\section{...}` → `# ...`
- [ ] Implémenter `\subsection{...}` → `## ...`
- [ ] Implémenter `\subsubsection{...}` → `### ...`
- [ ] Implémenter `\textbf{...}` → `**...**`
- [ ] Implémenter `\textit{...}` → `*...*`
- [ ] Implémenter `\texttt{...}` → `` `...` ``
- [ ] Implémenter `\hrule` → `---`
- [ ] Tests exhaustifs

**État**: Pas commencée

---

### Phase 4: Listes (itemize, enumerate)
- [ ] Parser `\begin{itemize}...\end{itemize}`
- [ ] Parser `\begin{enumerate}...\end{enumerate}`
- [ ] Gérer imbrication de listes
- [ ] Gérer `\item` avec labels optionnels
- [ ] Tests exhaustifs

**État**: Pas commencée

---

### Phase 5: Blocs (quote, verbatim, code, images)
- [ ] Implémenter `\begin{quote}...\end{quote}` → `> ...`
- [ ] Implémenter `\begin{verbatim}...\end{verbatim}` → triple backticks
- [ ] Implémenter `\begin{lstlisting}[language=...]...\end{lstlisting}` → triple backticks avec langue
- [ ] Implémenter `\includegraphics[options]{file}` → `![](file)`
- [ ] Tests exhaustifs

**État**: Pas commencée

---

### Phase 6: Tables (tabular)
- [ ] Parser `\begin{tabular}{colspec}...\end{tabular}`
- [ ] Parser alignement de colonnes `{|l|c|r|}`
- [ ] Parser cellules avec `&` et lignes avec `\\`
- [ ] Convertir en markdown table `| col | col |`
- [ ] Gérer hlines et autres séparateurs
- [ ] Tests exhaustifs

**État**: Pas commencée

---

### Phase 7: Commandes Avancées
- [ ] Implémenter `\emph{...}` → `*...*`
- [ ] Implémenter `\textup{}`, `\textsl{}`, `\textsc{}`
- [ ] Implémenter `\url{...}` → `[...](link)`
- [ ] Implémenter `\href{url}{text}` → `[text](url)`
- [ ] Implémenter footnotes/références (adapter au markdown)
- [ ] Tests exhaustifs

**État**: Pas commencée

---

### Phase 8: Gestion d'Erreurs & Avertissements
- [ ] Implémenter système d'avertissements robuste
- [ ] Wrapper commandes non supportées en commentaires HTML
- [ ] Wrapper environnements non supportés en commentaires HTML
- [ ] Logging détaillé des conversions
- [ ] Tests exhaustifs

**État**: Pas commencée

---

### Phase 9: Optimisations & Edge Cases
- [ ] Optimiser perfs (tokenizer, convertisseurs)
- [ ] Tester edge cases identifiés
- [ ] Implémenter sanitization de caractères spéciaux
- [ ] Tester avec documents réels
- [ ] Performance profiling

**État**: Pas commencée

---

### Phase 10: Documentation & Tests Complets
- [ ] Réviser `docs/claude/latex-to-markdown.md`
- [ ] Ajouter exemples de conversions
- [ ] Documenter tous les edge cases
- [ ] Augmenter couverture de tests à 95%+
- [ ] Documenter limitations et packages non supportés

**État**: Pas commencée

---

## Décisions de Design Prises

### 🆕 2025-11-21 - Phase 0
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
