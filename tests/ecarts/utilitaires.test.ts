/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine
 * utilitaires (statistiques, rendu restreint des formules).
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› L114`, `› T26`.
 *
 * Les tests nommés « témoin » sont verts aujourd'hui : ils montrent que le même
 * geste marche sur un cas voisin, donc que le rouge vient bien de l'écart.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as restrictedRendering from '#lib/components/markdown/restricted-rendering.ts';
import { parseStatChartContent } from '#lib/ubumark/parser/stat-chart-parser.ts';
import { buildStatChartScene } from '#lib/ubumark/utils/stat-chart-scene.ts';

describe('L114 : pourcentage d’un secteur de camembert au demi-dixième', () => {
	/** Le pourcentage affiché en légende pour le premier secteur d'un camembert `a` / `b`. */
	function firstPercent(a: number, b: number): string {
		const parsed = parseStatChartContent('circulaire', `Bus = ${a}\nVélo = ${b}`);
		if (!parsed.spec) throw new Error('camembert non lu');
		const scene = buildStatChartScene(parsed.spec);
		if (scene.kind !== 'circulaire') throw new Error(`scène inattendue : ${scene.kind}`);
		const found = /(\d+(?:,\d+)?)\s*%/.exec(scene.legend[0].text);
		if (!found) throw new Error(`aucun pourcentage dans « ${scene.legend[0].text} »`);
		return found[1];
	}

	it('témoin : 1 sur 8 s’affiche 12,5 %', () => {
		expect(firstPercent(1, 7)).toBe('12,5');
	});

	it('témoin : 23 sur 81 (28,395… %) s’affiche 28,4 %', () => {
		expect(firstPercent(23, 58)).toBe('28,4');
	});

	// 23/80 = 28,75 % exactement. Aujourd'hui : « 28,7 » (100 × 23 / 80 vaut
	// 28,749999999999996 en flottant).
	it('23 sur 80 (28,75 %) s’affiche 28,8 %', () => {
		expect(firstPercent(23, 57)).toBe('28,8');
	});

	it('41 sur 80 (51,25 %) s’affiche 51,3 %', () => {
		expect(firstPercent(41, 39)).toBe('51,3');
	});
});

describe('T26 : macros MathLive qui se développent en commande interdite', () => {
	interface Macro {
		name: string;
		expansion: string;
	}

	/** Les macros par défaut de la version installée de MathLive, avec leur développement. */
	function defaultMacros(): Macro[] {
		const source = readFileSync(
			resolve(process.cwd(), 'node_modules/mathlive/mathlive.mjs'),
			'utf8'
		);
		const macros: Macro[] = [];
		// Les dictionnaires de macros (`DEFAULT_MACROS`, et les paquets qu'il cite)
		const blocks = [...source.matchAll(/^var [A-Z_]*MACROS = \{$/gm)];
		if (blocks.length === 0) throw new Error('DEFAULT_MACROS introuvable dans mathlive.mjs');
		const literal = String.raw`"(?:[^"\\]|\\.)*"`;
		for (const block of blocks) {
			const body = source.slice(block.index, source.indexOf('\n};', block.index));
			// Une entrée commence en début de ligne, indentée de deux espaces, et court
			// jusqu'à la suivante : `nom: "développement"` ou `nom: { def: "développement", … }`.
			const entries = body.split(/^ {2}(?="?[A-Za-z]+"?: )/m).slice(1);
			for (const entry of entries) {
				const head = /^"?([A-Za-z]+)"?: /.exec(entry);
				if (!head) continue;
				const rest = entry.slice(head[0].length);
				const found = rest.startsWith('"')
					? new RegExp(`^${literal}`).exec(rest)?.[0]
					: new RegExp(`\\bdef: (${literal})`).exec(rest)?.[1];
				if (found) macros.push({ name: head[1], expansion: JSON.parse(found) as string });
			}
		}
		return macros;
	}

	/** Tous les noms listés par le module de rendu restreint (interdits ou examinés). */
	function listedNames(): Set<string> {
		const names = new Set<string>();
		for (const value of Object.values(restrictedRendering)) {
			if (!Array.isArray(value)) continue;
			for (const item of value) if (typeof item === 'string') names.add(item);
		}
		return names;
	}

	const macros = defaultMacros();
	const risky = macros.filter((m) => restrictedRendering.hasUnsafeMathCommand(m.expansion));

	it('témoin : les macros de MathLive sont lues, `\\angl` comprise', () => {
		expect(macros.length).toBeGreaterThan(100);
		expect(macros.find((m) => m.name === 'angl')?.expansion).toBe('\\enclose{actuarial}{#1}');
	});

	it('témoin : une macro sans commande interdite n’est pas retenue', () => {
		expect(risky.map((m) => m.name)).not.toContain('iff');
		expect(risky.map((m) => m.name)).toContain('angl');
	});

	// Aujourd'hui : `\angl`, `\phase`, `\strut`… ne sont vues que sous leur nom,
	// et aucune liste ne dit qu'elles ont été examinées. Une macro ajoutée par une
	// mise à jour de MathLive passerait de la même façon.
	it('chacune est refusée en mode restreint, ou listée comme examinée', () => {
		const listed = listedNames();
		const unclassified = risky.filter(
			(m) => !listed.has(m.name) && !restrictedRendering.hasUnsafeMathCommand(`\\${m.name}{x}`)
		);
		expect(unclassified.map((m) => m.name)).toEqual([]);
	});
});
