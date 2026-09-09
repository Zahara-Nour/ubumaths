<!--
	Fiche d'exercices en consultation publique
	==========================================

	Ce que voit un élève ou une famille sans compte, en cliquant sur une fiche
	citée dans le cahier de texte. Rien d'autre : pas de navigation vers le reste
	de l'application, pas de connexion suggérée.

	La composition du PDF se fait DANS LE NAVIGATEUR (Typst.js) : la génération
	serveur n'existe pas (`api/worksheets/[id]/pdf` répond 501). Ça tombe bien —
	le lecteur n'a pas de compte, et rien n'a besoin d'être calculé pour lui.

	`allowCorrection={false}` : un lien de consultation ne montre JAMAIS les
	corrections. C'est la raison d'être de cette prop.
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';
	import PdfPreview from '$lib/components/worksheets/PdfPreview.svelte';
	import type { WorksheetWithRelations } from '$lib/types/worksheets';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// La fonction SQL renvoie déjà la forme attendue par le composant ; le cast
	// est la frontière entre du jsonb et le type de l'application.
	const worksheet = $derived(data.worksheet as unknown as WorksheetWithRelations);
</script>

<svelte:head>
	<title>{worksheet.title} — Fiche d'exercices</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4">
	<header class="space-y-3">
		<Button variant="ghost" size="sm" href="/cahier/{data.token}">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour au cahier de texte
		</Button>
		<div>
			<h1 class="text-2xl font-bold">{worksheet.title}</h1>
			{#if worksheet.description}
				<p class="text-muted-foreground">{worksheet.description}</p>
			{/if}
		</div>
	</header>

	<Card.Root>
		<Card.Content class="p-4">
			<PdfPreview {worksheet} allowCorrection={false} />
		</Card.Content>
	</Card.Root>

	<p class="pt-2 text-center text-xs text-muted-foreground">
		Lien de consultation. Il ne permet pas de rejoindre la classe ni de se connecter.
	</p>
</div>
