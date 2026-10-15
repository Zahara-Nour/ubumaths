/**
 * « Faire un modèle » : un chapitre a-t-il de quoi faire un modèle ?
 * ===================================================================
 *
 * ADR 0029 : le modèle emporte TOUT le contenu du chapitre, séries comprises.
 * La règle Q128 (« les séries ne comptent pas ») venait de l'ancien modèle
 * « snapshot », qui ne les emportait pas : un chapitre fait uniquement de
 * séries ne pouvait pas devenir un modèle.
 */

import { describe, it, expect } from 'vitest';
import { chapterHasTemplateContent } from '../chapter-has-template-content';

const VIDE = { documents: 0, checklistItems: 0, exercises: 0, worksheets: 0, series: 0 };

describe('chapterHasTemplateContent', () => {
	it('un chapitre vide ne fait pas un modèle', () => {
		expect(chapterHasTemplateContent(VIDE)).toBe(false);
	});

	it('un chapitre fait uniquement de séries fait un modèle', () => {
		expect(chapterHasTemplateContent({ ...VIDE, series: 1 })).toBe(true);
	});

	it.each(['documents', 'checklistItems', 'exercises', 'worksheets'] as const)(
		'un chapitre avec un élément de type %s fait un modèle',
		(type) => {
			expect(chapterHasTemplateContent({ ...VIDE, [type]: 1 })).toBe(true);
		}
	);
});
