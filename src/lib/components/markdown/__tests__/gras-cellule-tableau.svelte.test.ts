/**
 * Markdown en ligne dans une cellule de tableau SANS trou (chantier gras-cellule-tableau)
 *
 * `TableNode` ne rendait dans une cellule que texte et formules : `**Brumeval**`
 * s'affichait avec ses astérisques (CM2, « Problèmes avec un tableau ou des
 * barres »). Une cellule rend désormais le même markdown en ligne qu'un
 * paragraphe : gras, italique, code, formules.
 *
 * Chat élève (rendu restreint, décision S1 du 2026-10-03) : une cellule
 * n'affiche rien de plus qu'un paragraphe du chat — ni lien, ni champ de
 * saisie, formules filtrées.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';

const HOTE = 'exemple.invalid';

async function tableau(content: string, restricted = false): Promise<HTMLElement> {
	const screen = await render(MarkdownRenderer, { props: { content, restricted } });
	const el = screen.container as HTMLElement;
	await expect.poll(() => el.querySelectorAll('td').length).toBeGreaterThan(0);
	return el;
}

function cellules(el: HTMLElement): HTMLElement[] {
	return [...el.querySelectorAll<HTMLElement>('th, td')];
}

describe('TableNode — markdown en ligne dans une cellule sans trou', () => {
	it('`**Brumeval**` : rendu en gras, sans astérisques', async () => {
		const el = await tableau('| Ville | Habitants |\n| --- | --- |\n| **Brumeval** | 12 |');
		const td = el.querySelector('td');
		expect(td?.querySelector('strong')?.textContent).toBe('Brumeval');
		expect(td?.textContent?.trim()).toBe('Brumeval');
	});

	it('en-tête en gras ou en italique', async () => {
		const el = await tableau('| **Ville** | *Habitants* |\n| --- | --- |\n| Brumeval | 12 |');
		const [ville, habitants] = cellules(el);
		expect(ville.querySelector('strong')?.textContent).toBe('Ville');
		expect(habitants.querySelector('em')?.textContent).toBe('Habitants');
		expect(el.querySelector('thead')?.textContent).not.toContain('*');
	});

	it('`_italique_` et `` `code` `` : rendus ; `$x_1$` ne bloque pas le gras voisin', async () => {
		const el = await tableau(
			'| a | b | c |\n| --- | --- | --- |\n| _mot_ | `f(x)` | **n** $x_1$ |'
		);
		const [, , , mot, code, n] = cellules(el);
		expect(mot.querySelector('em')?.textContent).toBe('mot');
		expect(code.querySelector('code')?.textContent).toBe('f(x)');
		expect(n.querySelector('strong')?.textContent).toBe('n');
	});

	it('gras et formule dans la même cellule', async () => {
		const el = await tableau('| a |\n| --- |\n| **total** : $3+4$ |');
		const td = el.querySelector('td');
		expect(td?.querySelector('strong')?.textContent).toBe('total');
		await expect.poll(() => td?.querySelectorAll('math-span').length).toBe(1);
	});

	it('tableau transposé et tableau à double entrée : gras rendu aussi', async () => {
		for (const directive of [':table-h', ':table-cross']) {
			const el = await tableau(`${directive}\n| a | b |\n| --- | --- |\n| **x** | 1 |`);
			expect(el.querySelector('strong')?.textContent).toBe('x');
			el.remove();
		}
	});

	it('cellules de texte ou de nombres seuls : texte inchangé, aucune balise', async () => {
		const el = await tableau('| a | b |\n| --- | --- |\n| Brumeval | 12 |');
		const [, , ville, nombre] = cellules(el);
		expect(ville.textContent?.trim()).toBe('Brumeval');
		expect(nombre.textContent?.trim()).toBe('12');
		expect(el.querySelector('td strong, td em, td code')).toBeNull();
	});

	it.each([
		'- 3',
		'1. a',
		'+ 2',
		'# 4',
		'> 5',
		'3 * 4 * 5',
		'x_1 et y_2',
		'snake_case_name',
		'a*b*c',
		'3*4*5 **gras**'
	])('`%s` (bloc ou marque douteuse) : affiché tel quel', async (texte) => {
		const el = await tableau(`| a |\n| --- |\n| ${texte} |`);
		expect(el.querySelector('td')?.textContent?.trim()).toBe(texte);
	});
});

describe('TableNode — cellule du chat (rendu restreint)', () => {
	it('gras rendu comme dans un paragraphe du chat', async () => {
		const el = await tableau('| a |\n| --- |\n| **Brumeval** |', true);
		expect(el.querySelector('td strong')?.textContent).toBe('Brumeval');
	});

	it('lien tapé dans une cellule : aucun <a>, aucun attribut ne cite l’adresse', async () => {
		const el = await tableau(`| a |\n| --- |\n| **voir** [ici](https://${HOTE}/x) |`, true);
		const td = el.querySelector('td');
		expect(td?.querySelector('a')).toBeNull();
		expect(td?.innerHTML).not.toMatch(new RegExp(`(href|src)="[^"]*${HOTE}`));
	});

	it('trou tapé dans une cellule : aucun champ de saisie', async () => {
		const el = await tableau('| a |\n| --- |\n| **x** {{blank:1}} |', true);
		expect(el.querySelector('td input, td math-field')).toBeNull();
	});

	it('formule à commande de style dans une cellule en gras : filtrée en texte', async () => {
		const el = await tableau(
			`| a |\n| --- |\n| **x** $\\htmlStyle{background-image:url(https://${HOTE}/t.png)}{x}$ |`,
			true
		);
		const td = el.querySelector('td');
		await expect.poll(() => td?.querySelector('code.restricted-math')).not.toBeNull();
		expect(td?.querySelector('math-span')).toBeNull();
	});
});
