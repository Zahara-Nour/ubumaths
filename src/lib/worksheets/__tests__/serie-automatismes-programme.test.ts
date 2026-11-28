/**
 * Série d'automatismes : question à programme (tortue, calcul ; chantier `blockly`, PR 5 ;
 * Python, outil 49)
 * et robot à produire (chantier `suite-fleches`, PR 1b)
 * ======================================================================================
 *
 * Un programme se fait à l'écran : une question à programme n'entre pas dans une série
 * d'automatismes (tranché par David le 2026-11-14). Le refus le dit au prof, au lieu de
 * « 0 case(s) dans l'énoncé pour 1 réponse(s) ». Un robot à produire, lui, se fait sur papier : le
 * quadrillage et 15 cases à l'énoncé, un code juste au corrigé.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { buildSerie } from '../serie-automatismes';

function modele(id: string, statement: string): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['5'],
		level: 1,
		status: 'draft',
		variations: [{ statement: templateMarkdown(statement) }]
	} as unknown as QuestionTemplate;
}

const MODELES = new Map([
	['tortue', modele('tortue', 'Trace.\n\n```tortue\nattendu: avancer 3\n```')],
	['calcul', modele('calcul', 'Programme.\n\n```calcul\nattendu: afficher nombre + 2\n```')],
	[
		'python',
		modele(
			'python',
			'Écris.\n\n```python-a-ecrire\nfonction: f\nsolution: |\n  def f(x):\n      return x\nessais: f(1)\n```'
		)
	]
]);

describe('buildSerie — question à programme', () => {
	it.each(['tortue', 'calcul', 'python'])('%s : refusée avec un message clair', (id) => {
		expect(() => buildSerie(MODELES, [{ templateId: id, seed: 1 }])).toThrow(
			`${id} : une question à programme (tortue, calcul, Python) ne peut pas entrer dans une série d’automatismes`
		);
	});
});

describe('buildSerie — robot à produire', () => {
	const robot = (...lignes: string[]) =>
		new Map([
			[
				'robot',
				modele('robot', ['Code.', '', '```robot', ...lignes, 'produire: oui', '```'].join('\n'))
			]
		]);

	it('énoncé : le bloc sans case: (le PDF dessine le quadrillage et 15 cases)', () => {
		const serie = buildSerie(robot('quadrillage: 8 x 5', 'départ: 2, 1', 'arrivée: 6, 4'), [
			{ templateId: 'robot', seed: 1 }
		]);
		expect(serie.statement).toContain('```robot');
		expect(serie.statement).toContain('produire: oui');
		expect(serie.statement).not.toMatch(/case\s*:/);
	});

	it('corrigé : le quadrillage seul, puis le CODE juste (jamais la scène de la réponse attendue)', () => {
		const serie = buildSerie(robot('quadrillage: 8 x 5', 'départ: 2, 1', 'arrivée: 6, 4'), [
			{ templateId: 'robot', seed: 1 }
		]);
		expect(serie.solution).toContain('```robot');
		expect(serie.solution).not.toContain('produire');
		const code = /Un code juste : \*\*(.+)\*\*/.exec(serie.solution)?.[1];
		expect(code).toBeDefined();
		expect(code).not.toContain('|');
		expect(code).not.toContain('8x5');
		// Le plus court : 4 cases à droite, 3 en haut, dans un ordre ou l'autre
		expect(code!.split(' ').sort()).toEqual(['↑', '↑', '↑', '→', '→', '→', '→'].sort());
		// Le code vient APRÈS la fin du bloc
		expect(serie.solution.indexOf('Un code juste')).toBeGreaterThan(
			serie.solution.lastIndexOf('```')
		);
	});

	it('deux robots dans une question : deux cases, chacun son code juste, dans l’ordre', () => {
		const deux = new Map([
			[
				'deux',
				modele(
					'deux',
					[
						'Code.',
						'',
						'```robot',
						'quadrillage: 8 x 5',
						'départ: 1, 1',
						'arrivée: 4, 1',
						'produire: oui',
						'```',
						'',
						'```robot',
						'quadrillage: 8 x 5',
						'départ: 1, 1',
						'arrivée: 1, 3',
						'produire: oui',
						'```'
					].join('\n')
				)
			]
		]);
		const serie = buildSerie(deux, [{ templateId: 'deux', seed: 1 }]);
		expect(serie.statement.match(/```robot/g)).toHaveLength(2);
		expect(serie.statement).not.toMatch(/case\s*:/);
		const codes = [...serie.solution.matchAll(/Un code juste : \*\*(.+)\*\*/g)].map((m) => m[1]);
		expect(codes).toEqual(['→ → →', '↑ ↑']);
	});

	it('robot après un texte à trous : les cases comptent ensemble, le robot a SA réponse', () => {
		const mixte = new Map([
			[
				'mixte',
				modele(
					'mixte',
					[
						'Complète.',
						'',
						'```trous',
						'$2$ est [pair], $7$ est [impair].',
						'intrus: premier',
						'```',
						'',
						'```robot',
						'quadrillage: 8 x 5',
						'départ: 1, 1',
						'arrivée: 4, 1',
						'produire: oui',
						'```'
					].join('\n')
				)
			]
		]);
		const serie = buildSerie(mixte, [{ templateId: 'mixte', seed: 1 }]);
		expect(serie.solution).toContain('1 → pair ; 2 → impair');
		expect(serie.solution).toContain('Un code juste : **→ → →**');
	});

	it('avance-pivote : le code juste en mots', () => {
		const serie = buildSerie(
			robot('quadrillage: 8 x 5', 'codage: avance-pivote', 'départ: 2, 1, droite', 'arrivée: 6, 1'),
			[{ templateId: 'robot', seed: 1 }]
		);
		expect(serie.solution).toContain('Un code juste : **avance de 4**');
	});
});

describe('buildSerie — labyrinthe à parcourir (chantier `labyrinthe`)', () => {
	const labyrinthe = new Map([
		[
			'labyrinthe',
			modele(
				'labyrinthe',
				[
					'Trouve la sortie.',
					'',
					'```labyrinthe',
					'grille: 5 x 4',
					'règle: premier',
					'parcourir: oui',
					'```'
				].join('\n')
			)
		]
	]);

	it('énoncé : la grille sans case: ; corrigé : le bon chemin teinté et sa sortie, même grille', () => {
		const serie = buildSerie(labyrinthe, [{ templateId: 'labyrinthe', seed: 1 }]);
		expect(serie.statement).toContain('```labyrinthe');
		expect(serie.statement).not.toMatch(/case\s*:/);
		const graine = /graine: (\d+)/.exec(serie.statement)?.[1];
		expect(graine).toBeDefined();
		expect(serie.solution).toContain(`graine: ${graine}`);
		expect(serie.solution).toContain('solution: oui');
		expect(serie.solution).not.toContain('parcourir');
		expect(serie.solution).toMatch(/\*\*Sortie \d : \d+( → \d+)+\*\*/);
		expect(serie.solution.indexOf('Sortie')).toBeGreaterThan(serie.solution.lastIndexOf('```'));
	});
});

describe('buildSerie — labyrinthe avec `solution: non` écrite par l’auteur', () => {
	it('le corrigé n’a qu’une ligne solution: (sinon « Labyrinthe indisponible »)', () => {
		const modeles = new Map([
			[
				'lab',
				modele(
					'lab',
					[
						'```labyrinthe',
						'grille: 4 x 3',
						'règle: premier',
						'parcourir: oui',
						'solution: non',
						'```'
					].join('\n')
				)
			]
		]);
		const serie = buildSerie(modeles, [{ templateId: 'lab', seed: 1 }]);
		expect(serie.solution.match(/solution\s*:/g)).toEqual(['solution:']);
		expect(serie.solution).toContain('solution: oui');
	});
});

describe('buildSerie — grille yohaku à remplir (chantier `outil-yohaku`)', () => {
	const yohaku = new Map([
		[
			'yohaku',
			modele(
				'yohaku',
				[
					'Remplis la grille.',
					'',
					'```yohaku',
					'opération: produit',
					'ligne: [x+2] | [x+3]',
					'ligne: [2x+1] | x+1',
					'```'
				].join('\n')
			)
		]
	]);

	it('énoncé : le bloc sans case: ni solution: ; corrigé : solution: oui, une seule fois', () => {
		const serie = buildSerie(yohaku, [{ templateId: 'yohaku', seed: 1 }]);
		expect(serie.statement).toContain('```yohaku');
		expect(serie.statement).not.toMatch(/case\s*:/);
		expect(serie.statement).not.toContain('solution');
		expect(serie.solution).toContain('solution: oui');
		expect(serie.solution.match(/solution\s*:/g)).toEqual(['solution:']);
		expect(serie.solution).not.toMatch(/case\s*:/);
	});

	it('`solution: non` écrite par l’auteur : le corrigé n’a qu’une ligne solution:', () => {
		const modeles = new Map([
			[
				'y',
				modele('y', '```yohaku\nopération: somme\nligne: [x] | 2\nligne: 3 | 4\nsolution: non\n```')
			]
		]);
		const serie = buildSerie(modeles, [{ templateId: 'y', seed: 1 }]);
		expect(serie.solution.match(/solution\s*:/g)).toEqual(['solution:']);
		expect(serie.solution).toContain('solution: oui');
	});
});
