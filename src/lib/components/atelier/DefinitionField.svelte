<script lang="ts">
	/**
	 * Le champ de définition d'une carte : `f(x) =` puis un champ MathLive.
	 *
	 * Phase 0 `/grapheur` §1 C5 à C10. La frappe met l'objet à jour d'elle-même,
	 * 0,3 s après la dernière touche — comme le grapheur, et sans bouton. Une
	 * définition illisible porte son erreur (message de la carte) ; on ne garde
	 * pas « l'ancienne courbe » à côté : une seule vérité.
	 */
	import { onMount } from 'svelte';
	import type { MathfieldElement } from 'mathlive';
	import MathField from '$lib/components/MathField.svelte';
	import { useAtelier } from '$lib/atelier/context';
	import { definitionFromField, fieldLatexOf } from '$lib/atelier/mathfield';
	import { internalDefinition, typedLetterOf } from '$lib/atelier/letter';
	import type { AtelierObject } from '$lib/atelier/types';

	interface Props {
		object: AtelierObject;
	}

	let { object }: Props = $props();

	/** Délai après la dernière touche — celui du grapheur (`FunctionInput`). */
	const TYPING_DELAY_MS = 300;

	const atelier = useAtelier();

	let element = $state<MathfieldElement>();

	/**
	 * La lettre de l'élève (`f(t)`). Le champ montre et reçoit `t` ; l'atelier
	 * range en x (`letter.ts`).
	 */
	const letter = $derived(typedLetterOf(atelier, object));

	/** Pourquoi la dernière frappe n'a pas été rangée (`f(t) = t + x`), ou `null`. */
	let refusal = $state<string | null>(null);

	/** Ce qu'affiche le champ, en LaTeX. */
	// svelte-ignore state_referenced_locally
	let latex = $state(fieldLatexOf(object, atelier.functionNames, typedLetterOf(atelier, object)));

	/**
	 * La dernière définition que CE champ a écrite dans l'atelier.
	 *
	 * Sert à distinguer « la définition a changé parce que j'ai tapé » (on ne
	 * touche à rien : le curseur de l'élève resterait sinon renvoyé au début) de
	 * « elle a changé ailleurs », dans Calcul (C8 : le champ suit).
	 */
	// svelte-ignore state_referenced_locally
	let lastWritten = object.definition;

	/**
	 * La lettre que montre le champ. ⚠️ Elle peut changer SANS que la définition
	 * rangée change : Calcul `f(s) = s^2` après `f(t) = t^2` range toujours x^2,
	 * et le champ restait en t (revue de #905).
	 */
	// svelte-ignore state_referenced_locally
	let lastLetter = letter;

	let timer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * L'élève a-t-il tapé depuis la dernière écriture ?
	 *
	 * ⚠️ Sans lui, ouvrir puis fermer une carte réécrivait la définition : le
	 * champ montre une TRADUCTION en LaTeX (`sqrt(x)` → `\sqrt{x}`), différente
	 * du texte rangé, et la fermeture l'écrivait comme si on l'avait tapée
	 * (revue du lot 2a, A).
	 */
	let dirty = false;

	const prefix = $derived(
		object.kind === 'function'
			? `${object.name}(${letter}) =`
			: object.kind === 'sequence'
				? // Une récurrence donne le terme SUIVANT (décision S3)
					object.mode === 'recurrence'
					? `${object.name}(n+1) =`
					: `${object.name}(n) =`
				: `${object.name} =`
	);

	/** Écrire maintenant ce qui a été tapé. */
	function flush() {
		if (timer !== null) clearTimeout(timer);
		timer = null;
		if (!dirty) return;
		dirty = false;
		const typed = definitionFromField(object.kind, latex);
		const internal =
			object.kind === 'function'
				? internalDefinition(typed, letter, object.name, 'keyboard', atelier.functionNames)
				: ({ ok: true, definition: typed } as const);
		// Rien n'est rangé : renommer t → x changerait le sens en silence
		refusal = internal.ok ? null : internal.message;
		if (!internal.ok) return;
		const definition = internal.definition;
		if (definition === object.definition) return;
		lastWritten = definition;
		atelier.update(object.name, definition, 'keyboard');
	}

	function handleInput() {
		dirty = true;
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(flush, TYPING_DELAY_MS);
	}

	// C8 : modifiée ailleurs, la définition est recopiée dans le champ
	$effect(() => {
		const definition = object.definition;
		const shownLetter = letter;
		if (definition === lastWritten && shownLetter === lastLetter) return;
		lastWritten = definition;
		lastLetter = shownLetter;
		// La version venue d'ailleurs l'emporte sur une frappe encore en attente
		if (timer !== null) clearTimeout(timer);
		timer = null;
		dirty = false;
		refusal = null;
		latex = fieldLatexOf(object, atelier.functionNames, shownLetter);
		// ⚠️ `MathField` ne recopie pas une valeur VIDE (`if (value)`) ; on ne
		// touche pas à ce composant partagé avec les réponses aux questions
		if (latex === '' && element) element.value = '';
	});

	onMount(() => {
		// C9 : une carte neuve est prête à taper
		if (object.definition === '') element?.focus();
		// ⚠️ Ce qui a été tapé juste avant de fermer la carte n'est pas perdu
		return flush;
	});
</script>

<div class="champ">
	<span class="prefixe" aria-hidden="true">{prefix}</span>
	<MathField
		bind:value={latex}
		bind:element
		oninput={handleInput}
		aria-label={`Définition de ${object.name}`}
		virtual-keyboard-mode="manual"
		class="saisie"
	/>
</div>
{#if refusal}
	<p class="refus" role="alert">{refusal}</p>
{/if}

<style>
	.refus {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: var(--color-destructive);
	}
	.champ {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.prefixe {
		font-family: var(--font-serif, serif);
		font-style: italic;
		white-space: nowrap;
	}
	.champ :global(.saisie:focus-within) {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 1px;
	}
	.champ :global(.saisie) {
		flex: 1;
		min-width: 0;
		font-size: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 0.125rem 0.375rem;
		background: var(--color-background);
	}
</style>
