<!--
	Le champ « Écriture mathématique » de Calcul (en essai)
	=======================================================

	Un champ MathLive, en maths par défaut, sans point (décisions 2 à 9 de
	`docs/wip/atelier-saisie-naturelle.md`), choisi dans les réglages de
	l'atelier (`docs/wip/atelier-reglages-phase0.md`). Deux chemins pour la
	même règle :

	- clavier physique : `keydown` en capture, AVANT MathLive — le mot fini par
	  l'espace ou un opérateur est réécrit, puis le terminateur inséré par nous ;
	- clavier virtuel : il ne passe pas par `keydown`, on relit après coup sur
	  `input` (le terminateur est déjà là).

	La logique (quel mot, quelle place, quelle complétion) est dans
	`natural-input.ts`, testée sans navigateur.
-->
<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import 'mathlive';
	import { onMount } from 'svelte';
	import { on } from 'svelte/events';
	import type { MathfieldElement } from 'mathlive';
	import {
		cleanedShortcuts,
		denominatorOf,
		fieldLatexFromText,
		finishedWordLatex,
		lineKindOf,
		proposalsFor,
		wordAtCaret,
		type CommandWord,
		type Proposal
	} from '$lib/atelier/natural-input';
	import { CALC_LAYOUT, commandsLayout } from '$lib/atelier/virtual-keyboard';

	// Types
	interface Props {
		words: readonly CommandWord[];
		/** Les saisies validées, de la plus ancienne à la plus récente (↑ / ↓), lues au rappel */
		history: () => readonly string[];
		/** Le LaTeX du champ ; écrit du dehors (bascule, action d'une carte), le champ le prend */
		latex?: string;
		/** `false` : la ligne n'est pas partie (case vide), le champ la garde */
		onsubmit: (latex: string) => boolean | void;
		label?: string;
		/** La consigne du champ vide, en LaTeX */
		placeholder?: string;
		/** Prendre le focus à l'ouverture (la page d'essai ; pas l'atelier) */
		focusOnMount?: boolean;
	}

	let {
		words,
		history,
		latex = $bindable(''),
		onsubmit,
		label = 'Saisie de Calcul',
		placeholder,
		focusOnMount = false
	}: Props = $props();

	// Constantes
	/** Les touches qui finissent un mot (clavier physique) ; l'espace s'écrit `\,`. */
	const TERMINATOR_KEYS = ' +-=<>;/';
	const uid = $props.id();
	const LIST_ID = `${uid}-propositions`;

	// Variables
	let field = $state<MathfieldElement>();
	let proposals = $state<Proposal[]>([]);
	let highlighted = $state(0);
	/**
	 * Où s'ouvre la liste : sous le mot, ou AU-DESSUS quand le champ est dans la
	 * moitié basse de l'écran — le champ de Calcul est en bas de la vue, et la
	 * liste sortait de l'écran (revue a11y, 2.4.7). Bornée, elle défile.
	 */
	let listAt = $state<{ left: number; top?: number; bottom?: number; maxHeight: number }>({
		left: 0,
		top: 0,
		maxHeight: 0
	});
	let listElement = $state<HTMLUListElement>();

	/**
	 * Ce que lit un lecteur d'écran : le focus réel est DANS le shadow DOM de
	 * MathLive, où `aria-controls` et `aria-activedescendant` de l'hôte ne
	 * portent pas (revue a11y, 4.1.2) — une région `status` dit la liste.
	 */
	const announcement = $derived(
		proposals.length === 0
			? ''
			: `${proposals[highlighted]?.label ?? ''}, ${highlighted + 1} sur ${proposals.length}. ↑ ↓ pour choisir, Tab pour insérer.`
	);
	/** Échap ferme la liste jusqu'à la frappe suivante */
	let dismissed = false;
	/** Une réécriture en cours : son propre `input` ne doit rien relancer */
	let rewriting = false;
	let recalled: number | null = null;
	/** La saisie rappelée telle que MathLive l'a rangée : la comparer, pas l'historique */
	let recalledValue: string | null = null;
	let draftBeforeRecall = '';

	// Fonctions
	/** Le LaTeX à gauche du curseur, ou `null` dans une fraction, un exposant… */
	function beforeCaret(): string | null {
		if (!field || (field.getElementInfo(field.position)?.depth ?? 0) > 0) return null;
		return field.getValue(0, field.position, 'latex');
	}

	/** Insérer du LaTeX à la place de [start, end[ (ou au curseur), en maths. */
	function insert(latexToInsert: string, range?: [number, number], selectHole = false) {
		if (!field) return;
		rewriting = true;
		if (range) field.selection = { ranges: [range] };
		field.insert(latexToInsert, {
			insertionMode: 'replaceSelection',
			selectionMode: selectHole ? 'placeholder' : 'after',
			format: 'latex',
			mode: 'math'
		});
		rewriting = false;
		latex = field.value;
	}

	/**
	 * Le mot qui finit au curseur devient texte, s'il est fini à sa place
	 * (décision 4). `terminator` : ce qui le finit, inséré par nous (clavier
	 * physique, Entrée) ; `null` : déjà dans le champ (clavier virtuel).
	 */
	function finishWord(terminator: string | null): boolean {
		const before = beforeCaret();
		if (!field || before === null) return false;
		const found = wordAtCaret(before, terminator === null);
		const replacement = found && finishedWordLatex(found, lineKindOf(field.value, words), words);
		// Une barre après une unité (`km/h`) : sinon MathLive en fait une fraction
		if (!found || !replacement || (terminator === '/' && !replacement.startsWith('\\mathrm'))) {
			return false;
		}
		const end = field.position - (terminator === null ? 1 : 0);
		insert(replacement + (terminator ?? ''), [end - found.atoms, end]);
		// Le curseur repasse derrière le terminateur : en maths (mesuré)
		if (terminator === null) field.position = field.position + 1;
		return true;
	}

	/**
	 * `1/4+1/3` tapé d'une traite : MathLive garde le curseur dans le
	 * dénominateur (mesuré : `\frac{1}{4+\frac13}`, et `limite 1/x en +∞` met
	 * « en +∞ » sous la barre). Un opérateur ou une espace tapés au bout d'un
	 * dénominateur simple (des chiffres, une lettre) sortent d'abord de la
	 * fraction : la lecture du texte de Calcul (`1/x+1` = 1/x + 1).
	 */
	function leaveSimpleDenominator() {
		if (!field) return;
		const here = field.getElementInfo(field.position);
		const next = field.getElementInfo(field.position + 1);
		if (here?.depth !== 1 || next?.depth !== 0 || !/^\\d?frac/.test(next.latex ?? '')) return;
		const denominator = denominatorOf(next.latex ?? '');
		if (/^(?:\d+|[A-Za-z])$/.test(denominator ?? '')) field.position = field.position + 1;
	}

	/** « sur [0;+∞[ » : `smartFence` refermerait le crochet (mesuré, comme les cartes) */
	function updateSmartFence() {
		if (field) field.smartFence = !/\\text\{(?:sur|dans)\}/.test(field.value);
	}

	/**
	 * La liste du mot au curseur. Rappelée aussi au `keydown` des touches de la
	 * liste : `input` peut arriver APRÈS la touche suivante (mesuré : ↑ tapé
	 * vite après « de » rappelait l'historique au lieu de parcourir la liste).
	 */
	function updateProposals() {
		const before = beforeCaret();
		const found = before === null || dismissed ? null : wordAtCaret(before, false);
		const next = field ? proposalsFor(found, lineKindOf(field.value, words), words) : [];
		const labels = (list: Proposal[]) => list.map((p) => p.label).join('|');
		if (labels(next) !== labels(proposals)) highlighted = 0;
		proposals = next;
		// Sous la première lettre du mot (décision 9 : `getElementInfo`)
		const bounds = found && field?.getElementInfo(field.position - found.atoms + 1)?.bounds;
		if (bounds && next.length > 0) listAt = placeList(bounds);
	}

	/** Sous le mot si la moitié basse de l'écran est libre, au-dessus sinon. */
	function placeList(bounds: DOMRect) {
		const gap = 6;
		const below = window.innerHeight - bounds.bottom - gap * 2;
		const above = bounds.top - gap * 2;
		return below >= above
			? { left: bounds.left, top: bounds.bottom + gap, maxHeight: below }
			: { left: bounds.left, bottom: window.innerHeight - bounds.top + gap, maxHeight: above };
	}

	function choose(proposal: Proposal, thenSubmit = false) {
		const before = beforeCaret();
		if (!field || before === null) return;
		const atoms = wordAtCaret(before, false)?.atoms ?? 0;
		const hole = proposal.latex.includes('\\placeholder');
		const end = field.position;
		insert(hole ? proposal.latex : `${proposal.latex}\\,`, [end - atoms, end], hole);
		proposals = [];
		// Une commande sans case (`aide`, `valeurs`) se lance d'une Entrée, comme Calcul
		if (thenSubmit && !hole && proposal.latex.startsWith('\\text{')) submit();
	}

	/** Valider la ligne : Entrée, le ⏎ du clavier virtuel, ou le bouton du parent. */
	export function submit() {
		if (!field) return;
		// Le dernier mot, fini par Entrée (`5 km + 300 m`)
		finishWord('');
		if (field.value.trim() === '') return;
		if (onsubmit(field.value) === false) return;
		setField('');
		recalled = null;
	}

	function setField(value: string) {
		if (!field) return;
		field.value = value;
		field.position = field.lastOffset;
		// Ce que MathLive a rangé (`{2 x}` devient `{2x}`) : sinon l'effet de la
		// ligne écrite du dehors le prendrait pour une autre ligne, et oublierait ↑
		latex = field.value;
		proposals = [];
	}

	/**
	 * ↑ / ↓ hors d'une fraction : les saisies validées, comme `CalcDesk.recallPrevious`.
	 *
	 * ⚠️ Comparer à `recalledValue`, pas à l'historique : une saisie du mode texte
	 * réécrite pour le champ (`fieldLatexFromText`) n'est pas toujours rangée à
	 * l'identique par MathLive, et ↑ croirait la ligne modifiée par l'élève.
	 */
	function recall(step: -1 | 1) {
		const list = history();
		if (!field || list.length === 0 || (step === 1 && recalled === null)) return;
		const changed = recalled === null || field.value !== recalledValue;
		if (step === -1) {
			if (changed) draftBeforeRecall = field.value;
			recalled = changed ? list.length - 1 : Math.max(0, (recalled ?? 0) - 1);
			setField(list[recalled]);
		} else if (changed || recalled === list.length - 1) {
			if (!changed) setField(draftBeforeRecall);
			recalled = null;
		} else {
			recalled = (recalled ?? 0) + 1;
			setField(list[recalled]);
		}
		recalledValue = recalled === null ? null : field.value;
	}

	/**
	 * Une touche prise par le champ : `preventDefault` SEUL. MathLive ignore
	 * alors la touche et vide son tampon de raccourcis — sans quoi (mesuré),
	 * après Entrée, la frappe suivante (« o » puis « f » : `\circ`) restaurait
	 * l'état sauvé de la ligne précédente dans le champ vidé.
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (!field || event.isComposing) return;
		const take = () => event.preventDefault();
		updateSmartFence();
		if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(event.key)) updateProposals();
		const count = proposals.length;
		if (count > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
			highlighted = (highlighted + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
			return take();
		}
		// Entrée choisit une commande, mais calcule sur une liste d'unités (comme les
		// fonctions de Calcul : `300 m` validé ne doit pas devenir `300 mm`) ; Tab choisit
		const units = count > 0 && proposals[0].latex.startsWith('\\mathrm');
		if (count > 0 && (event.key === 'Tab' || (event.key === 'Enter' && !units))) {
			choose(proposals[highlighted], event.key === 'Enter');
			return take();
		}
		// Échap ferme la liste ; liste fermée, MathLive passerait en saisie LaTeX
		// (mesuré : la frappe suivante part dans un « \… », les « é » sont perdus)
		if (event.key === 'Escape') {
			dismissed = true;
			proposals = [];
			return take();
		}
		if (event.key === 'Enter') {
			submit();
			return take();
		}
		// `*` : la croix de l'école, pas le point `\cdot` que MathLive écrit
		// (David, 2026-10-15) ; le clavier virtuel a déjà sa touche ×
		if (event.key === '*' && !event.ctrlKey && !event.metaKey && !event.altKey) {
			insert('\\times');
			return take();
		}
		const depth = field.getElementInfo(field.position)?.depth ?? 0;
		if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && depth === 0) {
			recall(event.key === 'ArrowUp' ? -1 : 1);
			return take();
		}
		dismissed = false;
		if (event.key.length !== 1 || !TERMINATOR_KEYS.includes(event.key)) return;
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if (event.key !== ';' && event.key !== '/') leaveSimpleDenominator();
		if (finishWord(event.key === ' ' ? '\\,' : event.key)) take();
	}

	function handleInput() {
		if (!field || rewriting) return;
		latex = field.value;
		// Clavier virtuel : le mot vient d'être fini par l'espace ou un opérateur
		finishWord(null);
		updateSmartFence();
		updateProposals();
	}

	/** Un texte brut collé (« résoudre x^2=4 ») est réécrit ; un LaTeX reste à MathLive */
	function handlePaste(event: ClipboardEvent) {
		const text = event.clipboardData?.getData('text/plain') ?? '';
		if (!field || text.trim() === '' || text.includes('\\')) return;
		event.preventDefault();
		event.stopPropagation();
		insert(fieldLatexFromText(text, words));
		updateSmartFence();
	}

	// La proposition surlignée reste visible quand la liste défile
	$effect(() => {
		const index = highlighted;
		if (proposals.length === 0) return;
		listElement?.children[index]?.scrollIntoView({ block: 'nearest' });
	});

	/**
	 * La ligne écrite du dehors : bascule depuis le mode texte, commande préparée
	 * par une carte (« Simuler »). Celle que le champ vient d'écrire lui-même est
	 * déjà la sienne : rien à faire.
	 */
	$effect(() => {
		const wanted = latex;
		if (!field || field.value === wanted) return;
		field.value = wanted;
		field.position = field.lastOffset;
		proposals = [];
		recalled = null;
	});

	onMount(() => {
		if (!field) return;
		const element = field;
		element.smartMode = false;
		// L'espace tapée reste `\,`, comme dans les cartes : elle fait l'unité (ADR 0026)
		element.mathModeSpace = '\\,';
		element.inlineShortcuts = cleanedShortcuts(element.inlineShortcuts);
		// Le clavier virtuel est UN pour toute la page (les cartes de l'atelier ont
		// aussi des champs MathLive) : nos onglets le temps du focus seulement,
		// comme `FillBlanksInput.svelte`
		const keyboard = window.mathVirtualKeyboard;
		const alphabeticBefore = keyboard.alphabeticLayout;
		let applied = false;
		const applyLayouts = () => {
			keyboard.layouts = [CALC_LAYOUT, commandsLayout(words), 'alphabetic'];
			keyboard.alphabeticLayout = 'azerty';
			applied = true;
		};
		const restoreLayouts = () => {
			if (!applied) return;
			applied = false;
			keyboard.layouts = 'default';
			keyboard.alphabeticLayout = alphabeticBefore;
		};
		const stops = [
			on(element, 'keydown', handleKeydown, { capture: true }),
			on(element, 'paste', handlePaste, { capture: true }),
			on(element, 'input', handleInput),
			// Le ⏎ du clavier virtuel (`commit`) ; pas la sortie du champ, qui émet aussi `change`
			on(element, 'change', () => element.hasFocus() && submit()),
			on(element, 'focusin', applyLayouts),
			on(element, 'focusout', () => {
				proposals = [];
				restoreLayouts();
			})
		];
		if (focusOnMount) element.focus();
		return () => {
			stops.forEach((stopListening) => stopListening());
			restoreLayouts();
		};
	});
</script>

<math-field
	bind:this={field}
	aria-label={label}
	{placeholder}
	class="block w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[1.375rem] text-foreground focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring"
></math-field>

<p class="sr-only" role="status">{announcement}</p>

{#if proposals.length > 0}
	<ul
		bind:this={listElement}
		id={LIST_ID}
		role="listbox"
		aria-label="Propositions : Tab pour insérer"
		class="fixed z-[200] m-0 max-w-[min(24rem,calc(100vw-2rem))] min-w-48 list-none overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
		style:left="{listAt.left}px"
		style:top={listAt.top === undefined ? undefined : `${listAt.top}px`}
		style:bottom={listAt.bottom === undefined ? undefined : `${listAt.bottom}px`}
		style:max-height="{listAt.maxHeight}px"
	>
		{#each proposals as proposal, index (proposal.label)}
			<li
				role="option"
				aria-selected={index === highlighted}
				class="flex cursor-pointer items-baseline gap-3 rounded-md px-2 py-1.5 {index ===
				highlighted
					? 'bg-primary text-primary-foreground'
					: ''}"
				onpointerdown={(event) => {
					event.preventDefault();
					choose(proposal);
				}}
			>
				<span class="font-semibold">{proposal.label}</span>
				<!-- Pas d'opacité sur la surlignée : son contraste tomberait sous 4,5:1 (revue a11y) -->
				<span class="truncate text-[0.8125rem] {index === highlighted ? '' : 'opacity-75'}"
					>{proposal.detail}</span
				>
			</li>
		{/each}
	</ul>
{/if}
