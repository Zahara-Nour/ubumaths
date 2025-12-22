# Ubumark System Improvements

> Analysis of potential improvements for architecture, security, performance, UX, and features

**Date:** 2025-12-23
**Status:** Analysis Document

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Architecture Improvements](#architecture-improvements)
- [Security Improvements](#security-improvements)
- [Performance Improvements](#performance-improvements)
- [UX Improvements](#ux-improvements)
- [Feature Improvements](#feature-improvements)
- [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The Ubumark system is a well-designed custom markdown engine with strong foundations. This document identifies opportunities for improvement across five dimensions:

| Dimension        | Current State                  | Priority Areas                              |
| ---------------- | ------------------------------ | ------------------------------------------- |
| **Architecture** | Good separation, some coupling | Plugin system, streaming parser             |
| **Security**     | Basic, needs hardening         | Input sanitization, resource limits         |
| **Performance**  | Adequate with caching          | Incremental parsing, worker threads         |
| **UX**           | Functional                     | Better errors, preview, autocomplete        |
| **Features**     | Comprehensive                  | Interactivity, collaboration, accessibility |

---

## Architecture Improvements

### 1. Plugin Architecture

**Current State**: Monolithic parser with hardcoded node types.

**Problem**: Adding new block types (e.g., ``mermaid`, ``quiz`) requires modifying core parser code.

**Proposed Solution**: Implement a plugin system for custom block handlers.

````typescript
// Plugin interface
interface UbumarkPlugin {
	name: string;
	blockTypes?: {
		trigger: RegExp; // e.g., /^```mermaid/
		parse: (content: string, context: ParseContext) => BlockNode;
		render?: (node: BlockNode) => string;
	}[];
	inlineTypes?: {
		trigger: RegExp;
		parse: (match: RegExpMatchArray) => InlineNode;
	}[];
}

// Registration
registerPlugin({
	name: 'mermaid',
	blockTypes: [
		{
			trigger: /^```mermaid$/,
			parse: (content) => ({
				type: 'mermaid-diagram',
				code: content
			})
		}
	]
});
````

**Benefits**:

- Extensibility without core changes
- Third-party plugin ecosystem
- Feature toggling per context

**Effort**: Medium (2-3 weeks)

---

### 2. Streaming Parser

**Current State**: Full document parsing before any output.

**Problem**: Large documents block rendering; no progressive feedback.

**Proposed Solution**: Implement streaming/incremental parsing.

```typescript
// Streaming API
async function* parseMarkdownStream(markdown: string): AsyncGenerator<BlockNode> {
	const lines = markdown.split('\n');
	let buffer: string[] = [];

	for (const line of lines) {
		buffer.push(line);

		if (isBlockComplete(buffer)) {
			yield parseBlock(buffer);
			buffer = [];
		}
	}

	if (buffer.length) {
		yield parseBlock(buffer);
	}
}

// Usage
for await (const block of parseMarkdownStream(content)) {
	renderBlock(block); // Progressive rendering
}
```

**Benefits**:

- Faster time-to-first-paint
- Reduced memory for large docs
- Better perceived performance

**Effort**: High (4-6 weeks)

---

### 3. Abstract Syntax Tree Optimization

**Current State**: AST is complete but not optimized for common operations.

**Proposed Improvements**:

#### a) Parent References

```typescript
interface ASTNodeWithParent extends BaseNode {
	parent?: ASTNodeWithParent;
	index?: number; // Position in parent's children
}
```

Enables efficient upward traversal without full tree search.

#### b) Node Pooling

```typescript
const nodePool = new Map<string, BaseNode[]>();

function allocateNode<T extends BaseNode>(type: string): T {
	const pool = nodePool.get(type);
	if (pool?.length) {
		return pool.pop() as T;
	}
	return { type } as T;
}

function releaseNode(node: BaseNode): void {
	const pool = nodePool.get(node.type) ?? [];
	pool.push(node);
	nodePool.set(node.type, pool);
}
```

Reduces GC pressure during rapid editing.

#### c) Immutable AST Option

```typescript
import { produce } from 'immer';

function updateNode(
	ast: DocumentNode,
	path: number[],
	updater: (node: ASTNode) => void
): DocumentNode {
	return produce(ast, (draft) => {
		let current = draft;
		for (const index of path) {
			current = current.children[index];
		}
		updater(current);
	});
}
```

Enables efficient change detection for reactive systems.

**Effort**: Medium (2-3 weeks)

---

### 4. Modular Type System

**Current State**: Types spread across multiple files with some duplication.

**Proposed Structure**:

```
src/lib/ubumark/types/
├── core.ts           # BaseNode, DocumentNode
├── blocks/
│   ├── paragraph.ts
│   ├── heading.ts
│   ├── list.ts
│   ├── table.ts
│   ├── math.ts
│   ├── media.ts      # Image, Video
│   └── special.ts    # VariationTable, ProbTree
├── inline/
│   ├── text.ts
│   ├── math.ts
│   ├── interactive.ts # Blank, MathPrompt
│   └── social.ts     # Hashtag, Mention
├── parameterization/
│   ├── variable.ts
│   ├── random.ts
│   └── eval.ts
└── index.ts          # Re-exports all
```

**Benefits**:

- Tree-shaking for smaller bundles
- Clearer ownership
- Easier navigation

**Effort**: Low (1 week)

---

## Security Improvements

### 1. Input Sanitization

**Current State**: Limited sanitization; relies on renderer escaping.

**Risks**:

- XSS through malformed math expressions
- ReDoS via regex complexity
- Resource exhaustion

**Proposed Solutions**:

#### a) Math Expression Sanitization

```typescript
const DANGEROUS_PATTERNS = [
	/\\input/, // LaTeX file inclusion
	/\\include/,
	/\\write/, // File writing
	/\\immediate/,
	/<script/i, // HTML injection
	/javascript:/i
];

function sanitizeMathExpression(expr: string): string {
	for (const pattern of DANGEROUS_PATTERNS) {
		if (pattern.test(expr)) {
			throw new SecurityError(`Dangerous pattern in math: ${pattern}`);
		}
	}
	return expr;
}
```

#### b) Regex Timeout Protection

```typescript
import RE2 from 're2'; // Google's RE2 library

// Replace vulnerable regexes with RE2
const SAFE_INLINE_MATH = new RE2(/\$([^$\n]+)\$/g);
```

RE2 guarantees linear time complexity.

#### c) Resource Limits

```typescript
interface ParseLimits {
	maxDocumentLength: number; // 1MB default
	maxNestingDepth: number; // 20 levels
	maxListItems: number; // 1000 items
	maxTableCells: number; // 10000 cells
	maxMathLength: number; // 10KB per expression
	parseTimeout: number; // 5000ms
}

function parseWithLimits(content: string, limits: ParseLimits = DEFAULT_LIMITS): DocumentNode {
	if (content.length > limits.maxDocumentLength) {
		throw new LimitError('Document too large');
	}

	const timeout = setTimeout(() => {
		throw new LimitError('Parse timeout');
	}, limits.parseTimeout);

	try {
		return parseMarkdown(content, { limits });
	} finally {
		clearTimeout(timeout);
	}
}
```

**Effort**: Medium (2-3 weeks)

---

### 2. Content Security Policy Integration

**Current State**: No CSP considerations for rendered content.

**Proposed Solution**:

```typescript
interface RenderSecurityOptions {
	allowedImageDomains: string[];
	allowedVideoProviders: ('youtube' | 'vimeo' | 'local')[];
	sanitizeHTML: boolean;
	nonce?: string; // For inline scripts/styles
}

function renderWithCSP(ast: DocumentNode, options: RenderSecurityOptions): string {
	// Validate image sources
	for (const node of findNodes(ast, 'image')) {
		if (!isAllowedDomain(node.src, options.allowedImageDomains)) {
			throw new SecurityError(`Blocked image domain: ${node.src}`);
		}
	}

	// Generate HTML with nonce
	return renderHTML(ast, { nonce: options.nonce });
}
```

**Effort**: Low-Medium (1-2 weeks)

---

### 3. Parameterization Security

**Current State**: Expression evaluation uses MathLive without sandboxing.

**Risks**:

- Infinite loops in expressions
- Memory exhaustion
- Accessing global scope

**Proposed Solutions**:

```typescript
// Expression complexity limits
const EVAL_LIMITS = {
	maxExpressionLength: 1000,
	maxOperations: 1000,
	maxRecursionDepth: 10,
	timeout: 100 // ms
};

// Sandboxed evaluation
function safeEvaluate(expr: string): number {
	// Pre-check complexity
	if (expr.length > EVAL_LIMITS.maxExpressionLength) {
		throw new LimitError('Expression too complex');
	}

	// Use worker thread with timeout
	return evaluateInWorker(expr, EVAL_LIMITS.timeout);
}
```

**Effort**: Medium (2-3 weeks)

---

## Performance Improvements

### 1. Incremental Parsing

**Current State**: Full reparse on any content change.

**Problem**: Slow feedback during editing of large documents.

**Proposed Solution**: Parse only changed regions.

```typescript
interface IncrementalUpdate {
	startLine: number;
	endLine: number;
	newLines: string[];
}

function parseIncremental(
	previousAST: DocumentNode,
	previousContent: string,
	update: IncrementalUpdate
): DocumentNode {
	// Find affected block range
	const affectedRange = findAffectedBlocks(previousAST, update.startLine, update.endLine);

	// Reparse only affected blocks
	const newBlocks = parseBlocks(update.newLines);

	// Splice into existing AST
	return spliceBlocks(previousAST, affectedRange, newBlocks);
}
```

**Benefits**:

- Sub-10ms updates for local edits
- Smoother typing experience
- Better for real-time collaboration

**Effort**: High (4-6 weeks)

---

### 2. Web Worker Parsing

**Current State**: Parsing blocks main thread.

**Proposed Solution**: Offload parsing to Web Worker.

```typescript
// parser.worker.ts
self.onmessage = (e: MessageEvent<ParseRequest>) => {
	const { id, content, options } = e.data;
	const result = parseMarkdown(content, options);
	self.postMessage({ id, result });
};

// Main thread
class ParserWorker {
	private worker = new Worker('./parser.worker.ts');
	private pending = new Map<string, PromiseCallbacks>();

	async parse(content: string, options?: ParseOptions): Promise<DocumentNode> {
		const id = crypto.randomUUID();

		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.worker.postMessage({ id, content, options });
		});
	}
}
```

**Benefits**:

- Non-blocking main thread
- Better frame rates during parsing
- Parallel processing potential

**Effort**: Medium (2-3 weeks)

---

### 3. Virtual Rendering

**Current State**: All blocks rendered to DOM.

**Problem**: Large documents create thousands of DOM nodes.

**Proposed Solution**: Render only visible blocks.

```typescript
// VirtualMarkdownRenderer.svelte
<script lang="ts">
  import { VirtualList } from 'svelte-virtual-list';

  let { ast, itemHeight = 50 } = $props();

  const blocks = $derived(ast.children);
</script>

<VirtualList
  items={blocks}
  {itemHeight}
  let:item
>
  <BlockRenderer node={item} />
</VirtualList>
```

**Benefits**:

- Constant DOM size regardless of document length
- Fast scrolling for large documents
- Lower memory usage

**Effort**: Medium (2-3 weeks)

---

### 4. Lazy Math Rendering

**Current State**: All math expressions rendered immediately.

**Problem**: MathLive rendering is expensive; many expressions may be off-screen.

**Proposed Solution**: Intersection Observer-based lazy rendering.

```typescript
// LazyMath.svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let { expression, syntax } = $props();
  let element: HTMLElement;
  let rendered = $state(false);

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          rendered = true;
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }  // Pre-render when 100px away
    );

    observer.observe(element);
    return () => observer.disconnect();
  });
</script>

<span bind:this={element}>
  {#if rendered}
    <MathLive {expression} {syntax} />
  {:else}
    <span class="math-placeholder">{expression}</span>
  {/if}
</span>
```

**Benefits**:

- Faster initial render
- Reduced CPU usage for off-screen content
- Better scrolling performance

**Effort**: Low (1 week)

---

### 5. AST Cache Improvements

**Current State**: LRU cache with string key hashing.

**Proposed Improvements**:

#### a) Structural Sharing

```typescript
// Share unchanged subtrees between parses
function mergeASTs(oldAST: DocumentNode, newAST: DocumentNode): DocumentNode {
	return {
		type: 'document',
		children: newAST.children.map((newBlock, i) => {
			const oldBlock = oldAST.children[i];
			if (oldBlock && deepEqual(oldBlock, newBlock)) {
				return oldBlock; // Reuse reference
			}
			return newBlock;
		})
	};
}
```

#### b) IndexedDB Persistence

```typescript
const CACHE_DB = 'ubumark-cache';

async function persistCache(): Promise<void> {
	const db = await openDB(CACHE_DB);
	const entries = Array.from(astCache.entries());

	const tx = db.transaction('cache', 'readwrite');
	for (const [key, value] of entries) {
		await tx.store.put({ key, value, timestamp: Date.now() });
	}
}

async function loadCache(): Promise<void> {
	const db = await openDB(CACHE_DB);
	const entries = await db.getAll('cache');

	for (const { key, value } of entries) {
		astCache.set(key, value);
	}
}
```

**Effort**: Medium (2 weeks)

---

## UX Improvements

### 1. Enhanced Error Messages

**Current State**: Generic error messages without context.

**Proposed Solution**: Rich, actionable error messages.

```typescript
interface ParseError {
  code: string;           // 'UNCLOSED_MATH'
  message: string;        // Human-readable
  line: number;
  column: number;
  length: number;         // For underlining
  suggestion?: string;    // How to fix
  relatedInfo?: {
    message: string;
    location: Location;
  }[];
}

// Example error
{
  code: 'UNCLOSED_MATH',
  message: 'Math expression not closed',
  line: 5,
  column: 10,
  length: 15,
  suggestion: 'Add a closing $ delimiter',
  relatedInfo: [{
    message: 'Opening delimiter here',
    location: { line: 5, column: 10 }
  }]
}
```

**Rendering**:

```svelte
<div class="error">
  <span class="error-code">{error.code}</span>
  <span class="error-message">{error.message}</span>

  {#if error.suggestion}
    <div class="suggestion">
      <Icon name="lightbulb" />
      {error.suggestion}
    </div>
  {/if}

  <pre class="error-context">
    {lines[error.line - 1]}
    {' '.repeat(error.column)}{'~'.repeat(error.length)}
  </pre>
</div>
```

**Effort**: Medium (2 weeks)

---

### 2. Live Preview with Diff

**Current State**: Preview shows final result only.

**Proposed Solution**: Show changes with visual diff.

```typescript
// Track changes between renders
interface PreviewDiff {
	added: Range[];
	removed: Range[];
	modified: Range[];
}

function computePreviewDiff(oldAST: DocumentNode, newAST: DocumentNode): PreviewDiff {
	// Use LCS algorithm on children
	const lcs = longestCommonSubsequence(oldAST.children, newAST.children, (a, b) => astEqual(a, b));

	// Identify additions, removals, modifications
	return computeDiffFromLCS(lcs, oldAST, newAST);
}
```

**Visual feedback**:

- Green highlight for additions
- Red strikethrough for removals
- Yellow background for modifications

**Effort**: Medium (2-3 weeks)

---

### 3. Autocomplete System

**Current State**: No autocomplete support.

**Proposed Solution**: Context-aware autocomplete.

```typescript
interface CompletionItem {
	label: string; // Display text
	insertText: string; // Text to insert
	kind: CompletionKind; // 'variable' | 'function' | 'snippet'
	detail?: string; // Additional info
	documentation?: string; // Full description
}

function getCompletions(
	content: string,
	position: Position,
	context: CompletionContext
): CompletionItem[] {
	const beforeCursor = content.slice(0, offset(position));

	// Inside {{...}}
	if (/\{\{[^}]*$/.test(beforeCursor)) {
		return [
			...getVariableCompletions(context.variables),
			...getRandomCompletions(),
			...getEvalCompletions()
		];
	}

	// After $ or ~
	if (/[$~][^$~]*$/.test(beforeCursor)) {
		return getMathCompletions();
	}

	// Start of line
	if (/^\s*$/.test(getLineBeforeCursor(beforeCursor))) {
		return getBlockCompletions();
	}

	return [];
}
```

**Completions**:

- Variables: `{{a}}`, `{{sum}}`
- Random: `{{1..10}}`, `{{2.3}}`
- Eval: `{{eval:`, `{{eval:|d}}`
- Math: `\frac{}{}`, `\sqrt{}`
- Blocks: ``variation`, ``probtree`

**Effort**: High (3-4 weeks)

---

### 4. Accessibility Improvements

**Current State**: Basic accessibility, limited screen reader support.

**Proposed Improvements**:

#### a) ARIA Labels for Math

```svelte
<!-- MathBlock.svelte -->
<div
  role="math"
  aria-label={generateMathDescription(expression)}
  tabindex="0"
>
  <MathLive {expression} />
</div>

<!-- Generate descriptions -->
function generateMathDescription(latex: string): string {
  // Convert LaTeX to spoken math
  return latexToSpeech(latex);
  // "x squared plus 2 x plus 1"
}
```

#### b) Keyboard Navigation

```typescript
// Enable keyboard navigation through document
interface KeyboardNav {
	nextBlock: () => void; // Arrow Down
	prevBlock: () => void; // Arrow Up
	enterBlock: () => void; // Enter
	exitBlock: () => void; // Escape
	focusInput: () => void; // Tab
}
```

#### c) High Contrast Mode

```css
@media (prefers-contrast: high) {
	.math-block {
		border: 2px solid currentColor;
		background: var(--background);
	}

	.variation-table {
		--sign-positive: #006400; /* Darker green */
		--sign-negative: #8b0000; /* Darker red */
	}
}
```

**Effort**: Medium (2-3 weeks)

---

### 5. Mobile Optimizations

**Current State**: Desktop-focused design.

**Proposed Improvements**:

#### a) Touch-Friendly Math Input

```svelte
<MathInput
  value={expression}
  mode="mobile"
  keyboard="custom"  <!-- Custom math keyboard -->
  on:change={handleChange}
/>
```

#### b) Responsive Layouts

```css
/* Probability trees on mobile */
@media (max-width: 640px) {
	.probability-tree {
		--tree-direction: vertical;
		--branch-spacing: 1rem;
	}
}

/* Variation tables on mobile */
@media (max-width: 640px) {
	.variation-table {
		font-size: 0.875rem;
		overflow-x: auto;
	}
}
```

#### c) Gesture Support

```typescript
// Swipe to navigate between blocks
const gestures = {
	swipeLeft: () => nextExercise(),
	swipeRight: () => prevExercise(),
	pinchZoom: (scale) => adjustFontSize(scale),
	doubleTap: (target) => expandMath(target)
};
```

**Effort**: Medium (2-3 weeks)

---

## Feature Improvements

### 1. Interactive Elements

**Current State**: Static content with basic fill-in-blanks.

**Proposed Features**:

#### a) Multiple Choice

````markdown
```mcq
question: Quelle est la dérivée de $x^2$ ?
* $2x$ (correct)
* $x$
* $x^2$
* $2$
```
````

````

#### b) Drag and Drop

```markdown
```dragdrop
zones:
  - id: numerator
    label: Numérateur
  - id: denominator
    label: Dénominateur

items:
  - value: 3
    target: numerator
  - value: 5
    target: denominator
````

````

#### c) Interactive Graphs

```markdown
```graph
type: function
expression: x^2 - 2x + 1
domain: [-2, 4]
interactive: true
draggable: [vertex]
````

````

**Effort**: High (6-8 weeks for full suite)

---

### 2. Collaboration Features

**Current State**: Single-user editing only.

**Proposed Features**:

#### a) Real-Time Collaboration

```typescript
// CRDT-based sync
interface CollaborativeDocument {
  id: string;
  content: Y.Text;  // Yjs text type
  cursors: Map<string, CursorPosition>;
  history: UndoManager;
}

function setupCollaboration(doc: CollaborativeDocument): void {
  const provider = new WebsocketProvider(
    'wss://sync.ubumaths.com',
    doc.id,
    doc.content.doc
  );

  provider.awareness.setLocalStateField('cursor', getCursorPosition());
}
````

#### b) Comments and Annotations

```markdown
[This needs clarification]{.comment author="Prof. Dupont"}
```

#### c) Version History

```typescript
interface DocumentVersion {
	id: string;
	content: string;
	author: string;
	timestamp: Date;
	message?: string;
}

async function saveVersion(doc: Document, message: string): Promise<DocumentVersion> {
	return await supabase.from('document_versions').insert({
		document_id: doc.id,
		content: doc.content,
		author: currentUser.id,
		message
	});
}
```

**Effort**: High (8-12 weeks)

---

### 3. Advanced Math Features

#### a) Step-by-Step Solutions

````markdown
```steps
goal: Résoudre $x^2 - 5x + 6 = 0$

step: Factoriser
$(x - 2)(x - 3) = 0$

step: Appliquer la règle du produit nul
$x - 2 = 0$ ou $x - 3 = 0$

step: Résoudre
$x = 2$ ou $x = 3$
```
````

````

#### b) Symbolic Computation

```typescript
// Integration with CAS (Computer Algebra System)
interface CASResult {
  simplified: string;
  steps: Step[];
  latex: string;
}

async function simplify(expr: string): Promise<CASResult> {
  return await cas.simplify(expr);
}

async function solve(equation: string, variable: string): Promise<CASResult> {
  return await cas.solve(equation, variable);
}
````

#### c) Unit Conversion

```markdown
{{convert:5km to m}} <!-- 5000 -->
{{convert:30°C to °F}} <!-- 86 -->
```

**Effort**: High (4-6 weeks per feature)

---

### 4. Export Enhancements

#### a) SCORM Export

```typescript
interface SCORMExport {
	manifest: SCORMManifest;
	content: SCORMContent[];
	tracking: SCORMTracking;
}

async function exportToSCORM(exercises: Exercise[]): Promise<Blob> {
	const scorm = buildSCORMPackage(exercises);
	return await zipSCORM(scorm);
}
```

#### b) Print Stylesheet

```css
@media print {
	.markdown-content {
		font-size: 12pt;
		line-height: 1.5;
	}

	.math-block {
		page-break-inside: avoid;
	}

	.probability-tree {
		page-break-inside: avoid;
		max-width: 100%;
	}

	/* Hide interactive elements */
	.blank-input,
	.hint-button {
		display: none;
	}
}
```

#### c) Braille Export

```typescript
// Convert to Braille Mathematics Notation (Nemeth)
function exportToBraille(ast: DocumentNode): string {
	return ast.children
		.map((node) => {
			if (node.type === 'math-block') {
				return latexToNemeth(node.expression);
			}
			return textToBraille(getTextContent(node));
		})
		.join('\n');
}
```

**Effort**: Medium-High (2-4 weeks per format)

---

### 5. Analytics and Insights

#### a) Content Analytics

```typescript
interface ContentAnalytics {
	readingLevel: number; // Flesch-Kincaid
	mathDensity: number; // Math per 100 words
	conceptCoverage: string[]; // Detected mathematical concepts
	estimatedTime: number; // Minutes to complete
}

function analyzeContent(ast: DocumentNode): ContentAnalytics {
	const text = extractText(ast);
	const mathNodes = findNodes(ast, 'math-inline', 'math-block');

	return {
		readingLevel: calculateFleschKincaid(text),
		mathDensity: (mathNodes.length / wordCount(text)) * 100,
		conceptCoverage: detectConcepts(mathNodes),
		estimatedTime: estimateCompletionTime(ast)
	};
}
```

#### b) Error Pattern Detection

```typescript
interface StudentErrorPattern {
	type: 'calculation' | 'concept' | 'notation';
	frequency: number;
	examples: string[];
	suggestion: string;
}

function analyzeStudentErrors(submissions: Submission[]): StudentErrorPattern[] {
	// Cluster similar errors
	// Identify common misconceptions
	// Generate targeted feedback
}
```

**Effort**: Medium (3-4 weeks)

---

## Implementation Roadmap

### Phase 1: Foundation (Q1)

**Focus**: Security and performance fundamentals

| Item                    | Priority | Effort  | Dependencies |
| ----------------------- | -------- | ------- | ------------ |
| Input sanitization      | Critical | 2 weeks | None         |
| Resource limits         | Critical | 1 week  | None         |
| Web Worker parsing      | High     | 3 weeks | None         |
| Enhanced error messages | High     | 2 weeks | None         |

### Phase 2: Performance (Q2)

**Focus**: Scalability and responsiveness

| Item                   | Priority | Effort  | Dependencies |
| ---------------------- | -------- | ------- | ------------ |
| Incremental parsing    | High     | 6 weeks | Phase 1      |
| Virtual rendering      | Medium   | 3 weeks | None         |
| Lazy math rendering    | Medium   | 1 week  | None         |
| AST cache improvements | Medium   | 2 weeks | None         |

### Phase 3: UX (Q3)

**Focus**: Developer and user experience

| Item                       | Priority | Effort  | Dependencies |
| -------------------------- | -------- | ------- | ------------ |
| Autocomplete system        | High     | 4 weeks | None         |
| Accessibility improvements | High     | 3 weeks | None         |
| Mobile optimizations       | Medium   | 3 weeks | None         |
| Live preview with diff     | Medium   | 2 weeks | Phase 2      |

### Phase 4: Features (Q4)

**Focus**: New capabilities

| Item                   | Priority | Effort  | Dependencies |
| ---------------------- | -------- | ------- | ------------ |
| Plugin architecture    | High     | 3 weeks | Phase 2      |
| Interactive elements   | High     | 6 weeks | Phase 3      |
| Advanced math features | Medium   | 4 weeks | None         |
| Export enhancements    | Medium   | 3 weeks | None         |

---

## Conclusion

The Ubumark system has solid foundations but significant opportunities for improvement:

1. **Security**: Critical for production use with user-generated content
2. **Performance**: Essential for large documents and real-time editing
3. **UX**: Key differentiator for adoption and satisfaction
4. **Features**: Competitive advantage and pedagogical value

Recommended starting points:

- **Immediate**: Security hardening (sanitization, limits)
- **Short-term**: Web Worker parsing, error messages
- **Medium-term**: Plugin architecture, autocomplete
- **Long-term**: Collaboration, advanced interactivity

Each improvement should be evaluated against:

- Implementation cost vs. benefit
- Maintenance burden
- User impact
- Technical debt implications
