/**
 * Retouches du chantier `texte-colore` (ADR 0042) : les 2 modèles publiés qui
 * affichent un `\textcolor` hors formule (relevé de toute la prod par la garde du
 * rendu, 2026-11-20), réécrits en `[…]{.nom}`. Instantané :
 * `data/corrections/texte-colore/_modeles.json` (lu en lecture seule le 2026-11-20).
 */

import { describe, expect, it } from 'vitest';
import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { checkTemplate } from '../../../src/lib/questions/review/check-template';
import { findTextcolorOutsideMath } from '../../../src/lib/questions/review/textcolor-hors-maths';
import { readSnapshot } from '../lib/files';
import { TEXTE_COLORE_RETOUCHES } from '../lib/retouches-texte-colore';

const SNAPSHOT = readSnapshot('texte-colore');

function original(prefix: string): QuestionTemplate {
	const found = [...SNAPSHOT.values()].find((t) => t.id.startsWith(prefix));
	if (!found) throw new Error(`${prefix} absent de l'instantané`);
	return found;
}

function patched(prefix: string): QuestionTemplate {
	const retouche = TEXTE_COLORE_RETOUCHES.find((r) => r.templateId.startsWith(prefix));
	if (!retouche) throw new Error(`aucune retouche pour ${prefix}`);
	return retouche.apply(original(prefix));
}

/**
 * `\textcolor{{{color:primary.N}}}{X}` → `X` (accolades appariées : X peut contenir
 * `{{a}}`), dans le JSON du modèle (barres obliques doublées).
 */
function withoutTextcolor(json: string): string {
	const head = /\\\\textcolor\{\{\{color:primary\.\d\}\}\}\{/g;
	let out = '';
	let last = 0;
	for (let match = head.exec(json); match; match = head.exec(json)) {
		let depth = 1;
		let i = head.lastIndex;
		for (; depth > 0; i++) {
			if (json[i] === '{') depth++;
			else if (json[i] === '}') depth--;
		}
		out += json.slice(last, match.index) + json.slice(head.lastIndex, i - 1);
		last = i;
		head.lastIndex = i;
	}
	return out + json.slice(last);
}

/** `[X]{.orange}` / `[X]{.bleu}` → `X` (X sans crochets, comme dans ces retouches) */
function withoutSpanMarks(json: string): string {
	return json.replace(/\[([^[\]]*)\]\{\.(?:orange|bleu)\}/g, '$1');
}

describe('retouches texte-colore', () => {
	it('deux modèles visés, chacun dans l’instantané', () => {
		expect(TEXTE_COLORE_RETOUCHES.map((r) => r.templateId.slice(0, 8)).sort()).toEqual([
			'78feafed',
			'e4784c78'
		]);
	});

	it.each(['78feafed', 'e4784c78'])('%s : avant, la garde du rendu le signale', (prefix) => {
		expect(findTextcolorOutsideMath(original(prefix), 5).findings.length).toBeGreaterThan(0);
	});

	it.each(['78feafed', 'e4784c78'])('%s : après, plus aucun `\\textcolor`', (prefix) => {
		const after = patched(prefix);
		expect(JSON.stringify(after)).not.toContain('textcolor');
		expect(findTextcolorOutsideMath(after, 20).findings).toEqual([]);
	});

	it('78feafed : la phrase et ses formules dans le même passage orange, le début en bleu', () => {
		const all = JSON.stringify(patched('78feafed').variations);
		for (const words of [
			'« la somme »',
			'« le produit »',
			'« la différence »',
			'« le quotient »'
		]) {
			expect(all).toContain(`[${words}]{.bleu}`);
		}
		expect(all).toContain(
			'[« le produit de ${{a}}$ par ${{c}}$ »]{.orange}, soit [${{a}} \\\\times {{c}}$]{.orange}'
		);
	});

	it('e4784c78 : le nombre de diviseurs et la valeur renvoyée en orange', () => {
		const after = patched('e4784c78');
		const all = JSON.stringify(after.variations);
		expect(all).toContain('[{{rep}}]{.orange} diviseurs');
		expect(all).toContain('[${{rep}}$]{.orange}');
		expect(all).toContain('[${{N}}$]{.orange}');
	});

	// Revue : comparer au caractère près, `$` et `{{variables}}` compris (seul le
	// marquage de couleur est retiré des deux côtés)
	it('rien d’autre ne change que le marquage de couleur (au caractère près)', () => {
		const plain = (t: QuestionTemplate) => withoutSpanMarks(withoutTextcolor(JSON.stringify(t)));
		for (const prefix of ['78feafed', 'e4784c78']) {
			expect(plain(patched(prefix)), prefix).toBe(plain(original(prefix)));
		}
		// Témoin : un `$` perdu ou une variable abîmée ne passerait pas
		const json = JSON.stringify(patched('78feafed'));
		const reference = withoutSpanMarks(withoutTextcolor(JSON.stringify(original('78feafed'))));
		for (const [from, to] of [
			['[${{b}} - {{c}}$]', '[{{b}} - {{c}}$]'],
			['${{a}}$ par', '${a}$ par']
		]) {
			expect(withoutSpanMarks(json.replace(from, to)), from).not.toBe(reference);
		}
	});

	it('les trois autres formules de 78feafed, en orange', () => {
		const all = JSON.stringify(patched('78feafed').variations);
		expect(all).toContain('la différence [${{b}} - {{c}}$]{.orange}, à calculer');
		expect(all).toContain('le quotient [${{b}} : {{c}}$]{.orange} ;');
		expect(all).toContain('la somme [${{a}} + {{c}}$]{.orange}, à calculer');
	});

	it('une ligne déjà retouchée est refusée (texte attendu introuvable)', () => {
		for (const retouche of TEXTE_COLORE_RETOUCHES) {
			const once = retouche.apply(original(retouche.templateId.slice(0, 8)));
			expect(() => retouche.apply(once)).toThrow();
		}
	});

	it('chaque modèle retouché reste importable (checkTemplate, 5 tirages par variation)', () => {
		for (const prefix of ['78feafed', 'e4784c78']) {
			const { created_at: _ca, updated_at: _ua, created_by: _cb, ...candidate } = patched(prefix);
			const report = checkTemplate(candidate, { instances: 5 });
			expect(report.passed, `${prefix} : ${report.reasons.join(', ')}`).toBe(true);
		}
	});
});
