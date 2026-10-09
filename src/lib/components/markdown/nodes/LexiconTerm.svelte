<!--
	LexiconTerm Component
	=====================

	Mot cliquable (lot 2 du lexique) : un mot de l'énoncé repéré dans le
	dictionnaire mathématique. Un clic ouvre sa fiche, au niveau de l'élève :
	chaque sens visible, ses définitions, et un lien vers le glossaire.

	Le niveau vient du contexte « lexique » (lexicon-context.ts). La fiche
	coupe ce contexte : ses définitions ne soulignent pas leurs propres mots.

	@see lexicon/linker.ts pour le repérage
	@see HintReference.svelte pour le même motif bouton + popover
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import * as Popover from '$lib/components/ui/popover';
	import { lexiconRuntime } from '$lib/lexicon/runtime-store.svelte';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import { provideLexicon, readLexicon } from '../lexicon-context';

	interface Props {
		/** Entrées du dictionnaire ouvertes par ce mot (plusieurs pour un homonyme) */
		ids: string[];
		/** Le mot tel qu'il est écrit dans l'énoncé, avec sa mise en forme */
		children: Snippet;
	}

	let { ids, children }: Props = $props();

	const lexicon = readLexicon();
	provideLexicon(() => null);

	// Le repérage a déjà chargé le dictionnaire : un mot cliquable n'existe qu'après
	let card = $derived.by(() => {
		const grade = lexicon();
		const runtime = lexiconRuntime();
		return grade && runtime ? runtime.lexiconCard(ids, grade) : [];
	});

	// Fiche annoncée comme une boîte de dialogue : nom = le mot, description = ses définitions
	const uid = $props.id();
	let contentRef = $state<HTMLElement | null>(null);

	// À l'ouverture, le focus va sur la fiche (lue en entier), pas sur son lien
	function focusCard(event: Event) {
		event.preventDefault();
		contentRef?.focus();
	}

	// Fiche ouverte, l'élève touche le champ de réponse : le focus doit y rester,
	// au lieu de revenir au mot (comportement par défaut de bits-ui)
	const FOCUSABLE =
		'input, textarea, select, math-field, button, a[href], [tabindex], [contenteditable]';
	let outsideTarget: HTMLElement | null = null;

	function rememberOutsideTarget(event: PointerEvent) {
		const target = event.target instanceof Element ? event.target : null;
		outsideTarget = target?.closest<HTMLElement>(FOCUSABLE) ?? document.body;
	}

	function restoreFocus(event: Event) {
		if (outsideTarget) {
			event.preventDefault();
			if (outsideTarget !== document.body) outsideTarget.focus();
		}
		outsideTarget = null;
	}
</script>

{#if card.length === 0}{@render children()}{:else}<Popover.Root
		><Popover.Trigger
			>{#snippet child({ props })}<button
					{...props}
					type="button"
					class="lexicon-term cursor-pointer underline decoration-foreground/60 decoration-dotted decoration-[1.5px] underline-offset-4 hover:decoration-foreground"
					>{@render children()}</button
				>{/snippet}</Popover.Trigger
		><Popover.Content
			bind:ref={contentRef}
			class="w-80 max-w-[90vw] space-y-3 text-left"
			align="start"
			role="dialog"
			aria-labelledby="{uid}-titre-0"
			aria-describedby={card.map((_, i) => `${uid}-definitions-${i}`).join(' ')}
			onOpenAutoFocus={focusCard}
			onInteractOutside={rememberOutsideTarget}
			onCloseAutoFocus={restoreFocus}
		>
			{#each card as entry, i (entry.id)}
				<div class="space-y-1">
					<p id="{uid}-titre-{i}" class="font-semibold text-foreground">
						{entry.term}{#if entry.sense}<span
								class="ml-1 text-sm font-normal text-muted-foreground italic">({entry.sense})</span
							>{/if}
					</p>
					{#if entry.seeTerm}
						<p class="text-xs text-muted-foreground">Voir : {entry.seeTerm}</p>
					{/if}
					<div id="{uid}-definitions-{i}">
						{#each entry.definitions as definition (definition)}
							<div class="text-sm text-foreground">
								<InlineMarkdown content={definition} />
							</div>
						{/each}
					</div>
				</div>
			{/each}
			<a
				href="{resolve('/glossaire')}?q={encodeURIComponent(card[0].term)}"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-block text-sm text-primary underline">Voir dans le glossaire</a
			>
		</Popover.Content></Popover.Root
	>{/if}

<style>
	/* Le mot garde la police et la couleur du texte : seul le soulignement pointillé le signale */
	.lexicon-term {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
	}
</style>
