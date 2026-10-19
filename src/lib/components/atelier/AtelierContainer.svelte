<script lang="ts">
	/**
	 * L'atelier : un panneau d'objets, et des vues qui en sont des projections.
	 *
	 * ⚠️ C'est l'atelier qui POSSÈDE l'état (décision figée n° 1) : les vues ne
	 * détiennent rien, elles montrent les mêmes objets autrement. C'est ce qui
	 * permet le changement de registre sans transfert ni re-parse.
	 */
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Atelier } from '$lib/atelier/atelier.svelte';
	import { provideAtelier } from '$lib/atelier/context';
	import {
		keepCalcHistory,
		openSession,
		type HistoryKeeper,
		type Session,
		type SessionNotice
	} from '$lib/atelier/session';
	import { isFunction, isList, type AtelierObject } from '$lib/atelier/types';
	import type { ImportedHistory } from '$lib/atelier/history-import';
	import type { RemovedWithDependents } from '$lib/atelier/atelier.svelte';
	import { derivativeName, displayName } from '$lib/atelier/names';
	import type { AtelierState } from '$lib/atelier/persistence';
	import type { ObjectAction } from '$lib/atelier/actions';
	import ObjectPanel from './ObjectPanel.svelte';
	import CalculView from './CalculView.svelte';
	import DataView from './DataView.svelte';
	import FigureView from './FigureView.svelte';
	import ShareBar from './ShareBar.svelte';
	import AtelierSettings from './AtelierSettings.svelte';
	import { readInputMode, writeInputMode, type InputMode } from '$lib/atelier/input-mode';
	import { readAngleUnit, writeAngleUnit, type AngleUnit } from '$lib/atelier/angle-unit';
	import { CalcDesk } from '$lib/atelier/desk.svelte';
	import GrapheurContainer from '$lib/components/grapheur/GrapheurContainer.svelte';
	import { GrapheurStore } from '$lib/stores/grapheur.svelte';
	import { provideGrapheurStore } from '$lib/stores/grapheur-context';
	import { syncPlots } from '$lib/atelier/plot-sync';
	import { consoleReadings } from '$lib/atelier/reading';
	import { ATELIER_STATE_VERSION } from '$lib/atelier/persistence';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { cascadeMessage, citingCellsNote, removedMessage } from '$lib/atelier/removal';
	import { tabulationReport } from '$lib/atelier/tabulate';
	import {
		ArchiveRestore,
		EllipsisVertical,
		FolderOpen,
		Redo2,
		RotateCcw,
		Save,
		Share2,
		SquareTerminal,
		Undo2,
		X
	} from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ToolButton from './ToolButton.svelte';
	import { FIELD_SELECTOR, consoleShortcut, isMacPlatform } from '$lib/atelier/console-key';
	import { downloadHistory, historyToUbumark } from '$lib/atelier/history-export';
	import { rovingToolbar } from './roving-toolbar';
	import {
		ATELIER_FILE_TOO_BIG,
		MAX_ATELIER_FILE_BYTES,
		atelierFileName,
		atelierFileToJson,
		readAtelierFile
	} from '$lib/atelier/atelier-file';
	import type { KeptHistory } from '$lib/atelier/history-storage';
	import { downloadText } from '$lib/atelier/history-export';
	import { renamedOnReadMessage } from '$lib/atelier/geometry';
	import {
		RETRIEVE_LABEL,
		SET_ASIDE_NOTICE,
		SET_ASIDE_REASSURANCE,
		hasSetAside,
		isBlankAtelier,
		keepAside,
		readPersonal,
		replacePersonal,
		replacementLoss,
		swapWithSetAside
	} from '$lib/atelier/replace';

	interface Props {
		/** L'atelier à piloter. Sans lui, le conteneur crée le sien. */
		atelier?: Atelier;
		/**
		 * Vue ouverte au démarrage (le Graphe par défaut). Une vue DEMANDÉE
		 * (`/grapheur`) s'ouvre console fermée ; sinon la console est ouverte.
		 */
		view?: ViewId;
		/** La console ouverte au démarrage ; par défaut, seulement sans vue demandée. */
		consoleAtStart?: boolean;
		/** Ne rien charger ni ranger — mode éphémère (§6, §7 N2). */
		ephemeral?: boolean;
		/** L'atelier reçu par l'URL. Sa présence fait le mode éphémère. */
		received?: AtelierState | null;
		/** Ce que la relecture de l'URL a eu à dire. */
		notice?: string | null;
		/**
		 * Un atelier VIDE reçoit une carte de ce type, tracée et prête à taper —
		 * c'est l'ouverture de `/grapheur` (phase 0 §6 B3 : pas de x² d'office).
		 */
		startWith?: 'function';
		/** Le titre de la page (niveau 1, pour les lecteurs d'écran — revue a11y). */
		heading?: string;
		/**
		 * L'atelier reçu est devenu l'atelier personnel (« Remplacer mon atelier ») :
		 * la page retire `?a=` de l'adresse, qu'un rechargement ne rouvre pas le lien.
		 */
		onLinkLeft?: () => void;
	}

	type ViewId = 'graphe' | 'figure' | 'donnees';

	/** Un avis de l'atelier, parfois avec son geste (« Retrouver mon atelier précédent », B4). */
	type Notice = SessionNotice & {
		readonly action?: { readonly label: string; readonly run: () => void };
	};

	/**
	 * Géométrie entre Graphe et Données (géométrie v2, Q5 révisée) : les deux vues
	 * graphiques côte à côte. L'identifiant reste `figure` (`FigureView`).
	 *
	 * Plus d'onglet Calcul (lot 2 de `atelier-refonte-interface-phase0.md`) : la
	 * console est un volet qui descend PAR-DESSUS la vue.
	 */
	const VIEWS: { id: ViewId; label: string }[] = [
		{ id: 'graphe', label: 'Graphe' },
		{ id: 'figure', label: 'Géométrie' },
		{ id: 'donnees', label: 'Données' }
	];

	/** Hauteur de la console, en % de la scène : par défaut, et ses bornes à la poignée. */
	const CONSOLE_HEIGHT = 40;
	const CONSOLE_MIN = 20;
	const CONSOLE_MAX = 90;
	/** En dessous, la console prend toute la scène (phase 0, lot 2 : sur téléphone). */
	const NARROW_QUERY = '(max-width: 640px)';

	let {
		atelier = new Atelier(),
		view,
		consoleAtStart,
		ephemeral = false,
		received = null,
		notice = null,
		startWith,
		heading = 'Atelier',
		onLinkLeft
	}: Props = $props();

	/** Les noms des étapes d'Annuler qui remplacent l'atelier (`atelier.replaceWith`). */
	const REPLACE_STEP = 'remplacer mon atelier';
	const RETRIEVE_STEP = 'retrouver mon atelier précédent';
	const LOAD_STEP = 'charger un atelier';

	/**
	 * Sur un lien reçu (mode éphémère) ? Au départ, ce que dit la page ; « Remplacer
	 * mon atelier » en sort sans recharger : l'atelier affiché devient le personnel.
	 */
	// svelte-ignore state_referenced_locally
	let linkMode = $state(ephemeral);
	/** L'atelier reçu, tant qu'on est sur le lien. */
	// svelte-ignore state_referenced_locally
	let shownReceived = $state(received);
	/** Une copie mise de côté existe : « Retrouver » est proposé (B4). */
	let setAsideExists = $state(false);
	/** « Remplacer mon atelier » : la confirmation, et ce qu'elle dit qui sera perdu (B2). */
	let confirmReplace = $state(false);
	let replaceLossText = $state('');

	/**
	 * Durée du toast « Annuler » après une suppression (E2). Le toast part, la
	 * suppression reste annulable : c'est une étape de la pile (lot 5, Q4).
	 */
	const UNDO_DURATION_MS = 10_000;

	/** L'objet dont la suppression attend confirmation, avec ce qu'elle emporterait (N2). */
	let pendingRemoval = $state<{
		name: string;
		dependents: readonly string[];
		/** Les cellules de la grille qui citent la liste (tableur, T3 et T5). */
		citing: number;
	} | null>(null);
	let confirmRemoval = $state(false);
	/** La suppression vient-elle d'être confirmée ? Sinon, renoncer rend le focus au bouton. */
	let removalConfirmed = false;

	/** Le toast de la dernière suppression, fermé dès qu'on annule (bouton ou Ctrl+Z). */
	let undoable: { result: RemovedWithDependents; toastId: string | number } | null = null;

	/** L'historique relu qui attend la confirmation du rejeu (lot C2, R2). */
	let pendingReplay = $state<ImportedHistory | null>(null);
	let confirmReplay = $state(false);

	/** « Repartir de zéro » : la confirmation est-elle ouverte ? (B7) */
	let confirmReset = $state(false);

	/** Le fichier `.atelier.json` relu qui attend la confirmation de « Charger » (lot 1). */
	let pendingLoad = $state<{
		state: AtelierState;
		history: KeptHistory;
		dropped: number;
		consoleNotice: string | null;
		/** Le nom du fichier : la console dit d'où vient l'atelier chargé */
		fileName: string;
	} | null>(null);
	let confirmLoad = $state(false);
	let loadInput = $state<HTMLInputElement | null>(null);
	let shareBar = $state<ShareBar | null>(null);

	/**
	 * Le champ de Calcul : texte ou écriture mathématique (phase 0
	 * `atelier-reglages-phase0.md`). Une préférence de l'élève, retenue dans ce
	 * navigateur — sur un lien reçu aussi : elle n'est pas le contenu de
	 * l'atelier. Les deux pages ne montent l'atelier que dans le navigateur.
	 */
	let inputMode = $state<InputMode>(readInputMode(readStorage()));

	/** La ligne en cours du champ mathématique : elle survit au passage par le Graphe. */
	let mathLatex = $state('');

	function chooseInputMode(mode: InputMode) {
		inputMode = mode;
		writeInputMode(readStorage(), mode);
	}

	/**
	 * Le réglage « Angles » (degrés par défaut, 2026-10-18) : une préférence de ce
	 * navigateur, posée sur l'atelier — qui recalcule ses mesures d'angle.
	 */
	// svelte-ignore state_referenced_locally
	atelier.setAngleUnit(readAngleUnit(readStorage()));

	function chooseAngleUnit(unit: AngleUnit) {
		atelier.setAngleUnit(unit);
		writeAngleUnit(readStorage(), unit);
	}

	/** Un historique relu : confirmer s'il y a de quoi perdre, sinon rejouer (R1, R2). */
	function handleReplayRequest(history: ImportedHistory) {
		pendingReplay = history;
		if (atelier.objects.length > 0 || desk.entries.length > 0) confirmReplay = true;
		else replayNow();
	}

	/**
	 * Vider puis rejouer. ⚠️ Pas `handleReset` : sur `/grapheur`, il recrée une
	 * carte `f` vide, qui ferait refuser le `f` rejoué.
	 */
	function replayNow() {
		if (pendingReplay === null) return;
		atelier.restore({ version: ATELIER_STATE_VERSION, objects: [] });
		desk.clear();
		seen = 0;
		selected = null;
		const history = pendingReplay;
		pendingReplay = null;
		desk.replay(history, graph);
	}

	/** Ce que le rejeu remplacera, en mots (R2). */
	function replayLoss(): string {
		const count = atelier.objects.length;
		if (count === 0) return 'l’historique actuel sera effacé.';
		const objects =
			count === 1 ? 'ton objet sera remplacé' : `tes ${count} objets seront remplacés`;
		return `${objects}, et l’historique effacé. Un lien de partage déjà copié les garde.`;
	}

	/** « Enregistrer » : l'atelier entier et sa console dans un fichier (lot 1). */
	function handleSave() {
		const now = new Date();
		downloadText(
			atelierFileToJson(atelier.serialize(), desk.entries, desk.typedInputs, now),
			'application/json',
			atelierFileName(now)
		);
		toaster.success('Atelier enregistré.');
	}

	/** Un fichier choisi par « Charger » : un atelier, un ancien historique, ou un refus. */
	async function handleLoadFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		// Vidé tout de suite : rechoisir le même fichier doit relancer la lecture
		input.value = '';
		if (file === undefined) return;
		// Trop gros : refusé avant d'être lu en mémoire. En OCTETS, large : la
		// limite exacte, en caractères, est celle de `readAtelierFile`
		const read =
			file.size > MAX_ATELIER_FILE_BYTES
				? ({ kind: 'error', message: ATELIER_FILE_TOO_BIG } as const)
				: readAtelierFile(await file.text());
		if (read.kind === 'error') {
			// Rien n'est remplacé, et on dit pourquoi (dans la zone des avis, lue à voix haute)
			notices = [...notices, { kind: 'warning', message: read.message }];
			return;
		}
		// Un historique d'avant la refonte : le rejeu de toujours, sa confirmation comprise
		if (read.kind === 'replay') {
			handleReplayRequest(read.history);
			return;
		}
		pendingLoad = { ...read, fileName: file.name };
		// Seuls les objets et la grille sont remplacés : la console reste (2026-10-19)
		if (!isBlankAtelier(atelier.serialize())) confirmLoad = true;
		else loadNow();
	}

	/**
	 * Remplacer l'atelier par le fichier relu, en UNE étape que Ctrl+Z défait
	 * (lot 5, PR 3). La console n'est pas remplacée : les lignes du fichier
	 * s'ajoutent à la suite (décision de David du 2026-10-19, comme R4).
	 */
	function loadNow() {
		if (pendingLoad === null) return;
		const { state, history, dropped, consoleNotice, fileName } = pendingLoad;
		pendingLoad = null;
		// R5, B8 : l'atelier remplacé est mis de côté AVANT, comme pour un lien reçu ;
		// s'il ne peut pas l'être, rien n'est chargé (B5)
		const setAside = loadSetsAside();
		if (setAside) {
			const kept = keepAside(readStorage(), atelier.serialize());
			if (!kept.ok) {
				warn(
					'Ton atelier n’a pas pu être mis de côté (stockage plein ou indisponible) : rien n’a été chargé.'
				);
				return;
			}
		}
		// La pile est gardée ; la copie mise de côté suit Annuler / Rétablir (B3) — si
		// l'atelier a été mis de côté : sans copie, il n'y a rien à tenir à jour
		const report = atelier.replaceWith(
			state,
			LOAD_STEP,
			setAside ? { onLeave: keepLeftAside } : {}
		);
		const stepId = atelier.lastStepId;
		desk.loaded(fileName, history);
		// Les lignes chargées sont sous les yeux : pas de pastille « nouveau »
		seen = desk.entries.length;
		selected = null;
		// Ce qui n'a pas pu être relu se dit, jamais en silence (§5)
		const lost = [
			...report.renamed.map(renamedOnReadMessage),
			...report.skipped.map((s) => `« ${s.name} » n'a pas pu être chargé : ${s.reason}`),
			...(dropped > 0 ? [`${dropped} élément(s) du fichier étaient illisibles.`] : []),
			...(consoleNotice !== null ? [consoleNotice] : [])
		];
		notices = [...notices, ...lost.map((message) => ({ kind: 'warning' as const, message }))];
		if (setAside) {
			setAsideExists = true;
			notices = [...notices, { kind: 'info', message: SET_ASIDE_NOTICE, action: retrieveAction() }];
		}
		offerUndo('Atelier chargé.', stepId);
		announce('Atelier chargé.');
	}

	/**
	 * Le toast d'un remplacement (Charger, Repartir de zéro), avec « Annuler » :
	 * il ne défait que SON étape, si elle est encore la dernière — comme celui
	 * d'une suppression (lot 5, Q4). Le toast part, Ctrl+Z reste.
	 */
	function offerUndo(message: string, stepId: number | null) {
		if (stepId === null) {
			toaster.success(message);
			return;
		}
		toaster.success(message, {
			description: 'Ctrl+Z (⌘Z) pour annuler',
			duration: UNDO_DURATION_MS,
			action: {
				label: 'Annuler',
				onClick: () => {
					// Une modification hors étape depuis compte : c'est elle qu'Annuler déferait
					if (atelier.isTopStep(stepId)) {
						undoStep();
						return;
					}
					toaster.warning(
						'D’autres changements ont suivi : utilise Annuler dans la barre pour remonter jusqu’à cette étape.'
					);
				}
			}
		});
	}

	/**
	 * Charger mettra-t-il l'atelier de côté ? Seulement s'il a quelque chose à
	 * perdre (B1), et dans un navigateur qui range — sans stockage, Charger reste
	 * ce qu'il était (« À trancher par David », journal de la phase 0).
	 */
	function loadSetsAside(): boolean {
		return readStorage() !== null && !isBlankAtelier(atelier.serialize());
	}

	// =========================================================================
	// Remplacer mon atelier, retrouver le précédent (`atelier-remplacer-phase0.md`)
	// =========================================================================

	/** Un avis d'alerte, lu à voix haute (la zone des avis est `aria-live`). */
	function warn(message: string) {
		notices = [...notices, { kind: 'warning', message }];
	}

	/** Le geste « Retrouver » d'un avis (B4). */
	function retrieveAction(): NonNullable<Notice['action']> {
		return { label: RETRIEVE_LABEL, run: retrieve };
	}

	/**
	 * Annuler ou Rétablir quitte un atelier remplacé : c'est lui qui est désormais
	 * de côté (B3 — rien n'est jamais perdu, on passe de l'un à l'autre).
	 */
	function keepLeftAside(left: AtelierState) {
		// L'atelier affiché rangé TOUT DE SUITE, puis l'atelier quitté mis de côté : les
		// deux écritures à la suite. Sans `saveNow`, la copie était réécrite 500 ms
		// avant l'atelier personnel, et l'atelier rendu n'existait qu'en mémoire (revue)
		session?.saveNow();
		const kept = keepAside(readStorage(), left);
		setAsideExists = hasSetAside(readStorage());
		if (!kept.ok) {
			warn('L’atelier quitté n’a pas pu être mis de côté (stockage plein ou indisponible).');
		}
	}

	/** « Remplacer mon atelier » (R1, R2) : confirmer s'il y a de quoi perdre (B1, B2, B6). */
	function requestReplace() {
		const personal = readPersonal(readStorage());
		if (personal.kind === 'refused') {
			warn(personal.message);
			return;
		}
		if (personal.kind === 'blank') {
			replaceNow();
			return;
		}
		replaceLossText = replacementLoss(personal.state);
		confirmReplace = true;
	}

	/**
	 * L'atelier affiché (le lien reçu, et ce que l'élève y a fait) devient
	 * l'atelier personnel ; l'ancien est mis de côté AVANT (R3, B5). Puis on quitte
	 * le lien sans recharger : la session s'ouvre sur l'atelier affiché.
	 */
	function replaceNow() {
		const incoming = atelier.serialize();
		const done = replacePersonal(readStorage(), incoming);
		if (!done.ok) {
			warn(done.message);
			return;
		}
		// L'atelier d'avant à l'écran, puis le reçu en UNE étape : un Ctrl+Z le rend
		const report =
			done.previous === null
				? null
				: (atelier.restore(done.previous),
					atelier.replaceWith(incoming, REPLACE_STEP, { onLeave: keepLeftAside }));
		linkMode = false;
		shownReceived = null;
		// R4 : la console de l'élève revient, celle du lien n'était qu'à lui
		desk.clear();
		selected = null;
		openPersonal(true);
		lastSeenRevision = atelier.revision;
		onLinkLeft?.();
		notices = [
			...notices,
			done.previous === null
				? { kind: 'info', message: 'Cet atelier est maintenant le tien.' }
				: {
						kind: 'info',
						message: `${SET_ASIDE_NOTICE} Cet atelier est maintenant le tien.`,
						action: retrieveAction()
					},
			// Une relecture qui écarte un objet le dit, jamais en silence
			...(report?.skipped ?? []).map((s) => ({
				kind: 'warning' as const,
				message: `« ${s.name} » n'a pas pu être gardé : ${s.reason}`
			}))
		];
		keepFocus();
	}

	/** Après « Remplacer », le bouton déclencheur a disparu avec le bandeau du lien. */
	function handleReplaceCloseFocus(event: Event) {
		if (linkMode) return;
		event.preventDefault();
		document.getElementById('atelier-mes-objets')?.focus();
	}

	/**
	 * Le bouton cliqué peut disparaître (Remplacer quitte le lien, Retrouver
	 * s'efface sans copie) : le focus va à « Mes objets », jamais sur la page (2.4.3).
	 */
	function keepFocus() {
		tick().then(() => {
			const active = document.activeElement;
			if (active === null || active === document.body || !active.isConnected) {
				document.getElementById('atelier-mes-objets')?.focus();
			}
		});
	}

	/**
	 * « Retrouver mon atelier précédent » (B3) : ÉCHANGE — la copie revient, en
	 * une étape d'Annuler, et l'atelier quitté prend sa place de côté.
	 */
	function retrieve() {
		if (linkMode) return;
		const storage = readStorage();
		const swapped = swapWithSetAside(storage, atelier.serialize());
		setAsideExists = hasSetAside(storage);
		if (swapped.kind === 'none') {
			warn('Il n’y a pas d’atelier mis de côté.');
			return;
		}
		if (swapped.kind !== 'swapped') {
			warn(swapped.message);
			return;
		}
		// Les « Retrouver » des avis d'avant : la barre garde le geste
		notices = notices.map((n) => ({ kind: n.kind, message: n.message }));
		const report = atelier.replaceWith(swapped.state, RETRIEVE_STEP, { onLeave: keepLeftAside });
		selected = null;
		// Ce que la relecture a eu à dire (B7), jamais en silence
		const lost = [
			...report.renamed.map(renamedOnReadMessage),
			...report.skipped.map((s) => `« ${s.name} » n'a pas pu être retrouvé : ${s.reason}`),
			...(swapped.dropped > 0
				? [`${swapped.dropped} élément(s) de l’atelier mis de côté étaient illisibles.`]
				: [])
		];
		notices = [
			...notices,
			{
				kind: 'info',
				message: 'Ton atelier précédent est revenu ; celui que tu quittes est mis de côté.'
			},
			...lost.map((message) => ({ kind: 'warning' as const, message }))
		];
		keepFocus();
	}

	/**
	 * Vider l'atelier — seulement après confirmation (Q5), jamais sur un lien
	 * reçu. En UNE étape que Ctrl+Z défait (lot 5, PR 3). Pas de copie mise de
	 * côté : l'atelier vide quitté par Annuler l'effacerait (`keepAside`, B1).
	 * La console reste, comme au chargement : Annuler rend alors tout (décision
	 * de David du 2026-10-19 ; elle était vidée avant, revue du lot 6, C3).
	 */
	function handleReset() {
		desk.reset();
		const stepId = atelier.lastStepId;
		seen = desk.entries.length;
		selected = null;
		// Sur `/grapheur`, on retrouve l'écran d'arrivée : une carte prête à taper
		startIfEmpty();
		offerUndo('Atelier vidé.', stepId);
		announce('L’atelier est vide.');
	}

	// svelte-ignore state_referenced_locally
	provideAtelier(atelier);

	// `view` donne la vue de DÉPART — celle qu'une URL demande (`/grapheur`
	// ouvre sur Graphe, §7 N1). Ensuite l'élève change d'onglet librement, sans
	// que la prop le ramène en arrière : capture volontaire, pattern documenté
	// dans `docs/pratiques/warning-svelte.md` §1.
	// svelte-ignore state_referenced_locally
	let activeView = $state<ViewId>(view ?? 'graphe');
	/** La console est-elle ouverte ? Même capture : la prop ne donne que le départ. */
	// svelte-ignore state_referenced_locally
	let consoleOpen = $state(consoleAtStart ?? view === undefined);
	let consoleHeight = $state(CONSOLE_HEIGHT);
	let calculView = $state<CalculView | null>(null);
	let consoleButton = $state<ToolButton | null>(null);
	let consolePanel = $state<HTMLElement | null>(null);
	let scene = $state<HTMLElement | null>(null);
	let selected = $state<string | null>(null);
	let notices = $state<Notice[]>([]);

	/**
	 * Ce qu'une action a changé hors de la vue courante (bascule d'onglet,
	 * diagramme affiché ou retiré), dit au lecteur d'écran (WCAG 4.1.3, audit
	 * a11y du lot 5 des outils statistiques).
	 */
	let announcement = $state('');

	// Le cycle de vie n'a de sens que dans un navigateur : la session lit le
	// stockage et écoute les autres onglets.
	// `$state` et non un simple `let` : l'effet ci-dessous doit se redéclencher
	// quand la session s'ouvre, sinon il part une fois sur `null` et ne revient
	// jamais — rien n'est alors jamais enregistré.
	let session = $state<Session | null>(null);
	/** Les lignes de Calcul rangées : même raison d'être un `$state`. */
	let calcHistory = $state<HistoryKeeper | null>(null);

	/**
	 * B3 : à l'ouverture, un atelier VIDE reçoit une carte prête à taper, tracée
	 * pour que la courbe apparaisse dès la frappe. Après la relecture de la
	 * sauvegarde, sinon on croirait vide un atelier pas encore relu.
	 */
	function startIfEmpty() {
		if (startWith === undefined || atelier.objects.length > 0) return;
		// Pas une étape : Annuler ne doit pas retirer la carte qu'on n'a pas créée
		const created = atelier.untracked(() => atelier.create({ kind: startWith }));
		if (!created.ok) return;
		atelier.untracked(() => atelier.setPlotted(created.object.name, true));
		selected = created.object.name;
	}

	/**
	 * Ouvrir l'atelier personnel : la session (relue, sauf `adopt` — l'atelier
	 * affiché vient d'y être écrit) et les lignes de Calcul.
	 */
	function openPersonal(adopt = false) {
		session = openSession(atelier, {
			storage: readStorage(),
			target: window,
			adopt,
			onNotice: (notice) => (notices = [...notices, notice])
		});
		// Les lignes de Calcul aussi (décision de David du 2026-10-13) : relues
		// sans rien refaire, et déjà « vues » — pas de pastille sur l'onglet
		calcHistory = keepCalcHistory(desk, { storage: readStorage(), target: window });
		seen = desk.entries.length;
		setAsideExists = hasSetAside(readStorage());
	}

	function closePersonal() {
		session?.close();
		session = null;
		calcHistory?.close();
		calcHistory = null;
	}

	onMount(() => {
		if (linkMode) {
			startIfEmpty();
			// « Remplacer mon atelier » peut ouvrir la session plus tard
			return closePersonal;
		}
		openPersonal();
		// La carte d'accueil AVANT de noter la révision de départ : sinon la simple
		// visite de `/grapheur` enregistrait une carte vide (revue du lot 6, C2) —
		// elle ne l'est que si l'élève y touche.
		startIfEmpty();
		// Le chargement initial compte comme une modification : on note la
		// révision de départ pour ne pas ré-enregistrer ce qu'on vient de lire.
		lastSeenRevision = atelier.revision;
		return closePersonal;
	});

	/**
	 * Le grapheur de CET atelier.
	 *
	 * Clé de rangement propre : sans elle, il chargerait les courbes de
	 * `/grapheur` puis les écraserait (revue #334). L'atelier range ses objets
	 * lui-même, le grapheur n'a donc rien à conserver — d'où `null`.
	 */
	const graph = new GrapheurStore(null);
	// Fourni à tout le conteneur, et pas seulement à la vue Graphe : la carte
	// (« Sur le graphique ») lit la courbe dessinée et la fenêtre visible
	provideGrapheurStore(graph);

	/**
	 * Le pupitre de la vue Calcul.
	 *
	 * ⚠️ Il vit ICI, et non dans `CalculView` : une action cliquée dans « Mes
	 * objets » doit écrire dans le MÊME historique que la saisie au clavier. Sans
	 * ça, « Dériver » ne produisait rien du tout — le bouton était actif et muet.
	 */
	// Capture volontaire : le pupitre garde CETTE instance d'atelier pour toute
	// la vie du conteneur, comme le grapheur ci-dessus.
	// svelte-ignore state_referenced_locally
	const desk = new CalcDesk(atelier);

	/** L'atelier est-il vide ? Des lignes de Calcul seules suffisent à ne pas l'être. */
	const isEmpty = $derived(atelier.objects.length === 0 && desk.entries.length === 0);
	/** Rien que « Repartir de zéro » puisse vider : la console n'en est plus (2026-10-19). */
	const nothingToReset = $derived(atelier.isBlank);

	let lastSeenRevision = $state(-1);

	// ⚠️ UNE seule source de « ça a changé ». Prévenir la session depuis chaque
	// endroit qui modifie l'atelier ne tenait pas : les créations depuis le
	// panneau ne déclenchaient aucune sauvegarde, et chaque action à venir
	// aurait rouvert le trou.
	$effect(() => {
		const current = atelier.revision;
		if (session === null || current === lastSeenRevision) return;
		lastSeenRevision = current;
		session.touch();
	});

	// Une ligne de plus, « Repartir de zéro », un rejeu : `entries` est remplacé
	// à chaque fois, et c'est ce remplacement qu'on suit
	$effect(() => {
		void desk.entries;
		calcHistory?.touch();
	});

	// Option B : la courbe suit l'objet. Un seul sens — l'atelier détient l'état.
	//
	// ⚠️ Cet effet LIT `graph.functions` (via `syncPlots`) et l'ÉCRIT : Svelte le
	// rejoue donc une fois de plus après chaque synchronisation. Il ne boucle que
	// parce que `syncPlots` est **idempotent** — la seconde passe ne réécrit
	// rien. Toute modification qui rendrait `syncPlots` inconditionnel donnerait
	// un `effect_update_depth_exceeded`.
	//
	// Les calculs `f(a)` de la console vont avec : la lecture graphique de
	// l'image les dessine (lot 3 bis de la refonte) — l'effet suit donc aussi
	// les lignes de la console.
	$effect(() => {
		void atelier.revision;
		syncPlots(atelier, graph, consoleReadings(desk.entries, atelier.functionNames));
	});

	/** Un navigateur peut refuser `localStorage` — ce n'est pas une erreur (§5 E1). */
	function readStorage(): Storage | null {
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}

	/**
	 * Supprimer l'objet et ses dépendants, puis proposer « Annuler » (lot B,
	 * N1, N3, N4). Le message disparaît seul : la suppression devient définitive.
	 */
	function removeNow(name: string) {
		// Par le pupitre : la suppression laisse sa ligne dans Calcul (G7)
		const result = desk.remove(name);
		if (!result.ok) {
			toaster.error(result.message);
			return;
		}
		if (selected !== null && result.removed.includes(selected)) selected = null;
		const forget = () => {
			if (undoable?.result === result) undoable = null;
		};
		const toastId = toaster.message(removedMessage(result.removed), {
			description: 'Ctrl+Z (⌘Z) pour annuler',
			duration: UNDO_DURATION_MS,
			action: { label: 'Annuler', onClick: () => undo(result) },
			onAutoClose: forget,
			onDismiss: forget
		});
		undoable = { result, toastId };
		// La carte a disparu : le focus ne doit pas retomber sur la page (a11y 2.4.3)
		tick().then(() => document.getElementById('atelier-mes-objets')?.focus());
	}

	/** Le bouton « Annuler » du toast : cette suppression, si elle est encore la dernière étape. */
	function undo(result: RemovedWithDependents) {
		if (undoable?.result === result) undoable = null;
		if (desk.undoRemoval(result)) {
			announce(`Annulé : ${removedMessage(result.removed)}`);
			return;
		}
		// L4 : d'autres étapes l'ont suivie — Annuler (barre, Ctrl+Z) remonte jusqu'à elle
		toaster.warning(
			'D’autres changements ont suivi : utilise Annuler dans la barre pour remonter jusqu’à cette suppression.'
		);
	}

	/** Annuler la dernière étape (barre, Ctrl/Cmd+Z) — lot 5. */
	function undoStep() {
		dismissRemovalToast();
		// Par le pupitre : une ligne rejouable, et la ligne de l'étape barrée (PR 2)
		const moved = desk.undo();
		announce(moved === null ? 'Rien à annuler.' : `Annulé : ${moved.label}.`);
	}

	/** Rétablir la dernière étape annulée (barre, Ctrl+Y, Ctrl/Cmd+Maj+Z). */
	function redoStep() {
		const moved = desk.redo();
		announce(moved === null ? 'Rien à rétablir.' : `Rétabli : ${moved.label}.`);
	}

	function dismissRemovalToast() {
		if (undoable === null) return;
		toast.dismiss(undoable.toastId);
		undoable = null;
	}

	/**
	 * Ctrl/Cmd+Z annule, Ctrl+Y ou Ctrl/Cmd+Maj+Z rétablit — jamais dans un champ
	 * en cours de frappe (il y annule la frappe) ni dans une fenêtre ouverte.
	 */
	function handleUndoKey(event: KeyboardEvent) {
		if (event.defaultPrevented || event.altKey || !(event.ctrlKey || event.metaKey)) return;
		const key = event.key.toLowerCase();
		const redo =
			(key === 'y' && event.ctrlKey && !event.shiftKey) || (key === 'z' && event.shiftKey);
		if (!redo && key !== 'z') return;
		const target = event.target as HTMLElement | null;
		// Un menu ou une liste ouverts gardent leurs touches (revue de #1517)
		if (
			target?.closest(
				`${FIELD_SELECTOR}, [role="dialog"], [role="alertdialog"], [role="menu"], [role="menubar"], [role="listbox"]`
			)
		) {
			return;
		}
		event.preventDefault();
		// Pas d'Annuler en plein glisser d'un point : l'étape n'est pas finie
		if (atelier.draggingPoint) return;
		if (redo) redoStep();
		else undoStep();
	}

	/** La confirmation : les objets emportés, et les cellules qui deviendront vides. */
	function removalDescription(pending: NonNullable<typeof pendingRemoval>): string {
		const cells = pending.citing > 0 ? citingCellsNote(pending.citing) : '';
		if (pending.dependents.length === 0) {
			return `Supprimer ${displayName(pending.name)} vide sa colonne. ${cells}`;
		}
		return [cascadeMessage(pending.name, pending.dependents), cells].filter(Boolean).join(' ');
	}

	function handleConfirmRemoval() {
		if (pendingRemoval === null) return;
		removalConfirmed = true;
		removeNow(pendingRemoval.name);
		// `pendingRemoval` n'est pas vidé : le titre se lirait « Supprimer  ? »
		// pendant l'animation de fermeture (a11y)
	}

	/** Après « Tout supprimer », le bouton déclencheur a disparu avec sa carte. */
	function handleRemovalCloseFocus(event: Event) {
		if (!removalConfirmed) return;
		removalConfirmed = false;
		event.preventDefault();
		document.getElementById('atelier-mes-objets')?.focus();
	}

	function handleAction(action: ObjectAction, object: AtelierObject) {
		if (action.id === 'remove') {
			const dependents = atelier.removalOf(object.name);
			// Une liste citée par des cellules de la grille : elles deviendront vides
			const citing = atelier.citingCells(object.name);
			if (dependents.length === 0 && citing === 0) {
				removeNow(object.name);
				return;
			}
			pendingRemoval = { name: object.name, dependents, citing };
			confirmRemoval = true;
			return;
		}
		if (action.id === 'plot') {
			atelier.setPlotted(object.name, !object.plotted);
			revealView('graphe');
			return;
		}
		// « Modifier dans Données » (lot 4a) : une liste se modifie dans la grille,
		// sa colonne choisie en arrivant — comme Tabuler y emmène
		if (action.id === 'data' && isList(object)) {
			revealView('donnees');
			const bottom = Math.max(1, object.definition.split(';').length);
			dataZone = { left: object.column, right: object.column, top: 1, bottom };
			dataKey++;
			return;
		}

		// L1 : dériver une seconde fois sélectionne la carte f′ qui existe déjà
		const derivative = derivativeName(object.name);
		const derivativeExisted = action.id === 'derive' && atelier.get(derivative) !== undefined;

		// ⚠️ Décision G7 de David : une action écrit sa ligne dans la console SANS
		// l'ouvrir — l'élève l'ouvre quand il le décide ; le bouton de la console
		// compte le nouveau résultat (A3). `graph` suit, parce que « Nuage de
		// points » écrit dedans.
		const before = desk.entries.length;
		const outcome = desk.runFromPanel(action.id, object.name, graph);
		if (outcome === 'unsupported') return;
		// …seulement si elle vaut quelque chose (f = |x| : la ligne dit pourquoi)
		if (derivativeExisted && atelier.get(derivative)?.status === 'ok') selected = derivative;

		// Une commande PRÉPARÉE (« Tableau croisé », « Simuler ») se termine au
		// clavier, dans la console : l'ouvrir est le geste lui-même, pas une bascule.
		// ⚠️ Écart avec A1, qui range `.simuler` parmi les actions sans bascule :
		// signalé à David (le geste ne produit rien tant que n n'est pas validé)
		if (outcome === 'needs-argument') {
			openConsole();
			return;
		}
		if (desk.entries.length > before && !consoleOpen) {
			announce('Nouvelle ligne dans la console.');
		}

		// Un nuage se voit dans le Graphe, un diagramme dans les Données : c'est là
		// que l'élève doit regarder. ⚠️ Comparer la RACINE : les actions portent
		// leur partenaire (`scatter:M`), et `action.id === 'scatter'` ne
		// répondait plus jamais (outils statistiques, Q39).
		const root = action.id.split(':')[0];
		// Diagramme en bâtons / en barres (`chart`) ou circulaire (`pie`, Q88) :
		// même destination, l'onglet Données (revue : `pie` menait à Calcul)
		const isChart = root === 'chart' || root === 'pie';
		// Retirer un diagramme ne mène nulle part : on reste où l'on est
		const chartShown = isChart && atelier.chartOf(object.name) !== undefined;
		// A5 : ce qui se VOIT ailleurs (nuage, diagramme) y emmène, comme « Tracer »
		if (root === 'scatter') revealView('graphe');
		else if (chartShown) revealView('donnees');
		// K1 : 𝒞f affichée se voit dans Géométrie, comme « Tracer » mène au Graphe ;
		// la retirer ne mène nulle part
		const after = atelier.get(object.name);
		const shownInFigure =
			root === 'figure' && after !== undefined && isFunction(after) && after.inFigure === true;
		if (shownInFigure) revealView('figure');

		if (isChart) {
			announce(
				atelier.chartOf(object.name)
					? `Diagramme de ${object.name} affiché dans l’onglet Données.`
					: `Diagramme de ${object.name} retiré.`
			);
		} else if (root === 'scatter') {
			announce(`Nuage de ${object.name} affiché dans l’onglet Graphe.`);
		} else if (root === 'figure') {
			announce(
				shownInFigure
					? `Courbe de ${displayName(object.name)} affichée dans l’onglet Géométrie.`
					: `Courbe de ${displayName(object.name)} retirée de l’onglet Géométrie.`
			);
		}
	}

	/**
	 * Les lignes de la console que l'élève a déjà eues sous les yeux.
	 *
	 * Mis à jour en OUVRANT la console et en la FERMANT : ce qu'on calcule sous
	 * ses yeux n'est pas « nouveau » quand on la referme.
	 */
	let seen = $state(0);

	/** Les résultats arrivés dans la console pendant qu'elle était fermée (A3). */
	const unseen = $derived(consoleOpen ? 0 : Math.max(0, desk.entries.length - seen));

	function showView(next: ViewId) {
		activeView = next;
		// La zone de Tabuler ne vaut qu'à l'arrivée : un retour par l'onglet ne la
		// resélectionne pas (revue — sur une grille annulée, 20 cases restaient choisies)
		dataZone = null;
	}

	/**
	 * Une action qui MONTRE quelque chose dans une vue (A5 : tracer, nuage,
	 * diagramme, Tabuler, Géométrie) y emmène. Sur téléphone, la console couvre
	 * toute la scène : on la referme, sinon l'élève ne verrait rien.
	 */
	function revealView(next: ViewId) {
		showView(next);
		if (consoleOpen && window.matchMedia?.(NARROW_QUERY).matches) closeConsole();
	}

	// =========================================================================
	// La console déroulante (lot 2 de `atelier-refonte-interface-phase0.md`)
	// =========================================================================

	/** L'ouvrir : le focus dans son champ, comme on vient y taper. */
	async function openConsole() {
		seen = desk.entries.length;
		consoleOpen = true;
		await tick();
		calculView?.focusInput();
	}

	/** La fermer : un focus resté dedans revient au bouton (il ne tombe pas sur la page). */
	function closeConsole() {
		seen = desk.entries.length;
		const focusInside = consolePanel?.contains(document.activeElement) ?? false;
		consoleOpen = false;
		if (focusInside) consoleButton?.focus();
	}

	function toggleConsole() {
		if (consoleOpen) closeConsole();
		else openConsole();
	}

	/**
	 * Les raccourcis (`console-key.ts`) : la touche sous Échap hors d'un champ,
	 * Ctrl+Entrée partout. En CAPTURE : le champ mathématique ne doit pas
	 * prendre Ctrl+Entrée pour un calcul.
	 */
	function handleConsoleShortcut(event: KeyboardEvent) {
		if (event.defaultPrevented || event.isComposing) return;
		const target = event.target instanceof Element ? event.target : null;
		const inField = target !== null && target.closest(FIELD_SELECTOR) !== null;
		const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
		if (!consoleShortcut(event, { isMac: isMacPlatform(nav), inField })) return;
		// Une fenêtre de confirmation ouverte garde la main
		if (document.querySelector('[role="alertdialog"], [role="dialog"][data-state="open"]')) return;
		event.preventDefault();
		event.stopPropagation();
		toggleConsole();
	}

	/**
	 * Échap dans la console la ferme — sauf si quelqu'un dedans l'a déjà pris
	 * (liste de commandes ouverte du champ texte). ⚠️ Le champ mathématique
	 * prend TOUJOURS Échap (`preventDefault`, sinon MathLive passe en saisie
	 * LaTeX) : sa liste ouverte arrête Échap (`stopPropagation`), et un Échap
	 * qui arrive ici depuis lui ferme donc bien la console.
	 */
	function handleConsoleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		const fromMathField = event.target instanceof Element && event.target.closest('math-field');
		if (event.defaultPrevented && !fromMathField) return;
		event.preventDefault();
		closeConsole();
	}

	/** La poignée : glisser pour changer la hauteur, en % de la scène. */
	function handleResizeStart(event: PointerEvent) {
		if (scene === null) return;
		event.preventDefault();
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture(event.pointerId);
		const box = scene.getBoundingClientRect();
		const move = (moved: PointerEvent) => {
			const percent = ((moved.clientY - box.top) / box.height) * 100;
			consoleHeight = Math.round(Math.min(CONSOLE_MAX, Math.max(CONSOLE_MIN, percent)));
		};
		const stop = () => {
			handle.removeEventListener('pointermove', move);
			handle.removeEventListener('pointerup', stop);
			handle.removeEventListener('pointercancel', stop);
		};
		handle.addEventListener('pointermove', move);
		handle.addEventListener('pointerup', stop);
		handle.addEventListener('pointercancel', stop);
	}

	/** La poignée au clavier : flèches haut / bas, de 5 en 5. */
	function handleResizeKey(event: KeyboardEvent) {
		const step = event.key === 'ArrowDown' ? 5 : event.key === 'ArrowUp' ? -5 : 0;
		if (step === 0) return;
		event.preventDefault();
		consoleHeight = Math.min(CONSOLE_MAX, Math.max(CONSOLE_MIN, consoleHeight + step));
	}

	/** L'historique en ubumark, à recopier dans une fiche : copié ou téléchargé. */
	async function copyForSheet() {
		try {
			await navigator.clipboard.writeText(historyToUbumark(desk.entries, new Date()));
			toaster.success('Historique copié : colle-le dans une fiche.');
		} catch {
			toaster.error(
				'La copie a été refusée par le navigateur. Télécharge l’historique à la place.'
			);
		}
	}

	/** La zone que la vue Données sélectionne en arrivant, et sa clé (Tabuler : la vue est recréée). */
	let dataZone = $state<{ left: number; right: number; top: number; bottom: number } | null>(null);
	let dataKey = $state(0);

	/**
	 * « Tabuler » depuis une carte (tableur, lot 3) : le tableau va dans la grille,
	 * et l'élève y va (Q-L3-1, comme « Diagramme ») — sans ligne dans Calcul.
	 */
	function handleTabulate(name: string, bounds: { from: string; to: string; step: string }) {
		const done = atelier.tabulate({ name, ...bounds });
		if (!done.ok) return { text: done.message, failed: true };
		const [x, image] = done.columns;
		revealView('donnees');
		// Deux colonnes voisines : la zone entière ; sinon la zone engloberait une
		// colonne de l'élève entre les deux, et seule la première case est choisie
		dataZone =
			image === x + 1
				? { left: x, right: image, top: 1, bottom: done.rows }
				: { left: x, right: x, top: 1, bottom: 1 };
		dataKey++;
		// Pas d'annonce ici : la carte la fait (`role="status"`) ; deux se bousculeraient
		return { text: tabulationReport(name, done), failed: false };
	}

	/** Vider puis écrire : le même message deux fois de suite est annoncé deux fois. */
	function announce(message: string) {
		announcement = '';
		setTimeout(() => (announcement = message), 0);
	}
</script>

<svelte:window onkeydown={handleUndoKey} onkeydowncapture={handleConsoleShortcut} />

<div class="atelier">
	<ObjectPanel bind:selected onAction={handleAction} onTabulate={handleTabulate} />

	<!-- `section` et non `main` : la page est déjà dans le `<main>` du layout,
	     et deux repères `main` perturbent la navigation (revue a11y du lot 6) -->
	<section class="zone" aria-labelledby="titre-atelier">
		<h1 id="titre-atelier" class="sr-only">{heading}</h1>
		<!-- La barre d'icônes (lot 1 de `atelier-refonte-interface-phase0.md`) -->
		<div class="barre" role="toolbar" aria-label="Outils de l’atelier" {@attach rovingToolbar}>
			<div class="outils">
				<!-- Annuler / Rétablir (lot 5) : l'infobulle nomme l'étape -->
				<ToolButton
					label={atelier.history.undo === null ? 'Annuler' : `Annuler : ${atelier.history.undo}`}
					icon={Undo2}
					hint="Ctrl+Z"
					disabledReason={atelier.history.undo === null ? 'Rien à annuler.' : null}
					onclick={undoStep}
				/>
				<ToolButton
					label={atelier.history.redo === null ? 'Rétablir' : `Rétablir : ${atelier.history.redo}`}
					icon={Redo2}
					hint="Ctrl+Y"
					disabledReason={atelier.history.redo === null ? 'Rien à rétablir.' : null}
					onclick={redoStep}
				/>
				{#if !linkMode}
					<ToolButton
						label="Repartir de zéro"
						icon={RotateCcw}
						disabledReason={nothingToReset ? 'L’atelier est déjà vide.' : null}
						onclick={() => (confirmReset = true)}
					/>
					<!-- Pas sur un lien reçu : on y regarde l'atelier d'un autre, sans le remplacer -->
					<ToolButton
						label="Charger un atelier"
						icon={FolderOpen}
						onclick={() => loadInput?.click()}
					/>
					<input
						bind:this={loadInput}
						class="sr-only"
						type="file"
						accept="application/json,.json"
						tabindex="-1"
						aria-hidden="true"
						onchange={handleLoadFile}
					/>
					<!-- B4 : seulement quand une copie existe ; l'échange s'annule (B3) -->
					{#if setAsideExists}
						<ToolButton label={RETRIEVE_LABEL} icon={ArchiveRestore} onclick={retrieve} />
					{/if}
				{/if}
				<ToolButton
					label="Enregistrer l’atelier"
					icon={Save}
					disabledReason={isEmpty ? 'Ton atelier est vide : il n’y a rien à enregistrer.' : null}
					onclick={handleSave}
				/>
			</div>
			<div class="outils">
				<!-- La console (lot 2) : son compteur dit qu'un résultat attend dedans (A3) -->
				<ToolButton
					bind:this={consoleButton}
					label="Console"
					icon={SquareTerminal}
					hint="touche sous Échap, ou Ctrl+Entrée"
					expanded={consoleOpen}
					controls="atelier-console"
					badge={unseen}
					badgeLabel="{unseen} nouveau{unseen > 1 ? 'x' : ''} résultat{unseen > 1 ? 's' : ''}"
					onclick={toggleConsole}
				/>
				{#if shownReceived === null}
					<ToolButton
						label="Partager"
						icon={Share2}
						disabledReason={atelier.objects.length === 0
							? 'Ton atelier est vide : il n’y a rien à partager.'
							: null}
						onclick={() => shareBar?.share()}
					/>
				{/if}
				<AtelierSettings
					bind:inputMode={() => inputMode, chooseInputMode}
					bind:angleUnit={() => atelier.angleUnit, chooseAngleUnit}
				/>
			</div>
		</div>
		<ShareBar bind:this={shareBar} received={shownReceived} {notice} onReplace={requestReplace} />
		<ConfirmDialog
			bind:open={confirmReplace}
			title="Remplacer ton atelier ?"
			description="{replaceLossText} {SET_ASIDE_REASSURANCE}"
			confirmLabel="Remplacer"
			variant="destructive"
			onConfirm={replaceNow}
			onCloseAutoFocus={handleReplaceCloseFocus}
		/>
		<ConfirmDialog
			bind:open={confirmLoad}
			title="Charger cet atelier ?"
			description="Charger remplace l’atelier actuel : {replayLoss()}{loadSetsAside()
				? ` ${SET_ASIDE_REASSURANCE}`
				: ''}"
			confirmLabel="Charger"
			variant="destructive"
			onConfirm={loadNow}
			onCancel={() => (pendingLoad = null)}
		/>
		<ConfirmDialog
			bind:open={confirmReset}
			title="Repartir de zéro ?"
			description="Tous les objets de l’atelier seront effacés — fonctions, valeurs, suites et listes —, ainsi que la grille. La console garde ses lignes, et Ctrl+Z rend l’atelier. Un lien de partage déjà copié le garde aussi."
			confirmLabel="Vider l’atelier"
			variant="destructive"
			onConfirm={handleReset}
		/>
		<ConfirmDialog
			bind:open={confirmRemoval}
			title="Supprimer {pendingRemoval ? displayName(pendingRemoval.name) : ''} ?"
			description={pendingRemoval ? removalDescription(pendingRemoval) : ''}
			confirmLabel="Tout supprimer"
			variant="destructive"
			onConfirm={handleConfirmRemoval}
			onCloseAutoFocus={handleRemovalCloseFocus}
		/>
		<ConfirmDialog
			bind:open={confirmReplay}
			title="Rejouer cet historique ?"
			description="Rejouer repart de zéro : {replayLoss()}"
			confirmLabel="Rejouer"
			variant="destructive"
			onConfirm={replayNow}
			onCancel={() => (pendingReplay = null)}
		/>
		<nav class="onglets" aria-label="Vues de l'atelier">
			{#each VIEWS as item (item.id)}
				<button
					type="button"
					class="onglet"
					aria-current={activeView === item.id ? 'page' : undefined}
					onclick={() => showView(item.id)}
				>
					{item.label}
				</button>
			{/each}
		</nav>

		<!--
			`aria-live` : un avertissement de perte de données doit être ANNONCÉ,
			pas seulement affiché. La région existe toujours, sinon un lecteur
			d'écran ne verrait jamais apparaître son contenu.
		-->
		<p class="sr-only" aria-live="polite" data-annonce>{announcement}</p>
		<ul class="avis" aria-live="polite" class:vide={notices.length === 0}>
			{#each notices as notice, i (i)}
				<li data-kind={notice.kind}>
					{notice.message}
					{#if notice.action}
						<button type="button" class="avis-action" onclick={notice.action.run}>
							{notice.action.label}
						</button>
					{/if}
				</li>
			{/each}
		</ul>

		<div class="scene" bind:this={scene}>
			<section class="vue" class:pleine={activeView === 'graphe' || activeView === 'figure'}>
				{#if activeView === 'graphe'}
					<!--
					`panel={false}` : dans l'atelier, c'est « Mes objets » qui tient ce
					rôle. Deux listes de fonctions côte à côte ne posent pas seulement la
					question de savoir laquelle fait foi — l'élève y PERD sa saisie, que
					la synchronisation réécrit aussitôt avec la définition de l'objet.
				-->
					<GrapheurContainer store={graph} panel={false} />
				{:else if activeView === 'figure'}
					<!-- Une projection de l'atelier, comme les autres : elle lit l'atelier, ne garde rien -->
					<FigureView />
				{:else}
					{#key dataKey}
						<DataView initialZone={dataZone} />
					{/key}
				{/if}
			</section>

			<!--
			La console déroulante (lot 2) : elle descend PAR-DESSUS la vue, qu'on
			voit dessous. Une RÉGION nommée et non une `dialog` : elle n'est pas
			modale — la vue et « Mes objets » restent utilisables pendant qu'elle
			est ouverte, et le focus n'y est pas piégé. Montée en permanence :
			l'historique, le brouillon et les étapes dépliées survivent à la
			fermeture ; `inert` la sort du parcours clavier quand elle est fermée.
			Le `keydown` n'y fait qu'écouter Échap remonté de ses champs (fermer) :
			la région n'est pas elle-même un contrôle.
		-->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				bind:this={consolePanel}
				id="atelier-console"
				class="console"
				class:ouverte={consoleOpen}
				role="region"
				aria-label="Console"
				data-own-keys
				inert={!consoleOpen}
				style:--hauteur="{consoleHeight}%"
				onkeydown={handleConsoleKeydown}
			>
				<div class="console-tete">
					<span class="console-titre" aria-hidden="true">Console</span>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									class="console-bouton"
									aria-label="Menu de la console"
									title="Menu de la console"
								>
									<EllipsisVertical size={16} aria-hidden="true" />
								</button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item disabled={desk.entries.length === 0} onclick={copyForSheet}>
								Copier l’historique pour une fiche
							</DropdownMenu.Item>
							<DropdownMenu.Item
								disabled={desk.entries.length === 0}
								onclick={() => downloadHistory(desk.entries, 'ubumark')}
							>
								Télécharger l’historique (ubumark)
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<button
						type="button"
						class="console-bouton"
						aria-label="Fermer la console"
						title="Fermer la console (Échap)"
						onclick={closeConsole}
					>
						<X size={16} aria-hidden="true" />
					</button>
				</div>
				<div class="console-corps">
					<CalculView bind:this={calculView} {desk} {inputMode} bind:mathLatex />
				</div>
				<!--
				La poignée : glisser, ou flèches haut / bas au clavier. Un `separator`
				FOCALISABLE est le motif ARIA du séparateur de fenêtres (window
				splitter) : un contrôle, avec sa valeur — Svelte ne le connaît pas.
			-->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
				<div
					class="poignee"
					role="separator"
					aria-orientation="horizontal"
					aria-label="Hauteur de la console"
					aria-valuemin={CONSOLE_MIN}
					aria-valuemax={CONSOLE_MAX}
					aria-valuenow={consoleHeight}
					tabindex="0"
					onpointerdown={handleResizeStart}
					onkeydown={handleResizeKey}
				></div>
			</div>
		</div>
	</section>
</div>

<style>
	.atelier {
		display: grid;
		grid-template-columns: minmax(14rem, 18rem) 1fr;
		height: 100%;
		min-height: 0;
	}

	.zone {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.barre {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.25rem 0.625rem;
		border-bottom: 1px solid var(--color-border);
	}
	.outils {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.onglets {
		display: flex;
		gap: 0.125rem;
		padding: 0.5rem 0.625rem 0;
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
	}
	.onglet {
		font-size: 0.8125rem;
		padding: 0.4375rem 0.875rem;
		border: 1px solid transparent;
		border-bottom: none;
		border-radius: 0.5rem 0.5rem 0 0;
		background: none;
		color: var(--color-muted-foreground);
		cursor: pointer;
		white-space: nowrap;
	}
	.onglet[aria-current='page'] {
		background: var(--color-background);
		color: var(--color-foreground);
		border-color: var(--color-border);
		margin-bottom: -1px;
		font-weight: 600;
	}

	.avis {
		list-style: none;
		margin: 0;
		padding: 0.5rem 0.75rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8125rem;
	}
	.avis li {
		padding: 0.375rem 0.625rem;
		border-radius: 0.375rem;
		background: var(--color-muted);
	}
	.avis.vide {
		padding: 0;
	}
	.avis li[data-kind='warning'] {
		color: var(--color-destructive);
	}
	/* Le geste d'un avis (« Retrouver mon atelier précédent ») : un lien-bouton */
	.avis-action {
		margin-left: 0.375rem;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-primary);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	.avis-action:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	/* La scène : la vue, et la console posée par-dessus (lot 2) */
	.scene {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		overflow: hidden;
	}
	.vue {
		flex: 1;
		min-width: 0;
		min-height: 0;
		padding: 1rem;
	}
	.vue.pleine {
		padding: 0;
		display: flex;
	}

	/* Le volet descend du haut, façon Quake ; fermé, il remonte hors de la scène */
	.console {
		position: absolute;
		inset: 0 0 auto;
		z-index: 20;
		height: var(--hauteur, 40%);
		display: flex;
		flex-direction: column;
		background: var(--color-background);
		border-bottom: 1px solid var(--color-border);
		box-shadow: 0 8px 20px -12px rgb(0 0 0 / 0.35);
		transform: translateY(-100%);
		visibility: hidden;
		transition:
			transform 180ms ease,
			visibility 0s linear 180ms;
	}
	.console.ouverte {
		transform: none;
		visibility: visible;
		transition:
			transform 180ms ease,
			visibility 0s;
	}
	@media (prefers-reduced-motion: reduce) {
		.console,
		.console.ouverte {
			transition: none;
		}
	}
	.console-tete {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem 0 0.75rem;
	}
	.console-titre {
		flex: 1;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}
	.console-bouton {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		min-height: 2rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-foreground);
		cursor: pointer;
	}
	.console-bouton:hover {
		background: var(--color-muted);
	}
	.console-bouton:focus-visible,
	.poignee:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	.console-corps {
		flex: 1;
		min-height: 0;
	}
	.poignee {
		flex: none;
		height: 0.625rem;
		cursor: ns-resize;
		touch-action: none;
		background: linear-gradient(var(--color-border), var(--color-border)) center / 2.5rem 3px
			no-repeat;
	}
	@media (pointer: coarse) {
		.poignee {
			height: 1.25rem;
		}
	}
	/* Sur téléphone, la console prend toute la scène, sans poignée */
	@media (max-width: 640px) {
		.console {
			height: 100%;
		}
		.poignee {
			display: none;
		}
	}

	@media (max-width: 720px) {
		/* Une colonne : le panneau au-dessus, la vue dessous. Des rangées SANS taille
		   écrasaient le panneau, dont les boutons « + Fonction… » passaient sous la
		   barre « Partager… / Réglages » (relevé à 390 px) */
		.atelier {
			grid-template-columns: 1fr;
			grid-template-rows: auto minmax(0, 1fr);
		}
	}
</style>
