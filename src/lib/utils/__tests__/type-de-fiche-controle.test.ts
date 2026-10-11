import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STUDENT_TYPE_LABELS } from '$lib/typst/labels';
import { getTypeLabel } from '$lib/typst/utils';
import { WORKSHEET_TYPE_LABELS, WORKSHEET_TYPE_OPTIONS } from '$lib/utils/worksheet-constants';

// Une fiche de type `assessment` est un contrôle (CONTEXT.md) : l'écran et le PDF disent le même mot.
describe('type de fiche « contrôle »', () => {
	it('les tables de libellés partagées disent « Contrôle »', () => {
		expect(WORKSHEET_TYPE_LABELS.assessment).toBe('Contrôle');
		expect(WORKSHEET_TYPE_OPTIONS.find((o) => o.value === 'assessment')?.label).toBe('Contrôle');
		expect(getTypeLabel('assessment')).toBe('Contrôle');
		expect(STUDENT_TYPE_LABELS.fr.assessment).toBe('Contrôle');
	});

	it('aucun libellé recopié dans un composant ne dit encore « Evaluation »', () => {
		const files = globSync('src/**/*.{ts,svelte}', { exclude: (f) => f.includes('__tests__') });
		const fautifs = files.filter((f) =>
			/(?:label: |assessment: )['"]Évaluation|(?:label: |assessment: )['"]Evaluation/.test(
				readFileSync(f, 'utf8')
			)
		);
		expect(fautifs).toEqual([]);
	});
});
