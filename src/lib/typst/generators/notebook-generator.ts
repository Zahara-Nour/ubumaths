/**
 * Notebook Typst Generator
 * ========================
 *
 * Generates Typst documents from Python notebooks. Mirrors the
 * `WorksheetGenerator` pattern but for cell-based notebooks (Jupyter-style).
 *
 * Three cell types are supported:
 *   - markdown → delegated to UbuMark's `parseMarkdown` + `generateTypst`
 *     (handles both LaTeX `$..$` / `$$..$$` and custom `~..~` / `~~..~~`
 *     math syntaxes, tables, lists, images via URL, blocks)
 *   - code     → Python code block with `In [N]:` marker + outputs
 *     (stream stdout/stderr, error tracebacks, PNG images, text/plain)
 *   - checkpoint → mode-specific summary (assert / unit_test / variable_check)
 *     + optional teacher hint (only if `includeHints: true`)
 *
 * Inline PNG outputs (matplotlib, etc.) are surfaced via `extractInlineImages`
 * and need to be mapped to the Typst shadow file system before compilation;
 * `generateNotebookPdf` orchestrates that.
 *
 * @module typst/generators/notebook-generator
 */

import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';
import { generateTypst } from '$lib/ubumark/generators';
import { escapeTypstBrackets } from '$lib/ubumark/generators';
import { BaseTypstGenerator } from './base-generator';
import type { GenerateResult, GeneratorConfig, GeneratorContext } from '../types';
import type {
	PythonNotebook,
	NotebookCell,
	BaseNotebookCell,
	CheckpointCell,
	CellOutput,
	StreamOutput,
	ErrorOutput,
	DisplayOutput,
	CheckpointConfig
} from '$lib/types/notebook';

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface NotebookExportOptions {
	includeOutputs: boolean;
	includeCheckpoints: boolean;
	includeHints: boolean;
	includeCoverPage: boolean;
}

export const DEFAULT_NOTEBOOK_EXPORT_OPTIONS: NotebookExportOptions = {
	includeOutputs: true,
	includeCheckpoints: true,
	includeHints: false,
	includeCoverPage: true
};

export interface NotebookGeneratorInput {
	notebook: PythonNotebook;
	options?: NotebookExportOptions;
	/** Optional name to display on the cover page (typically the author or the student for per-student exports). */
	authorName?: string;
}

/**
 * Map of virtual file path → PNG bytes for inline image outputs.
 * The compiler needs these mapped via `service.mapShadow(path, bytes)`
 * before compilation; `generateNotebookPdf` handles this.
 */
export type InlineImageMap = Map<string, Uint8Array>;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Max lines per output block before truncation. Matches the in-app foldOutput head+tail UX. */
const MAX_OUTPUT_LINES = 50;
/** Lines kept at the top when truncating. */
const TRUNCATE_HEAD_LINES = 30;
/** Lines kept at the bottom when truncating. */
const TRUNCATE_TAIL_LINES = 15;

// ============================================================================
// NOTEBOOK GENERATOR
// ============================================================================

export class NotebookGenerator extends BaseTypstGenerator<NotebookGeneratorInput> {
	constructor(generatorConfig?: Partial<GeneratorConfig>, context?: Partial<GeneratorContext>) {
		super(generatorConfig, context);
	}

	generate(input: NotebookGeneratorInput): GenerateResult {
		const options = { ...DEFAULT_NOTEBOOK_EXPORT_OPTIONS, ...input.options };
		const setup = this.generateNotebookSetup();
		const cover = options.includeCoverPage ? this.renderCoverPage(input) : '';
		const body = this.renderCells(input.notebook.content.cells, options);

		return {
			typstContent: setup + cover + body,
			metadata: {
				generator: 'notebook-generator',
				generatedAt: new Date()
			}
		};
	}

	// --------------------------------------------------------------------------
	// SETUP & COVER
	// --------------------------------------------------------------------------

	private generateNotebookSetup(): string {
		// A4, narrow-ish margins (1.8cm) so code blocks have room. Inter for
		// UI text, Fira Mono for code (Typst falls back to system mono if
		// Fira Mono isn't installed in the WASM environment).
		return `#set page(
  paper: "a4",
  margin: (top: 18mm, bottom: 18mm, left: 18mm, right: 18mm),
)
#set text(font: "New Computer Modern", size: 10pt, lang: "fr", region: "FR")
#set par(justify: true, leading: 0.6em)
#set heading(numbering: none)
#show raw.where(block: true): set text(font: "DejaVu Sans Mono", size: 8.5pt)
#show raw.where(block: false): set text(font: "DejaVu Sans Mono")
`;
	}

	private renderCoverPage(input: NotebookGeneratorInput): string {
		// Bracket-safe escape: this content is interpolated inside Typst
		// `[...]` markup blocks, so a stray `]` in user text would close
		// the block early and let arbitrary Typst follow.
		const title = escapeTypstBrackets(input.notebook.title);
		const description = input.notebook.description
			? escapeTypstBrackets(input.notebook.description)
			: '';
		const author = input.authorName ? escapeTypstBrackets(input.authorName) : '';
		const dateStr = this.formatDate();

		return `#align(center + horizon)[
  #block[
    #text(size: 22pt, weight: "bold")[${title}]
    ${description ? `\n    #v(8pt)\n    #text(size: 12pt, fill: gray)[${description}]` : ''}
    #v(20pt)
    ${author ? `#text(size: 11pt)[${author}]\n    #v(4pt)\n    ` : ''}#text(size: 11pt, fill: gray)[${dateStr}]
  ]
]
#pagebreak()
`;
	}

	// --------------------------------------------------------------------------
	// CELL DISPATCH
	// --------------------------------------------------------------------------

	private renderCells(cells: NotebookCell[], options: NotebookExportOptions): string {
		const blocks: string[] = [];
		for (const cell of cells) {
			if (cell.type === 'markdown') {
				blocks.push(this.renderMarkdownCell(cell));
			} else if (cell.type === 'code') {
				blocks.push(this.renderCodeCell(cell, options.includeOutputs));
			} else if (cell.type === 'checkpoint') {
				if (!options.includeCheckpoints) continue;
				blocks.push(this.renderCheckpointCell(cell as CheckpointCell, options.includeHints));
			}
		}
		return blocks.filter((b) => b.trim().length > 0).join('\n\n#v(8pt)\n\n');
	}

	// --------------------------------------------------------------------------
	// MARKDOWN
	// --------------------------------------------------------------------------

	private renderMarkdownCell(cell: BaseNotebookCell): string {
		const source = cell.source ?? '';
		if (source.trim().length === 0) return '';
		// Delegate to UbuMark — gets us LaTeX + custom math, tables, images,
		// variation tables, all the block types, for free.
		const ast = parseMarkdown(source);
		return generateTypst(ast);
	}

	// --------------------------------------------------------------------------
	// CODE
	// --------------------------------------------------------------------------

	private renderCodeCell(cell: BaseNotebookCell, includeOutputs: boolean): string {
		const marker =
			cell.execution_count !== null && cell.execution_count !== undefined
				? `[${cell.execution_count}]`
				: '[ ]';
		const code = this.renderCodeBlock(cell.source ?? '', `In ${marker}:`, '#f6f8fa', '#d0d7de');
		if (!includeOutputs || cell.outputs.length === 0) {
			return code;
		}
		const outputBlocks = cell.outputs
			.map((out) => this.renderOutput(out, cell))
			.filter((s) => s.length > 0);
		if (outputBlocks.length === 0) return code;
		return code + '\n' + outputBlocks.join('\n');
	}

	private renderCodeBlock(source: string, label: string, fill: string, stroke: string): string {
		// Use Typst's `#raw(block: true, ...)` rather than a triple-backtick
		// fence: a fence is closed by any `\`\`\`` in the source, which would
		// let crafted Python (or a shared checkpoint's `config.code`) break
		// out of the code block and emit Typst markup. `#raw` takes a string
		// literal and we escape it carefully via `escapeRawTypst`.
		const raw = `#raw(block: true, lang: "python", "${escapeRawTypst(source)}")`;
		return `#block(
  fill: rgb("${fill}"),
  inset: (x: 10pt, y: 8pt),
  radius: 4pt,
  width: 100%,
  stroke: 0.5pt + rgb("${stroke}"),
)[
  #text(size: 8pt, fill: rgb("#656d76"))[${escapeTypstBrackets(label)}]
  #v(2pt)
  ${raw}
]`;
	}

	// --------------------------------------------------------------------------
	// CHECKPOINT
	// --------------------------------------------------------------------------

	private renderCheckpointCell(cell: CheckpointCell, includeHints: boolean): string {
		const title = cell.title ? escapeTypstBrackets(cell.title) : 'Vérification';
		const body = this.renderCheckpointBody(cell.checkpoint);
		const hint =
			includeHints && cell.hint && cell.hint.trim().length > 0
				? this.renderHintBlock(cell.hint)
				: '';

		return `#block(
  fill: rgb("#fef3c7"),
  inset: 10pt,
  radius: 4pt,
  width: 100%,
  stroke: 0.5pt + rgb("#f59e0b"),
)[
  #text(size: 9pt, weight: "bold", fill: rgb("#92400e"))[✦ ${title}]
  #v(4pt)
  ${body}${hint ? '\n  #v(6pt)\n  ' + hint : ''}
]`;
	}

	private renderCheckpointBody(config: CheckpointConfig): string {
		if (config.mode === 'assert') {
			// `#raw` rather than a triple-backtick fence: prevents arbitrary
			// Typst injection if `config.code` contains \`\`\` somewhere.
			const raw = `#raw(block: true, lang: "python", "${escapeRawTypst(config.code)}")`;
			return `#text(size: 9pt)[Le test suivant doit passer :]
  #v(2pt)
  ${raw}`;
		}
		if (config.mode === 'unit_test') {
			// Function names are Python identifiers — safe in raw inline `...`.
			const fnName = config.function_name;
			const cases = config.test_cases
				.map((tc) => {
					const argsStr = tc.args.map((a) => this.formatJsonValue(a)).join(', ');
					const expectedStr = this.formatJsonValue(tc.expected);
					return `  - \`${fnName}(${argsStr})\` → \`${expectedStr}\``;
				})
				.join('\n');
			return `#text(size: 9pt)[La fonction \`${fnName}\` doit retourner :]
  #v(2pt)
${cases}`;
		}
		// variable_check
		const vars = Object.entries(config.expected_vars)
			.map(([name, value]) => {
				return `  - \`${name} == ${this.formatJsonValue(value)}\``;
			})
			.join('\n');
		return `#text(size: 9pt)[Les variables suivantes doivent avoir ces valeurs :]
  #v(2pt)
${vars}`;
	}

	private renderHintBlock(hint: string): string {
		const escaped = escapeTypstBrackets(hint);
		return `#block(
    fill: rgb("#fde68a"),
    inset: 8pt,
    radius: 3pt,
    width: 100%,
    stroke: 0.5pt + rgb("#d97706"),
  )[
    #text(size: 8pt, weight: "bold", fill: rgb("#92400e"))[Indice]
    #v(2pt)
    #text(size: 9pt)[${escaped}]
  ]`;
	}

	/**
	 * Format any JSON-serializable value for display in a checkpoint
	 * description. Strings get quoted, everything else uses JSON form.
	 */
	private formatJsonValue(value: unknown): string {
		if (value === null || value === undefined) return 'None';
		if (typeof value === 'string') return JSON.stringify(value);
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	// --------------------------------------------------------------------------
	// OUTPUTS — implemented in Phase 2
	// --------------------------------------------------------------------------

	private renderOutput(out: CellOutput, cell: BaseNotebookCell): string {
		if (out.output_type === 'stream') {
			return this.renderStreamOutput(out);
		}
		if (out.output_type === 'error') {
			return this.renderErrorOutput(out);
		}
		return this.renderDisplayOutput(out, cell);
	}

	private renderStreamOutput(out: StreamOutput): string {
		const text = this.truncateOutput(out.text ?? '');
		if (text.length === 0) return '';
		const isStderr = out.name === 'stderr';
		const fill = isStderr ? '#fee2e2' : '#f9fafb';
		const stroke = isStderr ? '#fca5a5' : '#e5e7eb';
		const label = isStderr ? 'Stderr:' : 'Out:';
		const labelColor = isStderr ? '#991b1b' : '#656d76';
		return `#block(
  fill: rgb("${fill}"),
  inset: (x: 10pt, y: 8pt),
  radius: 4pt,
  width: 100%,
  stroke: 0.5pt + rgb("${stroke}"),
)[
  #text(size: 8pt, fill: rgb("${labelColor}"))[${label}]
  #v(2pt)
  #raw(block: true, lang: none, "${escapeRawTypst(text)}")
]`;
	}

	private renderErrorOutput(out: ErrorOutput): string {
		const ename = escapeTypstBrackets(out.ename ?? 'Error');
		const evalue = escapeTypstBrackets(out.evalue ?? '');
		const traceback = (out.traceback ?? []).join('\n');
		const truncatedTb = this.truncateOutput(stripAnsi(traceback));
		return `#block(
  fill: rgb("#fee2e2"),
  inset: (x: 10pt, y: 8pt),
  radius: 4pt,
  width: 100%,
  stroke: 0.5pt + rgb("#fca5a5"),
)[
  #text(size: 8pt, weight: "bold", fill: rgb("#991b1b"))[${ename}: ${evalue}]
${truncatedTb ? `  #v(2pt)\n  #raw(block: true, lang: none, "${escapeRawTypst(truncatedTb)}")` : ''}
]`;
	}

	private renderDisplayOutput(out: DisplayOutput, cell: BaseNotebookCell): string {
		// Priority: PNG image > text/plain > text/html fallback
		const data = out.data ?? {};
		if (data['image/png']) {
			const idx = cell.outputs.indexOf(out);
			const path = pngVirtualPath(cell.id, idx);
			return `#align(center)[#image("${path}", width: 80%)]`;
		}
		if (data['text/plain']) {
			const text = this.truncateOutput(data['text/plain']);
			return `#block(
  fill: rgb("#f9fafb"),
  inset: (x: 10pt, y: 8pt),
  radius: 4pt,
  width: 100%,
  stroke: 0.5pt + rgb("#e5e7eb"),
)[
  #text(size: 8pt, fill: rgb("#656d76"))[Out:]
  #v(2pt)
  #raw(block: true, lang: none, "${escapeRawTypst(text)}")
]`;
		}
		if (data['text/html']) {
			// HTML without text/plain fallback — V1 limitation.
			return `#text(size: 8pt, style: "italic", fill: gray)[(sortie HTML non rendue)]`;
		}
		return '';
	}

	/**
	 * Truncate long outputs to keep PDFs sane. Mirrors the in-app
	 * `foldOutput` head/tail pattern.
	 */
	private truncateOutput(text: string): string {
		const lines = text.split('\n');
		if (lines.length <= MAX_OUTPUT_LINES) return text;
		const head = lines.slice(0, TRUNCATE_HEAD_LINES);
		const tail = lines.slice(lines.length - TRUNCATE_TAIL_LINES);
		const masked = lines.length - TRUNCATE_HEAD_LINES - TRUNCATE_TAIL_LINES;
		return [...head, `… (${masked} lignes masquées) …`, ...tail].join('\n');
	}
}

// ============================================================================
// INLINE IMAGE EXTRACTION
// ============================================================================

/**
 * Walk a notebook's outputs and extract inline base64 PNG images into a map
 * suitable for `service.mapShadow()`. Each image gets a deterministic
 * virtual path derived from `(cellId, outputIndex)` so the generator can
 * reference it via `#image("/notebook/cell-X/output-Y.png")`.
 */
export function extractInlineImages(notebook: PythonNotebook): InlineImageMap {
	const map: InlineImageMap = new Map();
	for (const cell of notebook.content.cells) {
		if (cell.type !== 'code') continue;
		cell.outputs.forEach((out, idx) => {
			if (out.output_type !== 'display_data' && out.output_type !== 'execute_result') return;
			const png = (out as DisplayOutput).data?.['image/png'];
			if (!png) return;
			const bytes = base64ToBytes(png);
			if (bytes) {
				map.set(pngVirtualPath(cell.id, idx), bytes);
			}
		});
	}
	return map;
}

function pngVirtualPath(cellId: string, outputIdx: number): string {
	// Sanitize cellId so it can't break out of the virtual /notebook namespace.
	const safe = cellId.replace(/[^a-zA-Z0-9_-]/g, '_');
	return `/notebook/cell-${safe}/output-${outputIdx}.png`;
}

function base64ToBytes(b64: string): Uint8Array | null {
	try {
		// Strip data URL prefix if present (defensive)
		const clean = b64.replace(/^data:image\/png;base64,/, '').replace(/\s+/g, '');
		// atob works in both browser and Node 18+
		const binary = atob(clean);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	} catch {
		return null;
	}
}

// ============================================================================
// TYPST RAW STRING ESCAPING
// ============================================================================

/**
 * Escape a string so it's safe inside `#raw(block: true, lang: none, "...")`.
 * Typst string literals follow C-like escaping: backslash + quote.
 */
function escapeRawTypst(text: string): string {
	return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Strip ANSI escape sequences (Python tracebacks include them for color).
 */
function stripAnsi(text: string): string {
	// eslint-disable-next-line no-control-regex
	return text.replace(/\[[0-9;]*m/g, '');
}

// ============================================================================
// CONVENIENCE WRAPPER
// ============================================================================

/**
 * One-shot helper that instantiates a default generator and returns the
 * Typst content. Mirrors `generateWorksheetTypst` for API symmetry.
 */
export function generateNotebookTypst(input: NotebookGeneratorInput): string {
	const generator = new NotebookGenerator();
	return generator.generate(input).typstContent;
}
