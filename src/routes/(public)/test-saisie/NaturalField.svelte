<!--
	Prototype JETABLE — le champ de saisie naturelle de Calcul
	==========================================================

	Un seul champ MathLive, en maths par défaut, sans point (décisions 1 à 9 de
	`docs/wip/atelier-saisie-naturelle.md`). Deux chemins pour la même règle :

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
	} from './natural-input';
	import { CALC_LAYOUT, commandsLayout } from './virtual-keyboard';

	// Types
	interface Props {
		words: readonly CommandWord[];
		/** Les saisies validées, de la plus ancienne à la plus récente (↑ / ↓) */
		history: readonly string[];
		/** Le LaTeX du champ, lu par le panneau « sous le capot » */
		latex?: string;
		onsubmit: (latex: string) => void;
	}

	let { words, history, latex = $bindable(''), onsubmit }: Props = $props();

	// Constantes
	/** Les touches qui finissent un mot (clavier physique) ; l'espace s'écrit `\,`. */
	const TERMINATOR_KEYS = ' +-=<>;/';
	const LIST_ID = 'saisie-propositions';

	// Variables
	let field = $state<MathfieldElement>();
	let proposals = $state<Proposal[]>([]);
	let highlighted = $state(0);
	let listAt = $state({ left: 0, top: 0 });
	/** Échap ferme la liste jusqu'à la frappe suivante */
	let dismissed = false;
	/** Une réécriture en cours : son propre `input` ne doit rien relancer */
	let rewriting = false;
	let recalled: number | null = null;
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
		if (bounds && next.length > 0) listAt = { left: bounds.left, top: bounds.bottom + 6 };
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

	function submit() {
		if (!field) return;
		// Le dernier mot, fini par Entrée (`5 km + 300 m`)
		finishWord('');
		if (field.value.trim() === '') return;
		onsubmit(field.value);
		setField('');
		recalled = null;
	}

	function setField(value: string) {
		if (!field) return;
		field.value = value;
		field.position = field.lastOffset;
		latex = value;
		proposals = [];
	}

	/** ↑ / ↓ hors d'une fraction : les saisies validées, comme `CalcDesk.recallPrevious` */
	function recall(step: -1 | 1) {
		if (!field || history.length === 0 || (step === 1 && recalled === null)) return;
		const changed = recalled === null || field.value !== history[recalled];
		if (step === -1) {
			if (changed) draftBeforeRecall = field.value;
			recalled = changed ? history.length - 1 : Math.max(0, (recalled ?? 0) - 1);
			setField(history[recalled]);
		} else if (changed || recalled === history.length - 1) {
			if (!changed) setField(draftBeforeRecall);
			recalled = null;
		} else {
			recalled = (recalled ?? 0) + 1;
			setField(history[recalled]);
		}
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

	onMount(() => {
		if (!field) return;
		const element = field;
		element.smartMode = false;
		// L'espace tapée reste `\,`, comme dans les cartes : elle fait l'unité (ADR 0026)
		element.mathModeSpace = '\\,';
		element.inlineShortcuts = cleanedShortcuts(element.inlineShortcuts);
		const keyboard = window.mathVirtualKeyboard;
		keyboard.layouts = [CALC_LAYOUT, commandsLayout(words), 'alphabetic'];
		keyboard.alphabeticLayout = 'azerty';
		const stops = [
			on(element, 'keydown', handleKeydown, { capture: true }),
			on(element, 'paste', handlePaste, { capture: true }),
			on(element, 'input', handleInput),
			// Le ⏎ du clavier virtuel (`commit`) ; pas la sortie du champ, qui émet aussi `change`
			on(element, 'change', () => element.hasFocus() && submit()),
			on(element, 'focusout', () => (proposals = []))
		];
		element.focus();
		return () => {
			stops.forEach((stopListening) => stopListening());
			keyboard.layouts = 'default';
		};
	});
</script>

<math-field
	bind:this={field}
	aria-label="Saisie de Calcul"
	aria-autocomplete="list"
	aria-controls={proposals.length > 0 ? LIST_ID : undefined}
	class="block w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[1.375rem] text-foreground focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring"
></math-field>

{#if proposals.length > 0}
	<ul
		id={LIST_ID}
		role="listbox"
		class="fixed z-[200] m-0 max-w-[min(24rem,calc(100vw-2rem))] min-w-48 list-none rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
		style:left="{listAt.left}px"
		style:top="{listAt.top}px"
	>
		{#each proposals as proposal, index (proposal.label)}
			<li
				role="option"
				aria-selected={index === highlighted}
				class="flex cursor-pointer items-baseline gap-3 rounded-md px-2 py-1.5 {index ===
				highlighted
					? 'bg-accent text-accent-foreground'
					: ''}"
				onpointerdown={(event) => {
					event.preventDefault();
					choose(proposal);
				}}
			>
				<span class="font-semibold">{proposal.label}</span>
				<span class="truncate text-[0.8125rem] opacity-75">{proposal.detail}</span>
			</li>
		{/each}
	</ul>
{/if}
