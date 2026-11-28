/**
 * Bloc ```engrenages — analyse (outil n° 52, `docs/wip/outil-engrenages-progress.md`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type ListNode } from '#lib/ubumark/index.ts';
import type { EngrenagesNode } from '#lib/ubumark/types/engrenages.ts';

const doc = (...lines: string[]) => parseMarkdown(lines.join('\n')).children;
const bloc = (...lines: string[]) => doc('```engrenages', ...lines, '```');

function gearsOf(children: readonly { type: string }[]): EngrenagesNode {
	const node = children.find((c) => c.type === 'engrenages');
	expect(node, 'un nœud engrenages attendu').toBeDefined();
	return node as EngrenagesNode;
}

const messages = (node: EngrenagesNode) => node.errors.map((e) => e.message).join(' | ');

describe('bloc ```engrenages — cas nominaux', () => {
	it('deux roues : dents, légendes par défaut A et B, 8 cm', () => {
		const node = gearsOf(bloc('roues: 12 ; 18'));
		expect(node.errors).toEqual([]);
		expect(node.wheels).toEqual([
			{ teeth: 12, label: 'A' },
			{ teeth: 18, label: 'B' }
		]);
		expect(node.sizeCm).toBe(8);
	});

	it('trois roues, légendes et taille écrites', () => {
		const node = gearsOf(
			bloc('roues: 12 ; 18 ; 8', 'légendes: Moteur ; Relais ; Roue', 'taille: 10,5 cm')
		);
		expect(node.errors).toEqual([]);
		expect(node.wheels?.map((w) => w.label)).toEqual(['Moteur', 'Relais', 'Roue']);
		expect(node.wheels?.map((w) => w.teeth)).toEqual([12, 18, 8]);
		expect(node.sizeCm).toBe(10.5);
	});

	it('accepte legendes sans accent et des espaces autour des « ; »', () => {
		const node = gearsOf(bloc('roues:6;60', 'legendes:  P ;Q'));
		expect(node.errors).toEqual([]);
		expect(node.wheels).toEqual([
			{ teeth: 6, label: 'P' },
			{ teeth: 60, label: 'Q' }
		]);
	});

	it('garde le texte du bloc pour l’éditeur riche', () => {
		const node = gearsOf(bloc('roues: 12 ; 18', 'taille: 6cm'));
		expect(node.source).toBe('roues: 12 ; 18\ntaille: 6cm');
	});

	it('dans un item de liste : un nœud, pas un bloc de code', () => {
		const children = doc('1. Observe :', '', '   ```engrenages', '   roues: 10 ; 15', '   ```');
		const list = children.find((c) => c.type === 'list') as ListNode;
		const node = gearsOf(list.items[0].children);
		expect(node.errors).toEqual([]);
		expect(node.wheels?.map((w) => w.teeth)).toEqual([10, 15]);
	});
});

describe('bloc ```engrenages — erreurs d’auteur, situées', () => {
	it('roues manquantes', () => {
		const node = gearsOf(bloc('taille: 6cm'));
		expect(node.wheels).toBeNull();
		expect(messages(node)).toMatch(/roues: manquant/);
	});

	it('une seule roue, ou quatre', () => {
		expect(messages(gearsOf(bloc('roues: 12')))).toMatch(/2 ou 3 roues/);
		expect(messages(gearsOf(bloc('roues: 12 ; 18 ; 8 ; 10')))).toMatch(/2 ou 3 roues/);
	});

	it('nombre de dents non entier ou hors de 6 à 60', () => {
		const decimal = gearsOf(bloc('roues: 12 ; 18,5'));
		expect(decimal.wheels).toBeNull();
		expect(messages(decimal)).toMatch(/Ligne 1 : .*« 18,5 ».*nombre entier de dents/);
		expect(messages(gearsOf(bloc('roues: 5 ; 18')))).toMatch(/entre 6 et 60/);
		expect(messages(gearsOf(bloc('roues: 12 ; 61')))).toMatch(/entre 6 et 60/);
		expect(messages(gearsOf(bloc('roues: {{a}} ; 18')))).toMatch(/nombre entier de dents/);
	});

	it('légendes en nombre différent des roues', () => {
		const node = gearsOf(bloc('roues: 12 ; 18', 'légendes: A ; B ; C'));
		expect(node.wheels).toBeNull();
		expect(messages(node)).toMatch(/Ligne 2 : 3 légendes pour 2 roues/);
	});

	it('légende vide ou trop longue', () => {
		expect(messages(gearsOf(bloc('roues: 12 ; 18', 'légendes: A ;')))).toMatch(/légende vide/);
		expect(
			messages(gearsOf(bloc('roues: 12 ; 18', 'légendes: A ; une roue au nom bien trop long')))
		).toMatch(/20 caractères au plus/);
	});

	it('taille sans unité ou hors bornes', () => {
		expect(messages(gearsOf(bloc('roues: 12 ; 18', 'taille: 8')))).toMatch(/centimètres/);
		expect(messages(gearsOf(bloc('roues: 12 ; 18', 'taille: 20cm')))).toMatch(/entre 4 et 16/);
	});

	it('clé inconnue, clé répétée, ligne non comprise', () => {
		expect(messages(gearsOf(bloc('roues: 12 ; 18', 'sens: oui')))).toMatch(
			/Ligne 2 : clé « sens » inconnue/
		);
		expect(messages(gearsOf(bloc('roues: 12 ; 18', 'roues: 8 ; 9')))).toMatch(
			/« roues » déjà donnée ligne 1/
		);
		expect(messages(gearsOf(bloc('roues: 12 ; 18', 'des roues')))).toMatch(/non comprise/);
	});

	it('bloc non fermé : un nœud en erreur, la suite du document reste du texte', () => {
		const children = doc('```engrenages', 'roues: 12 ; 18', '', 'La suite.');
		const node = gearsOf(children);
		expect(messages(node)).toMatch(/bloc non fermé/);
		expect(children.some((c) => c.type === 'paragraph')).toBe(true);
	});
});
