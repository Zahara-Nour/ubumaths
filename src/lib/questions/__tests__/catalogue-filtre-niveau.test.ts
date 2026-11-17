/**
 * Catalogue Automaths : filtre par niveau
 * =======================================
 *
 * Le professeur choisit un niveau : il voit les modèles de ce niveau seul, ou de
 * ce niveau et des niveaux inférieurs (arbre des prérequis, `getAccessibleGrades`).
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { filterTemplatesByGrade } from '../catalogue';

function modele(id: string, grades: string[]): QuestionTemplate {
	return { id, grades } as unknown as QuestionTemplate;
}

const MODELES = [
	modele('cp', ['CP']),
	modele('six', ['6']),
	modele('cinq-quatre', ['5', '4']),
	modele('quatre', ['4']),
	modele('trois', ['3']),
	modele('deux', ['2']),
	modele('spe', ['1_SPE']),
	modele('techno', ['1_TECHNO']),
	modele('sans', [])
];

function ids(templates: readonly QuestionTemplate[]): string[] {
	return templates.map((t) => t.id);
}

describe('filterTemplatesByGrade', () => {
	it('sans niveau choisi : tous les modèles, même sans niveau', () => {
		expect(ids(filterTemplatesByGrade(MODELES, null, false))).toEqual(ids(MODELES));
		expect(ids(filterTemplatesByGrade(MODELES, null, true))).toEqual(ids(MODELES));
	});

	it('ce niveau seul : les modèles qui le portent, parmi d’autres niveaux compris', () => {
		expect(ids(filterTemplatesByGrade(MODELES, '4', false))).toEqual(['cinq-quatre', 'quatre']);
	});

	it('ce niveau et les inférieurs : jusqu’au CP, rien au-dessus', () => {
		expect(ids(filterTemplatesByGrade(MODELES, '4', true))).toEqual([
			'cp',
			'six',
			'cinq-quatre',
			'quatre'
		]);
	});

	it('lycée : la 1re techno descend par la 2de, pas par la 1re spé', () => {
		expect(ids(filterTemplatesByGrade(MODELES, '1_TECHNO', true))).toEqual([
			'cp',
			'six',
			'cinq-quatre',
			'quatre',
			'trois',
			'deux',
			'techno'
		]);
	});

	it('un modèle sans niveau n’apparaît sous aucun niveau', () => {
		expect(ids(filterTemplatesByGrade(MODELES, 'CP', true))).toEqual(['cp']);
	});
});
