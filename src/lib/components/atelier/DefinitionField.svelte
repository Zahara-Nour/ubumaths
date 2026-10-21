<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * Le champ de définition d'une carte : `f(x) =` puis un champ MathLive.
	 *
	 * Phase 0 `/grapheur` §1 C5 à C10. La frappe met l'objet à jour d'elle-même,
	 * 0,3 s après la dernière touche — comme le grapheur, et sans bouton. Une
	 * définition illisible porte son erreur (message de la carte) ; on ne garde
	 * pas « l'ancienne courbe » à côté : une seule vérité.
	 */
	import { onMount } from 'svelte';
	import { on } from 'svelte/events';
	import type { MathfieldElement } from 'mathlive';
	import MathField from '$lib/components/MathField.svelte';
	import { useAtelier } from '$lib/atelier/context';
	import { definitionFromField, fieldLatexOf } from '$lib/atelier/mathfield';
	import { internalDefinition, typedLetterOf } from '$lib/atelier/letter';
	import { intervalWord, ONLY_FUNCTIONS, readInterval, splitInterval } from '$lib/atelier/interval';
	import { parseDefinition } from '$lib/atelier/parse';
	import { displayName } from '$lib/atelier/names';
	import type { AtelierObject } from '$lib/atelier/types';
	import { isConstruction } from '$lib/atelier/construction';

	interface Props {
		object: AtelierObject;
		/**
		 * Quand la frappe est rangée : 0,3 s après la dernière touche (`typing`),
		 * ou seulement à Entrée et à la sortie du champ (`validate`, carte d'une
		 * fonction, lot 3 de la refonte : décision de David du 2026-10-18).
		 */
		commit?: 'typing' | 'validate';
		/** Le préfixe `f(x) =` : la carte d'une fonction l'écrit elle-même, nom compris. */
		showPrefix?: boolean;
		/** Prendre le focus au montage : par défaut, une carte neuve (C9). */
		autofocus?: boolean;
	}

	let {
		object,
		commit = 'typing',
		showPrefix = true,
		autofocus = object.definition === ''
	}: Props = $props();

	const uid = $props.id();

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

	/** L'ensemble rangé (`sur [0;1]`) que montre le champ : changé ailleurs, le champ suit. */
	// svelte-ignore state_referenced_locally
	let lastInterval = intervalOf(object);

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
				: // Une courbe se nomme avec « : » (G5) : le champ porte l'équation entière ;
					// une construction (`d = (AB)`, lot 2) avec « = »
					object.kind === 'curve' && !isConstruction(object)
					? `${object.name} :`
					: `${object.name} =`
	);

	/** `sur ℝ` : un ensemble qui ne restreint rien. */
	function isWholeLine(written: string, shownLetter: string): boolean {
		const read = readInterval(written, shownLetter);
		return read.ok && read.domain === null;
	}

	function intervalOf(o: AtelierObject): string | undefined {
		return o.kind === 'function' ? o.interval : undefined;
	}

	/**
	 * Mesuré dans Chromium (`intervalle-champ.svelte.test.ts`) : avec `smartFence`,
	 * taper `[0;1[` écrit `\left\lbrack0;1\left\lbrack\right\rbrack\right\rbrack`,
	 * illisible. Coupé dès que le champ d'une fonction contient le « sur » d'un
	 * intervalle (suivi d'un ensemble, ou en fin de saisie) — comme
	 * les cases « intervalles » des questions —, rendu sinon (les parenthèses se
	 * referment). Jugé à chaque touche, AVANT MathLive (`keydown` en capture) :
	 * l'événement `input` arrive trop tard, après plusieurs frappes rapides.
	 */
	function updateSmartFence() {
		// La MÊME règle que le découpage (`intervalWord`), « sur » en fin de saisie compris
		if (element && object.kind === 'function') {
			element.smartFence = intervalWord(element.value, 'latex', true) === null;
		}
	}

	/** Écrire maintenant ce qui a été tapé. */
	function flush() {
		if (timer !== null) clearTimeout(timer);
		timer = null;
		if (!dirty) return;
		dirty = false;
		// `f(x) = x^2 sur [0;+∞[` : l'ensemble est lu à part (`interval.ts`)
		const { body, written } = splitInterval(latex, 'latex');
		if (written !== null && object.kind !== 'function') {
			refusal = ONLY_FUNCTIONS;
			return;
		}
		const typed = definitionFromField(object.kind, body);
		const internal =
			object.kind === 'function'
				? internalDefinition(typed, letter, object.name, 'keyboard', atelier.functionNames)
				: ({ ok: true, definition: typed } as const);
		// Rien n'est rangé : renommer t → x changerait le sens en silence
		refusal = internal.ok ? null : internal.message;
		if (!internal.ok) return;
		const definition = internal.definition;
		// À la validation, une saisie illisible ne remplace pas la définition qui
		// marche : l'erreur se dit sur le champ, Échap revient à l'ancienne (lot 3)
		if (commit === 'validate') {
			const unreadable = parseDefinition(
				object.kind,
				definition,
				'keyboard',
				atelier.functionNames
			).error;
			if (unreadable !== undefined) {
				refusal = unreadable;
				return;
			}
		}
		// `sur ℝ` ne range rien : sans cette lecture, chaque frappe relançait un update
		const wanted =
			written !== null && isWholeLine(written, letter) ? undefined : (written ?? undefined);
		if (definition === object.definition && wanted === intervalOf(object)) return;
		// I6 : effacer « sur … » retire l'intervalle (`null`). Une validation = une
		// étape d'Annuler / Rétablir (lot 5)
		const updated = atelier.step(`modifier ${displayName(object.name)}`, () =>
			atelier.update(
				object.name,
				definition,
				'keyboard',
				undefined,
				object.kind === 'function' ? written : undefined
			)
		);
		// Ensemble illisible, vide, hors du domaine (I3) : rien n'est rangé
		if (!updated.ok) {
			refusal = updated.message;
			return;
		}
		lastWritten = definition;
		lastInterval = intervalOf(updated.object);
	}

	function handleInput() {
		dirty = true;
		if (commit === 'validate') return;
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(flush, TYPING_DELAY_MS);
	}

	/** Revenir à la définition rangée : la frappe en cours est oubliée. */
	function restore() {
		dirty = false;
		refusal = null;
		latex = fieldLatexOf(object, atelier.functionNames, letter);
		if (element) element.value = latex;
		updateSmartFence();
	}

	/**
	 * Ranger ce que le champ montre À CET INSTANT. ⚠️ Lu sur l'élément : à une
	 * frappe rapide suivie d'Entrée, la valeur liée (`latex`) et `dirty`
	 * peuvent ne pas avoir encore suivi (mesuré dans les tests au vrai clavier).
	 */
	function commitNow() {
		if (element && element.value !== latex) {
			latex = element.value;
			dirty = true;
		}
		flush();
	}

	/**
	 * Entrée range ; Échap, en mode `validate`, rétablit. Échap est TOUJOURS
	 * pris au champ (`preventDefault`) : sinon MathLive passe en saisie LaTeX
	 * (revue de #1488). Il n'est arrêté (`stopPropagation`) que quand il y a
	 * quelque chose à rétablir — sinon il fermerait aussi la console (lot 2) ;
	 * sans frappe en cours, il continue son chemin.
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (commit !== 'validate') return;
		// Entrée range ; Ctrl+Entrée reste le raccourci de la console (lot 2)
		if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
			commitNow();
			return;
		}
		if (event.key !== 'Escape') return;
		event.preventDefault();
		if (!dirty && refusal === null) return;
		event.stopPropagation();
		restore();
	}

	// C8 : modifiée ailleurs, la définition est recopiée dans le champ
	$effect(() => {
		const definition = object.definition;
		const shownLetter = letter;
		const interval = intervalOf(object);
		if (definition === lastWritten && shownLetter === lastLetter && interval === lastInterval) {
			return;
		}
		lastWritten = definition;
		lastLetter = shownLetter;
		lastInterval = interval;
		// La version venue d'ailleurs l'emporte sur une frappe encore en attente
		if (timer !== null) clearTimeout(timer);
		timer = null;
		dirty = false;
		refusal = null;
		latex = fieldLatexOf(object, atelier.functionNames, shownLetter);
		updateSmartFence();
		// ⚠️ `MathField` ne recopie pas une valeur VIDE (`if (value)`) ; on ne
		// touche pas à ce composant partagé avec les réponses aux questions
		if (latex === '' && element) element.value = '';
	});

	onMount(() => {
		// L'espace tapée dans une VALEUR fait la grandeur (lot C des grandeurs :
		// « 5 m » est 5 mètres, « 5m » le produit) : MathLive l'ignore sinon
		if (object.kind === 'value' && element) {
			Object.assign(element, { mathModeSpace: '\\,' });
		}
		// Pas de menu ☰ (ni au clic droit) : mode texte ou LaTeX, couleur, style,
		// matrice donnent des définitions que l'atelier ne lit pas (David, 2026-10-15)
		if (element) element.menuItems = [];
		updateSmartFence();
		// Le clavier virtuel de MathLive ne passe pas par `keydown` : `beforeinput`
		// et `input` aussi (non mesuré au clavier virtuel, revue du lot 1)
		const stops = element
			? (['keydown', 'beforeinput', 'input'] as const).map((type) =>
					on(element!, type, updateSmartFence, { capture: true })
				)
			: [];
		// Mode `validate` : Entrée et la sortie du champ rangent (lot 3). Lus sur
		// la touche et sur `blur` plutôt que sur le `change` de MathLive, qui ne
		// part pas toujours (champ vide au départ : mesuré)
		if (element && commit === 'validate') {
			stops.push(on(element, 'keydown', handleKeydown, { capture: true }));
			stops.push(on(element, 'blur', commitNow));
		}
		const stopWatching = () => stops.forEach((stop) => stop());
		// C9 : une carte neuve est prête à taper
		if (autofocus) element?.focus();
		// ⚠️ Ce qui a été tapé juste avant de fermer la carte n'est pas perdu : lu
		// sur l'élément, comme à Entrée — la valeur liée peut avoir une frappe de retard
		return () => {
			stopWatching();
			commitNow();
		};
	});
</script>

<div class="champ">
	{#if showPrefix}
		<span class="prefixe" aria-hidden="true">{prefix}</span>
	{/if}
	<MathField
		bind:value={latex}
		bind:element
		oninput={handleInput}
		aria-label={`Définition de ${object.name}`}
		aria-invalid={refusal !== null}
		aria-describedby={refusal !== null ? `${uid}-refus` : undefined}
		virtual-keyboard-mode="manual"
		class="saisie"
	/>
</div>
{#if refusal}
	<p class="refus" id="{uid}-refus" role="alert">{refusal}</p>
{/if}

<style>
	/* Le bouton ☰ : MathLive le laisse affiché même quand son menu est vide */
	.champ :global(math-field::part(menu-toggle)) {
		display: none;
	}
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
