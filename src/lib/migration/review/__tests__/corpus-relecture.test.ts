/**
 * Corpus des questions relues : garde de non-régression
 * =====================================================
 *
 * Les 632 questions TinyMath relues et importées en brouillon vivent aussi,
 * versionnées, dans `docs/relecture/<lot>/<n>.json`. Chacune n'a été importée
 * que si elle passait `checkTemplate` : structure, schéma strict, specs vertes,
 * une spec « correct » par variation, 50 tirages par variation sans échec.
 *
 * Ce test rejoue ce contrôle à chaque PR. Une modification du générateur, du
 * validateur ou de mathAST qui casse une question du corpus rougit ici, au lieu
 * de se découvrir chez un élève. Rien d'autre ne le vérifiait : les specs ne
 * tournaient qu'à la main (`pnpm question:specs`).
 *
 * Limite : c'est l'instantané de la relecture. Un modèle modifié ensuite dans
 * l'éditeur n'est pas couvert, pas plus que les modèles créés hors relecture.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';
import { checkTemplate } from '../check-template';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { draftTemplate, parseReviewFile } from '../review-file';

// Une question lourde (#626 : 42 variations, 2100 tirages) prend quelques secondes
const TIMEOUT_MS = 60_000;
const CORPUS_DIR = join(process.cwd(), 'docs/relecture');
/** Garde contre un corpus vide ou déplacé : le test passerait sans rien vérifier. */
const MINIMUM_EXPECTED = 600;

function reviewFilePaths(): string[] {
	return readdirSync(CORPUS_DIR)
		.map((lot) => join(CORPUS_DIR, lot))
		.filter((dir) => statSync(dir).isDirectory())
		.flatMap((dir) =>
			readdirSync(dir)
				.filter((name) => name.endsWith('.json'))
				.map((name) => join(dir, name))
		);
}

const corpus = reviewFilePaths().flatMap((path) => {
	const source = relative(process.cwd(), path);
	const review = parseReviewFile(JSON.parse(readFileSync(path, 'utf-8')), source);
	const template = draftTemplate(review);
	// Un rejet ne porte pas de modèle importé
	return template ? [{ source, template }] : [];
});

describe('corpus des questions relues (docs/relecture)', () => {
	it(`contient au moins ${MINIMUM_EXPECTED} modèles`, () => {
		expect(corpus.length).toBeGreaterThanOrEqual(MINIMUM_EXPECTED);
	});

	it.each(corpus)(
		'$source reste importable',
		({ template }) => {
			const report = checkTemplate(template);
			expect(report.reasons).toEqual([]);
		},
		TIMEOUT_MS
	);

	// Même graine → même instance : un tirage qui échappe à la source de l'instance
	// (Math.random, graine recalculée) rougit ici, quel que soit l'endroit du modèle
	it.each(corpus)(
		'$source est reproductible à graine',
		({ template }) => {
			for (const seed of [0, 12345]) {
				const first = generateInstance(template, seed);
				const second = generateInstance(template, seed);
				expect(second.success).toBe(first.success);
				if (!first.success || !second.success) continue;
				expect({ ...second.instance, generatedAt: '' }).toEqual({
					...first.instance,
					generatedAt: ''
				});
			}
		},
		TIMEOUT_MS
	);
});
