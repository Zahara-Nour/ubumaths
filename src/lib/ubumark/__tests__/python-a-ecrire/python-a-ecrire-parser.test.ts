/**
 * Bloc ```python-a-ecrire : parseur (outil 49, chantier `outil-python`)
 *
 * Clés `fonction:`, `depart:`, `solution:`, `essais:`, `exiger:` ; `depart:` et `solution:`
 * en bloc littéral (`|`, lignes en retrait, retrait commun retiré).
 */

import { describe, it, expect } from 'vitest';
import {
	findPythonsAEcrire,
	hasPythonAEcrire,
	parsePythonAEcrireContent
} from '#lib/ubumark/parser/python-a-ecrire-parser.ts';
import { parseMarkdown } from '#lib/ubumark/index.ts';
import { generateTypst } from '#lib/ubumark/generators/typst-generator.ts';

const SOURCE = [
	'fonction: seuil',
	'depart: |',
	'  def seuil(A):',
	'      u = 2',
	'      n = 0',
	'      while ...:',
	'          ...',
	'      return n',
	'solution: |',
	'  def seuil(A):',
	'      u = 2',
	'      n = 0',
	'',
	'      while u <= A:',
	'          u = 1.5 * u',
	'          n = n + 1',
	'      return n',
	'essais: seuil(2) ; seuil(100) ; seuil(10000)',
	'exiger: boucle'
].join('\n');

const errorsOf = (source: string) => parsePythonAEcrireContent(source).errors.map((e) => e.message);

describe('parseur du bloc python-a-ecrire', () => {
	it('lit la fonction, le départ, la solution (retrait retiré, ligne vide gardée), les essais et les exigences', () => {
		const node = parsePythonAEcrireContent(SOURCE);
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			fonction: 'seuil',
			depart: [
				'def seuil(A):',
				'    u = 2',
				'    n = 0',
				'    while ...:',
				'        ...',
				'    return n'
			].join('\n'),
			solution: [
				'def seuil(A):',
				'    u = 2',
				'    n = 0',
				'',
				'    while u <= A:',
				'        u = 1.5 * u',
				'        n = n + 1',
				'    return n'
			].join('\n'),
			essais: ['seuil(2)', 'seuil(100)', 'seuil(10000)'],
			exiger: ['boucle']
		});
	});

	it('`départ` avec accent, `exiger` à deux exigences, sans départ ni exigence', () => {
		const avecAccent = parsePythonAEcrireContent(
			SOURCE.replace('depart: |', 'départ: |').replace(
				'exiger: boucle',
				'exiger: boucle, sans print'
			)
		);
		expect(avecAccent.errors).toEqual([]);
		expect(avecAccent.spec?.exiger).toEqual(['boucle', 'sans print']);
		const minimal = parsePythonAEcrireContent(
			[
				'fonction: f',
				'solution: |',
				'  def f(x):',
				'      return 2 * x',
				'essais: f(1) ; f(-3)'
			].join('\n')
		);
		expect(minimal.errors).toEqual([]);
		expect(minimal.spec).toMatchObject({ depart: '', exiger: [], essais: ['f(1)', 'f(-3)'] });
	});

	it('`case: N` posée par le générateur', () => {
		expect(parsePythonAEcrireContent(`case: 0\n${SOURCE}`).caseIndex).toBe(0);
	});

	it('fonction, solution ou essais manquants : erreurs d’auteur', () => {
		const sans = (cle: string) =>
			errorsOf(
				SOURCE.split('\n')
					.filter((line, k, all) => {
						// La clé et ses lignes en retrait
						const start = all.findIndex((l) => l.startsWith(`${cle}:`));
						if (start < 0) return true;
						let end = start + 1;
						while (end < all.length && (all[end].startsWith(' ') || all[end] === '')) end++;
						return k < start || k >= end;
					})
					.join('\n')
			).join(' ');
		expect(sans('fonction')).toMatch(/il manque la ligne fonction:/);
		expect(sans('solution')).toMatch(/il manque la solution/);
		expect(sans('essais')).toMatch(/il manque la ligne essais:/);
	});

	it('un essai qui n’appelle pas la fonction, une solution qui ne la définit pas : refusés', () => {
		expect(errorsOf(SOURCE.replace('seuil(100)', 'rang(100)')).join(' ')).toMatch(
			/essai « rang\(100\) » n’appelle pas la fonction seuil/
		);
		expect(errorsOf(SOURCE.replace('fonction: seuil', 'fonction: rang')).join(' ')).toMatch(
			/la solution ne définit pas la fonction rang/
		);
		expect(errorsOf(SOURCE.replace('fonction: seuil', 'fonction: 2seuil')).join(' ')).toMatch(
			/nom de fonction Python/
		);
	});

	it('exigence inconnue, clé inconnue, clé répétée : refusées', () => {
		expect(errorsOf(SOURCE.replace('exiger: boucle', 'exiger: récursif')).join(' ')).toMatch(
			/exigence « récursif » inconnue \(exigences possibles : boucle, sans print\)/
		);
		expect(errorsOf(`${SOURCE}\nniveau: 3e`).join(' ')).toMatch(/clé « niveau » inconnue/);
		expect(errorsOf(`${SOURCE}\nfonction: seuil`).join(' ')).toMatch(/déjà donnée ligne 1/);
	});

	it('repérage dans un énoncé, bloc en retrait signalé', () => {
		const enonce = `Écris la fonction.\n\n\`\`\`python-a-ecrire\n${SOURCE}\n\`\`\``;
		expect(hasPythonAEcrire(enonce)).toBe(true);
		expect(findPythonsAEcrire(enonce)).toEqual([
			expect.objectContaining({ startIndex: 2, closed: true, nested: false })
		]);
		expect(
			findPythonsAEcrire(`- Écris :\n\n  \`\`\`python-a-ecrire\n  fonction: f\n  \`\`\``)
		).toEqual([expect.objectContaining({ nested: true })]);
		expect(hasPythonAEcrire('```python\nprint(1)\n```')).toBe(false);
	});

	it('parseMarkdown : un nœud python-a-ecrire, pas un bloc de code', () => {
		const doc = parseMarkdown(`Écris.\n\n\`\`\`python-a-ecrire\n${SOURCE}\n\`\`\`\n\nFin.`);
		const node = doc.children.find((n) => n.type === 'python-a-ecrire');
		expect(node).toMatchObject({ type: 'python-a-ecrire', errors: [] });
		expect(doc.children.at(-1)).toMatchObject({ type: 'paragraph' });
	});
});

describe('bloc python-a-ecrire → Typst', () => {
	it('le départ en bloc de code, jamais la solution', () => {
		const source = generateTypst(parseMarkdown(`\`\`\`python-a-ecrire\n${SOURCE}\n\`\`\``));
		expect(source).toContain('```python\ndef seuil(A):\n    u = 2');
		expect(source).not.toContain('while u <= A');
	});

	it('sans départ : la fonction à écrire ; en erreur : cadre neutre', () => {
		const sansDepart = SOURCE.split('\n')
			.filter((_, k) => k < 1 || k > 7)
			.join('\n');
		expect(generateTypst(parseMarkdown(`\`\`\`python-a-ecrire\n${sansDepart}\n\`\`\``))).toContain(
			'Écris en Python la fonction #raw("seuil")'
		);
		expect(generateTypst(parseMarkdown('```python-a-ecrire\nfonction: f\n```'))).toContain(
			'Programme Python indisponible'
		);
	});
});
