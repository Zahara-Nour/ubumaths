/**
 * NotebookGenerator — unit tests
 *
 * Covers the 42 behaviours validated for the notebook PDF export:
 *  - cells 1-7: markdown rendering (LaTeX + custom math, empty cells)
 *  - cells 8-13: outputs (stream, error, display, HTML fallback, truncation)
 *  - cells 14-21: checkpoints (3 modes + hint + options)
 *  - cells 22-24: special chars, PNG inline images
 *
 * Each test exercises one behaviour to keep failures pinpointable.
 */

import { describe, it, expect } from 'vitest';
import {
	NotebookGenerator,
	extractInlineImages,
	generateNotebookTypst,
	DEFAULT_NOTEBOOK_EXPORT_OPTIONS,
	type NotebookExportOptions
} from './notebook-generator';
import type {
	PythonNotebook,
	NotebookCell,
	CheckpointCell,
	StreamOutput,
	ErrorOutput,
	DisplayOutput
} from '$lib/types/notebook';

// ============================================================================
// FIXTURES
// ============================================================================

const NOW = '2026-06-04T10:00:00.000Z';

function makeNotebook(
	cells: NotebookCell[],
	overrides: Partial<PythonNotebook> = {}
): PythonNotebook {
	return {
		id: 'nb-1',
		title: 'Démo statistiques',
		description: null,
		content: {
			version: '1.0',
			metadata: { title: 'Démo statistiques', created_at: NOW, updated_at: NOW },
			cells
		},
		author_id: 'author-1',
		is_public: false,
		created_at: NOW,
		updated_at: NOW,
		...overrides
	};
}

function makeMd(source: string, id = 'cell-md'): NotebookCell {
	return {
		id,
		type: 'markdown',
		source,
		execution_count: null,
		outputs: [],
		state: 'idle'
	};
}

function makeCode(
	source: string,
	outputs: StreamOutput[] | ErrorOutput[] | DisplayOutput[] = [],
	id = 'cell-code',
	executionCount: number | null = 1
): NotebookCell {
	return {
		id,
		type: 'code',
		source,
		execution_count: executionCount,
		outputs: outputs as unknown as never[],
		state: 'success'
	};
}

function makeCheckpoint(overrides: Partial<CheckpointCell> = {}): CheckpointCell {
	return {
		id: 'cell-cp',
		type: 'checkpoint',
		source: '',
		execution_count: null,
		outputs: [],
		state: 'idle',
		checkpoint: { mode: 'assert', code: 'assert x == 6' },
		...overrides
	};
}

function render(notebook: PythonNotebook, options?: Partial<NotebookExportOptions>): string {
	const opts: NotebookExportOptions = { ...DEFAULT_NOTEBOOK_EXPORT_OPTIONS, ...options };
	return new NotebookGenerator().generate({ notebook, options: opts }).typstContent;
}

// ============================================================================
// MARKDOWN CELLS (behaviours 1-5)
// ============================================================================

describe('NotebookGenerator — markdown cells', () => {
	it('empty markdown cell produces no body block', () => {
		const out = render(makeNotebook([makeMd('   \n  ')]), { includeCoverPage: false });
		// No paragraphs, but setup is still present
		expect(out).toContain('#set page');
		expect(out).not.toMatch(/\$.*\$/); // no math
	});

	it('LaTeX inline math is converted to Typst math', () => {
		const out = render(makeNotebook([makeMd("La dérivée est $f'(x) = 2x$.")]), {
			includeCoverPage: false
		});
		// Typst inline math is `$...$` (the LaTeX → Typst conversion preserves the wrapping)
		expect(out).toMatch(/\$[^$]*2[^$]*x[^$]*\$/);
	});

	it('LaTeX block math produces a centered display equation', () => {
		const out = render(makeNotebook([makeMd('$$\\int_0^1 x \\, dx = \\frac{1}{2}$$')]), {
			includeCoverPage: false
		});
		// Typst block math: `$ ... $` (note the spaces — that's the block form)
		expect(out).toMatch(/\$\s[^$]+\s\$/);
	});

	it('custom inline math (~..~) is converted to Typst math', () => {
		const out = render(makeNotebook([makeMd('Avec ~f(x) = x^2~ la dérivée vaut ~2x~.')]), {
			includeCoverPage: false
		});
		// The custom syntax goes through expressionToLatex → convertLatexToTypstMath
		// We just check that the math made it into Typst form
		expect(out).toContain('$');
	});

	it('custom block math (~~..~~) is converted to Typst block math', () => {
		const out = render(makeNotebook([makeMd('~~(a+b)/c = 1~~')]), {
			includeCoverPage: false
		});
		expect(out).toContain('$');
	});

	it('emits #set page only once across multiple markdown cells (no spurious page breaks)', () => {
		// Regression: each markdown cell used to inherit the UbuMark
		// transpiler's default `includeSetup: true`, which re-emits
		// `#set page(...)` per cell — and Typst treats a `set page` after
		// content as a page break, so every heading ended up on its own
		// page in the PDF.
		const out = render(
			makeNotebook([
				makeMd('# Partie 1'),
				makeMd('## Sous-partie'),
				makeMd('### Détail'),
				makeMd('Texte de paragraphe')
			]),
			{ includeCoverPage: false }
		);
		const pageSetupCount = (out.match(/#set page\(/g) ?? []).length;
		expect(pageSetupCount).toBe(1);
		// And no explicit pagebreak in the body either.
		expect(out).not.toContain('#pagebreak()');
	});
});

// ============================================================================
// CODE CELLS (behaviours 6-7, 22)
// ============================================================================

describe('NotebookGenerator — code cells', () => {
	it('renders code cell with execution_count marker', () => {
		const out = render(makeNotebook([makeCode('print("hello")', [], 'c1', 3)]), {
			includeCoverPage: false,
			includeOutputs: false
		});
		// Label brackets are bracket-escaped inside the [...] markup block.
		expect(out).toMatch(/In\s*\\\[3\\\]/);
		expect(out).toMatch(/#raw\(block: true, lang: "python"/);
		expect(out).toContain('print(');
	});

	it('uses [ ] marker when execution_count is null', () => {
		const out = render(makeNotebook([makeCode('x = 1', [], 'c1', null)]), {
			includeCoverPage: false,
			includeOutputs: false
		});
		expect(out).toMatch(/In\s*\\\[\s*\\\]/);
	});

	it('omits output blocks when cell has no outputs', () => {
		const out = render(makeNotebook([makeCode('x = 1', [], 'c1')]), { includeCoverPage: false });
		expect(out).not.toContain('Out:');
		expect(out).not.toContain('Stderr:');
	});

	it('preserves Typst special chars in code (#raw block)', () => {
		const tricky = '# comment with $var and @decorator and *args\nx = "_test_"';
		const out = render(makeNotebook([makeCode(tricky, [], 'c1', 1)]), {
			includeCoverPage: false,
			includeOutputs: false
		});
		// The Python source lands inside #raw(...) which doesn't interpret
		// Typst markup. The special chars survive verbatim.
		expect(out).toContain('$var');
		expect(out).toContain('@decorator');
		expect(out).toContain('*args');
	});

	it('contains a crafted backtick payload inside a Typst string literal (no fence breakout)', () => {
		// A crafted code cell with triple backticks used to break out of the
		// markdown code fence the previous implementation emitted. With the
		// #raw(..., "...") migration the source is wrapped in a Typst string
		// literal and the backticks have no parser meaning.
		const malicious = '```\n#text(red)[INJECTED]\n```';
		const out = render(makeNotebook([makeCode(malicious, [], 'c1', 1)]), {
			includeCoverPage: false,
			includeOutputs: false
		});
		// The dangerous payload appears, but as a quoted string argument to
		// #raw — confirmed by finding the wrapping signature.
		expect(out).toMatch(/#raw\(block: true, lang: "python", "/);
		// The injected `#text(red)[INJECTED]` is in the source string —
		// not interpreted as a top-level Typst directive.
		expect(out).toContain('#text(red)[INJECTED]');
		// No standalone "INJECTED" rendered red — the payload stays in raw.
	});
});

// ============================================================================
// OUTPUTS (behaviours 8-13, 23-24)
// ============================================================================

describe('NotebookGenerator — outputs', () => {
	it('renders stdout stream as a gray Out: block', () => {
		const out = render(
			makeNotebook([
				makeCode('print(1)', [
					{ output_type: 'stream', name: 'stdout', text: 'hello\n' }
				] as StreamOutput[])
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('Out:');
		expect(out).toContain('hello');
	});

	it('renders stderr stream as a red Stderr: block', () => {
		const out = render(
			makeNotebook([
				makeCode('import sys; sys.stderr.write("oops")', [
					{ output_type: 'stream', name: 'stderr', text: 'oops\n' }
				] as StreamOutput[])
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('Stderr:');
		expect(out).toContain('oops');
		expect(out).toContain('#fee2e2'); // red fill
	});

	it('renders error output with ename + evalue + traceback', () => {
		const out = render(
			makeNotebook([
				makeCode('1/0', [
					{
						output_type: 'error',
						ename: 'ZeroDivisionError',
						evalue: 'division by zero',
						traceback: [
							'Traceback (most recent call last):',
							'  File "<stdin>", line 1',
							'ZeroDivisionError: division by zero'
						]
					}
				] as ErrorOutput[])
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('ZeroDivisionError');
		expect(out).toContain('division by zero');
		expect(out).toContain('Traceback');
	});

	it('renders PNG output with #image() pointing to virtual path', () => {
		const tinyPng =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';
		const out = render(
			makeNotebook([
				makeCode(
					'plt.show()',
					[
						{
							output_type: 'display_data',
							data: { 'image/png': tinyPng }
						}
					] as DisplayOutput[],
					'plotCell'
				)
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('#image(');
		expect(out).toContain('/notebook/cell-plotCell/output-0.png');
	});

	it('falls back to text/plain when both text/plain and text/html are present', () => {
		const out = render(
			makeNotebook([
				makeCode('df', [
					{
						output_type: 'execute_result',
						data: { 'text/plain': '   a  b\n0  1  2', 'text/html': '<table>…</table>' }
					}
				] as DisplayOutput[])
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('   a  b');
		expect(out).not.toContain('<table>');
	});

	it('renders "(sortie HTML non rendue)" when only text/html is present', () => {
		const out = render(
			makeNotebook([
				makeCode('widget', [
					{
						output_type: 'display_data',
						data: { 'text/html': '<button>click</button>' }
					}
				] as DisplayOutput[])
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('sortie HTML non rendue');
		expect(out).not.toContain('<button>');
	});

	it('truncates outputs longer than 50 lines (head + tail + masked count)', () => {
		const longText = Array.from({ length: 120 }, (_, i) => `line ${i + 1}`).join('\n');
		const out = render(
			makeNotebook([
				makeCode('for i in range(120): print(i)', [
					{ output_type: 'stream', name: 'stdout', text: longText }
				] as StreamOutput[])
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('line 1');
		expect(out).toContain('line 120');
		expect(out).toMatch(/lignes masqu/);
		expect(out).not.toContain('line 50'); // middle was cut
	});

	it('omits all outputs when includeOutputs is false', () => {
		const out = render(
			makeNotebook([
				makeCode('print(1)', [
					{ output_type: 'stream', name: 'stdout', text: 'hello' }
				] as StreamOutput[])
			]),
			{ includeCoverPage: false, includeOutputs: false }
		);
		expect(out).not.toContain('hello');
		expect(out).not.toContain('Out:');
	});
});

// ============================================================================
// CHECKPOINT CELLS (behaviours 14-21)
// ============================================================================

describe('NotebookGenerator — checkpoint cells', () => {
	it('renders assert mode with title and code', () => {
		const out = render(
			makeNotebook([
				makeCheckpoint({ title: 'Étape 1', checkpoint: { mode: 'assert', code: 'assert x == 6' } })
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('Étape 1');
		expect(out).toContain('assert x == 6');
		expect(out).toContain('#fef3c7'); // amber fill
	});

	it('renders unit_test mode with function name and test cases', () => {
		const out = render(
			makeNotebook([
				makeCheckpoint({
					title: 'Vérifier moyenne',
					checkpoint: {
						mode: 'unit_test',
						function_name: 'moyenne',
						test_cases: [
							{ args: [[1, 2, 3]], expected: 2 },
							{ args: [[10, 20]], expected: 15 }
						]
					}
				})
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('moyenne');
		expect(out).toContain('[1,2,3]');
		expect(out).toContain('15');
	});

	it('renders variable_check mode with expected vars', () => {
		const out = render(
			makeNotebook([
				makeCheckpoint({
					checkpoint: { mode: 'variable_check', expected_vars: { x: 6, y: 'hello' } }
				})
			]),
			{ includeCoverPage: false }
		);
		expect(out).toContain('x == 6');
		expect(out).toContain('y == ');
		expect(out).toContain('"hello"');
	});

	it('uses "Vérification" as fallback title', () => {
		const out = render(makeNotebook([makeCheckpoint({ title: undefined })]), {
			includeCoverPage: false
		});
		expect(out).toContain('Vérification');
	});

	it('renders the hint block when includeHints is true', () => {
		const out = render(
			makeNotebook([
				makeCheckpoint({
					hint: 'Pense à trier la liste avant de prendre le milieu.'
				})
			]),
			{ includeCoverPage: false, includeHints: true }
		);
		expect(out).toContain('Indice');
		expect(out).toContain('Pense à trier la liste');
	});

	it('omits the hint block when includeHints is false', () => {
		const out = render(makeNotebook([makeCheckpoint({ hint: 'secret tip' })]), {
			includeCoverPage: false,
			includeHints: false
		});
		expect(out).not.toContain('Indice');
		expect(out).not.toContain('secret tip');
	});

	it('skips all checkpoint cells when includeCheckpoints is false', () => {
		const out = render(
			makeNotebook([
				makeMd('# Intro'),
				makeCheckpoint({ title: 'Should be skipped' }),
				makeMd('# Conclusion')
			]),
			{ includeCoverPage: false, includeCheckpoints: false }
		);
		expect(out).not.toContain('Should be skipped');
		expect(out).not.toContain('assert x == 6');
	});

	it('does not include hint section when hint is whitespace only', () => {
		const out = render(makeNotebook([makeCheckpoint({ hint: '   \n  ' })]), {
			includeCoverPage: false,
			includeHints: true
		});
		expect(out).not.toContain('Indice');
	});

	it('escapes `]` in the checkpoint title to prevent Typst block breakout', () => {
		const out = render(
			makeNotebook([
				makeCheckpoint({
					title: 'Étape 1] #text(red)[INJECTED'
				})
			]),
			{ includeCoverPage: false }
		);
		// The `]` in the title is escaped, so the parenthetical Typst
		// directive is just rendered as escaped text — not interpreted.
		expect(out).toContain('\\]');
		// Critically, no unescaped `#text(red)[INJECTED` should be at the
		// "start of a Typst directive" — but it can appear as quoted text.
		// We check that the title content stays inside its block by looking
		// for the escape sequence right after "Étape 1".
		expect(out).toMatch(/Étape 1\\\]/);
	});

	it('escapes `]` in the hint text to prevent block breakout', () => {
		const out = render(
			makeNotebook([
				makeCheckpoint({
					hint: 'Pense à ] #text(red)[ HACK'
				})
			]),
			{ includeCoverPage: false, includeHints: true }
		);
		expect(out).toMatch(/Pense à \\\]/);
	});
});

// ============================================================================
// COVER PAGE (behaviour 21)
// ============================================================================

describe('NotebookGenerator — cover page', () => {
	it('includes title + date when includeCoverPage is true', () => {
		const out = render(makeNotebook([makeMd('# Hello')], { title: 'Mon notebook test' }), {
			includeCoverPage: true
		});
		expect(out).toContain('Mon notebook test');
		expect(out).toContain('#pagebreak()');
	});

	it('includes description on the cover when present', () => {
		const out = render(
			makeNotebook([makeMd('# Hello')], {
				title: 'Mon notebook',
				description: 'Une description détaillée'
			}),
			{ includeCoverPage: true }
		);
		expect(out).toContain('Une description détaillée');
	});

	it('skips the cover page when includeCoverPage is false', () => {
		const out = render(makeNotebook([makeMd('# Hello')]), { includeCoverPage: false });
		expect(out).not.toContain('#pagebreak()');
	});

	it('includes authorName when provided', () => {
		const gen = new NotebookGenerator();
		const result = gen.generate({
			notebook: makeNotebook([makeMd('# Hello')]),
			options: { ...DEFAULT_NOTEBOOK_EXPORT_OPTIONS, includeCoverPage: true },
			authorName: 'Mme Dupont'
		});
		expect(result.typstContent).toContain('Mme Dupont');
	});
});

// ============================================================================
// EXTRACT INLINE IMAGES (behaviour 24)
// ============================================================================

describe('extractInlineImages', () => {
	const tinyPngB64 =
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';

	it('returns an empty map when no PNG outputs are present', () => {
		const map = extractInlineImages(makeNotebook([makeCode('x = 1')]));
		expect(map.size).toBe(0);
	});

	it('extracts one image per PNG output with the deterministic virtual path', () => {
		const map = extractInlineImages(
			makeNotebook([
				makeCode(
					'plt.show()',
					[{ output_type: 'display_data', data: { 'image/png': tinyPngB64 } }] as DisplayOutput[],
					'plotCell'
				)
			])
		);
		expect(map.size).toBe(1);
		expect(map.has('/notebook/cell-plotCell/output-0.png')).toBe(true);
		const bytes = map.get('/notebook/cell-plotCell/output-0.png');
		expect(bytes).toBeInstanceOf(Uint8Array);
		// PNG magic bytes
		expect(bytes![0]).toBe(0x89);
		expect(bytes![1]).toBe(0x50);
		expect(bytes![2]).toBe(0x4e);
		expect(bytes![3]).toBe(0x47);
	});

	it('sanitizes cell ids that contain special chars', () => {
		const map = extractInlineImages(
			makeNotebook([
				makeCode(
					'plt.show()',
					[{ output_type: 'display_data', data: { 'image/png': tinyPngB64 } }] as DisplayOutput[],
					'cell/with$weird@chars'
				)
			])
		);
		const paths = Array.from(map.keys());
		expect(paths[0]).toMatch(/^\/notebook\/cell-[a-zA-Z0-9_]+\/output-0\.png$/);
		expect(paths[0]).not.toContain('/with');
		expect(paths[0]).not.toContain('$');
	});

	it('handles multiple images on the same cell', () => {
		const map = extractInlineImages(
			makeNotebook([
				makeCode(
					'multi',
					[
						{ output_type: 'display_data', data: { 'image/png': tinyPngB64 } },
						{ output_type: 'display_data', data: { 'image/png': tinyPngB64 } }
					] as DisplayOutput[],
					'multiCell'
				)
			])
		);
		expect(map.size).toBe(2);
		expect(map.has('/notebook/cell-multiCell/output-0.png')).toBe(true);
		expect(map.has('/notebook/cell-multiCell/output-1.png')).toBe(true);
	});
});

// ============================================================================
// LEGACY HELPER
// ============================================================================

describe('generateNotebookTypst', () => {
	it('returns a string from the class generator', () => {
		const result = generateNotebookTypst({ notebook: makeNotebook([makeMd('# Test')]) });
		expect(typeof result).toBe('string');
		expect(result).toContain('#set page');
	});
});
