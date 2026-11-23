<!--
	SeriesStartScreen
	=================
	Page d'attente avant de lancer une série (chantier `diaporama-reglages`) :
	cadre commun aux formes de série. En tête (titre, résumé), réglages propres à
	la forme, indications courtes, puis le bouton « C'est parti ! ».

	Le clic sur « C'est parti ! » est un geste de l'utilisateur : la forme peut y
	débloquer le son et le plein écran (exigé par les navigateurs).
-->

<script lang="ts" module>
	export interface StartHint {
		/** Touche ou geste, ex. « Espace » */
		key: string;
		/** Ce qu'il fait, ex. « pause » */
		label: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import { Play } from '@lucide/svelte';

	// Types
	interface Props {
		/** Nom de la forme, ex. « En classe » */
		title: string;
		/** Ex. « 10 questions · environ 4 min » */
		summary: string;
		hints: StartHint[];
		/** Page à laquelle « Quitter » ramène */
		quitHref: string;
		onstart: () => void;
		/** Texte du bouton (« Reprendre » pour une tentative commencée) */
		startLabel?: string;
		/** Démarrage en cours : bouton inactif (pas de double démarrage) */
		starting?: boolean;
		/** Réglages de la forme */
		settings?: Snippet;
	}

	// Props
	let {
		title,
		summary,
		hints,
		quitHref,
		onstart,
		startLabel = "C'est parti !",
		starting = false,
		settings
	}: Props = $props();
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 py-6">
	<BackLink href={quitHref} label="Quitter" kind="quit" class="mb-0" />

	<header class="space-y-1 text-center">
		<h2 class="text-3xl font-bold">{title}</h2>
		<p class="text-lg text-muted-foreground" data-testid="series-start-summary">{summary}</p>
	</header>

	{#if settings}
		<section class="rounded-lg border bg-card p-4" aria-labelledby="series-start-settings-title">
			<h3 id="series-start-settings-title" class="mb-3 text-lg font-semibold">Réglages</h3>
			{@render settings()}
		</section>
	{/if}

	{#if hints.length > 0}
		<ul
			class="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
			data-testid="series-start-hints"
		>
			{#each hints as hint (hint.key)}
				<li>
					<kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
						>{hint.key}</kbd
					>
					{hint.label}
				</li>
			{/each}
		</ul>
	{/if}

	<div class="flex justify-center">
		<Button size="lg" class="h-14 px-10 text-xl" onclick={onstart} disabled={starting}>
			<Play class="mr-2 h-6 w-6" />
			{startLabel}
		</Button>
	</div>
</div>
