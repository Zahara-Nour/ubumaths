/**
 * Accord entre les niveaux proposés par l'interface et ceux que le serveur
 * accepte.
 *
 * La page de création portait sa propre liste — 6, 5, 4, 3, 2, 1, T — sans
 * rapport avec le référentiel : choisir « 1ère » ou « Terminale » envoyait des
 * codes que la validation refuse, et créer un modèle pour ces niveaux était
 * simplement impossible. Ces tests figent le contrat des deux côtés.
 */

import { describe, expect, it } from 'vitest';
import { createChapterTemplateSchema } from '$lib/server/validation/chapter-templates';
import { GRADE_CODES } from '$lib/types/grades';

const template = (grades: string[]) => ({ title: 'Fractions', grades });

describe('createChapterTemplateSchema — niveaux', () => {
	it.each(GRADE_CODES)('accepte le niveau %s du référentiel', (code) => {
		expect(createChapterTemplateSchema.safeParse(template([code])).success).toBe(true);
	});

	// Les deux valeurs que l'ancienne liste maison envoyait : il n'existe pas de
	// « 1ère » ni de « Terminale » tout court, les filières les distinguent.
	it.each(['1', 'T'])('refuse « %s », qui n’est pas un niveau', (code) => {
		expect(createChapterTemplateSchema.safeParse(template([code])).success).toBe(false);
	});

	it('accepte plusieurs niveaux, filières comprises', () => {
		const result = createChapterTemplateSchema.safeParse(
			template(['CM2', '6', '2', '1_SPE', 'T_STMG'])
		);

		expect(result.success).toBe(true);
	});

	it('accepte un modèle sans niveau', () => {
		expect(createChapterTemplateSchema.safeParse({ title: 'Fractions' }).success).toBe(true);
	});
});
