/**
 * Envoi du formulaire d'énigme (création, édition) à l'action de la page.
 *
 * L'action répond au format de SvelteKit (`{ type, status, data }`, `data` sérialisé) :
 * lu sans `deserialize`, le succès ne se voyait jamais et la page annonçait une erreur
 * après un enregistrement réussi.
 */
import { deserialize } from '$app/forms';
import type { CreateRiddleData } from '$lib/types/riddle';

export type SubmitRiddleFormResult = { ok: true } | { ok: false; message: string | null };

/**
 * Corps du formulaire. Genre et image vides ne sont pas envoyés. Sans réponse
 * attendue (validation à la main), `answer` part en `null` : `JSON.stringify(undefined)`
 * envoyait la chaîne « undefined », illisible pour le serveur.
 */
export function buildRiddleFormBody(data: CreateRiddleData): FormData {
	const body = new FormData();
	body.append('title', data.title);
	if (data.genre) body.append('genre', data.genre);
	body.append('difficulty', data.difficulty.toString());
	body.append('statement', data.statement);
	body.append('correction', data.correction);
	if (data.image_url) body.append('image_url', data.image_url);
	body.append('answer', JSON.stringify(data.answer ?? null));
	body.append('status', data.status || 'draft');
	return body;
}

export async function submitRiddleForm(
	body: FormData,
	fetcher: typeof fetch = fetch
): Promise<SubmitRiddleFormResult> {
	const response = await fetcher('', {
		method: 'POST',
		body,
		headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
	});
	const result = deserialize(await response.text());

	if (result.type === 'success') return { ok: true };
	if (result.type === 'failure') {
		const message = result.data?.message;
		return { ok: false, message: typeof message === 'string' ? message : null };
	}
	return { ok: false, message: null };
}
