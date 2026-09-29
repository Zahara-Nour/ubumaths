/**
 * Retouches ciblées (lib/retouches.ts), sur l'instantané des lignes de prod
 * (`docs/corrections/retouches/_modeles.json`, lu en lecture seule le 2026-09-30).
 * Chaque retouche : le défaut disparaît, le reste est intact, et une ligne déjà
 * retouchée (ou changée depuis) est refusée au lieu d'être retouchée à l'aveugle.
 */

import { describe, expect, it } from 'vitest';
import type { QuestionInstance, QuestionTemplate } from '../../../src/lib/questions/types';
import { generateInstance } from '../../../src/lib/questions/generator/instance-generator';
import { checkTemplate } from '../../../src/lib/migration/review/check-template';
import { readSnapshot } from '../lib/files';
import {
	changedColumns,
	R_DEC_RANG_TRAILING_SPACE,
	referencesVariable,
	renameInExpression,
	renameInText,
	RETOUCHES
} from '../lib/retouches';

// ============================================================================
// FIXTURES
// ============================================================================

const SNAPSHOT = readSnapshot('retouches');

function original(prefix: string): QuestionTemplate {
	const found = [...SNAPSHOT.values()].find((t) => t.id.startsWith(prefix));
	if (!found) throw new Error(`${prefix} absent de l'instantané`);
	return found;
}

function patched(prefix: string): QuestionTemplate {
	const retouche = RETOUCHES.find((r) => r.templateId.startsWith(prefix));
	if (!retouche) throw new Error(`aucune retouche pour ${prefix}`);
	return retouche.apply(original(prefix));
}

function draw(template: QuestionTemplate, variationIndex: number, seed: number): QuestionInstance {
	const result = generateInstance(
		{ ...template, variations: [template.variations[variationIndex]] },
		seed
	);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

function value(instance: QuestionInstance, name: string): string | undefined {
	return instance.resolvedVariables?.find((v) => v.name === name)?.value;
}

/**
 * Ce que voit l'élève : énoncé, réponses attendues, correction. Les termes de
 * l'énoncé sont triés : `shuffleTerms` (7c642d2f) mélange selon le texte de
 * l'expression, donc un autre nom de variable donne un autre ordre des MÊMES termes.
 */
function rendered(instance: QuestionInstance): string {
	const [head, body = ''] = String(instance.statement).split('>>');
	return JSON.stringify([
		head,
		body.replace(/\$\$$/, '').split(' + ').sort(),
		(instance.blanks ?? []).map((b) => b.expectedAnswer),
		instance.correction?.steps
	]);
}

function steps(template: QuestionTemplate): string[] {
	return template.variations.flatMap((v) => (v.correction?.steps ?? []).map(String));
}

// ============================================================================
// RENOMMAGE
// ============================================================================

describe('renommer une variable', () => {
	it('ne touche que les directives, jamais la prose', () => {
		expect(renameInText('le chiffre ${{e}}$ est rée', 'e', 'u')).toBe('le chiffre ${{u}}$ est rée');
		expect(renameInText('{{if:e>0|e vaut {{e}}|zéro}}', 'e', 'u')).toBe(
			'{{if:u>0|e vaut {{u}}|zéro}}'
		);
		expect(renameInText('\\textcolor{x}{{{eval:{{e}}+e*10;d}}}', 'e', 'u')).toBe(
			'\\textcolor{x}{{{eval:{{u}}+u*10;d}}}'
		);
	});

	it("n'attrape pas un nom plus long ni une commande LaTeX", () => {
		expect(renameInExpression('expression + e - \\exp(e)', 'e', 'u')).toBe(
			'expression + u - \\exp(u)'
		);
	});

	it.each(['accbfd16', '7c642d2f', '13d52989'])(
		'%s : plus aucune référence à `e`, rendu identique sur 30 tirages',
		(prefix) => {
			const before = original(prefix);
			const after = patched(prefix);
			expect(referencesVariable(before, 'e')).toBe(true);
			expect(referencesVariable(after, 'e')).toBe(false);
			expect(steps(after).join('')).not.toContain('{{eval:{{u}}}}');
			before.variations.forEach((_, vi) => {
				for (let seed = 1; seed <= 30; seed++) {
					expect(rendered(draw(after, vi, seed))).toBe(rendered(draw(before, vi, seed)));
				}
			});
		}
	);
});

// ============================================================================
// AUTRES RETOUCHES
// ============================================================================

describe('retouches', () => {
	it('dd7db98e : 2/10 retiré, 1/5 corrigé par amplification', () => {
		const after = patched('dd7db98e');
		const list = after.variations[0].variables?.find((v) => v.name === 'a')?.expression;
		expect(list?.split('|')).not.toContain('2/10');
		expect(list?.split('|')).toContain('1/5');
		const fifth = { ...after, variations: [after.variations[0]] };
		const seeds = Array.from({ length: 200 }, (_, i) => i + 1).map((s) => draw(fifth, 0, s));
		const one = seeds.find((instance) => value(instance, 'a') === '1/5');
		expect(one).toBeDefined();
		const text = (one?.correction?.steps ?? []).join(' ');
		expect(text).toContain('\\dfrac{2}{10}');
		expect(text).toContain('Le dénominateur $5$');
		expect(text).not.toContain('On écrit');
	});

	it.each([
		['160f782d', ['\\dfrac{0}{10}', '\\dfrac{0}{100}']],
		['58f7a8dd', ['\\dfrac{0}{10}', '\\dfrac{0}{100}']]
	])('%s : aucune réponse attendue avec un terme nul', (prefix, nulls) => {
		const before = original(prefix);
		const after = patched(prefix);
		// Le défaut existait bien dans la ligne de prod
		expect(nulls.some((n) => draw(before, 1, 1).blanks?.[0].expectedAnswer.includes(n))).toBe(true);
		after.variations.forEach((_, vi) => {
			for (let seed = 1; seed <= 20; seed++) {
				const expected = draw(after, vi, seed).blanks?.[0].expectedAnswer ?? '';
				for (const n of nulls) expect(expected).not.toContain(n);
			}
		});
	});

	it('33b1b496 : variations 1-2, `r` jamais égal à `p` (200 tirages)', () => {
		const before = original('33b1b496');
		const after = patched('33b1b496');
		const clashes = (template: QuestionTemplate, vi: number) =>
			Array.from({ length: 200 }, (_, i) => draw(template, vi, i + 1)).filter(
				(instance) => value(instance, 'r') === value(instance, 'p')
			).length;
		expect(clashes(before, 0)).toBeGreaterThan(0);
		expect(clashes(after, 0)).toBe(0);
		expect(clashes(after, 1)).toBe(0);
		expect(after.variations.slice(2)).toEqual(before.variations.slice(2));
	});

	it('ff8082bd : `b` retirée des variables et des specs', () => {
		const after = patched('ff8082bd');
		expect(after.shared?.variables?.map((v) => v.name)).toEqual(['a', 'c']);
		expect((after.testSpecs ?? []).every((s) => !('b' in (s.variables ?? {})))).toBe(true);
	});

	it('07bce646 : retitré, rien d’autre ne change', () => {
		const changed = changedColumns(original('07bce646'), patched('07bce646'));
		expect(changed).toEqual({ title: 'Opérations sur les limites' });
	});

	it('R-DEC-RANG : titres sans espace finale', () => {
		expect(R_DEC_RANG_TRAILING_SPACE).toHaveLength(7);
		for (const id of R_DEC_RANG_TRAILING_SPACE) {
			const before = original(id.slice(0, 8));
			expect(before.title.endsWith(' ')).toBe(true);
			expect(changedColumns(before, patched(id.slice(0, 8)))).toEqual({
				title: before.title.trim()
			});
		}
	});

	it.each(['14a51794', 'bd21a9d7'])('%s : `\\;` retirés, rien d’autre', (prefix) => {
		const before = steps(original(prefix));
		const after = steps(patched(prefix));
		expect(before.join('')).toContain('\\;');
		expect(after.join('')).not.toContain('\\;');
		expect(after).toEqual(before.map((s) => s.split('\\;').join('')));
	});
});

// ============================================================================
// GARDES
// ============================================================================

describe('gardes', () => {
	it('une ligne déjà retouchée est refusée (texte attendu introuvable)', () => {
		for (const prefix of ['dd7db98e', '160f782d', '33b1b496', '07bce646', '14a51794']) {
			const retouche = RETOUCHES.find((r) => r.templateId.startsWith(prefix));
			expect(() => retouche?.apply(patched(prefix))).toThrow();
		}
	});

	it('une modification hors des colonnes autorisées est refusée', () => {
		const before = original('07bce646');
		expect(() => changedColumns(before, { ...before, status: 'published' })).toThrow(/status/);
	});

	it('chaque modèle retouché reste importable (checkTemplate, 5 tirages par variation)', () => {
		for (const retouche of RETOUCHES) {
			const {
				created_at: _a,
				updated_at: _u,
				created_by: _c,
				...after
			} = retouche.apply(SNAPSHOT.get(retouche.templateId) as QuestionTemplate);
			const report = checkTemplate(after, { instances: 5 });
			expect(report.reasons, retouche.templateId).toEqual([]);
		}
	}, 120_000);
});
