<!--
	Vue de nœud partagée pour les blocs DSL en clôture
	=================================================

	Un arbre de probabilité et un cercle trigonométrique sont, du point de vue de
	l'éditeur, le même objet : un bloc ```<mot-clé> dont le contenu est du texte,
	rendu en aperçu et modifié dans un dialogue.

	Écrire deux vues de 700 lignes quasi identiques — comme l'ont fait la droite
	graduée et le tableau de variations — aurait figé la duplication. Ce composant
	porte l'enveloppe (aperçu, survol, dialogue, erreurs) ; chaque type ne fournit
	que ce qui le distingue : son analyseur, son composant de rendu, son gabarit.

	@module extensions/FencedDslNodeView
-->
<script lang="ts">
	import type { Component } from 'svelte';
	import { NodeViewWrapper } from 'svelte-tiptap';
	import { Pencil, Trash2, AlertCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	/** Ce que tout analyseur de bloc DSL renvoie. */
	interface ParseResult {
		node: unknown | null;
		errors: { message: string }[];
	}

	interface Props {
		/** Texte du bloc, tel qu'il sera réécrit en markdown. */
		content: string;
		/** Nom affiché dans le dialogue et les libellés d'accessibilité. */
		label: string;
		/** Analyse le texte : sert à l'aperçu ET à la validation avant d'save. */
		parse: (content: string) => ParseResult;
		/** Composant d'aperçu, qui reçoit le nœud analysé. */
		preview: Component<{ node: never }>;
		/** Aide affichée sous la zone de saisie. */
		hint?: string;
		selected?: boolean;
		onSave: (content: string) => void;
		onDelete: () => void;
	}

	let {
		content,
		label,
		parse,
		preview: Preview,
		hint = '',
		selected = false,
		onSave,
		onDelete
	}: Props = $props();

	let dialogOpen = $state(false);
	let draft = $state('');
	let survol = $state(false);

	// L'aperçu suit le contenu enregistré ; le dialogue a son propre draft,
	// pour qu'une saisie invalide n'efface pas ce qui est affiché.
	const analyse = $derived(parse(content));
	const draftAnalysis = $derived(dialogOpen ? parse(draft) : null);

	const erreurs = $derived(analyse.errors.map((e) => e.message));
	const draftErrors = $derived(draftAnalysis?.errors.map((e) => e.message) ?? []);

	function ouvrir() {
		draft = content;
		dialogOpen = true;
	}

	function save() {
		// Refuser d'save un bloc invalide : l'aperçu deviendrait une boîte
		// d'erreur, et le markdown exporté serait illisible pour le parser.
		if (draftErrors.length > 0) return;
		onSave(draft);
		dialogOpen = false;
	}
</script>

<NodeViewWrapper class="fenced-dsl-wrapper my-4">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="group relative rounded-lg border p-2 transition-colors {selected
			? 'border-primary'
			: 'border-transparent hover:border-border'}"
		onmouseenter={() => (survol = true)}
		onmouseleave={() => (survol = false)}
	>
		{#if erreurs.length > 0}
			<div
				class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
			>
				<AlertCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
				<div>
					<p class="font-medium">{label} : syntaxe invalide</p>
					<ul class="mt-1 list-inside list-disc text-muted-foreground">
						{#each erreurs as erreur (erreur)}
							<li>{erreur}</li>
						{/each}
					</ul>
				</div>
			</div>
		{:else if analyse.node}
			<Preview node={analyse.node as never} />
		{/if}

		{#if survol || selected}
			<div class="absolute top-2 right-2 flex gap-1">
				<Button variant="secondary" size="icon" onclick={ouvrir} aria-label="Modifier {label}">
					<Pencil class="h-4 w-4" />
				</Button>
				<Button variant="secondary" size="icon" onclick={onDelete} aria-label="Supprimer {label}">
					<Trash2 class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>
</NodeViewWrapper>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Modifier {label}</Dialog.Title>
			{#if hint}
				<Dialog.Description>{hint}</Dialog.Description>
			{/if}
		</Dialog.Header>

		<textarea
			bind:value={draft}
			class="h-64 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-sm"
			spellcheck="false"
			aria-label="Contenu de {label}"
		></textarea>

		{#if draftErrors.length > 0}
			<ul class="list-inside list-disc text-sm text-destructive">
				{#each draftErrors as erreur (erreur)}
					<li>{erreur}</li>
				{/each}
			</ul>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (dialogOpen = false)}>Annuler</Button>
			<Button onclick={save} disabled={draftErrors.length > 0}>Enregistrer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
