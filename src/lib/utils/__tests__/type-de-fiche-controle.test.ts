import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { documentLabels } from '$lib/typst/labels';
import { WORKSHEET_TYPES } from '$lib/types/worksheets';
import { getTypeLabel } from '$lib/typst/utils';
import { WORKSHEET_TYPE_LABELS, WORKSHEET_TYPE_OPTIONS } from '$lib/utils/worksheet-constants';

// ADR 0030 : une fiche de type `assessment` est une « Évaluation écrite » (« contrôle »
// nomme la série notée en ligne) ; l'écran et le PDF disent le même mot.
describe('type de fiche « évaluation écrite »', () => {
	it('les tables de libellés partagées disent « Évaluation écrite »', () => {
		expect(WORKSHEET_TYPE_LABELS.assessment).toBe('Évaluation écrite');
		expect(WORKSHEET_TYPE_OPTIONS.find((o) => o.value === 'assessment')?.label).toBe(
			'Évaluation écrite'
		);
		expect(getTypeLabel('assessment')).toBe('Évaluation écrite');
	});

	it('aucun libellé recopié ne dit « Evaluation » seule (terme banni ; « écrite » permis)', () => {
		const files = globSync('src/**/*.{ts,svelte}', { exclude: (f) => f.includes('__tests__') });
		const fautifs = files.filter((f) =>
			/(?:label: |assessment: )['"]É?[Ee]valuation(?! écrite)/.test(readFileSync(f, 'utf8'))
		);
		expect(fautifs).toEqual([]);
	});
});

// Décision de David (2026-10-12) : un seul libellé par type, en langage courant, à l'écran
// comme sur le PDF français. La table vivait en neuf copies divergentes.
describe('libellés des types de fiche : une seule table', () => {
	it('le PDF et les listes de choix disent les mots de la table', () => {
		const fr = documentLabels('fr');
		for (const type of WORKSHEET_TYPES) {
			const libelle = WORKSHEET_TYPE_LABELS[type];
			expect(getTypeLabel(type)).toBe(libelle);
			expect(WORKSHEET_TYPE_OPTIONS.find((o) => o.value === type)?.label).toBe(libelle);
		}
		expect(fr.typeWorksheet).toBe(WORKSHEET_TYPE_LABELS.worksheet);
		expect(fr.typeAssessment).toBe(WORKSHEET_TYPE_LABELS.assessment);
		expect(fr.typeExam).toBe(WORKSHEET_TYPE_LABELS.exam);
		expect(fr.typeHomework).toBe(WORKSHEET_TYPE_LABELS.homework);
	});

	it('aucun composant ne recopie une table de libellés de types', () => {
		const files = globSync('src/**/*.{ts,svelte}', { exclude: (f) => f.includes('__tests__') });
		const copie =
			/homework: ['"`](Devoirs?|Corvées Domestiques)['"`]|worksheet: ['"`](Feuille|Fiche de travail)|label: lore\.learning\.(exam|homework) }/;
		const fautifs = files.filter(
			(f) => !f.endsWith('worksheet-type-labels.ts') && copie.test(readFileSync(f, 'utf8'))
		);
		expect(fautifs).toEqual([]);
	});
});
