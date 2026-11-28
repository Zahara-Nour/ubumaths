/**
 * Écart T36 — le signalement montre le message tel que le destinataire l'a vu
 * ============================================================================
 *
 * Le prof lisait un message signalé dans `plain_text`, extrait de son contenu
 * TipTap par `extract_plain_text_from_tiptap` : une formule, une légende d'image
 * ou un bloc spécial n'y sont pas, alors que le destinataire les voyait. Le
 * modérateur jugeait donc un autre message que celui reçu.
 *
 * Décision de David (2026-11-28) : la fenêtre du signalement rend le contenu
 * comme le chat le rend (rendu RESTREINT : formules filtrées, images du seul
 * stockage du projet), pour le message signalé comme pour son contexte. Le
 * marquage et la recherche, qui lisent `plain_text`, ne changent pas.
 *
 * Chemin réel : `ReviewReportDialog` ouvert, réseau simulé (lecture du contexte).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { JSONContent } from '@tiptap/core';
import ReviewReportDialog, { type ReportData } from '../ReviewReportDialog.svelte';

// ============================================================================
// CONSTANTES
// ============================================================================

const HOTE = 'exemple.invalid';
const IMAGE_EXTERNE = `https://${HOTE}/traceur.png`;
const CONTEXTE = '/context';

// ============================================================================
// FUNCTIONS
// ============================================================================

const texte = (text: string): JSONContent => ({ type: 'text', text });
const formule = (latex: string): JSONContent => ({
	type: 'mathInline',
	attrs: { latex, syntax: 'latex' }
});

/** Un message du chat : texte, formule, image externe (ce que l'éditeur stocke). */
function messageAvecFormule(debut: string): JSONContent {
	return {
		type: 'doc',
		content: [
			{ type: 'paragraph', content: [texte(`${debut} `), formule('x^2+1')] },
			{ type: 'image', attrs: { src: IMAGE_EXTERNE, alt: 'zz-legende' } }
		]
	};
}

function signalement(patch: Partial<ReportData> = {}): ReportData {
	return {
		report_id: crypto.randomUUID(),
		message_id: crypto.randomUUID(),
		message_content: messageAvecFormule('zz-signale'),
		// Ce que `extract_plain_text_from_tiptap` en retient : ni formule, ni légende.
		message_plain_text: 'zz-signale',
		message_created_at: '2026-11-28T10:00:00.000Z',
		sender_id: crypto.randomUUID(),
		sender_firstname: 'Auteur',
		sender_lastname: 'Fictif',
		conversation_name: 'zz-groupe',
		reported_by: crypto.randomUUID(),
		reporter_firstname: 'Lecteur',
		reporter_lastname: 'Fictif',
		reason: 'inappropriate',
		details: null,
		status: 'pending',
		created_at: '2026-11-28T10:05:00.000Z',
		...patch
	};
}

/** Réseau simulé : la lecture du contexte rend `messages`, ou échoue (`null`). */
function reseau(messages: unknown[] | null): void {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (adresse: RequestInfo | URL) => {
			if (!String(adresse).includes(CONTEXTE)) return new Response('inattendu', { status: 500 });
			return messages === null
				? new Response('échec', { status: 500 })
				: Response.json({ messages });
		})
	);
}

/** La zone « Contexte de la conversation » de la fenêtre ouverte (portail). */
async function zoneDuMessage(report: ReportData): Promise<HTMLElement> {
	render(ReviewReportDialog, { props: { open: true, report } });
	await expect.poll(() => document.querySelector('[role="dialog"] .max-h-64')).not.toBeNull();
	const zone = document.querySelector<HTMLElement>('[role="dialog"] .max-h-64');
	if (!zone) throw new Error('zone du message absente');
	await expect.poll(() => zone.textContent).not.toContain('Chargement du contexte');
	return zone;
}

/** Les formules MathLive rendues dans la zone. */
function formulesRendues(zone: HTMLElement): string[] {
	return [...zone.querySelectorAll('math-span')].map((el) => el.textContent ?? '');
}

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

// ============================================================================
// TESTS
// ============================================================================

describe('signalement : le message rendu comme le destinataire l’a vu (écart T36)', () => {
	it('contexte illisible : le message signalé montre sa formule, sans charger l’image externe', async () => {
		reseau(null);
		const zone = await zoneDuMessage(signalement());

		await expect.poll(() => formulesRendues(zone)).toEqual(['x^2+1']);
		expect(zone.textContent).toContain('zz-signale');
		// Rendu restreint : l'image externe devient un texte, avec sa légende.
		expect(zone.textContent).toMatch(/image externe non affichée/);
		expect(zone.textContent).toContain('zz-legende');
		expect(zone.querySelector('img')).toBeNull();
	});

	it('contexte lu : chaque message du contexte est rendu, formules comprises', async () => {
		const report = signalement();
		reseau([
			{
				id: crypto.randomUUID(),
				conversation_id: crypto.randomUUID(),
				sender_id: crypto.randomUUID(),
				sender_firstname: 'Voisin',
				sender_lastname: 'Fictif',
				sender_avatar_url: null,
				content: messageAvecFormule('zz-avant'),
				plain_text: 'zz-avant',
				created_at: '2026-11-28T09:59:00.000Z',
				is_reported_message: false
			},
			{
				id: report.message_id,
				conversation_id: crypto.randomUUID(),
				sender_id: report.sender_id,
				sender_firstname: 'Auteur',
				sender_lastname: 'Fictif',
				sender_avatar_url: null,
				content: report.message_content,
				plain_text: report.message_plain_text,
				created_at: report.message_created_at,
				is_reported_message: true
			}
		]);
		const zone = await zoneDuMessage(report);

		await expect.poll(() => formulesRendues(zone)).toEqual(['x^2+1', 'x^2+1']);
		expect(zone.textContent).toContain('zz-avant');
		expect(zone.textContent).toContain('zz-signale');
		expect(zone.querySelector('img')).toBeNull();
	});

	it('contenu qui n’est pas un document : le texte du message reste lu', async () => {
		reseau(null);
		const zone = await zoneDuMessage(
			signalement({ message_content: { text: 'zz-ancien' }, message_plain_text: 'zz-ancien' })
		);
		await expect.poll(() => zone.textContent).toContain('zz-ancien');
		expect(zone.textContent).not.toContain('[Contenu non disponible]');
	});

	it('ni contenu ni texte : la fenêtre le dit', async () => {
		reseau(null);
		const zone = await zoneDuMessage(
			signalement({ message_content: null, message_plain_text: null })
		);
		await expect.poll(() => zone.textContent).toContain('[Contenu non disponible]');
	});
});
