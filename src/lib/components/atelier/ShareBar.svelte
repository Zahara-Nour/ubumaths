<script lang="ts">
	/**
	 * La barre de partage et de réception — lot 5.
	 *
	 * Deux usages qu'il ne faut pas confondre (§6) : **partager son atelier**, et
	 * **ouvrir un contenu sans toucher au sien**.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { encodeAtelier, MAX_URL_PAYLOAD } from '$lib/atelier/url';
	import { mergeInto } from '$lib/atelier/merge';
	import type { AtelierState } from '$lib/atelier/persistence';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		/** L'atelier reçu par l'URL, quand il y en a un : on est alors éphémère. */
		received?: AtelierState | null;
		/** Ce que la relecture de l'URL a eu à dire — erreur ou objets écartés. */
		notice?: string | null;
	}

	let { received = null, notice = null }: Props = $props();

	const atelier = useAtelier();

	let link = $state<string | null>(null);
	let message = $state<string | null>(null);
	let busy = $state(false);

	/**
	 * Fabriquer le lien.
	 *
	 * ⚠️ La taille est annoncée **avant** la copie (§6 L1) : `/calc` refuse
	 * aujourd'hui après coup, ce qui fait perdre le geste à l'élève.
	 */
	async function share() {
		if (atelier.objects.length === 0) {
			message = 'Ton atelier est vide : il n’y a rien à partager.';
			link = null;
			return;
		}

		busy = true;
		try {
			const encoded = await encodeAtelier(atelier.serialize());
			if (!encoded.withinLimit) {
				message = `Ton atelier est trop volumineux pour un lien (${encoded.payload.length} caractères sur ${MAX_URL_PAYLOAD} possibles). Retire quelques objets, ou raccourcis tes listes.`;
				link = null;
				return;
			}
			const url = `${location.origin}${location.pathname}?a=${encoded.payload}`;
			link = url;
			try {
				await navigator.clipboard.writeText(url);
				message = 'Lien copié.';
			} catch {
				// ⚠️ Le presse-papier peut refuser (permission, contexte non sécurisé).
				// Le lien reste affiché et sélectionnable : jamais un échec muet.
				message = 'Copie automatique impossible — sélectionne le lien ci-dessous.';
			}
		} finally {
			busy = false;
		}
	}

	/** Verser dans son atelier ce qu'on a reçu — décision Q2. */
	function keep() {
		if (received === null) return;
		const report = mergeInto(atelier, received);

		const parts: string[] = [];
		if (report.added > 0)
			parts.push(
				`${report.added} objet${report.added > 1 ? 's' : ''} ajouté${report.added > 1 ? 's' : ''}`
			);
		for (const { from, to } of report.renamed) parts.push(`« ${from} » gardé sous « ${to} »`);
		if (report.refused.length > 0)
			parts.push(`${report.refused.length} refusé${report.refused.length > 1 ? 's' : ''}`);

		message = parts.length === 0 ? 'Il n’y avait rien à garder.' : parts.join(' · ');
	}
</script>

<div class="partage">
	{#if received !== null}
		<!--
			⚠️ La bannière dit que l'atelier personnel n'est PAS touché (§6 N3).
			Sans elle, l'élève croit avoir perdu son travail.
		-->
		<p class="bandeau" role="status">
			Tu regardes un atelier partagé. <strong>Le tien n’a pas été modifié.</strong>
		</p>
		<Button size="sm" onclick={keep}>Garder dans mon atelier</Button>
	{:else}
		<Button size="sm" variant="outline" disabled={busy} onclick={share}>Partager…</Button>
	{/if}

	<p class="retour-partage" aria-live="polite" class:vide={message === null && notice === null}>
		{message ?? notice ?? ''}
	</p>

	{#if link !== null}
		<!-- Sélectionnable : c'est le repli quand le presse-papier refuse. -->
		<input class="lien" type="text" readonly value={link} aria-label="Lien de partage" />
	{/if}
</div>

<style>
	.partage {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		border-bottom: 1px solid var(--color-border);
	}

	.bandeau {
		margin: 0;
		font-size: 0.8125rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background: var(--color-muted);
		color: var(--color-foreground);
	}

	.retour-partage {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
		flex: 1 1 12rem;
		min-width: 0;
	}
	.retour-partage.vide {
		visibility: hidden;
	}

	.lien {
		flex: 1 1 100%;
		min-width: 0;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-background);
		color: var(--color-foreground);
	}
</style>
