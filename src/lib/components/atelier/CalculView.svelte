<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * La console de l'atelier (l'ancienne vue Calcul).
	 *
	 * Depuis le lot 2 de `docs/archive/wip/atelier-refonte-interface-phase0.md`, elle vit
	 * dans le volet déroulant du conteneur, montée en permanence : plus d'onglet.
	 *
	 * Un seul champ : l'élève y écrit des définitions, des calculs ou des
	 * commandes, et chaque ligne d'historique peut être **gardée** sous un nom
	 * (décision D5). Les objets du panneau sont connus du moteur sans que rien
	 * ne soit redéclaré (Q1, option B).
	 *
	 * Spécification : `docs/archive/wip/atelier-vue-calcul-phase0.md`. Le champ
	 * est en texte ou en écriture mathématique, au choix de l'élève dans les
	 * réglages (`docs/archive/wip/atelier-reglages-phase0.md`).
	 */
	import { convertLatexToMarkup, type MathfieldElement } from 'mathlive';
	import type { CalcDesk, Entry } from '$lib/atelier/desk.svelte';
	import {
		commandBeingWritten,
		commandCatalog,
		plain,
		type AtelierCommand
	} from '$lib/atelier/commands';
	import { tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { answerToCopy } from '$lib/atelier/copy-text';
	import { insertProposal, proposalsFor, type Proposal } from '$lib/atelier/completion';
	import GeneratedStepsCorrection from '$lib/components/questions/GeneratedStepsCorrection.svelte';
	import VariationTable from '$lib/components/markdown/nodes/VariationTable.svelte';
	import StatChart from '$lib/components/markdown/nodes/StatChart.svelte';
	import FormulaText from './FormulaText.svelte';
	import { definedName } from '$lib/atelier/desk.svelte';
	import {
		readStepsVerbosity,
		writeStepsVerbosity,
		type StepsVerbosity
	} from '$lib/atelier/steps-summary';
	import type { InputMode } from '$lib/atelier/input-mode';
	import {
		calcTextOf,
		commandWords,
		draftTextOf,
		fieldLatexFromText
	} from '$lib/atelier/natural-input';
	import NaturalField from './NaturalField.svelte';
	import { isSafeLatex } from '$lib/atelier/safe-latex';

	/**
	 * Le pupitre vient du CONTENEUR, pas d'ici : c'est lui qui reçoit les actions
	 * cliquées dans « Mes objets », et elles doivent écrire dans le même
	 * historique que la saisie au clavier.
	 */
	let {
		desk,
		inputMode = 'text',
		mathLatex = $bindable('')
	}: {
		desk: CalcDesk;
		/** Le champ : texte, ou écriture mathématique (réglage de l'atelier). */
		inputMode?: InputMode;
		/**
		 * La ligne en cours du champ mathématique, en LaTeX. Tenue par le
		 * CONTENEUR : la vue est démontée quand on passe au Graphe, et la
		 * reconstruire depuis `desk.draft` perdait les cases d'un modèle (revue).
		 */
		mathLatex?: string;
	} = $props();

	let field = $state<HTMLInputElement | null>(null);
	let root = $state<HTMLDivElement | null>(null);
	let list = $state<HTMLOListElement | null>(null);

	/** Le nombre d'entrées au dernier passage : seule une entrée NOUVELLE fait descendre. */
	let shownCount = 0;

	// Une nouvelle entrée (tapée, ou écrite par une action de carte) se montre :
	// l'historique descend tout en bas (demande de David du 2026-10-23)
	$effect(() => {
		const count = desk.entries.length;
		if (list !== null && count > shownCount) list.scrollTop = list.scrollHeight;
		shownCount = count;
	});

	/** Le focus dans le champ, à l'ouverture de la console (lot 2). */
	export function focusInput() {
		// Le curseur en fin de ligne : une commande préparée s'ajoute au brouillon,
		// l'élève reprend là où elle finit
		if (field !== null) {
			field.focus();
			field.setSelectionRange(field.value.length, field.value.length);
			return;
		}
		const mathField = root?.querySelector<MathfieldElement>('math-field');
		if (!mathField) return;
		mathField.focus();
		mathField.position = mathField.lastOffset;
	}

	/** Une commande en texte (`.dériver f`) : en chasse fixe, à la différence des maths. */
	function isTypedCommand(entry: Entry): boolean {
		return entry.label.trimStart().startsWith('.');
	}

	/**
	 * Les lignes dont les étapes sont dépliées (décision Q1).
	 *
	 * La ligne montre la RÉPONSE ; le raisonnement s'ouvre à la demande. Sept
	 * `.résoudre` de suite déplieraient sinon une quarantaine de blocs, et
	 * l'historique cesserait d'être lisible.
	 */
	let unfolded = $state<number[]>([]);

	/**
	 * Les lignes qui montrent leur autre écriture (phase 0 `atelier-cas-phase0.md`,
	 * PR 2). Affichage seul, ligne par ligne : ni sauvegardé, ni exporté.
	 */
	let toggled = $state<number[]>([]);

	/** Un navigateur peut refuser `localStorage` — la page marche sans. */
	function stepsStorage(): Storage | null {
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}

	/**
	 * La rédaction des étapes, LIGNE PAR LIGNE (décision de David, 2026-10-13).
	 *
	 * `lastVerbosity` : le dernier choix fait, sur n'importe quelle ligne, retenu
	 * dans ce navigateur (« Détaillé » si rien n'est retenu). Il ne s'applique
	 * qu'à l'OUVERTURE d'une ligne : basculer une ligne ne touche pas les autres
	 * lignes déjà dépliées.
	 *
	 * `lineVerbosity` : le niveau de chaque ligne dépliée au moins une fois.
	 * `chosen` distingue une ligne réglée à la main (elle garde son niveau si on
	 * la replie puis la redéplie) d'une ligne seulement ouverte (elle reprend le
	 * dernier choix à sa prochaine ouverture). Non persisté : l'historique ne
	 * l'est pas non plus. Basculer ne recalcule rien — les deux rédactions sont
	 * déjà dans la ligne (`Entry.summary`).
	 */
	let lastVerbosity = $state<StepsVerbosity>(readStepsVerbosity(stepsStorage()));
	const lineVerbosity = new SvelteMap<number, { verbosity: StepsVerbosity; chosen: boolean }>();

	function verbosityOf(id: number): StepsVerbosity {
		return lineVerbosity.get(id)?.verbosity ?? lastVerbosity;
	}

	function chooseStepsVerbosity(id: number, verbosity: StepsVerbosity) {
		lineVerbosity.set(id, { verbosity, chosen: true });
		lastVerbosity = verbosity;
		writeStepsVerbosity(stepsStorage(), verbosity);
	}

	/** Les étapes à montrer : le résumé seulement si la ligne en a un. */
	function shownSteps(entry: Entry, detailed: NonNullable<Entry['steps']>) {
		return verbosityOf(entry.id) === 'summarized' && entry.summary !== undefined
			? entry.summary
			: detailed;
	}

	function toggleSteps(id: number) {
		if (unfolded.includes(id)) {
			unfolded = unfolded.filter((x) => x !== id);
			return;
		}
		// Le niveau d'ouverture est figé ICI : un choix fait ensuite sur une
		// autre ligne ne doit pas changer celle-ci sous les yeux de l'élève
		if (lineVerbosity.get(id)?.chosen !== true) {
			lineVerbosity.set(id, { verbosity: lastVerbosity, chosen: false });
		}
		unfolded = [...unfolded, id];
	}

	const catalog = $derived(commandCatalog(desk.session.engine));

	/**
	 * Le champ « Écriture mathématique » (phase 0 `atelier-reglages-phase0.md`).
	 *
	 * `desk.draft` reste la ligne en cours, en TEXTE, quel que soit le champ :
	 * le bouton « Calculer », les commandes préparées par une carte et le retour
	 * au mode texte la lisent. Le champ mathématique l'écrit à chaque frappe
	 * (`draftTextOf`) ; la reprend quand elle change du dehors
	 * (`fieldLatexFromText`).
	 */
	const words = $derived(commandWords(catalog));
	let naturalField = $state<NaturalField | null>(null);
	/**
	 * Le brouillon que `mathLatex` écrit déjà. Pas un `$state` : l'effet qui le
	 * lit ne doit se relancer que sur `desk.draft`. Au retour sur Calcul, il
	 * repart de la ligne gardée : seul un brouillon changé entre-temps (une
	 * commande préparée par une carte) la remplace.
	 */
	// svelte-ignore state_referenced_locally
	let mirrored: string | null = mathLatex === '' ? null : draftTextOf(mathLatex, words);

	function setMathLatex(value: string) {
		mathLatex = value;
		mirrored = draftTextOf(value, words);
		desk.draft = mirrored;
	}

	// La bascule depuis le mode texte, une commande préparée par une carte
	// (« Simuler »), la ligne vidée après un calcul : le champ suit
	$effect(() => {
		if (inputMode !== 'math') return;
		const draft = desk.draft;
		if (draft === mirrored) return;
		mirrored = draft;
		mathLatex = draft === '' ? '' : fieldLatexFromText(draft, words);
	});

	/** ↑ / ↓ du champ mathématique : les saisies tapées, dans l'un ou l'autre mode. */
	function recallableLatex(): readonly string[] {
		return desk.typedInputs.map((text) => fieldLatexFromText(text, words));
	}

	/** La ligne validée dans le champ mathématique ; `false` : elle reste, la raison est dite. */
	function submitMath(latex: string): boolean {
		const converted = calcTextOf(latex, words);
		if (!converted.ok) {
			desk.notice = converted.message;
			return false;
		}
		desk.submit(converted.text, latex);
		return true;
	}

	/**
	 * La consigne du champ mathématique vide, en LaTeX (MathLive) : celle du
	 * champ texte, sans le point des commandes.
	 */
	const MATH_PLACEHOLDER = String.raw`f(x)=x^2-3x+1\text{, ou }12\,\mathrm{km}+300\,\mathrm{m}\text{, ou résoudre }x^2=4`;

	/**
	 * La saisie écrite dans le champ mathématique, composée — ou `null` : la
	 * ligne montre alors son texte, échappé par Svelte.
	 *
	 * ⚠️ La liste blanche ICI, quelle que soit la provenance (audit du
	 * 2026-10-14) : une saisie tapée peut venir du stockage — ↑ rappelle les
	 * `typed` relus, filtrés en longueur seulement — ou d'un collage. Sans ce
	 * filtre, `\htmlStyle{…}` rappelé puis validé posait un calque plein écran
	 * et une requête vers un site tiers dans la page.
	 */
	function inputMarkupOf(entry: Entry): string | null {
		if (entry.inputLatex === undefined || !isSafeLatex(entry.inputLatex)) return null;
		try {
			return convertLatexToMarkup(entry.inputLatex, { defaultMode: 'inline-math' });
		} catch {
			return null;
		}
	}

	/** Ce que lit un lecteur d'écran : le texte envoyé, sans le point jamais tapé. */
	function spokenInput(entry: Entry): string {
		return entry.label.replace(/^\.(?=\p{L})/u, '');
	}

	/**
	 * Les commandes à proposer, filtrées par ce qui est déjà tapé (§5 N1, N2).
	 *
	 * ⚠️ Le filtre regarde AUSSI la graphie sans accent et les raccourcis : sans
	 * ça, `.der` ne proposait rien alors que `.deriver` s'exécute très bien — la
	 * découverte et l'exécution n'étaient pas d'accord, et c'est la découverte
	 * qui est le point de ce lot.
	 */
	const suggestions = $derived.by(() => {
		// Le champ mathématique a sa propre liste (sans point)
		if (inputMode === 'math' || !desk.draft.startsWith('.')) return [] as AtelierCommand[];
		// Un espace signifie que la commande est choisie : on ne propose plus rien.
		if (desk.draft.slice(1).includes(' ')) return [] as AtelierCommand[];
		const typed = plain(desk.draft.slice(1).split(' ')[0]).toLowerCase();
		return catalog
			.filter((c) =>
				[c.french, c.name, ...c.aliases].some((form) => plain(form).toLowerCase().startsWith(typed))
			)
			.slice(0, 8);
	});

	/** Préfixe des ids : deux vues Calcul montées ne doivent pas se confondre. */
	const uid = $props.id();

	/**
	 * La liste des commandes au clavier (phase 0 `atelier-cas-phase0.md`, PR 1).
	 *
	 * Échap la ferme jusqu'à la frappe suivante, comme un rappel par ↑ / ↓. Le
	 * surlignage est retenu par NOM, et toute frappe le remet sur la première
	 * commande disponible.
	 */
	let dismissed = $state(false);
	let highlightedName = $state<string | null>(null);

	const listOpen = $derived(suggestions.length > 0 && !dismissed);
	const active = $derived(
		suggestions.find((c) => c.name === highlightedName) ?? suggestions[0] ?? null
	);
	const activeId = $derived(
		listOpen && active !== null ? `${uid}-commande-${suggestions.indexOf(active)}` : undefined
	);

	/**
	 * La complétion des fonctions et des lettres grecques (phase 0
	 * `atelier-cas-phase0.md`, PR 3). Le mot en cours est celui du CURSEUR :
	 * `caret` suit la frappe, les flèches et le clic. La liste des commandes a
	 * la priorité — une seule liste ouverte à la fois.
	 */
	let caret = $state(0);
	let highlightedProposal = $state<string | null>(null);

	const proposals = $derived(
		inputMode === 'math' || suggestions.length > 0 ? [] : proposalsFor(desk.draft, caret)
	);
	const proposalsOpen = $derived(proposals.length > 0 && !dismissed);
	const activeProposal = $derived(
		proposals.find((p) => p.insert === highlightedProposal) ?? proposals[0] ?? null
	);
	const activeDescendant = $derived(
		listOpen
			? activeId
			: proposalsOpen && activeProposal !== null
				? `${uid}-proposition-${proposals.indexOf(activeProposal)}`
				: undefined
	);

	/**
	 * Retenir où est le curseur : c'est lui qui désigne le mot en cours.
	 *
	 * ⚠️ Relu aussi en tête de `handleKeydown` et d'`insert` : Cmd+← (Mac) ne
	 * donne aucun relâchement de touche, une sélection à la souris peut finir
	 * hors du champ — Tab insérait alors à l'ancienne place (revue).
	 */
	function syncCaret() {
		if (field !== null) caret = field.selectionStart ?? desk.draft.length;
	}

	/** Le curseur bougé autrement (souris, Cmd+←) : la liste affichée le suit. */
	function handleSelectionChange() {
		if (field !== null && document.activeElement === field) syncCaret();
	}

	/**
	 * Les touches qui DÉPLACENT le curseur : le mot en cours change avec lui.
	 * Pas les autres — le relâchement de Tab arriverait avant l'insertion, et
	 * relirait un curseur périmé.
	 */
	const CARET_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);

	function handleKeyup(event: KeyboardEvent) {
		if (CARET_KEYS.has(event.key)) syncCaret();
	}

	/** Remplacer le mot en cours par la proposition, curseur juste après. */
	async function insert(proposal: Proposal) {
		syncCaret();
		const next = insertProposal(desk.draft, caret, proposal);
		desk.draft = next.draft;
		caret = next.caret;
		highlightedProposal = null;
		// La valeur changée par script met le curseur à la FIN du champ : au
		// milieu (`co| + 1`), il faut le replacer après l'insertion
		await tick();
		field?.focus();
		field?.setSelectionRange(next.caret, next.caret);
	}

	/** Déplacer le surlignage parmi les propositions, en boucle. */
	function moveProposal(step: 1 | -1) {
		if (activeProposal === null) return;
		const next = (proposals.indexOf(activeProposal) + step + proposals.length) % proposals.length;
		highlightedProposal = proposals[next].insert;
	}

	/** La commande dont l'élève tape la suite, et son modèle sous le champ. */
	const writing = $derived(inputMode === 'math' ? null : commandBeingWritten(catalog, desk.draft));
	const model = $derived(writing === null ? null : (writing.example ?? writing.description));

	/**
	 * Une frappe rouvre la liste et remet le surlignage sur la première
	 * commande disponible : sans ça, effacer puis retaper `.d` gardait la
	 * commande surlignée avant (revue).
	 */
	function handleInput() {
		dismissed = false;
		highlightedName = null;
		highlightedProposal = null;
		syncCaret();
	}

	/** Le nom tapé après le point est-il exactement une graphie de cette commande ? */
	function typedInFull(command: AtelierCommand): boolean {
		const typed = plain(desk.draft.slice(1)).toLowerCase();
		return [command.french, command.name, ...command.aliases].some(
			(form) => plain(form).toLowerCase() === typed
		);
	}

	/** Déplacer le surlignage parmi les commandes proposées, en boucle. */
	function move(step: 1 | -1) {
		if (active === null) return;
		const next = (suggestions.indexOf(active) + step + suggestions.length) % suggestions.length;
		highlightedName = suggestions[next].name;
	}

	/**
	 * Entrée dans la liste des commandes CHOISIT (une commande incomplète ne
	 * calcule rien) ; Tab aussi. Liste fermée, ↑ / ↓ rappellent les saisies.
	 *
	 * ⚠️ `preventDefault` avant tout : Entrée enverrait le formulaire, Tab
	 * ferait quitter le champ.
	 */
	function handleKeydown(event: KeyboardEvent) {
		// Safari envoie l'Entrée qui valide une saisie IME avec `isComposing`
		// faux, mais le code 229
		const composing = event.isComposing || event.keyCode === 229;
		if (composing || event.altKey || event.ctrlKey || event.metaKey) return;
		syncCaret();

		if (listOpen) {
			if (event.key === 'Escape') {
				event.preventDefault();
				dismissed = true;
				return;
			}
			// Une liste sans commande disponible (`.pose`) : Entrée calcule, et
			// le moteur dit pourquoi
			if (active === null) return;
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				move(event.key === 'ArrowDown' ? 1 : -1);
			} else if (event.key === 'Enter' && typedInFull(active) && active.runsAlone === true) {
				// `.aide` tapée en entier : rien à choisir, Entrée calcule (décision
				// de David, 2026-10-11) — le formulaire part comme sans la liste
			} else if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
				event.preventDefault();
				complete(active);
			}
			return;
		}

		// Liste des fonctions et lettres grecques : elle s'est ouverte toute
		// seule au milieu d'un calcul, elle ne détourne donc PAS Entrée, qui
		// calcule (décision de David : `3ta` donne 3·t·a) ; Tab ou un clic choisit
		if (proposalsOpen && activeProposal !== null) {
			if (event.key === 'Escape') {
				event.preventDefault();
				dismissed = true;
				return;
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				moveProposal(event.key === 'ArrowDown' ? 1 : -1);
				return;
			}
			if (event.key === 'Tab' && !event.shiftKey) {
				event.preventDefault();
				void insert(activeProposal);
				return;
			}
		}

		// Le curseur se place seul à la fin de la ligne rappelée : la norme HTML
		// l'y met quand un script change la valeur d'un champ (mesuré : un
		// `setSelectionRange` ajouté ne changeait rien au test qui le vérifie)
		// Maj+↑ / Maj+↓ sélectionnent le texte : on les laisse au navigateur
		if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.shiftKey) {
			event.preventDefault();
			if (event.key === 'ArrowUp') desk.recallPrevious();
			else desk.recallNext();
			caret = desk.draft.length;
			// Une ligne rappelée qui commence par un point rouvrirait la liste, et
			// ↑ / ↓ y resteraient pris (`.pose` : rien à surligner, revue) — elle
			// revient à la frappe suivante
			dismissed = true;
		}
	}

	/**
	 * Le LaTeX de la réponse montrée : aussi posé en `data-latex`, que lisent
	 * les tests de navigateur (`e2e/verifs/`).
	 */
	function shownLatex(entry: Entry): string | undefined {
		if (entry.failed) return undefined;
		// Le bouton de la ligne a basculé : on montre l'autre écriture
		return entry.alternative !== undefined && toggled.includes(entry.id)
			? entry.alternative.latex
			: entry.latex;
	}

	/**
	 * Le rendu mathématique d'une ligne, ou `null` s'il n'y en a pas de sûr.
	 *
	 * Le repli est le TEXTE, échappé par Svelte : si la conversion échoue, on
	 * n'affiche pas du markup à moitié construit.
	 */
	function markupOf(entry: Entry): string | null {
		const latex = shownLatex(entry);
		if (latex === undefined) return null;
		try {
			return convertLatexToMarkup(latex, { defaultMode: 'inline-math' });
		} catch {
			return null;
		}
	}

	/**
	 * Copier la réponse d'une ligne (phase 0 `atelier-copier-phase0.md`). Le
	 * retour va dans la ligne de retour de Calcul, annoncée ; vidée d'abord, pour
	 * qu'une seconde copie soit annoncée aussi.
	 */
	async function copyAnswer(text: string, message: string) {
		desk.notice = null;
		try {
			await navigator.clipboard.writeText(text);
			await tick();
			desk.notice = message;
		} catch {
			// Permission refusée, contexte non sécurisé : jamais un échec muet
			desk.notice = 'Ton navigateur a refusé la copie.';
		}
	}

	function toggleAlternative(id: number) {
		toggled = toggled.includes(id) ? toggled.filter((x) => x !== id) : [...toggled, id];
	}

	/** Ce que dit le bouton : l'écriture qu'il va montrer. */
	function toggleLabel(entry: Entry): string {
		if (entry.alternative === undefined) return '';
		if (!toggled.includes(entry.id)) return entry.alternative.label;
		return entry.alternative.label === 'Valeur approchée' ? 'Valeur exacte' : 'Valeur approchée';
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		// Le bouton « Calculer » sous le champ mathématique : le même chemin qu'Entrée
		if (inputMode === 'math') naturalField?.submit();
		else desk.submit(desk.draft);
	}

	/** Remplacer la commande en cours par celle que l'élève vient de choisir. */
	function complete(command: AtelierCommand) {
		desk.draft = `.${command.french} `;
		highlightedName = null;
		// Rendre la main au champ : l'élève vient de choisir dans une liste, il
		// veut taper la suite, pas recliquer.
		field?.focus();
	}

	/**
	 * Une ligne est gardable si elle porte l'ARBRE de son résultat (§4 L2).
	 *
	 * ⚠️ Auparavant « Garder… » s'affichait sur toute sortie non vide, `.aide`
	 * comprise — et gardait alors « MathAST CAS - Commandes disponibles » comme
	 * un objet mathématique.
	 */
	function canKeep(entry: Entry): boolean {
		// Une construction tapée seule (`(AB)`, lot 2) se garde par sa définition
		return (
			entry.result?.kind === 'calcul' &&
			(entry.result.ast !== undefined || entry.result.construction !== undefined)
		);
	}
</script>

<svelte:document onselectionchange={handleSelectionChange} />

<!-- L'historique pour une fiche (ubumark) est dans le menu de la console (conteneur) -->
<div class="calcul" bind:this={root}>
	<ol class="historique" bind:this={list}>
		{#each desk.entries as entry, index (entry.id)}
			{@const markup = markupOf(entry)}
			{@const copied = answerToCopy(entry, toggled.includes(entry.id))}
			{@const written = inputMarkupOf(entry)}
			{@const defined = definedName(entry)}
			<li class:refus={entry.failed} class:annulee={entry.undone}>
				<!-- L'invite de la console : décorative, HORS du paragraphe de la saisie,
				     qui sert de description aux étapes (`aria-describedby`) -->
				<div class="ligne-saisie">
					<span class="invite" aria-hidden="true">&gt;</span>
					<!-- Barrée : son étape est annulée (lot 5, PR 2) — dit, pas seulement montré -->
					{#if entry.undone}<span class="sr-only">Annulée :</span>{/if}
					<p
						class="saisie"
						class:commande={written === null && isTypedCommand(entry)}
						id="{uid}-saisie-{entry.id}"
					>
						{#if written !== null}
							<!-- La saisie écrite en mathématiques : composée pour les yeux,
						     dite en texte aux lecteurs d'écran (lecture de MathLive en anglais) -->
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<span aria-hidden="true">{@html written}</span>
							<span class="sr-only">{spokenInput(entry)}</span>
						{:else}
							{entry.label}
						{/if}
					</p>
				</div>
				<div class="reponse">
					<!-- La réponse, repérable d'un coup d'œil (demande de David, 2026-10-18) -->
					<span class="fleche" aria-hidden="true">--&gt;</span>
					{#if markup !== null}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<span class="math" data-latex={shownLatex(entry)}>{@html markup}</span>
					{:else if entry.formulas}
						<!-- Refus de `.réciproque` : ses formules `$…$` composées -->
						<span class="texte"><FormulaText text={entry.text} /></span>
					{:else if defined !== null}
						<!-- « f est correctement défini », le nom en couleur -->
						<span class="texte"
							><span class="nom-defini">{defined}</span>{entry.text.slice(defined.length)}</span
						>
					{:else}
						<span class="texte">{entry.text}</span>
					{/if}
					{#if entry.note !== undefined}
						<!-- Montrée même quand la réponse est composée en mathématiques -->
						<span class="note">{entry.note}</span>
					{/if}
					<!-- Les boutons de la ligne : au survol ou au focus, toujours au toucher -->
					<span class="outils-ligne">
						{#if entry.alternative !== undefined && !entry.failed}
							<Button
								variant="ghost"
								size="sm"
								class="bascule"
								onclick={() => toggleAlternative(entry.id)}
							>
								{toggleLabel(entry)}
							</Button>
						{/if}
						{#if canKeep(entry)}
							<Button variant="ghost" size="sm" class="garder" onclick={() => desk.keep(entry)}>
								Garder…
							</Button>
						{/if}
						{#if copied !== null}
							<!-- La réponse seule, en texte lisible ; le LaTeX au menu (David, 2026-10-15) -->
							<span class="copier">
								<Button
									variant="ghost"
									size="sm"
									onclick={() =>
										copyAnswer(
											copied.text,
											copied.asLatex === true
												? 'Copié en LaTeX : cette réponse ne s’écrit pas en texte.'
												: 'Copié.'
										)}
								>
									Copier
								</Button>
								{#if copied.latex !== undefined && copied.asLatex !== true}
									{@const latex = copied.latex}
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button
													{...props}
													variant="ghost"
													size="sm"
													class="px-1"
													aria-label="Autres façons de copier"
												>
													<ChevronDown class="size-4" aria-hidden="true" />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Item onclick={() => copyAnswer(latex, 'Copié en LaTeX.')}>
												Copier en LaTeX
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								{/if}
							</span>
						{/if}
						{#if entry.steps !== undefined}
							<Button
								variant="ghost"
								size="sm"
								class="comment"
								aria-expanded={unfolded.includes(entry.id)}
								aria-controls="{uid}-etapes-{entry.id}"
								onclick={() => toggleSteps(entry.id)}
							>
								{unfolded.includes(entry.id) ? 'Masquer le détail' : 'Comment ?'}
							</Button>
						{/if}
					</span>
				</div>
				{#if entry.steps !== undefined && unfolded.includes(entry.id)}
					<div class="etapes" id="{uid}-etapes-{entry.id}">
						<!-- Pas d'interrupteur quand le résumé ne dirait rien de moins -->
						{#if entry.summary !== undefined}
							<div
								class="redaction"
								role="group"
								aria-label="Rédaction des étapes de la ligne {index + 1}"
								aria-describedby="{uid}-saisie-{entry.id}"
							>
								<button
									type="button"
									class="choix"
									aria-pressed={verbosityOf(entry.id) === 'summarized'}
									onclick={() => chooseStepsVerbosity(entry.id, 'summarized')}
									><span class="coche" aria-hidden="true">✓</span>Résumé</button
								>
								<button
									type="button"
									class="choix"
									aria-pressed={verbosityOf(entry.id) === 'detailed'}
									onclick={() => chooseStepsVerbosity(entry.id, 'detailed')}
									><span class="coche" aria-hidden="true">✓</span>Détaillé</button
								>
							</div>
						{/if}
						<GeneratedStepsCorrection steps={shownSteps(entry, entry.steps)} />
					</div>
				{/if}
				<!--
					Le tableau de variations se montre d'emblée : c'est la réponse
					elle-même, pas un détail à déplier. La ligne au-dessus ne porte
					alors que le texte du moteur, en repli.
				-->
				{#if entry.table !== undefined}
					<div class="tableau">
						<VariationTable node={entry.table} />
					</div>
				{/if}
				<!-- Le graphique d'une simulation (Q80) : sous la ligne, à côté des
				     nombres qu'il illustre -->
				{#if entry.chart !== undefined}
					<div class="tableau">
						<StatChart scene={entry.chart} />
					</div>
				{/if}
			</li>
		{/each}
	</ol>

	<!--
		`aria-live` : ce que « Garder » a produit doit être ANNONCÉ, pas seulement
		affiché — sinon un lecteur d'écran ne voit jamais apparaître le message.
	-->
	<p class="retour" aria-live="polite" class:vide={desk.notice === null}>{desk.notice ?? ''}</p>

	{#if listOpen}
		<!--
			Le motif « combobox » : le focus reste dans le champ, l'élément
			surligné est annoncé par `aria-activedescendant`. Les boutons gardent
			le clic (et le toucher) ; `tabindex="-1"` les sort du parcours au Tab.
		-->
		<ul class="commandes" id="{uid}-commandes" role="listbox" aria-label="Commandes disponibles">
			{#each suggestions as command, index (command.name)}
				<li role="none">
					<button
						type="button"
						role="option"
						id="{uid}-commande-{index}"
						tabindex="-1"
						aria-selected={command === active}
						class:surlignee={command === active}
						onclick={() => complete(command)}
						title={command.example ?? ''}
					>
						<span class="nom">.{command.french}</span>
						<span class="quoi">{command.description}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if proposalsOpen}
		<!-- Même motif que la liste des commandes ; Entrée n'y choisit pas -->
		<ul
			class="commandes propositions"
			id="{uid}-propositions"
			role="listbox"
			aria-label="Fonctions et lettres grecques : Tab pour insérer, Entrée calcule"
		>
			{#each proposals as proposal, index (proposal.insert)}
				<li role="none">
					<button
						type="button"
						role="option"
						id="{uid}-proposition-{index}"
						tabindex="-1"
						aria-selected={proposal === activeProposal}
						aria-label={proposal.label}
						class:surlignee={proposal === activeProposal}
						onclick={() => insert(proposal)}
					>
						<span class="nom">{proposal.insert}</span>
						<span class="quoi">{proposal.label}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if model !== null}
		<p class="modele" id="{uid}-modele">Modèle : <code>{model}</code></p>
	{/if}

	<form onsubmit={submit}>
		{#if inputMode === 'math'}
			<div class="champ-math">
				<NaturalField
					bind:this={naturalField}
					bind:latex={() => mathLatex, setMathLatex}
					{words}
					history={recallableLatex}
					onsubmit={submitMath}
					label="Calcul, définition ou commande"
					placeholder={MATH_PLACEHOLDER}
				/>
			</div>
		{:else}
			<input
				bind:this={field}
				bind:value={desk.draft}
				type="text"
				autocomplete="off"
				spellcheck="false"
				role="combobox"
				aria-autocomplete="list"
				aria-expanded={listOpen || proposalsOpen}
				aria-controls={listOpen
					? `${uid}-commandes`
					: proposalsOpen
						? `${uid}-propositions`
						: undefined}
				aria-activedescendant={activeDescendant}
				aria-describedby={model !== null ? `${uid}-modele` : undefined}
				onkeydown={handleKeydown}
				onkeyup={handleKeyup}
				onclick={syncCaret}
				oninput={handleInput}
				aria-label="Calcul, définition ou commande"
				placeholder="f(x) = x^2 − 3x + 1, ou 12 km + 300 m, ou un point pour les commandes"
			/>
		{/if}
		<Button type="submit" disabled={desk.draft.trim() === ''}>Calculer</Button>
	</form>
</div>

<style>
	.calcul {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.historique {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.historique li {
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.5rem;
	}
	.historique li.refus .texte {
		color: var(--color-destructive);
	}
	/* Une ligne dont l'étape est annulée : barrée, atténuée, toujours lisible */
	.historique li.annulee .ligne-saisie,
	.historique li.annulee .reponse {
		text-decoration: line-through;
		opacity: 0.6;
	}

	/* Une longue saisie écrite en mathématiques défile dans son cadre (§3 N5).
	   Sur le paragraphe, pas sur la formule : une zone qui défile prend le focus
	   au clavier (Chrome 130), et la formule est cachée aux lecteurs d'écran */
	/* L'instruction en couleur NORMALE, pas plus sombre que la réponse (demande
	   de David, 2026-10-18) : c'est la taille et l'invite qui la distinguent */
	.saisie {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-foreground);
		max-width: 100%;
		overflow-x: auto;
	}
	.ligne-saisie {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		min-width: 0;
	}
	.ligne-saisie .saisie {
		min-width: 0;
	}
	.invite {
		flex: none;
		font-family: var(--font-mono, monospace);
		color: var(--color-muted-foreground);
	}
	/* Une commande en texte (`.dériver f`) en chasse fixe ; les maths restent composées */
	.saisie.commande {
		font-family: var(--font-mono, monospace);
	}

	.reponse {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	/* `-->` et le nom défini en couleur d'accent : la réponse se repère d'un coup
	   d'œil. ⚠️ Pas `--color-primary` (#fc8f1b : 2,3:1 sur blanc). Le fond de
	   la console est `--color-background` : en clair #a65800 y fait 5,0:1 sur
	   #fafafa (5,2:1 sur blanc) — #b25f00 n'y faisait que 4,44:1, sous le seuil
	   AA de 4,5:1 qu'exige le nom défini, du vrai texte ; en sombre, le jaune du
	   site #ffc400 fait 9,5:1 sur #262624 */
	.calcul {
		--accent-console: light-dark(#a65800, #ffc400);
	}
	.fleche {
		font-family: var(--font-mono, monospace);
		font-weight: 700;
		color: var(--accent-console);
	}
	.nom-defini {
		font-weight: 700;
		color: var(--accent-console);
	}

	/* Les boutons de ligne ne gênent plus la lecture : visibles au survol ou
	   quand la ligne a le focus ; toujours atteignables au clavier (opacité, pas
	   `display`), et toujours visibles au toucher, où rien ne survole —
	   `any-*` : un portable tactile à souris déclare `hover: hover`, mais le
	   doigt n'y survole rien non plus */
	.outils-ligne {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 120ms ease;
	}
	.historique li:hover .outils-ligne,
	.historique li:focus-within .outils-ligne {
		opacity: 1;
	}
	@media (any-hover: none), (any-pointer: coarse) {
		.outils-ligne {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.outils-ligne {
			transition: none;
		}
	}
	/* Un résultat long défile dans son cadre plutôt que de pousser le panneau
	   d'objets hors de l'écran (§3 N5). */
	.math,
	.texte {
		font-size: 1.05rem;
		min-width: 0;
		overflow-x: auto;
	}
	.texte {
		white-space: pre-wrap;
	}
	.copier {
		display: inline-flex;
		align-items: center;
	}

	.note {
		flex-basis: 100%;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}

	/* Un tableau déborde en largeur bien plus qu'une formule : il défile dans
	   son cadre plutôt que d'élargir la page. */
	.tableau {
		margin-top: 0.5rem;
		overflow-x: auto;
	}

	/* Les étapes dépliées : un bloc indenté sous la réponse, qui défile dans son
	   cadre comme le reste — un `\begin{aligned}` est large. */
	.etapes {
		margin-top: 0.5rem;
		padding-left: 0.75rem;
		border-left: 2px solid var(--color-border);
		overflow-x: auto;
	}

	/* L'interrupteur « Résumé / Détaillé » : le choix segmenté de
	   `SequenceSettings` (nuage / escalier). L'état choisi ne repose pas que sur
	   un fond pâle (projection) : bordure pleine contrastée et coche ✓. */
	.redaction {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.375rem;
	}
	.choix {
		min-height: 1.75rem;
		padding: 0.125rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.coche {
		display: none;
		margin-right: 0.25rem;
	}
	.choix[aria-pressed='true'] {
		background: var(--color-muted);
		border-color: var(--color-foreground);
		font-weight: 600;
	}
	.choix[aria-pressed='true'] .coche {
		display: inline;
	}
	.choix:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	@media (pointer: coarse) {
		.choix {
			min-height: 44px;
		}
	}

	/* ⚠️ Pas « .avis » : `AtelierContainer` a déjà une région de ce nom, et deux
	   régions aria-live homonymes dans le même écran se confondent — y compris
	   pour un test qui croit interroger l'une et lit l'autre. */
	.retour {
		margin: 0;
		min-height: 1.25rem;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}
	.retour.vide {
		visibility: hidden;
	}

	.commandes {
		max-height: 12rem;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-card);
	}
	.commandes button {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		padding: 0.25rem 0.375rem;
		text-align: left;
		border-radius: 0.25rem;
	}
	.commandes button:hover:not(:disabled),
	.commandes button.surlignee {
		background: var(--color-muted);
	}

	.modele {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}
	.modele code {
		font-family: var(--font-mono, monospace);
		color: var(--color-foreground);
	}
	.commandes button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.nom {
		font-family: var(--font-mono, monospace);
		white-space: nowrap;
	}
	.quoi {
		color: var(--color-muted-foreground);
		font-size: 0.8125rem;
	}

	form {
		display: flex;
		gap: 0.5rem;
	}
	.champ-math {
		flex: 1;
		min-width: 0;
	}

	form input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		color: var(--color-foreground);
	}
</style>
