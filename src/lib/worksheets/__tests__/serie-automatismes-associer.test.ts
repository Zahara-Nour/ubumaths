/**
 * Série d'automatismes : éléments à associer (chantier `docs/wip/associer-progress.md`)
 * ====================================================================================
 *
 * Phase 0 validée le 2026-11-14 : à l'énoncé, deux colonnes à relier au crayon (le bloc
 * sans liens, sans `case:`) ; au corrigé, la bonne étiquette en face de chaque élément
 * (liste « élément → étiquette »). Une case par élément.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie } from '../serie-automatismes';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

function modele(id: string, statement: string, blanks?: unknown[]): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['1_SPE'],
		level: 1,
		status: 'draft',
		variations: [{ statement, ...(blanks ? { blanks } : {}) }]
	} as unknown as QuestionTemplate;
}

const associer = [
	'```associer',
	'- a -> pair',
	'- b -> impair',
	'- c -> pair',
	'- -> premier',
	'```'
];

const seul = modele('seul', ['Associe.', '', ...associer].join('\n'));
const avecCase = modele('avec-case', ['Calcule $1+1=?$.', '', ...associer].join('\n'), [
	{ expectedAnswer: '2' }
]);
const modeles = new Map([seul, avecCase].map((t) => [t.id, t]));

describe('buildSerie — éléments à associer', () => {
	it('énoncé : le bloc sans liens ni case ; corrigé : la bonne étiquette en face de chaque élément', () => {
		const serie = buildSerie(modeles, [{ templateId: 'seul', seed: 1 }]);
		expect(serie.statement).toContain('```associer');
		expect(serie.statement).not.toMatch(/case:/);
		expect(serie.statement).not.toMatch(/- [abc] -> \S/);
		expect(serie.solution).not.toContain('```associer');
		expect(serie.solution).toMatch(/- a → pair/);
		expect(serie.solution).toMatch(/- b → impair/);
		expect(serie.solution).toMatch(/- c → pair/);
		// L'énoncé est un item de liste : le PDF dessine les deux colonnes, jamais du code
		const typst = generateTypst(parseMarkdown(serie.statement));
		expect(typst).toContain('2.5cm');
		expect(typst).not.toContain('- a ->');
	});

	it('avec une autre case : les cases comptent ensemble', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-case', seed: 1 }]);
		expect(serie.solution).toMatch(/- b → impair/);
		expect(serie.solution).toContain('2');
	});

	it('courbes dans les éléments (lot 2) : énoncé avec les courbes, corrigé « 1 → étiquette »', () => {
		const courbes = modele(
			'courbes',
			[
				'Associe.',
				'',
				'````associer',
				'- ```courbe',
				'  x: -3 ; 3',
				'  y: -3 ; 3',
				'  f(x) = 2*x',
				'  ```',
				'  -> linéaire',
				'- ```courbe',
				'  x: -3 ; 3',
				'  y: -3 ; 3',
				'  f(x) = x^2',
				'  ```',
				'  -> carré',
				'- -> constante',
				'````'
			].join('\n')
		);
		const serie = buildSerie(new Map([[courbes.id, courbes]]), [
			{ templateId: 'courbes', seed: 1 }
		]);
		expect(serie.statement).toContain('````associer');
		expect(serie.statement).toContain('- ```courbe');
		expect(serie.statement).not.toMatch(/case:/);
		// Lien de fin d'élément vidé (`->` seul) ; seuls les intrus « - -> … » portent une étiquette
		expect(serie.statement).not.toMatch(/^\s+->[ \t]*\S/m);
		expect(serie.solution).not.toContain('```courbe');
		expect(serie.solution).toMatch(/- 1 → linéaire/);
		expect(serie.solution).toMatch(/- 2 → carré/);
		// Le PDF de la série dessine les courbes, numérotées (bloc dans l'item de liste)
		const typst = generateTypst(parseMarkdown(serie.statement));
		expect(typst).toContain('[*2.*]');
		expect(typst).not.toContain('Figure indisponible');
	});
});
