<!--
	Accueil d'un espace de pages (`/dev`, `/aide-ecriture`) : un titre, une phrase,
	la liste des pages de l'espace. Liste vide → « Aucune page pour l'instant ».
-->
<script lang="ts" module>
	export interface IndexedPage {
		href: string;
		title: string;
		description: string;
	}
</script>

<script lang="ts">
	import { resolve } from '$app/paths';

	let { title, intro, pages }: { title: string; intro: string; pages: IndexedPage[] } = $props();
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="mb-2 text-3xl font-bold">{title}</h1>
	<p class="mb-8 text-muted-foreground">{intro}</p>

	{#if pages.length === 0}
		<p class="text-muted-foreground">Aucune page pour l'instant.</p>
	{:else}
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each pages as p (p.href)}
				<li>
					<a
						href={resolve(p.href as '/')}
						class="block h-full rounded-lg border border-border p-4 transition-colors hover:bg-muted"
					>
						<span class="font-semibold">{p.title}</span>
						<span class="mt-1 block text-sm text-muted-foreground">{p.description}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
