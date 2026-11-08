/**
 * Rendu du cahier de texte — `JournalContent` (chantier cahier-ubumark)
 *
 * Le cahier est écrit en ubumark : rendu par `MarkdownRenderer`, jamais par
 * `{@html}`. Les 4 lignes HTML de la prod ont été converties le 2026-11-08
 * (migration 20261106164230) ; la lecture HTML a été retirée ensuite (PR 3).
 *
 * Les liens des références dépendent du lecteur : élève connecté (sa route) ou
 * lien public `/cahier/[token]` (la fiche citée s'ouvre par le jeton).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JournalContent from '../JournalContent.svelte';
import { resolveResource } from '$lib/resources';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';

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
	links: { role: 'student' | 'public' | 'teacher'; shareToken?: string; classId?: string };
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

	it('contenu converti par la migration (séance de prod) : deux paragraphes, deux liens', async () => {
		// Sortie de 20261106164230_cahier_texte_conversion_ubumark.sql pour
		// `<p>[[…]]</p><p></p><p>[[…]]</p><p></p>`.
		const container = await rendre({
			content: `[[worksheet:${FICHE}|Evaluation : Produit scalaire]]\n\n[[worksheet:${FICHE}#2,4,5|Evaluation : Produit scalaire — ex. 2, 4 et 5]]`,
			links: { role: 'student' }
		});
		const liens = container.querySelectorAll('a.internal-link');
		expect(liens).toHaveLength(2);
		expect(liens[0].closest('p')).not.toBe(liens[1].closest('p'));
		expect(container.textContent).not.toContain('[[');
		expect(container.textContent).not.toContain('<p>');
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

	it('prof : un classId mal formé n’entre jamais dans une adresse', async () => {
		const CLASSE = '44444444-4444-4444-8444-444444444444';
		const chapitre = `[[chapter:${FICHE}|Chapitre]]`;
		const valide = await rendre({ content: chapitre, links: { role: 'teacher', classId: CLASSE } });
		expect(valide.querySelector('a.internal-link')?.getAttribute('href')).toContain(CLASSE);
		const forge = await rendre({
			content: chapitre,
			links: { role: 'teacher', classId: '../../admin?x=' }
		});
		expect(forge.querySelector('a.internal-link')).toBeNull();
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

describe('JournalContent — plus de lecture HTML (après conversion)', () => {
	it('un contenu à l’ancienne forme HTML n’est plus interprété : les balises restent du texte', async () => {
		const container = await rendre({
			content: `<p>[[worksheet:${FICHE}#3|Second degré — ex. 3]]</p><p>Bien <strong>relire</strong>.</p>`,
			links: { role: 'student' }
		});
		expect(container.querySelector('strong')).toBeNull();
		expect(container.textContent).toContain('<strong>');
	});
});

/**
 * Vidéos (décision de David du 2026-11-06, audit de #2435) : une vidéo hébergée
 * ailleurs que dans notre stockage ferait partir l'adresse IP de chaque lecteur
 * — visiteurs anonymes du lien public compris — chez son hébergeur. Au cahier,
 * elle devient un lien, YouTube compris : aucune requête tierce à l'affichage.
 */
describe('JournalContent — vidéos', () => {
	const EXTERNE = 'https://tiers.example/clip.mp4';
	const STOCKAGE = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/clip.mp4`;

	it('vidéo d’un autre hôte : un lien, ni <video> ni requête', async () => {
		const container = await rendre({
			content: `!video[Démo](${EXTERNE})`,
			links: { role: 'public', shareToken: 'jeton0123456789abcdef' }
		});
		expect(container.querySelector('video, iframe, source')).toBeNull();
		const lien = container.querySelector('a.external-media');
		expect(lien?.getAttribute('href')).toBe(EXTERNE);
		expect(lien?.textContent).toContain('Démo');
	});

	it('YouTube : un lien vers YouTube, pas de lecteur intégré', async () => {
		const container = await rendre({
			content: '!video[Cours](https://youtu.be/abcDEF12345)',
			links: { role: 'student' }
		});
		expect(container.querySelector('iframe, video')).toBeNull();
		expect(container.querySelector('a.external-media')?.getAttribute('href')).toBe(
			'https://www.youtube.com/watch?v=abcDEF12345'
		);
	});

	it('vidéo de notre stockage : lue dans la page', async () => {
		const container = await rendre({
			content: `!video[Démo](${STOCKAGE})`,
			links: { role: 'student' }
		});
		expect(container.querySelector('video source')?.getAttribute('src')).toBe(STOCKAGE);
	});

	it('vidéo imbriquée (liste, citation) : aucune requête vers l’hôte', async () => {
		// ⚠️ Constat du 2026-11-08 : `ListNode` et `Blockquote` ne rendent pas le
		// nœud `video` (ni lecteur ni lien, partout, pas seulement au cahier).
		// Ce test garde la seule propriété exigée ici : rien n'est chargé.
		for (const content of [`- !video[Démo](${EXTERNE})`, `> !video[Démo](${EXTERNE})`]) {
			const container = await rendre({ content, links: { role: 'student' } });
			expect(container.querySelector('video, iframe, source')).toBeNull();
		}
	});

	it('adresse sans schéma (`//hôte`) ou relative : un lien, jamais une vidéo', async () => {
		for (const src of ['//tiers.example/clip.mp4', '/medias/clip.mp4']) {
			const container = await rendre({
				content: `!video[Démo](${src})`,
				links: { role: 'student' }
			});
			expect(container.querySelector('video, iframe, source')).toBeNull();
			expect(container.querySelector('a.external-media')).not.toBeNull();
		}
	});

	it('adresse `data:` : ni vidéo, ni lien qui l’ouvre', async () => {
		const container = await rendre({
			content: '!video[Démo](data:video/mp4;base64,AAAA)',
			links: { role: 'student' }
		});
		expect(container.querySelector('video, iframe, source')).toBeNull();
		const href = container.querySelector('a.external-media')?.getAttribute('href') ?? '';
		expect(href.startsWith('data:')).toBe(false);
	});

	it('hors cahier (cours, exercices) : rien ne change', async () => {
		const target = document.body.appendChild(document.createElement('main'));
		cibles.push(target);
		const screen = await render(MarkdownRenderer, {
			target,
			props: { content: `!video[Démo](${EXTERNE})` }
		});
		expect((screen.container as HTMLElement).querySelector('video source')).not.toBeNull();
	});
});
