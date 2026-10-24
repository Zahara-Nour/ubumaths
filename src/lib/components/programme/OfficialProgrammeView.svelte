<!--
	OfficialProgrammeView — le programme officiel (BO) d'un niveau
	==============================================================
	Deux lectures du même texte, pour la page Programme :
	- `pdf` : le PDF du BO dans le lecteur du navigateur (recherche, zoom,
	  sélection), plus un lien pour l'ouvrir dans un onglet (aperçu médiocre
	  sur iPhone / iPad) et un lien de téléchargement ;
	- `texte` : sa transcription ubumark, ou un message tant qu'elle n'est pas
	  écrite ; un niveau de titre = une couleur, pour se repérer dans un texte
	  long (titre du BO en couleur du texte).
	`official` null : pas de mathématiques à ce niveau (terminale générale).

	@module components/programme/OfficialProgrammeView
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { OfficialProgramme } from '$lib/programmes/official-programmes';
	import { Download, ExternalLink } from '@lucide/svelte';

	interface Props {
		official: OfficialProgramme | null;
		/** Transcription ubumark ; null : pas encore écrite (ou vue PDF) */
		transcription: string | null;
		view: 'pdf' | 'texte';
	}

	let { official, transcription, view }: Props = $props();
</script>

{#if !official}
	<div class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
		Pas de programme de mathématiques pour ce niveau
	</div>
{:else}
	<div class="space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm font-medium">{official.title}</p>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					href={official.pdfUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					<ExternalLink class="mr-1 h-4 w-4" />
					Ouvrir le PDF dans un onglet
				</Button>
				<Button variant="outline" size="sm" href={official.pdfUrl} download>
					<Download class="mr-1 h-4 w-4" />
					Télécharger
				</Button>
			</div>
		</div>

		{#if view === 'pdf'}
			<iframe src={official.pdfUrl} title={official.title} class="h-[80vh] w-full rounded-lg border"
			></iframe>
		{:else if transcription}
			<article class="bo-texte rounded-lg border p-6">
				<MarkdownRenderer content={transcription} lexiconGrade={null} />
			</article>
		{:else}
			<div class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
				Transcription pas encore disponible pour ce niveau : le PDF reste consultable.
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Une couleur par niveau de titre de la transcription (classes `md-hN` de HeadingNode) */
	.bo-texte :global(.md-h2) {
		color: var(--color-curve-1);
	}
	.bo-texte :global(.md-h3) {
		color: var(--color-curve-2);
	}
	.bo-texte :global(.md-h4) {
		color: var(--color-curve-3);
	}
	.bo-texte :global(.md-h5) {
		color: var(--color-curve-4);
	}
	.bo-texte :global(.md-h6) {
		color: var(--color-fig-vert);
	}
</style>
