/**
 * Rendu du cahier de texte — `JournalContent` (chantier cahier-ubumark)
 *
 * Le cahier passe du HTML à ubumark : un contenu markdown est rendu par
 * `MarkdownRenderer`, jamais par `{@html}`. Les lignes encore en HTML (4 en
 * prod au 2026-11-06, converties ensuite) gardent l'ancienne chaîne
 * (`transformMathHtml` + `linkifyResourceReferences`) le temps de la
 * conversion.
 *
 * Les liens des références dépendent du lecteur : élève connecté (sa route) ou
 * lien public `/cahier/[token]` (la fiche citée s'ouvre par le jeton).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JournalContent from '../JournalContent.svelte';
import { resolveResource } from '$lib/resources';

const FICHE = '664fee6b-c9d0-4406-a9eb-9e0655c2b1ac';
const JETON = 'jeton-de-partage-0123456789abcdef';

let cibles: HTMLElement[] = [];
afterEach(() => {
	for (const c of cibles) c.remove();
	cibles = [];
});

/** Rend dans un <main>, décor de l'application, et rend le conteneur. */
async function rendre(props: {
	content: string;
	links: { role: 'student' | 'public'; shareToken?: string };
}): Promise<HTMLElement> {
	const target = document.body.appendChild(document.createElement('main'));
	cibles.push(target);
	const screen = await render(JournalContent, { target, props });
	return screen.container as HTMLElement;
}

function urlFiche(role: 'student' | 'public', shareToken?: string): string | null {
	return resolveResource('worksheet', FICHE, {
		role,
		label: 'x',
		context: { shareToken }
	}).url;
}

describe('JournalContent — markdown', () => {
	it('rend la mise en forme, pas les marques', async () => {
		const container = await rendre({
			content: 'Revoir le **cours**.\n\n- point un\n- point deux',
			links: { role: 'student' }
		});
		expect(container.querySelector('strong')?.textContent).toBe('cours');
		expect(container.querySelectorAll('li')).toHaveLength(2);
		expect(container.textContent).not.toContain('**');
	});

	it('rend une formule, pas son code entre dollars', async () => {
		const container = await rendre({
			content: 'Résoudre $x^2=4$.',
			links: { role: 'student' }
		});
		expect(container.querySelector('math-span, math-field, .katex')).not.toBeNull();
		expect(container.textContent).not.toContain('$x^2=4$');
	});

	it('élève : une référence devient un lien vers SA route', async () => {
		const attendu = urlFiche('student');
		expect(attendu).not.toBeNull();
		const container = await rendre({
			content: `Faire [[worksheet:${FICHE}#3|l’exercice 3]].`,
			links: { role: 'student' }
		});
		const lien = container.querySelector('a.internal-link');
		expect(lien?.getAttribute('href')).toBe(attendu);
		expect(lien?.textContent).toContain('l’exercice 3');
		expect(container.textContent).not.toContain('[[');
	});

	it('lien public : la fiche citée s’ouvre par le jeton', async () => {
		const attendu = urlFiche('public', JETON);
		expect(attendu).toContain(JETON);
		const container = await rendre({
			content: `[[worksheet:${FICHE}|Fiche second degré]]`,
			links: { role: 'public', shareToken: JETON }
		});
		expect(container.querySelector('a.internal-link')?.getAttribute('href')).toBe(attendu);
	});

	it('lien public sans jeton : la référence reste du texte inerte', async () => {
		const container = await rendre({
			content: `[[worksheet:${FICHE}|Fiche second degré]]`,
			links: { role: 'public' }
		});
		expect(container.querySelector('a.internal-link')).toBeNull();
		expect(container.textContent).toContain('Fiche second degré');
	});

	it('une balise tapée reste du texte, jamais un élément', async () => {
		const container = await rendre({
			content: 'Attention <img src=x onerror="alert(1)"> et <script>alert(2)</script>',
			links: { role: 'student' }
		});
		expect(container.querySelector('img, script')).toBeNull();
	});

	it('vide : rien n’est rendu', async () => {
		const container = await rendre({ content: '', links: { role: 'student' } });
		expect(container.textContent?.trim()).toBe('');
	});
});

describe('JournalContent — HTML hérité (avant conversion)', () => {
	const HTML = `<p>[[worksheet:${FICHE}#3|Second degré — ex. 3]]</p><p></p><p>Bien <strong>relire</strong>.</p>`;

	it('affiche le texte mis en forme, pas les balises', async () => {
		const container = await rendre({ content: HTML, links: { role: 'student' } });
		expect(container.textContent).not.toContain('<p>');
		expect(container.querySelector('strong')?.textContent).toBe('relire');
	});

	it('garde le lien de la référence, par le jeton sur le lien public', async () => {
		const container = await rendre({
			content: HTML,
			links: { role: 'public', shareToken: JETON }
		});
		expect(container.querySelector('a.internal-link')?.getAttribute('href')).toBe(
			urlFiche('public', JETON)
		);
	});
});
