<!--
	Fiche d'exercices ouverte depuis le lien du cours (ADR 0025)
	===========================================================

	Calque de `cahier/[token]/fiche/[id]` : ce que voit un élève ou une famille
	sans compte en ouvrant une fiche du cours. Composition du PDF dans le
	navigateur ; `variant="reader"` : voir et télécharger, jamais la correction.
-->
<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import * as Card from '$lib/components/ui/card';
	import PdfPreview from '$lib/components/worksheets/PdfPreview.svelte';
	import type { WorksheetWithRelations } from '$lib/types/worksheets';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// La fonction SQL renvoie la forme attendue par le composant ; le cast est la
	// frontière entre du jsonb (validé par Zod côté serveur) et le type de l'application.
	const worksheet = $derived(data.worksheet as unknown as WorksheetWithRelations);
</script>

<svelte:head>
	<title>{worksheet.title} — Fiche d'exercices</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4">
	<header class="space-y-3">
		<BackLink href={`/cours/${data.token}`} label="Retour au cours" class="mb-0" />
		<div>
			<h1 class="text-2xl font-bold">{worksheet.title}</h1>
			{#if worksheet.description}
				<p class="text-muted-foreground">{worksheet.description}</p>
			{/if}
		</div>
	</header>

	<Card.Root>
		<Card.Content class="p-4">
			<PdfPreview {worksheet} variant="reader" />
		</Card.Content>
	</Card.Root>

	<p class="pt-2 text-center text-xs text-muted-foreground">
		Lien de consultation. Il ne permet pas de rejoindre la classe ni de se connecter.
	</p>
</div>
