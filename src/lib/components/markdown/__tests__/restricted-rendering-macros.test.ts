/**
 * Garde du rendu restreint : les macros par défaut de MathLive (ancien écart T26).
 *
 * Le filtre du rendu restreint lit le texte écrit par l'élève, sans développer les
 * macros. Une macro de MathLive dont le développement contient une commande
 * interdite (`\angl` → `\enclose{actuarial}{#1}`) passe sous son nom : chacune doit
 * être refusée en mode restreint, ou listée comme examinée
 * (`REVIEWED_SAFE_MATHLIVE_MACROS`). Lit la version INSTALLÉE de MathLive.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as restrictedRendering from '../restricted-rendering.ts';

describe('macros MathLive qui se développent en commande interdite', () => {
	interface Macro {
		name: string;
		expansion: string;
	}

	/** La chaîne que vaut un littéral JavaScript entre guillemets simples ou doubles. */
	function unquote(literal: string): string {
		if (literal.startsWith('"')) return JSON.parse(literal) as string;
		// Guillemets simples : les passer en doubles, pour le même lecteur
		const inner = literal.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"');
		return JSON.parse(`"${inner}"`) as string;
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
		const text = String.raw`"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'`;
		// `nom: "développement"`, ou `nom: { … def: "développement" … }` : le nom ouvre
		// une ligne, à n'importe quelle profondeur (un paquet comme `mathtools` range
		// ses macros dans `package: { … }`). `def` est lui-même lu comme un nom, puis écarté.
		const entry = new RegExp(`^ +"?([A-Za-z]+)"?: (?:(${text})|\\{)`, 'gm');
		const definition = new RegExp(`^\\s*(?:[a-zA-Z]+: [^\\n]*\\n\\s*)*?def: (${text})`);
		for (const block of blocks) {
			const body = source.slice(block.index, source.indexOf('\n};', block.index));
			for (const m of body.matchAll(entry)) {
				if (m[1] === 'def') continue;
				const literal = m[2] ?? definition.exec(body.slice(m.index + m[0].length))?.[1];
				if (literal) macros.push({ name: m[1], expansion: unquote(literal) });
			}
		}
		return macros;
	}

	/**
	 * Tous les noms listés par le module de rendu restreint (interdits ou examinés),
	 * quelle que soit la forme de la liste : tableau, ensemble, ou clés d'un objet.
	 */
	function listedNames(): Set<string> {
		const names = new Set<string>();
		for (const value of Object.values(restrictedRendering)) {
			const items =
				Array.isArray(value) || value instanceof Set
					? [...value]
					: value && typeof value === 'object'
						? Object.keys(value)
						: [];
			for (const item of items) if (typeof item === 'string') names.add(item);
		}
		return names;
	}

	/** La macro, écrite par un élève, est-elle rendue en texte par le mode restreint ? */
	function refused(name: string): boolean {
		const written = `\\${name}{x}`;
		return (
			restrictedRendering.hasUnsafeMathCommand(written) ||
			restrictedRendering.isRefusedRestrictedFormula(written)
		);
	}

	const macros = defaultMacros();
	const risky = macros.filter((m) => restrictedRendering.hasUnsafeMathCommand(m.expansion));

	it('témoin : les macros de MathLive sont lues, `\\angl` comprise', () => {
		expect(macros.length).toBeGreaterThan(100);
		expect(macros.find((m) => m.name === 'angl')?.expansion).toBe('\\enclose{actuarial}{#1}');
		// Une macro définie par un objet, et une macro rangée dans un paquet
		expect(macros.find((m) => m.name === 'phase')?.expansion).toBe('\\enclose{phasorangle}{#1}');
		expect(macros.find((m) => m.name === 'colondash')?.expansion).toContain('\\mkern');
	});

	it('témoin : une macro sans commande interdite n’est pas retenue', () => {
		expect(risky.map((m) => m.name)).not.toContain('iff');
		expect(risky.map((m) => m.name)).toContain('angl');
	});

	// Une macro ajoutée par une mise à jour de MathLive, dont le développement
	// contient une commande interdite, fait échouer ce test : l'examiner, puis la
	// refuser ou l'ajouter à REVIEWED_SAFE_MATHLIVE_MACROS.
	it('chacune est refusée en mode restreint, ou listée comme examinée', () => {
		const listed = listedNames();
		const unclassified = risky.filter((m) => !listed.has(m.name) && !refused(m.name));
		expect(unclassified.map((m) => m.name)).toEqual([]);
	});
});
