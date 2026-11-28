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
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

import * as restrictedRendering from '../restricted-rendering.ts';

describe('macros MathLive qui se développent en commande interdite', () => {
	interface Macro {
		name: string;
		expansion: string;
	}

	/**
	 * Les macros par défaut de la version installée de MathLive, avec leur développement.
	 * Les dictionnaires (`DEFAULT_MACROS` et les paquets qu'il cite) sont ÉVALUÉS dans
	 * `node:vm`, pas lus par expression régulière : une entrée écrite autrement (objet sur
	 * une ligne, backticks, concaténation…) ne peut pas être perdue en silence. Une
	 * entrée de forme inconnue fait échouer le test.
	 */
	function defaultMacros(): Macro[] {
		const source = readFileSync(
			resolve(process.cwd(), 'node_modules/mathlive/mathlive.mjs'),
			'utf8'
		);
		const blocks = [...source.matchAll(/^var ([A-Z_]*MACROS) = \{$/gm)];
		if (blocks.length === 0) throw new Error('DEFAULT_MACROS introuvable dans mathlive.mjs');
		let code = '';
		for (const block of blocks) {
			const end = source.indexOf('\n};', block.index);
			if (end < 0) throw new Error(`fin de ${block[1]} introuvable`);
			code += `${source.slice(block.index, end + 3)}\n`;
		}
		code += `this.dictionaries = { ${blocks.map((b) => b[1]).join(', ')} };`;
		const context: { dictionaries?: Record<string, unknown> } = {};
		runInNewContext(code, context);

		const macros: Macro[] = [];
		const walk = (dictionary: unknown, where: string): void => {
			if (!dictionary || typeof dictionary !== 'object') {
				throw new Error(`dictionnaire de macros illisible : ${where}`);
			}
			for (const [name, value] of Object.entries(dictionary)) {
				if (typeof value === 'string') {
					macros.push({ name, expansion: value });
				} else if (value && typeof value === 'object' && 'package' in value) {
					walk(value.package, `${where}.${name}`);
				} else if (value && typeof value === 'object' && 'def' in value) {
					if (typeof value.def !== 'string') throw new Error(`macro illisible : ${name}`);
					macros.push({ name, expansion: value.def });
				} else {
					throw new Error(`macro de forme inconnue : ${where}.${name}`);
				}
			}
		};
		for (const [name, dictionary] of Object.entries(context.dictionaries ?? {})) {
			walk(dictionary, name);
		}
		return macros;
	}

	/** Les macros examinées et sûres : la seule liste qui vaut examen (pas les commandes). */
	const reviewed = new Set<string>(restrictedRendering.REVIEWED_SAFE_MATHLIVE_MACROS);

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
		const unclassified = risky.filter((m) => !reviewed.has(m.name) && !refused(m.name));
		expect(unclassified.map((m) => m.name)).toEqual([]);
	});
});
