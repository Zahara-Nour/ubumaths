<!--
	ResourceRow — une ressource du cours, vue élève, en une ligne
	=============================================================
	Pastille du type, titre (tel que le professeur l'a saisi), et à droite le
	téléchargement quand il existe. Toute la ligne ouvre la ressource. À placer
	dans un `<ul>` encadré (`divide-y rounded-xl border`) : il porte le cadre et les séparateurs.

	Le titre n'est PAS un titre HTML : la règle globale `main h3` de `app.css`
	lui imposerait la taille d'un titre de section (cause du design précédent,
	où documents et sections avaient la même taille).

	@module components/cours/ResourceRow
-->
<script lang="ts">
	import { cn } from '#lib/utils.ts';
	import { Download, ExternalLink } from '@lucide/svelte';
	import type { ResourceKind } from './plan-groups';

	// Types
	interface Props {
		title: string;
		/** Texte du professeur sous le titre ; absent = rien. */
		description?: string | null;
		kind: ResourceKind;
		/** Ouvre la ressource ; absent = ligne non cliquable. */
		href: string | null;
		/** Nouvel onglet (fichier, Drive) plutôt que navigation dans le site. */
		newTab?: boolean;
		/** Téléchargement direct ; absent = pas de bouton. */
		downloadHref?: string | null;
	}

	// Constantes
	const BADGES: Record<ResourceKind, { label: string; classes: string }> = {
		pdf: { label: 'PDF', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
		image: {
			label: 'IMG',
			classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
		},
		video: {
			label: 'VID',
			classes: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
		},
		file: { label: 'DOC', classes: 'bg-muted text-muted-foreground' },
		drive: {
			label: 'DRIVE',
			classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
		},
		worksheet: {
			label: 'FICHE',
			classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
		},
		exercise: {
			label: 'EXO',
			classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
		}
	};

	let {
		title,
		description = null,
		kind,
		href,
		newTab = false,
		downloadHref = null
	}: Props = $props();

	const badge = $derived(BADGES[kind]);
	const linkTarget = $derived(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {});
</script>

{#snippet contenu()}
	<span
		class={cn(
			'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[0.625rem] font-bold tracking-wide',
			badge.classes
		)}
		aria-hidden="true"
	>
		{badge.label}
	</span>
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="font-medium wrap-anywhere">{title}</span>
		{#if description}
			<span class="line-clamp-2 text-sm text-muted-foreground">{description}</span>
		{/if}
		{#if newTab}
			<span class="sr-only">(nouvel onglet)</span>
		{/if}
	</span>
	{#if newTab && kind === 'drive'}
		<ExternalLink class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
	{/if}
{/snippet}

<li class="flex items-center">
	{#if href}
		<a
			{href}
			{...linkTarget}
			class="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
		>
			{@render contenu()}
		</a>
	{:else}
		<div class="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
			{@render contenu()}
		</div>
	{/if}
	{#if downloadHref}
		<a
			href={downloadHref}
			class="mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
			aria-label="Télécharger {title}"
			title="Télécharger"
		>
			<Download class="h-5 w-5" aria-hidden="true" />
		</a>
	{/if}
</li>
