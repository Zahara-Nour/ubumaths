/**
 * Built-in templates must speak the document's language
 * =====================================================
 *
 * The 12 templates share a single body per template: the chrome comes from
 * `{{label_*}}` placeholders so a label cannot drift between languages. This
 * checks the sweep is complete — a French word left hard-coded would print on
 * an English worksheet.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATES, renderTemplate, SAMPLE_PREVIEW_DATA } from '../default-templates';
import { labelPlaceholders } from '../../labels';
import { TYPST_LANGS } from '$lib/types/locale';

/**
 * Accented characters are the strongest tell: an English render must contain
 * none, bar the proper nouns that keep their spelling in both languages.
 */
const PROPER_NOUNS = ['Léopold Sédar Senghor'];

/** French words with no accent to give them away. */
const FRENCH_MARKERS = [
	'Nom :',
	'Prenom',
	'Classe :',
	'Consignes',
	'Duree',
	'Bareme',
	'Eleve',
	'Exercice',
	'Exercices',
	'Professeur',
	'EVALUATION',
	'EXAMEN',
	'DEVOIRS',
	'saviez-vous',
	'En bref',
	'candidat',
	'Lisez',
	'Justifiez',
	'Ecrivez',
	'calculatrice',
	'aujourd',
	'soussigne',
	'Rappel',
	'Document genere',
	'Semestre',
	'Objectifs',
	'hesitez'
];

function renderEnglish(templateContent: string): string {
	const data: Record<string, string> = {
		...SAMPLE_PREVIEW_DATA,
		// The teacher's own content is not the point here — only the chrome is.
		// The French sample exercises would otherwise trip every marker.
		exercises: 'CONTENT',
		exercises_badge: 'CONTENT',
		instructions: 'CONTENT',
		title: 'CONTENT',
		...labelPlaceholders('en'),
		lang: TYPST_LANGS.en
	};
	return renderTemplate(templateContent, data);
}

describe.each(DEFAULT_TEMPLATES.map((t) => [t.name, t.template_content] as const))(
	'%s',
	(name, content) => {
		it('leaves no French chrome once rendered in English', () => {
			// Typst comments are not rendered, so they are not the point here.
			let rendered = renderEnglish(content)
				.split('\n')
				.filter((line) => !line.trim().startsWith('//'))
				.join('\n');

			for (const marker of FRENCH_MARKERS) {
				expect(rendered, `${name} contient encore « ${marker} »`).not.toContain(marker);
			}

			// The catch-all: any accented letter left is French prose the sweep
			// missed. A marker list alone lets whole sentences through — it did.
			for (const noun of PROPER_NOUNS) rendered = rendered.split(noun).join('');
			const accented = rendered.match(/[À-ÖØ-öø-ÿ]+/g);
			expect(accented, `${name} garde du texte accentué : ${accented?.slice(0, 5)}`).toBeNull();
		});

		it('takes its typst lang from the document', () => {
			expect(content).not.toContain('lang: "fr"');
			if (content.includes('lang:')) {
				expect(renderEnglish(content)).toContain('lang: "en"');
			}
		});

		it('leaves no unresolved placeholder in English', () => {
			expect(renderEnglish(content)).not.toMatch(/\{\{/);
		});
	}
);
