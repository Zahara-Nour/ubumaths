<!--
	Page d'aide d'un bloc ubumark (`/aide-ecriture/blocs/<bloc>`, prof) :
	réglages, exemples à copier, erreurs typiques, zone « Essayer ».
	Contenu : une fiche de `$lib/block-catalog`.
-->
<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import * as Table from '$lib/components/ui/table';
	import { resolve } from '$app/paths';
	import type { BlockCatalogEntry } from '$lib/block-catalog';
	import BlockSource from './BlockSource.svelte';
	import BlockTryIt from './BlockTryIt.svelte';

	let { entry }: { entry: BlockCatalogEntry } = $props();

	// Une fiche qui garde sa propre adresse (cercle trigo) a pour parente l'aide entière
	const back = $derived(
		entry.href
			? { href: '/aide-ecriture', label: 'Retour à l’aide à l’écriture' }
			: { href: '/aide-ecriture/blocs', label: 'Retour aux blocs' }
	);
</script>

<svelte:head>
	<title>{entry.title} · Aide à l’écriture · Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
	<BackLink href={back.href} label={back.label} />
	<h1 class="mb-2 text-3xl font-bold">{entry.title}</h1>
	<div class="mb-2 flex flex-wrap gap-2">
		{#each entry.fences as name (name)}
			<code class="rounded bg-muted px-2 py-0.5 text-sm">```{name}</code>
		{/each}
	</div>
	<p class="mb-8 text-muted-foreground">{entry.intro}</p>

	<section class="mb-10">
		<h2 class="mb-4 text-2xl font-semibold">Réglages</h2>
		<p class="mb-4 text-muted-foreground">
			Une ligne par réglage, écrite <code>clé: valeur</code>, entre la ligne d’ouverture et les
			trois accents graves de fin.
		</p>
		{#each entry.settingGroups as group, index (index)}
			{#if group.title}
				<h3 class="mt-6 mb-2 text-lg font-semibold">{group.title}</h3>
			{/if}
			<div class="overflow-x-auto rounded-lg border border-border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Clé</Table.Head>
							<Table.Head>Valeurs</Table.Head>
							<Table.Head>Par défaut</Table.Head>
							<Table.Head>Effet</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each group.settings as setting (setting.key)}
							<Table.Row>
								<Table.Cell class="align-top"><code>{setting.key}:</code></Table.Cell>
								<Table.Cell class="align-top whitespace-normal">{setting.values}</Table.Cell>
								<Table.Cell class="align-top whitespace-normal">
									{#if setting.defaultValue === null}
										<strong>obligatoire</strong>
									{:else}
										{setting.defaultValue}
									{/if}
								</Table.Cell>
								<Table.Cell class="align-top whitespace-normal">{setting.description}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{/each}
		{#if entry.seeAlso}
			<p class="mt-4">
				Voir aussi :
				<a href={resolve(entry.seeAlso.href as '/')} class="text-primary underline">
					{entry.seeAlso.label}
				</a>
			</p>
		{/if}
	</section>

	<section class="mb-10">
		<h2 class="mb-4 text-2xl font-semibold">Exemples</h2>
		<div class="flex flex-col gap-8">
			{#each entry.examples as example (example.title)}
				<article class="rounded-lg border border-border p-4">
					<h3 class="mb-1 text-lg font-semibold">{example.title}</h3>
					<p class="mb-4 text-muted-foreground">{example.explanation}</p>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<BlockSource source={example.source} />
						<div
							class="flex min-h-32 items-center justify-center overflow-x-auto rounded-lg bg-muted/50 p-4"
						>
							<!-- min-w-0 : sans lui, le rendu garde sa largeur de départ (droite à 600 px) et déborde des deux côtés -->
							<div class="min-w-0">
								<MarkdownRenderer content={example.source} showAuthoringErrors />
							</div>
						</div>
					</div>
				</article>
			{/each}
		</div>
	</section>

	{#if entry.mistakes.length > 0}
		<section class="mb-10">
			<h2 class="mb-4 text-2xl font-semibold">Erreurs fréquentes</h2>
			<div class="flex flex-col gap-8">
				{#each entry.mistakes as mistake (mistake.title)}
					<article class="rounded-lg border border-border p-4">
						<h3 class="mb-1 text-lg font-semibold">{mistake.title}</h3>
						<p class="mb-4 text-muted-foreground">{mistake.explanation}</p>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<pre class="overflow-x-auto rounded-md bg-muted p-3 text-sm">{mistake.source}</pre>
							<div class="overflow-x-auto rounded-lg bg-muted/50 p-4">
								<MarkdownRenderer content={mistake.source} showAuthoringErrors />
							</div>
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<section>
		<h2 class="mb-4 text-2xl font-semibold">Essayer</h2>
		<p class="mb-4 text-muted-foreground">
			Modifie le bloc : le rendu et les messages d’erreur suivent à chaque frappe.
		</p>
		<BlockTryIt initial={entry.tryIt} />
	</section>
</div>
