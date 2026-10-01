/**
 * Bloc ```loi — loi d'une variable aléatoire finie (1re spécialité) :
 * analyse, scène, Typst.
 *
 * Spécification validée par David le 2026-10-01 (lot 6, Q40 à Q42).
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';

// =============================================================================
// Helpers
// =============================================================================

const GAME = 'G = -2 ; 0 ; 5\nP = 1/2 ; 3/10 ; 1/5';
const DIE = 'X = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6';

function specOf(source: string) {
	const node = parseStatChartContent('loi', source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string) {
	const node = parseStatChartContent('loi', source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0];
}

function sceneOf(source: string, locale: 'fr' | 'en' = 'fr') {
	return buildStatChartScene(specOf(source), { locale }) as LawScene;
}

// =============================================================================
// Analyse
// =============================================================================

describe('loi — analyse', () => {
	it('variable, valeurs et probabilités telles qu’écrites', () => {
		const law = specOf(GAME).law!;

		expect(law.variable).toBe('G');
		expect(law.values).toEqual(['-2', '0', '5']);
		expect(law.probabilities).toEqual(['1/2', '3/10', '1/5']);
		expect(law.indicators).toEqual([]);
		expect(law.masked).toEqual([]);
	});

	it('indicateurs, masquer, titre ; probabilités décimales et en %', () => {
		const law = specOf(
			'X = 0 ; 1 ; 2\nP = 0,3 ; 45 % ; 0.25\nindicateurs: espérance ; écart type\nmasquer: 1\ntitre: Nombre de piles'
		).law!;

		expect(law.indicators).toEqual(['esperance', 'ecart-type']);
		expect(law.masked).toEqual([1]);
	});

	it('« ? » : probabilité inconnue et cachée', () => {
		expect(specOf('X = 0 ; 1\nP = 1/2 ; ?').law!.probabilities).toEqual(['1/2', null]);
	});
});

describe('loi — erreurs situées', () => {
	it('ligne P absente', () => {
		expect(errorOf('X = 1 ; 2').message).toMatch(/P =/);
	});

	it('autant de probabilités que de valeurs', () => {
		expect(errorOf('X = 1 ; 2 ; 3\nP = 1/2 ; 1/2').message).toMatch(/3.*2/);
	});

	it('somme différente de 1 : la somme trouvée', () => {
		expect(errorOf('X = 1 ; 2\nP = 1/2 ; 1/3').message).toContain('5/6');
	});

	it('probabilité hors de [0 ; 1], valeur en double, nombre illisible', () => {
		expect(errorOf('X = 1 ; 2\nP = -1/2 ; 3/2').message).toMatch(/entre 0 et 1/);
		expect(errorOf('X = 1 ; 1\nP = 1/2 ; 1/2').message).toMatch(/deux fois/);
		expect(errorOf('X = 1 ; a\nP = 1/2 ; 1/2').line).toBe(1);
	});

	// Revue du lot 6 : avec un « ? », presque rien n'était vérifié
	it('avec « ? » : doublons et somme des probabilités connues vérifiés', () => {
		expect(errorOf('X = 1 ; 1 ; 2\nP = 1/5 ; 1/5 ; ?').message).toMatch(/deux fois/);
		expect(errorOf('X = 1 ; 2 ; 3\nP = 0,8 ; 0,5 ; ?').message).toMatch(/13\/10|1,3/);
		expect(errorOf('X = 1 ; 2 ; 3\nP = 1/2 ; 1/2 ; ?').message).toMatch(/déjà 1/);
	});

	it('une valeur en pourcentage, ou vide, est refusée avec un message clair', () => {
		expect(errorOf('X = 25 % ; 2\nP = 1/2 ; 1/2').line).toBe(1);
		expect(errorOf('X = 1 ; 2 ;\nP = 1/2 ; 1/2').message).toMatch(/vide/);
	});

	it('masquer et indicateurs répétés : une seule fois', () => {
		const law = specOf(`${GAME}\nmasquer: 0 ; 0\nindicateurs: espérance ; espérance`).law!;

		expect(law.masked).toEqual([1]);
		expect(law.indicators).toEqual(['esperance']);
	});

	it('au plus 12 valeurs', () => {
		const values = Array.from({ length: 13 }, (_, i) => i).join(' ; ');
		const probs = Array.from({ length: 13 }, () => '1/13').join(' ; ');

		expect(errorOf(`X = ${values}\nP = ${probs}`).message).toMatch(/12/);
	});

	it('masquer : une valeur inconnue', () => {
		expect(errorOf(`${GAME}\nmasquer: 7`).message).toMatch(/7/);
	});

	it('indicateurs avec une probabilité « ? »', () => {
		expect(errorOf('X = 0 ; 1\nP = 1/2 ; ?\nindicateurs: espérance').message).toMatch(/\?/);
	});

	it('nom de variable : une seule lettre majuscule, autre que P', () => {
		expect(errorOf('g = 1 ; 2\nP = 1/2 ; 1/2').line).toBe(1);
	});

	it('indicateur inconnu, ou option d’un autre bloc', () => {
		expect(errorOf(`${GAME}\nindicateurs: médiane`).message).toMatch(/médiane/);
		expect(errorOf(`${GAME}\nvaleurs: oui`).message).toMatch(/lois/);
	});
});

// =============================================================================
// Scène
// =============================================================================

describe('loi — scène', () => {
	it('deux lignes : gᵢ et P(G = gᵢ), valeurs avec le vrai signe moins', () => {
		const scene = sceneOf(GAME);

		expect(scene.variable).toBe('G');
		expect(scene.values).toEqual(['−2', '0', '5']);
		expect(scene.probabilities.map((c) => c.text)).toEqual(['1/2', '3/10', '1/5']);
		expect(scene.accessibleTitle).toBe('Loi de G');
	});

	it('ligne d’indicateurs : fractions exactes', () => {
		expect(sceneOf(`${DIE}\nindicateurs: espérance ; variance ; écart type`).indicators).toEqual([
			'E(X) = 7/2 = 3,5',
			'V(X) = 35/12 ≈ 2,92',
			'σ(X) ≈ 1,71'
		]);
		expect(sceneOf(`${GAME}\nindicateurs: espérance`).indicators).toEqual(['E(G) = 0']);
	});

	it('anglais : point décimal dans les probabilités et les indicateurs', () => {
		const scene = sceneOf('X = 0 ; 1\nP = 0,3 ; 0,7\nindicateurs: espérance', 'en');

		expect(scene.probabilities.map((c) => c.text)).toEqual(['0.3', '0.7']);
		expect(scene.indicators).toEqual(['E(X) = 7/10 = 0.7']);
		expect(scene.hiddenLabel).toBe('blank cell');
	});

	it('masquer et « ? » : cases vides et marquées', () => {
		const masked = sceneOf(`${GAME}\nmasquer: 0`).probabilities[1];
		const unknown = sceneOf('X = 0 ; 1\nP = 1/2 ; ?').probabilities[1];

		expect(masked).toMatchObject({ text: '', hidden: true });
		expect(unknown).toMatchObject({ text: '', hidden: true });
	});
});

// =============================================================================
// Typst
// =============================================================================

describe('loi — Typst', () => {
	const count = (text: string, marker: string) => text.split(marker).length - 1;

	it('un tableau de deux lignes, en-têtes en mode math', () => {
		const typst = generateStatChartTypst(parseStatChartContent('loi', GAME));

		expect(typst).toContain('#table(');
		// 2 lignes × (en-tête + 3 valeurs)
		expect(count(typst, '// case')).toBe(8);
		expect(typst).toContain('$g_i$');
		expect(typst).toContain('$P(G = g_i)$');
	});

	it('indicateurs sous le tableau ; case masquée vide', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('loi', `${GAME}\nindicateurs: espérance\nmasquer: 5`)
		);

		expect(typst).toContain('#"E(G) = 0"');
		expect(typst).not.toContain('#"1/5"');
	});
});
