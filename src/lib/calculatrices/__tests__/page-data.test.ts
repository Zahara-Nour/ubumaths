/**
 * Guides calculatrices : en production, rien de non relu sur la machine ne sort du
 * serveur (phase 0, point 8), sur le contenu RÉEL des modèles. La revue du 2026-10-12
 * a trouvé ce texte dans le JavaScript envoyé au navigateur : les `load` sont devenus
 * serveur, et ce test vérifie ce qu'ils renvoient.
 */
import { describe, expect, it } from 'vitest';
import { GRADE_CODES } from '$lib/types/grades';
import { GRADE_SLUGS } from '../levels';
import { MODELS } from '../models';
import { guidePage, listModels, modelPage } from '../page-data';

const PRODUCTION = { includeUnverified: false };
const LOCAL = { includeUnverified: true };

/** Tout le texte non relu des modèles : aucune de ces chaînes ne doit sortir en production */
const UNVERIFIED_TEXTS = MODELS.flatMap((model) => [
	...model.sequences
		.filter((sequence) => !sequence.verifiedOnDevice)
		.flatMap((sequence) => [...sequence.steps, ...(sequence.note ? [sequence.note] : [])]),
	...model.pitfalls
		.filter((pitfall) => !pitfall.verifiedOnDevice)
		.map((pitfall) => pitfall.explanation)
]);

describe('en production', () => {
	it('aucune page de guide ne contient de texte non relu', () => {
		const leaks: string[] = [];
		for (const model of MODELS) {
			for (const grade of GRADE_CODES) {
				const serialized = JSON.stringify(guidePage(model.slug, GRADE_SLUGS[grade], PRODUCTION));
				for (const text of UNVERIFIED_TEXTS) {
					if (serialized.includes(JSON.stringify(text).slice(1, -1))) {
						leaks.push(`${model.slug}/${GRADE_SLUGS[grade]} : ${text.slice(0, 40)}`);
					}
				}
			}
		}
		expect(leaks).toEqual([]);
	});

	it('un modèle sans séquence relue est « Bientôt », dans la liste et sur sa page', () => {
		for (const summary of listModels(PRODUCTION)) {
			const model = MODELS.find((candidate) => candidate.slug === summary.slug);
			const hasVerified = model?.sequences.some((sequence) => sequence.verifiedOnDevice) ?? false;
			expect(summary.available, summary.slug).toBe(hasVerified);
			expect(modelPage(summary.slug, PRODUCTION)?.available, summary.slug).toBe(hasVerified);
		}
	});
});

describe('en local', () => {
	it('le guide NumWorks montre les séquences non relues, pour la relecture', () => {
		const page = guidePage('numworks', 'seconde', LOCAL);
		expect(page?.kind).toBe('guide');
		if (page?.kind === 'guide') expect(page.guide.own.length).toBeGreaterThan(0);
	});
});

describe('adresses inconnues', () => {
	it('renvoient null (404)', () => {
		expect(modelPage('inconnue', PRODUCTION)).toBeNull();
		expect(guidePage('numworks', 'sixieme', PRODUCTION)).toBeNull();
	});
});
