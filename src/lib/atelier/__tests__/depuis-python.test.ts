/**
 * « Ouvrir dans l'atelier » depuis Python — le sens inverse du pont
 * (phase 0 `docs/wip/python-vers-atelier-phase0.md`, validée par David le 2026-10-25).
 *
 * Trois étages : ce que le menu propose pour une liste rapportée par Python
 * (`offerOf`), la boîte aux lettres à usage unique (`postToAtelier`,
 * `takeFromPython`), et l'atelier éphémère qu'ouvre `/atelier?depuis-python=`.
 */

import { describe, it, expect } from 'vitest';
import { offerOf, type PythonListReport } from '../from-python';
import { postToAtelier, takeFromPython, PYTHON_MAILBOX_PREFIX } from '../python-mailbox';
import { openLink } from '../grapheur-link';
import { isList, isQualitative, type ListObject } from '../types';

// =============================================================================
// Décor
// =============================================================================

/** Un `Storage` en mémoire : la boîte aux lettres ne dépend pas du navigateur. */
class MemoryStorage implements Storage {
	private map = new Map<string, string>();
	get length() {
		return this.map.size;
	}
	clear() {
		this.map.clear();
	}
	getItem(key: string) {
		return this.map.get(key) ?? null;
	}
	key(index: number) {
		return [...this.map.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.map.delete(key);
	}
	setItem(key: string, value: string) {
		this.map.set(key, value);
	}
}

function report(name: string, items: (number | string)[]): PythonListReport {
	return { name, length: items.length, distinct: new Set(items).size, items };
}

function counted(name: string, counts: [number | string, number][]): PythonListReport {
	const length = counts.reduce((sum, [, count]) => sum + count, 0);
	return { name, length, distinct: counts.length, counts };
}

function refusalOf(r: PythonListReport): string {
	const offer = offerOf(r);
	if (offer.kind !== 'refused') throw new Error(`accepté : ${offer.label}`);
	return offer.message;
}

/** Déposer, puis ouvrir l'adresse rendue comme `/atelier` l'ouvrirait. */
async function openedFrom(r: PythonListReport, storage = new MemoryStorage()) {
	const offer = offerOf(r);
	if (offer.kind === 'refused') throw new Error(`refusé : ${offer.message}`);
	const url = postToAtelier(offer.lists, storage);
	if (url === null) throw new Error('boîte aux lettres indisponible');
	const params = new URL(url, 'https://www.chiph.re').searchParams;
	return { link: await openLink(params, storage), url, storage };
}

function listsOf(link: Awaited<ReturnType<typeof openLink>>): ListObject[] {
	if (link.kind !== 'received') throw new Error(`pas reçu : ${JSON.stringify(link)}`);
	return link.atelier.objects.filter(isList);
}

// =============================================================================
// Ce que le menu propose
// =============================================================================

describe('offerOf — une liste du programme', () => {
	it('lancers = [3, 5, 1] : une liste, nommée par sa taille', () => {
		const offer = offerOf(report('lancers', [3, 5, 1]));

		expect(offer.kind).toBe('list');
		if (offer.kind !== 'list') return;
		expect(offer.label).toBe('lancers (3 valeurs)');
		expect(offer.lists).toEqual([{ title: 'lancers', definition: '3 ; 5 ; 1' }]);
	});

	it('une seule valeur : au singulier', () => {
		const offer = offerOf(report('seuil', [12]));
		expect(offer.kind === 'list' && offer.label).toBe('seuil (1 valeur)');
	});

	it('un nom d’atelier valide (L) est gardé, sans titre', () => {
		const offer = offerOf(report('L', [1, 2]));
		expect(offer.kind === 'list' && offer.lists).toEqual([{ name: 'L', definition: '1 ; 2' }]);
	});

	it('un nom réservé de l’atelier (x, n) devient un titre', () => {
		const offer = offerOf(report('x', [1, 2]));
		expect(offer.kind === 'list' && offer.lists).toEqual([{ title: 'x', definition: '1 ; 2' }]);
	});

	it('les flottants passent tels que Python les écrit, sans arrondi', () => {
		const offer = offerOf(report('L', [0.1 + 0.2, -3, 2.5]));
		expect(offer.kind === 'list' && offer.lists[0].definition).toBe(
			'0.30000000000000004 ; -3 ; 2.5'
		);
	});

	it('des mots passent tels quels', () => {
		const offer = offerOf(report('tirages', ['P', 'F', 'P']));
		expect(offer.kind === 'list' && offer.lists[0].definition).toBe('P ; F ; P');
		expect(offer.kind === 'list' && offer.label).toBe('tirages (3 valeurs)');
	});
});

describe('offerOf — plus de 200 valeurs : ses effectifs (Q3)', () => {
	it('1 000 lancers de dé : deux listes, valeurs croissantes et effectifs', () => {
		const offer = offerOf(
			counted('lancers', [
				[3, 170],
				[1, 160],
				[6, 168],
				[2, 172],
				[5, 165],
				[4, 165]
			])
		);

		expect(offer.kind).toBe('counts');
		if (offer.kind !== 'counts') return;
		expect(offer.label).toBe('lancers : ses effectifs (1000 valeurs, 6 différentes)');
		expect(offer.lists).toEqual([
			{ title: 'lancers (valeurs)', definition: '1 ; 2 ; 3 ; 4 ; 5 ; 6' },
			{ title: 'lancers (effectifs)', definition: '160 ; 172 ; 170 ; 165 ; 165 ; 168' }
		]);
	});

	it('des mots gardent l’ordre de leur première apparition', () => {
		const offer = offerOf(
			counted('pieces', [
				['P', 520],
				['F', 480]
			])
		);
		expect(offer.kind === 'counts' && offer.lists[0].definition).toBe('P ; F');
	});

	it('plus de 200 valeurs et plus de 20 différentes : refus avec les chiffres', () => {
		expect(refusalOf({ name: 'L', length: 1000, distinct: 731 })).toBe(
			'« L » a 1000 valeurs : l’atelier en lit au plus 200, ou ses effectifs s’il y a au plus 20 valeurs différentes (elle en a 731).'
		);
	});
});

describe('offerOf — refus, avec leur raison', () => {
	it('liste vide', () => {
		expect(refusalOf(report('L', []))).toBe('« L » est vide.');
	});

	it('booléens', () => {
		expect(refusalOf({ name: 'L', length: 2, distinct: 0, problem: { kind: 'bool' } })).toBe(
			'« L » contient des booléens (True, False) : l’atelier ne lit que des nombres et des mots.'
		);
	});

	it('entier trop grand pour rester exact', () => {
		expect(refusalOf({ name: 'L', length: 1, distinct: 0, problem: { kind: 'big-int' } })).toBe(
			'« L » contient un entier trop grand (au-delà de 2⁵³) : l’atelier ne le garderait pas exact.'
		);
	});

	it('nan ou inf', () => {
		expect(refusalOf({ name: 'L', length: 1, distinct: 0, problem: { kind: 'not-finite' } })).toBe(
			'« L » contient nan ou inf : ce ne sont pas des nombres pour l’atelier.'
		);
	});

	it('autre chose (liste imbriquée, None) : le type est nommé', () => {
		expect(
			refusalOf({
				name: 'L',
				length: 2,
				distinct: 0,
				problem: { kind: 'other', type: 'NoneType' }
			})
		).toBe(
			'« L » contient un élément de type NoneType : l’atelier ne lit que des nombres et des mots.'
		);
	});

	it('un texte avec « ; » ou un retour à la ligne', () => {
		expect(refusalOf(report('L', ['a;b']))).toBe(
			'« L » contient un texte avec « ; » ou un retour à la ligne : l’atelier y verrait deux valeurs.'
		);
		expect(refusalOf(report('L', ['a\nb']))).toContain('retour à la ligne');
	});

	it('une liste trop longue à écrire : arrondir en Python', () => {
		const floats = Array.from({ length: 200 }, (_, i) => 0.123456789012345 + i * 1e-12);
		expect(refusalOf(report('L', floats))).toBe(
			'« L » s’écrit en plus de 4000 caractères (ses nombres ont beaucoup de décimales) : arrondis-les en Python, par exemple round(x, 3).'
		);
	});
});

describe('offerOf — revue : ce que l’atelier refuserait ou lirait autrement à l’arrivée', () => {
	it('plus de 20 modalités : refusée au menu, pas à l’arrivée', () => {
		const mots = Array.from({ length: 30 }, (_, i) => `a${i}`);
		expect(refusalOf(report('mots', mots))).toBe(
			'« mots » a 30 modalités : une liste de mots en a au plus 20 dans l’atelier.'
		);
	});

	it('les modalités se comptent comme l’atelier : sans la casse ni les espaces', () => {
		const mots = Array.from({ length: 20 }, (_, i) => `m${i}`);
		const offer = offerOf(report('L', [...mots, 'M0', ' m1 ']));
		expect(offer.kind).toBe('list');
	});

	it('un mot de plus de 40 caractères', () => {
		expect(refusalOf(report('L', ['x'.repeat(41)]))).toBe(
			'« L » contient un mot de plus de 40 caractères : l’atelier ne le garde pas comme modalité.'
		);
		expect(
			refusalOf({ name: 'L', length: 1, distinct: 0, problem: { kind: 'long-text' } })
		).toContain('plus de 40 caractères');
	});

	it('un texte qui se lit comme un nombre : écrire le nombre sans guillemets', () => {
		expect(refusalOf(report('L', ['12', 'a']))).toBe(
			'« L » contient le texte « 12 », que l’atelier lirait comme un nombre : écris-le sans guillemets.'
		);
		expect(refusalOf(report('L', ['0x10']))).toContain('« 0x10 »');
	});

	it('un texte vide, ou sans lettre', () => {
		expect(refusalOf(report('L', ['a', ' ']))).toBe(
			'« L » contient un texte vide : l’atelier y verrait une case vide.'
		);
		expect(refusalOf(report('L', ['?']))).toBe(
			'« L » contient le texte « ? », qui n’est ni un nombre ni un mot.'
		);
	});

	it('un texte avec une virgule', () => {
		expect(refusalOf(report('L', ['rouge, vert']))).toBe(
			'« L » contient un texte avec une virgule : l’atelier la lirait comme un séparateur.'
		);
	});

	it('effectifs de mots : P et p sont une même modalité, comptée une fois', () => {
		const offer = offerOf(
			counted('L', [
				['P', 150],
				['F', 50],
				['p ', 100]
			])
		);
		expect(offer.kind === 'counts' && offer.lists).toEqual([
			{ title: 'L (valeurs)', definition: 'P ; F' },
			{ title: 'L (effectifs)', definition: '250 ; 50' }
		]);
	});

	it('plus d’un million de valeurs : refus', () => {
		expect(
			refusalOf({ name: 'L', length: 2_000_000, distinct: 0, problem: { kind: 'too-long' } })
		).toBe('« L » a plus d’un million de valeurs : trop pour l’atelier.');
	});
});

// =============================================================================
// La boîte aux lettres
// =============================================================================

describe('boîte aux lettres à usage unique (Q4)', () => {
	it('dépose sous une clé neuve et rend l’adresse de l’atelier', () => {
		const storage = new MemoryStorage();
		const url = postToAtelier([{ title: 'L', definition: '1 ; 2' }], storage);

		expect(url).toMatch(/^\/atelier\?depuis-python=[0-9a-f-]{36}$/);
		expect(storage.length).toBe(1);
		expect(storage.key(0)?.startsWith(PYTHON_MAILBOX_PREFIX)).toBe(true);
	});

	it('se lit une fois : la seconde lecture ne trouve rien', () => {
		const storage = new MemoryStorage();
		const url = postToAtelier([{ title: 'L', definition: '1 ; 2' }], storage)!;
		const id = new URL(url, 'https://www.chiph.re').searchParams.get('depuis-python')!;

		expect(takeFromPython(id, storage)).toMatchObject({ ok: true });
		expect(takeFromPython(id, storage)).toEqual({ ok: false, reason: 'missing' });
		expect(storage.length).toBe(0);
	});

	it('un contenu abîmé est refusé, et effacé', () => {
		const storage = new MemoryStorage();
		const id = '00000000-0000-4000-8000-000000000000';
		storage.setItem(PYTHON_MAILBOX_PREFIX + id, '{"version":1,"lists":[{"definition":42}]}');

		expect(takeFromPython(id, storage)).toEqual({ ok: false, reason: 'invalid' });
		expect(storage.length).toBe(0);
	});

	it('une clé qui n’est pas un UUID n’est pas lue', () => {
		const storage = new MemoryStorage();
		storage.setItem(PYTHON_MAILBOX_PREFIX + 'abc', '{}');
		expect(takeFromPython('abc', storage)).toEqual({ ok: false, reason: 'invalid' });
	});

	it('les dépôts de plus d’un jour sont balayés au dépôt suivant', () => {
		const storage = new MemoryStorage();
		const old = { version: 1, postedAt: Date.now() - 2 * 24 * 3600 * 1000, lists: [] };
		storage.setItem(PYTHON_MAILBOX_PREFIX + 'ancien', JSON.stringify(old));
		storage.setItem('chiphre-atelier', '{}');

		postToAtelier([{ title: 'L', definition: '1' }], storage);

		expect(storage.getItem(PYTHON_MAILBOX_PREFIX + 'ancien')).toBeNull();
		expect(storage.getItem('chiphre-atelier')).toBe('{}');
	});

	it('un stockage plein ou bloqué : rien d’ouvert, null', () => {
		const storage = new MemoryStorage();
		storage.setItem = () => {
			throw new DOMException('plein', 'QuotaExceededError');
		};
		expect(postToAtelier([{ title: 'L', definition: '1' }], storage)).toBeNull();
	});
});

// =============================================================================
// L'atelier éphémère
// =============================================================================

describe('/atelier?depuis-python= — l’atelier reçu', () => {
	it('lancers = [3, 5, 1] : une liste L titrée « lancers »', async () => {
		const { link } = await openedFrom(report('lancers', [3, 5, 1]));
		const [list] = listsOf(link);

		expect(list.name).toBe('L');
		expect(list.values).toEqual([3, 5, 1]);
		if (link.kind !== 'received') return;
		expect(link.atelier.titleOf(list.column)).toBe('lancers');
		expect(link.notice).toBeNull();
	});

	it('un flottant revient exact', async () => {
		const { link } = await openedFrom(report('L', [0.1 + 0.2]));
		expect(listsOf(link)[0].values).toEqual([0.1 + 0.2]);
	});

	it('des mots : une liste qualitative', async () => {
		const { link } = await openedFrom(report('tirages', ['P', 'F', 'P']));
		const [list] = listsOf(link);
		expect(isQualitative(list) && list.categories).toEqual(['P', 'F', 'P']);
	});

	it('les effectifs : deux listes titrées, dans deux colonnes', async () => {
		const { link } = await openedFrom(
			counted('lancers', [
				[1, 400],
				[2, 600]
			])
		);
		const lists = listsOf(link);

		expect(lists.map((l) => [l.name, l.values])).toEqual([
			['L', [1, 2]],
			['M', [400, 600]]
		]);
		if (link.kind !== 'received') return;
		expect(lists.map((l) => link.atelier.titleOf(l.column))).toEqual([
			'lancers (valeurs)',
			'lancers (effectifs)'
		]);
	});

	it('l’ouverture n’est pas un geste : Annuler ne vide pas l’atelier reçu', async () => {
		const { link } = await openedFrom(report('L', [1, 2]));
		if (link.kind !== 'received') throw new Error('pas reçu');
		link.atelier.undo();
		expect(link.atelier.objects).toHaveLength(1);
	});

	it('rouvrir la même adresse : la boîte est vide, et on le dit', async () => {
		const { url, storage } = await openedFrom(report('L', [1, 2]));
		const again = await openLink(new URL(url, 'https://www.chiph.re').searchParams, storage);

		expect(again).toEqual({
			kind: 'invalid',
			message:
				'Cette liste venue de Python a déjà été ouverte : clique de nouveau sur « Ouvrir dans l’atelier » dans Python.'
		});
	});
});
