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
	import type { AtelierObject } from '$lib/atelier/types';

	interface Props {
		object: AtelierObject;
	}

	let { object }: Props = $props();

	/** Délai après la dernière touche — celui du grapheur (`FunctionInput`). */
	const TYPING_DELAY_MS = 300;

	const atelier = useAtelier();

	let element = $state<MathfieldElement>();

	/** Ce qu'affiche le champ, en LaTeX. */
	// svelte-ignore state_referenced_locally
	let latex = $state(fieldLatexOf(object, atelier.functionNames));

	/**
	 * La dernière définition que CE champ a écrite dans l'atelier.
	 *
	 * Sert à distinguer « la définition a changé parce que j'ai tapé » (on ne
	 * touche à rien : le curseur de l'élève resterait sinon renvoyé au début) de
	 * « elle a changé ailleurs », dans Calcul (C8 : le champ suit).
	 */
	// svelte-ignore state_referenced_locally
	let lastWritten = object.definition;

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
			? `${object.name}(x) =`
			: object.kind === 'sequence'
				? `${object.name}(n) =`
				: `${object.name} =`
	);

	/** Écrire maintenant ce qui a été tapé. */
	function flush() {
		if (timer !== null) clearTimeout(timer);
		timer = null;
		if (!dirty) return;
		dirty = false;
		const definition = definitionFromField(object.kind, latex);
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
		if (definition === lastWritten) return;
		lastWritten = definition;
		// La version venue d'ailleurs l'emporte sur une frappe encore en attente
		if (timer !== null) clearTimeout(timer);
		timer = null;
		dirty = false;
		latex = fieldLatexOf(object, atelier.functionNames);
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

<style>
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
