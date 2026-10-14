/**
 * Un document téléversé part chez SON propriétaire (ADR 0029)
 * ===========================================================
 *
 * `DocumentUpload` sert le chapitre et le modèle. Un PDF déposé dans le modèle
 * doit demander son autorisation et s'enregistrer par les routes du MODÈLE :
 * c'est le serveur qui range alors le fichier sous `templates/<id>/`. Parti par
 * les routes du chapitre, il n'appartiendrait pas au modèle.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import DocumentUpload from '../DocumentUpload.svelte';

// Constantes
const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const MODELE = '22222222-2222-4222-8222-222222222222';

// Functions
/** Un client Supabase qui accepte tout dépôt signé. */
function fauxSupabase() {
	return {
		storage: {
			from: () => ({ uploadToSignedUrl: async () => ({ data: {}, error: null }) })
		}
	} as unknown as SupabaseClient<Database>;
}

/** Les appels réseau, et des réponses de succès. */
function espionnerFetch() {
	const urls: string[] = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
		urls.push(String(url));
		const corps = String(url).endsWith('/document-upload-url')
			? { storagePath: 'x/1.pdf', token: 'jeton' }
			: { placed: true };
		return new Response(JSON.stringify(corps), { status: 200 });
	});
	return urls;
}

function rendu() {
	return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/** Choisit un PDF puis envoie le formulaire. */
async function deposerUnPdf(racine: HTMLElement) {
	const input = racine.querySelector<HTMLInputElement>('input[type="file"]');
	if (!input) throw new Error('champ de fichier absent');
	const transfert = new DataTransfer();
	transfert.items.add(new File(['%PDF'], 'cours.pdf', { type: 'application/pdf' }));
	input.files = transfert.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	await rendu();

	racine.querySelector<HTMLFormElement>('[data-testid="upload-form"]')?.requestSubmit();
	// Trois étapes asynchrones : autorisation, dépôt, enregistrement.
	await rendu();
	await rendu();
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DocumentUpload — propriétaire du fichier', () => {
	it('dans un modèle, autorisation et enregistrement passent par les routes du modèle', async () => {
		const urls = espionnerFetch();
		const onSuccess = vi.fn();
		const { container } = await render(DocumentUpload, {
			templateId: MODELE,
			supabase: fauxSupabase(),
			onSuccess
		});

		await deposerUnPdf(container as HTMLElement);

		expect(urls).toEqual([
			`/api/teacher/chapter-templates/${MODELE}/document-upload-url`,
			`/api/teacher/chapter-templates/${MODELE}/documents`
		]);
		expect(onSuccess).toHaveBeenCalledOnce();
	});

	it('dans un chapitre, rien ne change : les routes du chapitre', async () => {
		const urls = espionnerFetch();
		const { container } = await render(DocumentUpload, {
			chapterId: CHAPITRE,
			supabase: fauxSupabase()
		});

		await deposerUnPdf(container as HTMLElement);

		expect(urls).toEqual([
			`/api/teacher/chapters/${CHAPITRE}/document-upload-url`,
			`/api/teacher/chapters/${CHAPITRE}/documents`
		]);
	});
});
