/**
 * `pnpm ecarts` — le registre unique des écarts (docs/ecarts/registre.md)
 * =======================================================================
 *
 * Gardé ici (scripts/ecarts/logique.ts) :
 * - une ligne = identifiant · type · domaine · constat · preuve · état ; une ligne
 *   mal formée est une erreur dite avec son numéro de ligne, jamais sautée ;
 * - la lettre de l'identifiant et le type vont ensemble (V = bug visible…) ;
 * - pas deux fois le même identifiant, ligne close comprise ;
 * - un nouveau numéro dépasse tout ce qui a existé : les lignes du registre ET la
 *   ligne « Derniers numéros » (les écarts fermés avant le registre n'y sont pas) ;
 * - preuve verte = au moins un test joué et tous verts ; aucun test trouvé, fichier
 *   absent, fichier qui ne se charge pas = preuve cassée, jamais verte ;
 * - une commande introuvable (126, 127) ou tuée est une preuve cassée, pas un rouge ;
 * - seules les lignes à preuve verte sont barrées ; une ligne déjà close, cassée ou
 *   « à la main » ne bouge pas ;
 * - avant d'écrire, le registre est relu : une ligne close ou dont la preuve a changé
 *   pendant le rejeu n'est pas barrée ; une ligne ajoutée entre-temps n'est pas perdue ;
 * - un ajout ne touche que la ligne « Derniers numéros » et la fin de la liste ; un
 *   retour à la ligne dans un champ, des fins de ligne Windows sont refusés ;
 * - le bilan sépare clos, toujours ouverts, preuves cassées et « à la main ».
 */

import { describe, it, expect } from 'vitest';
import {
	addEntry,
	commandOutcome,
	formatReport,
	idsToStrike,
	isVitestReport,
	nextId,
	parseArgs,
	parseRegistry,
	strikeEntries,
	vitestOutcome,
	type VitestReport
} from '../ecarts/logique.ts';

const REGISTRY = `# Registre des écarts

Derniers numéros : V71 · L36 · E52

## Écarts

- V35 · bug visible · mathAST · le i passe devant √3 · preuve : test tests/ecarts/mathast.test.ts › V35 · à faire (décision du 2026-11-03)
- L9 · bug latent · PDF · la police des fiches vient d'un chemin macOS · preuve : commande \`test -f static/fonts/stix.otf\` · à faire
- D6 · décision produit · grapheur · zoom au doigt · preuve : à la main · reporté
- ~~V12 · bug visible · mathAST · racine mal placée · preuve : à la main · à faire~~ · clos le 2026-11-20 (corrigé, #3000)
`;

const ROOT = '/depot';

function report(
	tests: Array<{ file: string; name: string; status: string }>,
	failedSuites: string[] = []
): VitestReport {
	const files = [...new Set([...tests.map((t) => t.file), ...failedSuites])];
	return {
		testResults: files.map((file) => ({
			name: `${ROOT}/${file}`,
			// Comme vitest : un seul test rouge met le fichier en échec.
			status:
				failedSuites.includes(file) || tests.some((t) => t.file === file && t.status === 'failed')
					? 'failed'
					: 'passed',
			assertionResults: tests
				.filter((t) => t.file === file)
				.map((t) => ({ fullName: t.name, status: t.status }))
		}))
	};
}

describe('parseRegistry', () => {
	it('lit les lignes ouvertes et closes', () => {
		const { entries, errors } = parseRegistry(REGISTRY);
		expect(errors).toEqual([]);
		expect(entries.map((e) => [e.id, e.closed])).toEqual([
			['V35', false],
			['L9', false],
			['D6', false],
			['V12', true]
		]);
		expect(entries[0]).toMatchObject({
			type: 'bug visible',
			domain: 'mathAST',
			finding: 'le i passe devant √3',
			proof: { kind: 'test', file: 'tests/ecarts/mathast.test.ts', name: 'V35' },
			state: 'à faire (décision du 2026-11-03)'
		});
		expect(entries[1].proof).toEqual({ kind: 'command', command: 'test -f static/fonts/stix.otf' });
		expect(entries[2].proof).toEqual({ kind: 'manual' });
		expect(entries[3].closing).toBe('clos le 2026-11-20 (corrigé, #3000)');
	});

	it('lit un test sans nom et un identifiant « bis »', () => {
		const { entries, errors } = parseRegistry(
			'- L28 bis · bug latent · mathAST · constat · preuve : test tests/ecarts/l28.test.ts · à faire\n'
		);
		expect(errors).toEqual([]);
		expect(entries[0].id).toBe('L28 bis');
		expect(entries[0].proof).toEqual({ kind: 'test', file: 'tests/ecarts/l28.test.ts' });
	});

	it('lit la ligne des derniers numéros', () => {
		expect(parseRegistry(REGISTRY).lastNumbers).toEqual({ V: 71, L: 36, E: 52 });
	});

	it.each([
		['champ manquant', '- V1 · bug visible · mathAST · constat · à faire'],
		['identifiant inconnu', '- X1 · bug visible · d · c · preuve : à la main · à faire'],
		[
			'type qui ne va pas avec la lettre',
			'- V1 · bug latent · d · c · preuve : à la main · à faire'
		],
		['preuve sans forme connue', '- V1 · bug visible · d · c · preuve : regarder · à faire'],
		[
			'test hors de tests/ecarts',
			'- V1 · bug visible · d · c · preuve : test src/a.test.ts · à faire'
		],
		['commande sans accents graves', '- V1 · bug visible · d · c · preuve : commande ls · à faire'],
		['champ vide', '- V1 · bug visible ·  · c · preuve : à la main · à faire'],
		['ligne barrée sans clôture', '- ~~V1 · bug visible · d · c · preuve : à la main · à faire~~']
	])('refuse : %s', (_cas, line) => {
		const { entries, errors } = parseRegistry(`# Titre\n\n${line}\n`);
		expect(entries).toEqual([]);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatch(/^ligne 3 : /);
	});

	it('refuse deux fois le même identifiant, ligne close comprise', () => {
		const { errors } = parseRegistry(
			`${REGISTRY}- V12 · bug visible · d · c · preuve : à la main · à faire\n`
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('V12');
	});

	it('refuse les fins de ligne Windows', () => {
		const { entries, errors } = parseRegistry(REGISTRY.replaceAll('\n', '\r\n'));
		expect(entries).toEqual([]);
		expect(errors).toHaveLength(1);
	});

	it('refuse deux lignes de derniers numéros', () => {
		expect(parseRegistry(`${REGISTRY}Derniers numéros : V80\n`).errors).toHaveLength(1);
	});

	it('ignore la prose et les titres', () => {
		expect(parseRegistry('# Titre\n\nDu texte · avec des points.\n').errors).toEqual([]);
	});
});

describe('nextId', () => {
	it('dépasse la ligne des derniers numéros', () => {
		expect(nextId(parseRegistry(REGISTRY), 'V')).toBe('V72');
	});

	it('dépasse les lignes du registre quand elles vont plus loin', () => {
		const registry = parseRegistry(
			`${REGISTRY}- E60 · vérification à l'écran · d · c · preuve : à la main · à faire\n`
		);
		expect(nextId(registry, 'E')).toBe('E61');
	});

	it('compte les lignes closes et les « bis »', () => {
		const registry = parseRegistry(
			'- ~~M4 · code mort · d · c · preuve : à la main · à faire~~ · clos le 2026-11-24\n' +
				'- M7 bis · code mort · d · c · preuve : à la main · à faire\n'
		);
		expect(nextId(registry, 'M')).toBe('M8');
	});

	it('commence à 1 pour une lettre jamais vue', () => {
		expect(nextId(parseRegistry(REGISTRY), 'C')).toBe('C1');
	});
});

describe('addEntry', () => {
	const input = { letter: 'V', domain: 'mathAST', finding: 'un constat', proof: 'à la main' };

	it('ajoute la ligne à la fin et met à jour les derniers numéros', () => {
		const added = addEntry(REGISTRY, input);
		expect(added.ok).toBe(true);
		if (!added.ok) return;
		expect(added.id).toBe('V72');
		expect(added.text).toContain('Derniers numéros : V72 · L36 · E52');
		expect(added.text.trimEnd().split('\n').at(-1)).toBe(
			'- V72 · bug visible · mathAST · un constat · preuve : à la main · à faire'
		);
		expect(parseRegistry(added.text).errors).toEqual([]);
	});

	it('ajoute une lettre absente de la ligne des derniers numéros', () => {
		const added = addEntry(REGISTRY, { ...input, letter: 'C' });
		expect(added.ok && added.text).toContain('Derniers numéros : V71 · L36 · E52 · C1');
	});

	it('refuse une preuve mal formée sans rien écrire', () => {
		const added = addEntry(REGISTRY, { ...input, proof: 'regarder' });
		expect(added.ok).toBe(false);
	});

	it('refuse un constat qui contient le séparateur', () => {
		expect(addEntry(REGISTRY, { ...input, finding: 'a · b' }).ok).toBe(false);
	});

	it("refuse d'ajouter à un registre mal formé", () => {
		expect(addEntry('- n’importe quoi\n', input).ok).toBe(false);
	});

	it('refuse un registre sans ligne des derniers numéros', () => {
		expect(addEntry('# Registre\n', input).ok).toBe(false);
	});

	it('refuse un retour à la ligne dans un champ', () => {
		expect(addEntry(REGISTRY, { ...input, finding: 'a\nb' }).ok).toBe(false);
		expect(addEntry(REGISTRY, { ...input, domain: 'a\rb' }).ok).toBe(false);
	});

	it('liste vide : la ligne va sous le titre « ## Écarts »', () => {
		const added = addEntry('# R\n\nDerniers numéros : V4\n\n## Écarts\n', input);
		expect(added.ok && added.text).toBe(
			'# R\n\nDerniers numéros : V5\n\n## Écarts\n\n- V5 · bug visible · mathAST · un constat · preuve : à la main · à faire\n'
		);
	});

	it('sans liste ni titre « ## Écarts » : refusé', () => {
		expect(addEntry('# R\n\nDerniers numéros : V4\n', input).ok).toBe(false);
	});

	it('la prose après la liste et la fin du fichier ne bougent pas', () => {
		const text = `${REGISTRY}\n## Notes\n\nDu texte.\n\n`;
		const added = addEntry(text, input);
		expect(added.ok).toBe(true);
		if (!added.ok) return;
		expect(
			added.text.endsWith(
				'~~ · clos le 2026-11-20 (corrigé, #3000)\n- V72 · bug visible · mathAST · un constat · preuve : à la main · à faire\n\n## Notes\n\nDu texte.\n\n'
			)
		).toBe(true);
	});
});

describe('vitestOutcome', () => {
	const proof = { kind: 'test', file: 'tests/ecarts/mathast.test.ts', name: 'V35' } as const;
	const file = proof.file;

	it('rouge : un test du nom échoue', () => {
		const r = report([
			{ file, name: 'mathAST V35 forme a', status: 'passed' },
			{ file, name: 'mathAST V35 forme b', status: 'failed' }
		]);
		expect(vitestOutcome(r, proof, ROOT)).toBe('red');
	});

	it('verte : tous les tests du nom passent, les autres ne comptent pas', () => {
		const r = report([
			{ file, name: 'mathAST V35 forme a', status: 'passed' },
			{ file, name: 'mathAST V17', status: 'failed' }
		]);
		expect(vitestOutcome(r, proof, ROOT)).toBe('green');
	});

	it('ne confond pas V3 et V35', () => {
		const r = report([{ file, name: 'mathAST V35 forme a', status: 'passed' }]);
		expect(vitestOutcome(r, { ...proof, name: 'V3' }, ROOT)).toBe('broken');
	});

	it('sans nom : tout le fichier', () => {
		const r = report([
			{ file, name: 'a', status: 'passed' },
			{ file, name: 'b', status: 'failed' }
		]);
		expect(vitestOutcome(r, { kind: 'test', file }, ROOT)).toBe('red');
	});

	it.each([
		['fichier absent du compte rendu', report([])],
		['aucun test de ce nom', report([{ file, name: 'mathAST V17', status: 'passed' }])],
		['tests sautés seulement', report([{ file, name: 'mathAST V35', status: 'skipped' }])],
		['fichier qui ne se charge pas', report([], [file])],
		[
			'fichier en échec hors des tests',
			report([{ file, name: 'mathAST V35', status: 'passed' }], [file])
		]
	])('cassée : %s', (_cas, r) => {
		expect(vitestOutcome(r, proof, ROOT)).toBe('broken');
	});
});

describe('commandOutcome', () => {
	it.each([
		[0, null, 'green'],
		[1, null, 'red'],
		[2, null, 'red'],
		[126, null, 'broken'],
		[127, null, 'broken'],
		[null, 'SIGTERM', 'broken'],
		[null, null, 'broken']
	] as const)('sortie %s, signal %s → %s', (status, signal, expected) => {
		expect(commandOutcome(status, signal)).toBe(expected);
	});
});

describe('strikeEntries', () => {
	it('barre les lignes demandées et elles seules', () => {
		const text = strikeEntries(REGISTRY, ['L9'], '2026-11-25', 'preuve verte');
		const { entries, errors } = parseRegistry(text);
		expect(errors).toEqual([]);
		expect(entries.filter((e) => e.closed).map((e) => e.id)).toEqual(['L9', 'V12']);
		expect(text).toContain(
			"- ~~L9 · bug latent · PDF · la police des fiches vient d'un chemin macOS · preuve : commande `test -f static/fonts/stix.otf` · à faire~~ · clos le 2026-11-25 (preuve verte)"
		);
	});

	it('ne touche pas une ligne déjà close ni un identifiant inconnu', () => {
		expect(strikeEntries(REGISTRY, ['V12', 'V99'], '2026-11-25', 'preuve verte')).toBe(REGISTRY);
	});
});

describe('idsToStrike', () => {
	const { entries } = parseRegistry(REGISTRY);
	const l9 = entries[1];
	const green = [{ entry: l9, outcome: 'green' as const }];

	it('garde une preuve verte encore ouverte et inchangée', () => {
		expect(idsToStrike(green, parseRegistry(REGISTRY))).toEqual(['L9']);
	});

	it('ne garde ni rouge, ni cassée, ni à la main', () => {
		const results = (['red', 'broken', 'manual'] as const).map((outcome) => ({
			entry: l9,
			outcome
		}));
		expect(idsToStrike(results, parseRegistry(REGISTRY))).toEqual([]);
	});

	it('écarte une ligne close, disparue ou dont la preuve a changé pendant le rejeu', () => {
		const closed = strikeEntries(REGISTRY, ['L9'], '2026-11-25', 'corrigé');
		expect(idsToStrike(green, parseRegistry(closed))).toEqual([]);
		expect(idsToStrike(green, parseRegistry('# vide\n'))).toEqual([]);
		const changed = REGISTRY.replace('stix.otf', 'autre.otf');
		expect(idsToStrike(green, parseRegistry(changed))).toEqual([]);
	});
});

describe('isVitestReport', () => {
	it('accepte un compte rendu, refuse un JSON tronqué', () => {
		expect(isVitestReport(report([{ file: 'a', name: 'n', status: 'passed' }]))).toBe(true);
		expect(isVitestReport({ testResults: [] })).toBe(true);
		expect(isVitestReport({ testResults: {} })).toBe(false);
		expect(isVitestReport({ testResults: [{ name: 'a' }] })).toBe(false);
		expect(isVitestReport(null)).toBe(false);
	});
});

describe('formatReport', () => {
	const { entries } = parseRegistry(REGISTRY);
	const [v35, l9, d6] = entries;

	it('sépare clos, ouverts, cassées et à la main', () => {
		const text = formatReport([
			{ entry: v35, outcome: 'red' },
			{ entry: l9, outcome: 'green' },
			{ entry: d6, outcome: 'manual' },
			{ entry: { ...v35, id: 'V40' }, outcome: 'broken', detail: 'aucun test trouvé' }
		]);
		expect(text).toMatch(/Preuves vertes \(1\)[^]*L9/);
		expect(text).toMatch(/Preuves cassées \(1\)[^]*V40[^]*aucun test trouvé/);
		expect(text).toMatch(/Toujours ouverts \(1\)[^]*V35/);
		expect(text).toMatch(/À la main, jamais rejoués \(1\)[^]*D6/);
	});

	it('dit quand il n’y a rien à rejouer', () => {
		expect(formatReport([])).toContain('Aucun écart ouvert');
	});
});

describe('parseArgs', () => {
	it('sans argument : la liste', () => {
		expect(parseArgs([])).toEqual({ command: 'list' });
	});

	it('rejouer, avec identifiants et --barrer', () => {
		expect(parseArgs(['rejouer'])).toEqual({ command: 'replay', ids: [], strike: false });
		expect(parseArgs(['rejouer', 'V35', 'L28 bis', '--barrer'])).toEqual({
			command: 'replay',
			ids: ['V35', 'L28 bis'],
			strike: true
		});
	});

	it('ajouter', () => {
		expect(
			parseArgs(['ajouter', 'V', '--domaine', 'mathAST', '--constat', 'c', '--preuve', 'à la main'])
		).toEqual({
			command: 'add',
			input: { letter: 'V', domain: 'mathAST', finding: 'c', proof: 'à la main' }
		});
		expect(
			parseArgs([
				'ajouter',
				'V',
				'--domaine',
				'd',
				'--constat',
				'c',
				'--preuve',
				'à la main',
				'--etat',
				'en attente'
			])
		).toMatchObject({ input: { state: 'en attente' } });
	});

	it.each([
		[['rejoue']],
		[['rejouer', '--barer']],
		[['ajouter', 'V', '--domaine', 'd']],
		[['ajouter', 'Z', '--domaine', 'd', '--constat', 'c', '--preuve', 'à la main']],
		[['ajouter', 'V', '--domaine', 'd', '--constat', 'c', '--preuve']],
		[['--liste']]
	])('une faute de frappe affiche l’usage : %j', (args) => {
		expect(parseArgs(args)).toBeNull();
	});
});
