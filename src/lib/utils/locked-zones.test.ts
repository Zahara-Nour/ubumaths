/**
 * Tests for the locked-zones parser/reconstruction utilities.
 *
 * Each test references a behavior tagged L1..Ln from the Phase 0 spec
 * (see docs/wip/python-locked-zones-progress.md).
 */

import { describe, expect, it } from 'vitest';
import { parseTemplate, reconstructCode, renderDefaults } from './locked-zones';

describe('parseTemplate', () => {
	it('L1 — empty code has no markers and no errors', () => {
		const r = parseTemplate('');
		expect(r.markers).toEqual([]);
		expect(r.errors).toEqual([]);
	});

	it('L1 — code without markers is silent', () => {
		const r = parseTemplate('x = 5\nwhile True:\n    pass');
		expect(r.markers).toEqual([]);
		expect(r.errors).toEqual([]);
	});

	it('L2 — single bare marker {{id}}', () => {
		const r = parseTemplate('while {{cond}}:');
		expect(r.errors).toEqual([]);
		expect(r.markers).toHaveLength(1);
		expect(r.markers[0]).toMatchObject({
			id: 'cond',
			default: '',
			templateStart: 6, // index of "{"
			templateEnd: 14 // index after "}}"
		});
	});

	it('L2 — marker with double-quoted default', () => {
		const r = parseTemplate('while {{cond | "False"}}:');
		expect(r.errors).toEqual([]);
		expect(r.markers).toHaveLength(1);
		expect(r.markers[0]).toMatchObject({ id: 'cond', default: 'False' });
	});

	it('L3 — marker with single-quoted default', () => {
		const r = parseTemplate("while {{cond | 'False'}}:");
		expect(r.errors).toEqual([]);
		expect(r.markers).toHaveLength(1);
		expect(r.markers[0]).toMatchObject({ id: 'cond', default: 'False' });
	});

	it('L4 — multiple markers preserve order', () => {
		const r = parseTemplate('x = {{a}} + {{b}}');
		expect(r.errors).toEqual([]);
		expect(r.markers).toHaveLength(2);
		expect(r.markers[0].id).toBe('a');
		expect(r.markers[1].id).toBe('b');
		expect(r.markers[0].templateStart).toBeLessThan(r.markers[1].templateStart);
	});

	it('L4 — marker with whitespace inside {{ }}', () => {
		const r = parseTemplate('while {{  cond   |   "False"  }}:');
		expect(r.errors).toEqual([]);
		expect(r.markers[0]).toMatchObject({ id: 'cond', default: 'False' });
	});

	it('L6 — unterminated marker reports error', () => {
		const r = parseTemplate('while {{cond:');
		expect(r.markers).toEqual([]);
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].kind).toBe('unterminated');
	});

	it('L7 — empty id reports error', () => {
		const r = parseTemplate('while {{}}:');
		expect(r.markers).toEqual([]);
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].kind).toBe('empty-id');
	});

	it('L7 — id with only whitespace reports error', () => {
		const r = parseTemplate('while {{   }}:');
		expect(r.markers).toEqual([]);
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].kind).toBe('empty-id');
	});

	it('L9 — id starting with digit reports invalid-id', () => {
		const r = parseTemplate('x = {{1foo}}');
		expect(r.markers).toEqual([]);
		expect(r.errors[0].kind).toBe('invalid-id');
	});

	it('L9 — id with dash reports invalid-id', () => {
		const r = parseTemplate('x = {{foo-bar}}');
		expect(r.markers).toEqual([]);
		expect(r.errors[0].kind).toBe('invalid-id');
	});

	it('L9 — id with underscore and digits is OK', () => {
		const r = parseTemplate('x = {{_x123}}');
		expect(r.errors).toEqual([]);
		expect(r.markers[0].id).toBe('_x123');
	});

	it('L7 — duplicate id reports error on the second occurrence', () => {
		const r = parseTemplate('x = {{cond}}\ny = {{cond}}');
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].kind).toBe('duplicate-id');
		// First marker is still recognised; only the duplicate is dropped.
		expect(r.markers).toHaveLength(1);
		expect(r.markers[0].id).toBe('cond');
	});

	it('L8 — marker spanning two lines reports cross-line', () => {
		const r = parseTemplate('x = {{cond\n}}');
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].kind).toBe('cross-line');
		expect(r.markers).toEqual([]);
	});

	it('L12 — default without quotes reports unquoted-default', () => {
		const r = parseTemplate('x = {{cond | False}}');
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].kind).toBe('unquoted-default');
		expect(r.markers).toEqual([]);
	});

	it('L10 — escaped double-quote inside default is preserved', () => {
		const r = parseTemplate('x = {{cond | "say \\"hi\\""}}');
		expect(r.errors).toEqual([]);
		expect(r.markers[0].default).toBe('say "hi"');
	});

	it('L10 — escaped single-quote inside single-quoted default', () => {
		const r = parseTemplate("x = {{cond | 'it\\'s'}}");
		expect(r.errors).toEqual([]);
		expect(r.markers[0].default).toBe("it's");
	});

	it('— characters between closing quote and `}}` raise unquoted-default', () => {
		// Without the post-quote check, `{{x | "foo"bar}}` would slice to
		// `foo"bar` and accept it silently. The fix surfaces an error.
		const r = parseTemplate('x = {{cond | "foo"bar}}');
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].kind).toBe('unquoted-default');
	});

	it('— double-quoted segment followed by another quoted segment is unterminated', () => {
		// `{{cond | "foo"bar"}}` is also wrong but surfaces as `unterminated`:
		// after `"foo"` closes, `"bar"...` reopens a new string that never
		// closes before EOF. Either error is acceptable — the teacher sees
		// that the marker is malformed.
		const r = parseTemplate('x = {{cond | "foo"bar"}}');
		expect(r.errors.length).toBeGreaterThan(0);
		expect(['unquoted-default', 'unterminated']).toContain(r.errors[0].kind);
	});

	it('— template ranges are correct for substitution', () => {
		const tpl = 'while {{cond | "False"}}:';
		const r = parseTemplate(tpl);
		const m = r.markers[0];
		// Slicing [templateStart, templateEnd] must equal the raw marker text.
		expect(tpl.slice(m.templateStart, m.templateEnd)).toBe('{{cond | "False"}}');
	});
});

describe('reconstructCode', () => {
	it('— substitutes a single bare marker', () => {
		const out = reconstructCode('while {{cond}}:', { cond: 'x > 0' });
		expect(out).toBe('while x > 0:');
	});

	it('— substitutes a marker with default and provided value', () => {
		const out = reconstructCode('while {{cond | "False"}}:', { cond: 'x > 0' });
		expect(out).toBe('while x > 0:');
	});

	it('— uses default when value is missing', () => {
		const out = reconstructCode('while {{cond | "False"}}:', {});
		expect(out).toBe('while False:');
	});

	it('— uses empty string when value is "" (not the default)', () => {
		const out = reconstructCode('while {{cond | "False"}}:', { cond: '' });
		expect(out).toBe('while :');
	});

	it('— bare marker with no value substitutes empty string', () => {
		const out = reconstructCode('while {{cond}}:', {});
		expect(out).toBe('while :');
	});

	it('— substitutes multiple markers', () => {
		const out = reconstructCode('x = {{a | "0"}} + {{b | "0"}}', { a: '1', b: '2' });
		expect(out).toBe('x = 1 + 2');
	});

	it('— preserves literal "{{ }}" sequences inside substitution values', () => {
		const out = reconstructCode('comment = {{x | "abc"}}', { x: '"{{not a marker}}"' });
		expect(out).toBe('comment = "{{not a marker}}"');
	});

	it('— code without markers is returned unchanged', () => {
		const out = reconstructCode('x = 5\nwhile True:\n    pass', { cond: 'ignored' });
		expect(out).toBe('x = 5\nwhile True:\n    pass');
	});

	it('— ignores unknown keys in values', () => {
		const out = reconstructCode('x = {{a | "0"}}', { a: '1', b: '999' });
		expect(out).toBe('x = 1');
	});

	it('— with parse errors, the malformed marker is left in place', () => {
		// Behaviour: when parseTemplate would error, reconstructCode is
		// best-effort. Malformed markers are left literally in the output
		// so the resulting code raises a SyntaxError if executed — which is
		// what we want (the teacher sees the issue at submission time).
		const out = reconstructCode('x = {{1bad}}', { '1bad': 'anything' });
		expect(out).toBe('x = {{1bad}}');
	});

	it('— mix of valid + malformed + valid: valid ones substituted, malformed left in place', () => {
		// Cursor-accounting check: a malformed marker between two valid
		// markers must not break the slicing of the surrounding spans.
		const out = reconstructCode('x = {{a | "0"}} + {{1bad}} - {{b | "0"}}', {
			a: '1',
			b: '2'
		});
		expect(out).toBe('x = 1 + {{1bad}} - 2');
	});
});

describe('renderDefaults', () => {
	it('— replaces marker by its default value', () => {
		const r = renderDefaults('while {{cond | "False"}}:');
		expect(r.rendered).toBe('while False:');
	});

	it('— bare marker renders as empty', () => {
		const r = renderDefaults('while {{cond}}:');
		expect(r.rendered).toBe('while :');
	});

	it('— zones carry the rendered-side positions of the editable region', () => {
		const r = renderDefaults('while {{cond | "False"}}:');
		expect(r.zones).toHaveLength(1);
		const z = r.zones[0];
		expect(z.id).toBe('cond');
		expect(z.defaultValue).toBe('False');
		// "while False:" — "False" is at index 6, length 5.
		expect(r.rendered.slice(z.renderedStart, z.renderedEnd)).toBe('False');
	});

	it('— multiple markers: rendered positions track default-length offsets', () => {
		const r = renderDefaults('x = {{a | "0"}} + {{b | "42"}}');
		expect(r.rendered).toBe('x = 0 + 42');
		expect(r.zones).toHaveLength(2);
		expect(r.rendered.slice(r.zones[0].renderedStart, r.zones[0].renderedEnd)).toBe('0');
		expect(r.rendered.slice(r.zones[1].renderedStart, r.zones[1].renderedEnd)).toBe('42');
	});

	it('— code without markers renders unchanged with empty zones', () => {
		const r = renderDefaults('x = 5');
		expect(r.rendered).toBe('x = 5');
		expect(r.zones).toEqual([]);
	});

	it('— malformed template surfaces errors and returns the template unchanged', () => {
		const r = renderDefaults('x = {{1bad}}');
		expect(r.errors.length).toBeGreaterThan(0);
		expect(r.rendered).toBe('x = {{1bad}}');
		expect(r.zones).toEqual([]);
	});
});
