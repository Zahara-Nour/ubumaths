<script lang="ts">
	/**
	 * Bouton « signaler » du serveur de dev
	 * =====================================
	 *
	 * Petit bouton flottant, chargé par le layout racine en dev seulement
	 * (`import.meta.env.DEV`) : jamais dans le build. Un appui ouvre une case de
	 * texte ; « Envoyer » écrit sur le Mac mini la note, l'adresse de la page, la
	 * taille de l'écran, le navigateur, le compte fictif connecté et les erreurs
	 * de console vues depuis le chargement (`scripts/retours/plugin.ts`).
	 *
	 * Caché quand le serveur ne vise pas la base locale : la route refuserait.
	 * La case s'ouvre en HAUT de l'écran : en bas, le clavier de l'iPhone la cache.
	 */
	import { PUBLIC_SUPABASE_URL } from '$app/env/public';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { collectedErrors } from '#lib/dev/feedback-collector.ts';
	import {
		FEEDBACK_ENDPOINT,
		MAX_NOTE,
		isLocalSupabaseUrl,
		type FeedbackPayload
	} from '#lib/dev/feedback.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';

	interface Props {
		/** Compte connecté (fictif : base locale), `null` pour un visiteur */
		account: { email: string; role: string } | null;
	}

	let { account }: Props = $props();

	const available = isLocalSupabaseUrl(PUBLIC_SUPABASE_URL);

	let open = $state(false);
	let note = $state('');
	let sending = $state(false);
	let errorCount = $state(0);

	function toggle() {
		open = !open;
		if (open) errorCount = collectedErrors().errors.length;
	}

	async function send() {
		if (sending) return;
		sending = true;
		const { errors, dropped } = collectedErrors();
		const payload: FeedbackPayload = {
			note: note.slice(0, MAX_NOTE),
			url: location.href.slice(0, 2000),
			viewport: {
				width: Math.round(window.innerWidth),
				height: Math.round(window.innerHeight),
				dpr: Math.min(window.devicePixelRatio || 1, 10)
			},
			userAgent: navigator.userAgent.slice(0, 500),
			account,
			errors,
			droppedErrors: dropped
		};
		try {
			const response = await fetch(FEEDBACK_ENDPOINT, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				const body: unknown = await response.json().catch(() => null);
				const message =
					body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
						? body.message
						: `erreur ${response.status}`;
				toaster.error(`Retour non envoyé : ${message}`);
				return;
			}
			toaster.success('Retour envoyé');
			note = '';
			open = false;
		} catch {
			toaster.error('Retour non envoyé : serveur de dev injoignable');
		} finally {
			sending = false;
		}
	}
</script>

{#if available}
	<button
		type="button"
		class="fixed bottom-2 left-2 z-[250] rounded-full border border-border bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-md backdrop-blur hover:text-foreground"
		aria-expanded={open}
		aria-controls="signaler-dev"
		onclick={toggle}
	>
		Signaler
	</button>

	{#if open}
		<div
			id="signaler-dev"
			role="dialog"
			aria-label="Signaler un problème (serveur de dev)"
			class="fixed inset-x-2 top-2 z-[250] mx-auto flex max-w-md flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-xl"
		>
			<label for="signaler-dev-note" class="text-sm font-medium">
				Que se passe-t-il sur cette page ?
			</label>
			<Textarea
				id="signaler-dev-note"
				bind:value={note}
				maxlength={MAX_NOTE}
				rows={4}
				placeholder="Note facultative : les erreurs de console partent de toute façon"
			/>
			<p class="text-xs text-muted-foreground">
				Envoyé avec l'adresse de la page, la taille de l'écran,
				{account ? 'le compte connecté' : 'aucun compte (visiteur)'} et
				{errorCount === 0
					? 'aucune erreur de console'
					: errorCount === 1
						? '1 erreur de console'
						: `${errorCount} erreurs de console`}.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="outline" size="sm" onclick={toggle} disabled={sending}>Fermer</Button>
				<Button size="sm" onclick={send} disabled={sending}>
					{sending ? 'Envoi…' : 'Envoyer'}
				</Button>
			</div>
		</div>
	{/if}
{/if}
