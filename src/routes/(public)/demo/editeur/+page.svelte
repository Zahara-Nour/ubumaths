<!--
	Vitrine : l'éditeur de texte (`/demo/editeur`)
	==============================================

	Le visiteur écrit une phrase avec des formules dans un seul éditeur ; trois
	cartes la montrent telle que la lisent trois usages réels, chacun par son
	vrai moteur d'affichage :
	- message privé au professeur : JSON → `RestrictedRichText` (`/messages/[id]`) ;
	- cahier de texte : HTML → `transformMathHtml` + liens de ressources
	  (`/dashboard/student/cahier-texte/[entryId]`) ;
	- énoncé d'exercice : markdown → `MarkdownRenderer` (`ExerciseDisplay`).
	Rien n'est envoyé ni enregistré. Le banc d'essai complet (réglages,
	messagerie) reste sur `/dev/editeur-riche` (chantier demo-debug, PR 6h).
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { onMount } from 'svelte';
	import { generateHTML, type JSONContent } from '@tiptap/core';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import * as Card from '$lib/components/ui/card';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import RestrictedRichText from '$lib/components/rich-text/RestrictedRichText.svelte';
	import { createEditorExtensions } from '$lib/components/rich-text/editor-config';
	import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';
	import { linkifyResourceReferences } from '$lib/resources/linkify';
	import { transformMathHtml } from '$lib/utils/sanitize';

	// Constantes
	const INITIAL_DOC: JSONContent = {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'La solution de ' },
					{ type: 'mathInline', attrs: { latex: '2x+3=11' } },
					{ type: 'text', text: ' est ' },
					{ type: 'mathInline', attrs: { latex: 'x=4' } },
					{ type: 'text', text: '.' }
				]
			}
		]
	};

	// Variables
	let doc = $state<unknown>(INITIAL_DOC);
	let mounted = $state(false);

	// Les trois formes que gardent les usages réels, tirées du même document
	let markdown = $derived(tipTapToMarkdown(doc as JSONContent));
	// Même sérialisation que `editor.getHTML()`. Elle a besoin du DOM, donc pas au serveur ; et
	// pas avant le montage : l'hydratation garde le `{@html}` du serveur sans le corriger.
	let html = $derived(
		mounted ? generateHTML(doc as JSONContent, createEditorExtensions({ headingLevels: 6 })) : ''
	);
	let lessonHtml = $derived(
		linkifyResourceReferences(transformMathHtml(html), { role: 'student' })
	);
	let isEmpty = $derived(markdown.trim() === '');

	// Functions
	onMount(() => {
		mounted = true;
	});
</script>

<SeoHead {...demoSeo('/demo/editeur')} />

<div class="container mx-auto max-w-3xl space-y-6 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-3xl font-bold">L’éditeur de texte</h1>
		<p class="text-muted-foreground">
			Le même éditeur sert à écrire un message, une séance du cahier de texte ou un énoncé
			d’exercice, formules comprises. Écrivez une phrase : elle apparaît dessous telle qu’on la lit
			dans chacun de ces trois usages.
		</p>
		<p class="text-sm text-muted-foreground">Rien n’est enregistré sur cette page.</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Écrivez</Card.Title>
			<Card.Description>
				Le bouton Σ de la barre d’outils donne accès aux formules.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<RichTextEditor bind:jsonValue={doc} preset="standard" minHeight="120px" />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Un message au professeur</Card.Title>
			<Card.Description>
				L’élève écrit à son professeur ; le professeur le lit dans sa messagerie.
			</Card.Description>
		</Card.Header>
		<Card.Content data-testid="usage-message">
			{#if isEmpty}
				<p class="text-muted-foreground italic">Écrivez une phrase ci-dessus.</p>
			{:else}
				<RestrictedRichText content={doc} class="prose prose-sm max-w-none dark:prose-invert" />
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Le cahier de texte</Card.Title>
			<Card.Description>
				Le professeur écrit la séance ; ses élèves la lisent dans leur cahier de texte.
			</Card.Description>
		</Card.Header>
		<Card.Content data-testid="usage-cahier">
			{#if isEmpty}
				<p class="text-muted-foreground italic">Écrivez une phrase ci-dessus.</p>
			{:else}
				<div class="lesson prose prose-sm max-w-none dark:prose-invert">
					{@html lessonHtml}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Un énoncé d’exercice</Card.Title>
			<Card.Description>
				Le professeur écrit l’énoncé ; l’élève le lit en faisant l’exercice.
			</Card.Description>
		</Card.Header>
		<Card.Content data-testid="usage-enonce">
			{#if isEmpty}
				<p class="text-muted-foreground italic">Écrivez une phrase ci-dessus.</p>
			{:else}
				<MarkdownRenderer content={markdown} />
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<style>
	/* Comme au cahier de texte de l'élève : les formules restent dans la ligne */
	.lesson :global(.math-inline-wrapper) {
		display: inline;
	}
	.lesson :global(.math-block-wrapper) {
		display: block;
		text-align: center;
		margin: 1rem 0;
	}
	.lesson :global(math-field) {
		font-size: inherit;
	}
</style>
