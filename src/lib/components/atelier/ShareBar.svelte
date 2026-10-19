<script lang="ts">
	/**
	 * La barre de partage et de réception — lot 5.
	 *
	 * Deux usages qu'il ne faut pas confondre (§6) : **partager son atelier**, et
	 * **ouvrir un contenu sans toucher au sien** — puis, au choix, le garder dans le
	 * sien (la fusion) ou le prendre à la place du sien (« Remplacer mon atelier »,
	 * `atelier-remplacer-phase0.md`).
	 *
	 * Le bouton « Partager » est dans la barre d'icônes de l'atelier (lot 1 de
	 * `atelier-refonte-interface-phase0.md`), qui appelle `share()` ; cette barre
	 * garde ce qui se lit : le bandeau d'un atelier reçu, le retour, le lien.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { encodeAtelier, MAX_URL_PAYLOAD } from '$lib/atelier/url';
	import { keepReceived } from '$lib/atelier/merge';
	import { renamedOnReadMessage } from '$lib/atelier/geometry';
	import { onMount } from 'svelte';
	import type { AtelierState } from '$lib/atelier/persistence';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		/** L'atelier reçu par l'URL, quand il y en a un : on est alors éphémère. */
		received?: AtelierState | null;
		/** Ce que la relecture de l'URL a eu à dire — erreur ou objets écartés. */
		notice?: string | null;
		/**
		 * « Remplacer mon atelier » (R1 de `atelier-remplacer-phase0.md`) : le
		 * conteneur confirme, met l'atelier personnel de côté et quitte le lien.
		 */
		onReplace?: () => void;
	}

	let { received = null, notice = null, onReplace }: Props = $props();

	const atelier = useAtelier();

	let link = $state<string | null>(null);

	/**
	 * La notice (lien abîmé, objets écartés) est écrite APRÈS le montage : une
	 * région `aria-live` qui apparaît avec son texte déjà dedans n'est pas
	 * annoncée — l'élève ne saurait pas que son lien est cassé (revue a11y).
	 */
	let shownNotice = $state<string | null>(null);
	onMount(() => {
		const timer = setTimeout(() => (shownNotice = notice), 0);
		return () => clearTimeout(timer);
	});
	let message = $state<string | null>(null);
	let busy = $state(false);

	/**
	 * Fabriquer le lien.
	 *
	 * ⚠️ La taille est annoncée **avant** la copie (§6 L1) : `/calc` refuse
	 * aujourd'hui après coup, ce qui fait perdre le geste à l'élève.
	 */
	export async function share() {
		if (busy) return;
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

	/**
	 * Verser dans son atelier ce qu'on a reçu — décision Q2.
	 *
	 * ⚠️ Dans l'atelier PERSONNEL (celui du navigateur), pas dans l'atelier
	 * affiché : celui-ci est l'atelier éphémère du lien, qui contient déjà ces
	 * objets — on en faisait des copies, et rien n'était enregistré (revue du
	 * lot 6, C1).
	 */
	function keep() {
		if (received === null) return;
		let storage: Storage | null = null;
		try {
			storage = window.localStorage;
		} catch {
			storage = null;
		}
		const kept = keepReceived(storage, received);
		if (!kept.ok) {
			message = kept.message;
			return;
		}
		const report = kept.report;

		const parts: string[] = [];
		if (report.added > 0)
			parts.push(
				`${report.added} objet${report.added > 1 ? 's' : ''} ajouté${report.added > 1 ? 's' : ''}`
			);
		for (const { from, to } of report.renamed) parts.push(`« ${from} » gardé sous « ${to} »`);
		if (report.refused.length > 0)
			parts.push(`${report.refused.length} refusé${report.refused.length > 1 ? 's' : ''}`);
		// Lot 5 (phase 0 §4) : la graine reste la nôtre, ses tirages sont refaits
		if (report.redrawn) parts.push('les tirages au hasard sont refaits dans ton atelier');

		const summary =
			parts.length === 0
				? 'Il n’y avait rien à garder.'
				: `${parts.join(' · ')} dans ton atelier — tu le retrouves dans « Atelier ».`;
		// Q2 de la géométrie : un `y` de l'atelier personnel renommé en l'enregistrant
		const migrations = (report.migrated ?? []).map(renamedOnReadMessage);
		message = [summary, ...migrations].join(' ');
	}
</script>

<!-- Rien à dire : la barre ne prend pas de place, mais sa région `aria-live` reste -->
<div
	class="partage"
	class:vide={received === null && message === null && shownNotice === null && link === null}
>
	{#if received !== null}
		<!--
			⚠️ La bannière dit que l'atelier personnel n'est PAS touché (§6 N3).
			Sans elle, l'élève croit avoir perdu son travail.
		-->
		<p class="bandeau" role="status">
			Tu regardes un atelier partagé. <strong>Le tien n’a pas été modifié.</strong>
		</p>
		<Button size="sm" onclick={keep}>Garder dans mon atelier</Button>
		<!-- R1 : l'autre geste — l'atelier reçu à la place du sien, qui est mis de côté -->
		{#if onReplace}
			<Button size="sm" variant="outline" onclick={onReplace}>Remplacer mon atelier</Button>
		{/if}
	{/if}

	<p
		class="retour-partage"
		aria-live="polite"
		class:vide={message === null && shownNotice === null}
	>
		{message ?? shownNotice ?? ''}
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
	.partage.vide {
		padding: 0;
		border-bottom: none;
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
