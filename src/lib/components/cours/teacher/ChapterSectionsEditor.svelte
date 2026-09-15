<!--
	ChapterSectionsEditor
	=====================

	Range les ressources d'un chapitre par MOMENT du cours (« Préparation »,
	« Le cours »…) plutôt que par type. Une section accueille les quatre types
	côte à côte, et tout se déplace au glisser-déposer.

	⚠️ L'ordre à l'intérieur d'une section est porté par `sectionOrder`, et NON
	par `displayOrder` : ce dernier reste l'ordre par type, et les quatre types
	vivent dans quatre tables. Seul `sectionOrder` les range ensemble.

	Modèle d'état, repris du kanban (`organisation/kanban/[boardId]`) :
	- l'état LOCAL est la source de vérité de l'affichage — le glisser-déposer
	  le mute directement, sans quoi le geste serait saccadé ;
	- chaque mutation prend un instantané avant d'appeler l'API, et le restaure
	  si l'appel échoue.

	Câblage svelte-dnd-action :
	- `onconsider` met à jour la liste visible PENDANT le geste ;
	- `onfinalize` valide la dépose → on renumérote et on persiste.
	- ⚠️ La bibliothèque injecte une copie « ombre » de l'élément tiré, avec le
	  MÊME identifiant : sans le suffixe dans la clé du `{#each}`, Svelte voit
	  deux éléments identiques. Et il faut TOUJOURS committer le dédoublonnage
	  au finalize, même sur une dépose sans effet, sinon l'ombre reste et
	  l'élément paraît grisé et intraînable.
	- ⚠️⚠️ D'où vient la ressource ne se lit QU'À LA PRISE (`origine`) : cette
	  ombre au même identifiant fait que, à la dépose, la zone survolée paraît
	  la contenir déjà. Le plan concluait « rien n'a bougé » et n'enregistrait
	  RIEN — le déplacement tenait à l'écran jusqu'au rechargement.

	@module components/cours/teacher/ChapterSectionsEditor
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import type {
		ChapterContentType,
		ChapterSection,
		ChapterDocument,
		ChapterExercise,
		ChapterChecklistItem,
		ChapterWorksheet
	} from '$lib/types/chapters';
	import type { SectionContentKind } from '$lib/server/validation/chapter-sections';
	import { dndzone, SHADOW_PLACEHOLDER_ITEM_ID, TRIGGERS, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import PublicationToggle from './PublicationToggle.svelte';
	import { enhance } from '$app/forms';
	import {
		GripVertical,
		Pencil,
		Trash2,
		Plus,
		Check,
		X,
		ExternalLink,
		FileText,
		ListChecks,
		BookOpen,
		ClipboardList
	} from '@lucide/svelte';
	import {
		empreinteAffichage,
		estOmbre,
		origineDuGlisser,
		remettreAuRang,
		resolveDrop,
		type DragOrigin
	} from './section-dnd';

	type WorksheetRow = ChapterWorksheet & { title: string | null; status: string | null };

	interface Props {
		chapterId: string;
		sections: ChapterSection[];
		documents: ChapterDocument[];
		exercises: ChapterExercise[];
		checklistItems: ChapterChecklistItem[];
		worksheets: WorksheetRow[];
		/** Titres des exercices, par identifiant d'exercice. */
		exerciseDetails?: Record<string, { title: string | null }>;
		/**
		 * Fiches réellement distribuées, par identifiant de FICHE (et non de
		 * rattachement) : publier une fiche que personne n'a reçue ne la montre à
		 * personne, et le bouton doit le dire.
		 */
		distributedWorksheetIds?: string[];
		/**
		 * Le professeur veut ajouter une ressource dans cette section.
		 *
		 * La boîte de dialogue vit dans la PAGE, pas ici : c'est elle qui connaît
		 * les exercices et les fiches disponibles, et qui porte déjà les actions
		 * de formulaire. Ce composant ne fait que désigner la cible.
		 */
		onAdd: (kind: SectionContentKind, sectionId: string | null) => void;
		/**
		 * Corriger le texte d'un objectif.
		 *
		 * Sans ça, le plan ne saurait que supprimer : une coquille obligerait à
		 * refaire l'objectif, et sa publication avec.
		 */
		onEditChecklistItem: (item: {
			id: string;
			content: string;
			description: string | null;
		}) => void;
	}

	let {
		chapterId,
		sections,
		documents,
		exercises,
		checklistItems,
		worksheets,
		exerciseDetails = {},
		distributedWorksheetIds = [],
		onAdd,
		onEditChecklistItem
	}: Props = $props();

	/**
	 * Vue unifiée d'une ressource.
	 *
	 * ⚠️ `id` est `kind:contentId` et non l'identifiant de la ligne :
	 * svelte-dnd-action exige un `id` unique DANS TOUTE la zone, or les quatre
	 * tables ont chacune leurs propres identifiants. `contentId` garde la vraie
	 * clé, celle que l'API attend.
	 */
	type Ressource = {
		id: string;
		kind: SectionContentKind;
		contentId: string;
		label: string;
		typeLabel: string;
		publishedAt: string | null;
		/** Document seulement : où l'ouvrir. `null` pour les autres types. */
		openUrl: string | null;
		/** Fiche seulement : a-t-elle été distribuée ? */
		distributed?: boolean;
		/** Objectif seulement : sa précision, pour la reprise du texte. */
		description?: string | null;
	};

	type SectionLocale = {
		id: string;
		title: string;
		ressources: Ressource[];
	};

	const FLIP_MS = 200;

	/**
	 * Où va la suppression, pour chaque type.
	 *
	 * ⚠️ Le nom du champ diffère d'une action à l'autre — les quatre tables ont
	 * chacune la leur. Une table de correspondance fermée évite de le deviner
	 * dans le balisage, où l'erreur serait muette : le formulaire partirait, le
	 * serveur ne trouverait pas l'identifiant, et rien ne serait supprimé.
	 */
	const SUPPRESSION: Record<SectionContentKind, { action: string; champ: string }> = {
		checklistItem: { action: '?/deleteChecklistItem', champ: 'itemId' },
		exercise: { action: '?/unlinkExercise', champ: 'chapterExerciseId' },
		worksheet: { action: '?/unlinkWorksheet', champ: 'chapterWorksheetId' },
		document: { action: '?/deleteDocument', champ: 'documentId' }
	};

	/** Ce que `PublicationToggle` attend : « checklistItem » s'y dit « checklist ». */
	const TYPE_PUBLICATION: Record<SectionContentKind, ChapterContentType> = {
		checklistItem: 'checklist',
		exercise: 'exercise',
		worksheet: 'worksheet',
		document: 'document'
	};

	/** Le menu « Ajouter », dans l'ordre où le professeur les cherche. */
	const TYPES_AJOUTABLES = [
		{ kind: 'checklistItem' as const, label: 'Objectif', icon: ListChecks },
		{ kind: 'exercise' as const, label: capitaliser(lore.learning.exercise), icon: BookOpen },
		{ kind: 'worksheet' as const, label: 'Fiche', icon: ClipboardList },
		{ kind: 'document' as const, label: 'Document', icon: FileText }
	];

	function capitaliser(mot: string): string {
		return mot.charAt(0).toUpperCase() + mot.slice(1);
	}

	// `Set` natif et non `SvelteSet` : il est local à cette fonction pure, jamais
	// lu de façon réactive. Le rendre réactif coûterait sans rien apporter —
	// `dedupeById` du kanban fait le même choix.
	function dedupeById<T extends { id: string }>(items: T[]): T[] {
		const vus = new Set<string>();
		const sortie: T[] = [];
		for (const item of items) {
			if (vus.has(item.id)) continue;
			vus.add(item.id);
			sortie.push(item);
		}
		return sortie;
	}

	function dndKey(item: { id: string }): string {
		return estOmbre(item) ? `${item.id}_dnd-shadow` : item.id;
	}

	/** Toutes les ressources du chapitre, avec la section où elles sont rangées. */
	function toutesLesRessources(): { ressource: Ressource; sectionId: string | null }[] {
		return (
			[
				...documents.map((d) => ({
					sectionId: d.sectionId,
					ordre: d.sectionOrder,
					ressource: {
						id: `document:${d.id}`,
						kind: 'document' as const,
						contentId: d.id,
						label: d.title,
						typeLabel: 'Document',
						publishedAt: d.publishedAt,
						// Le même calcul que `DocumentCard` : un document déposé passe par
						// la route signée, un Drive garde son URL d'origine.
						openUrl:
							d.sourceType === 'google_drive'
								? (d.googleDriveUrl ?? null)
								: d.storagePath
									? `/api/documents/${d.id}`
									: null
					}
				})),
				...exercises.map((e) => ({
					sectionId: e.sectionId,
					ordre: e.sectionOrder,
					ressource: {
						id: `exercise:${e.id}`,
						kind: 'exercise' as const,
						contentId: e.id,
						// Un exercice sans titre reste un exercice : mieux vaut un repère
						// qu'une ligne vide que le professeur ne saura pas identifier.
						label: exerciseDetails[e.exerciseId]?.title ?? 'Exercice sans titre',
						typeLabel: 'Exercice',
						publishedAt: e.publishedAt,
						openUrl: null
					}
				})),
				...checklistItems.map((c) => ({
					sectionId: c.sectionId,
					ordre: c.sectionOrder,
					ressource: {
						id: `checklistItem:${c.id}`,
						kind: 'checklistItem' as const,
						contentId: c.id,
						label: c.content,
						typeLabel: 'Objectif',
						publishedAt: c.publishedAt,
						openUrl: null,
						description: c.description
					}
				})),
				...worksheets.map((w) => ({
					sectionId: w.sectionId,
					ordre: w.sectionOrder,
					ressource: {
						id: `worksheet:${w.id}`,
						kind: 'worksheet' as const,
						contentId: w.id,
						label: w.title ?? 'Fiche sans titre',
						typeLabel: 'Fiche',
						publishedAt: w.publishedAt,
						openUrl: null,
						distributed: distributedWorksheetIds.includes(w.worksheetId)
					}
				}))
			]
				// Tri secondaire sur le libellé : `section_order` vaut 0 par défaut,
				// donc tout ce qui n'a jamais été rangé est à égalité.
				.sort(
					(a, b) => a.ordre - b.ordre || a.ressource.label.localeCompare(b.ressource.label, 'fr')
				)
				.map(({ ressource, sectionId }) => ({ ressource, sectionId }))
		);
	}

	function instantanerSections(): SectionLocale[] {
		const toutes = toutesLesRessources();
		return [...sections]
			.sort((a, b) => a.displayOrder - b.displayOrder)
			.map((s) => ({
				id: s.id,
				title: s.title,
				ressources: toutes.filter((r) => r.sectionId === s.id).map((r) => r.ressource)
			}));
	}

	function instantanerNonClassees(): Ressource[] {
		return toutesLesRessources()
			.filter((r) => r.sectionId === null)
			.map((r) => r.ressource);
	}

	// L'état local est la source de vérité de l'affichage pendant les gestes.
	// Il n'est PAS re-synchronisé depuis le serveur : chaque mutation persiste
	// et se restaure en cas d'échec, comme sur le kanban. Recharger pendant un
	// glisser rendrait le geste saccadé.
	let sectionsLocales = $state<SectionLocale[]>(instantanerSections());
	let nonClassees = $state<Ressource[]>(instantanerNonClassees());

	/**
	 * Empreinte de CE QUI EXISTE ET DE CE QUI S'AFFICHE — jamais du rangement.
	 *
	 * ⚠️ Deux exigences contraires se rencontrent ici. L'état local doit rester
	 * la source de vérité PENDANT un glisser, sinon le geste saccade ; mais tout
	 * ce que le professeur change depuis le plan revient par les props, après
	 * `invalidateAll()`.
	 *
	 * ⚠️⚠️ Les IDENTIFIANTS ne suffisent pas, et c'est contre-intuitif : publier
	 * un contenu ou corriger le texte d'un objectif ne change aucun identifiant.
	 * Une empreinte qui ne retiendrait qu'eux figerait l'affichage sur
	 * l'instantané d'origine — le badge resterait « Préparé », et comme
	 * `PublicationToggle` calcule son champ caché depuis `publishedAt`, chaque
	 * clic renverrait `published=true` : DÉPUBLIER deviendrait impossible sans
	 * recharger. Sur une fiche, republier redistribue à toute la classe.
	 *
	 * Ces champs-là ne bougent jamais pendant un glisser — seuls `section_id` et
	 * `section_order` bougent, et ils sont volontairement absents. L'invariant
	 * du geste tient donc toujours.
	 */
	let empreinte = $derived(
		empreinteAffichage({
			sections,
			documents,
			exercises,
			checklistItems,
			worksheets,
			distributedWorksheetIds
		})
	);

	// Volontairement hors `$state` : cette valeur ne pilote aucun affichage, elle
	// ne sert qu'à ne pas rejouer l'effet pour la même empreinte.
	//
	// Elle démarre vide plutôt qu'à `empreinte` : lire un `$derived` ici n'en
	// capturerait que la valeur initiale, ce que Svelte signale à juste titre.
	// L'effet la remplit à son premier passage, en reconstruisant un instantané
	// identique à celui d'origine — même props, même résultat.
	let derniereEmpreinte = '';

	$effect(() => {
		if (empreinte === derniereEmpreinte) return;
		derniereEmpreinte = empreinte;
		sectionsLocales = instantanerSections();
		nonClassees = instantanerNonClassees();
	});

	let busy = $state(false);
	let editingSectionId = $state<string | null>(null);
	let editTitle = $state('');
	let isAddingSection = $state(false);
	let newSectionTitle = $state('');

	async function appeler(url: string, init: RequestInit, echec: string): Promise<boolean> {
		try {
			const reponse = await fetch(url, {
				headers: { 'Content-Type': 'application/json' },
				...init
			});

			if (!reponse.ok) {
				// Le serveur rend un message utile (« cette section n'appartient pas
				// à ce chapitre ») : le montrer plutôt qu'un texte générique.
				const corps = await reponse.json().catch(() => null);
				toaster.error(corps?.message ?? echec);
				return false;
			}

			return true;
		} catch {
			toaster.error(echec);
			return false;
		}
	}

	/** Persiste l'ordre d'une zone, en renumérotant de 0 à n. */
	async function persisterZone(sectionId: string | null, liste: Ressource[]): Promise<boolean> {
		if (liste.length === 0) return true;

		return appeler(
			`/api/teacher/chapters/${chapterId}/sections/assign`,
			{
				method: 'POST',
				body: JSON.stringify({
					sectionId,
					items: liste.map((r, i) => ({ kind: r.kind, id: r.contentId, sectionOrder: i }))
				})
			},
			'Impossible de ranger les ressources'
		);
	}

	// ===== Glisser-déposer : les ressources =====

	function poserZone(sectionId: string | null, liste: Ressource[]) {
		if (sectionId === null) {
			nonClassees = liste;
			return;
		}
		const section = sectionsLocales.find((s) => s.id === sectionId);
		if (section) section.ressources = liste;
	}

	/**
	 * D'où part la ressource en cours de glisser.
	 *
	 * Volontairement hors `$state` : cette valeur ne pilote aucun affichage. Elle
	 * se pose à la PRISE, et c'est tout l'enjeu — au moment de la dépose, les
	 * zones ne disent plus d'où vient la ressource (cf. `DragOrigin`).
	 */
	let origine: DragOrigin | null = null;

	function ressourcesConsider(sectionId: string | null, event: CustomEvent<DndEvent<Ressource>>) {
		if (event.detail.info.trigger === TRIGGERS.DRAG_STARTED) {
			origine = origineDuGlisser(sectionId, event.detail.items, event.detail.info.id);
		}
		poserZone(sectionId, dedupeById(event.detail.items));
	}

	async function ressourcesFinalize(
		sectionId: string | null,
		event: CustomEvent<DndEvent<Ressource>>
	) {
		const depart = origine;

		// Instantané de TOUTES les zones avant mutation — un déplacement entre
		// sections en touche deux — et SANS les ombres : restaurer une ombre
		// laisserait une ligne fantôme, grisée et intraînable, jusqu'au
		// rechargement.
		const instantane = {
			sections: sectionsLocales.map((s) => ({
				id: s.id,
				ressources: s.ressources.filter((r) => !estOmbre(r))
			})),
			nonClassees: nonClassees.filter((r) => !estOmbre(r))
		};

		const arrivee = dedupeById(event.detail.items);
		// TOUJOURS committer, même sur une dépose sans effet : sinon l'ombre du
		// `consider` précédent reste dans l'état et l'élément paraît grisé.
		poserZone(sectionId, arrivee);

		const deplaceId = event.detail.info.id;

		// La décision vit dans `section-dnd.ts`, où elle est testée sans avoir à
		// fabriquer d'événement de souris.
		const issue = resolveDrop(depart, sectionId, arrivee, deplaceId);

		if (issue.kind === 'ignored') return;

		if (issue.kind === 'moved') {
			// La retirer de sa zone d'origine : la bibliothèque ne gère que la
			// zone qui reçoit.
			if (issue.from === null) {
				nonClassees = nonClassees.filter((r) => r.id !== deplaceId);
			} else {
				const source = sectionsLocales.find((s) => s.id === issue.from);
				if (source) source.ressources = source.ressources.filter((r) => r.id !== deplaceId);
			}
		}

		// Ce qu'on s'apprête à enregistrer devient le nouveau point de départ :
		// au clavier, un même glisser enchaîne plusieurs déposes.
		origine = { zone: sectionId, index: arrivee.findIndex((r) => r.id === deplaceId) };

		busy = true;
		const ok = await persisterZone(sectionId, arrivee);
		busy = false;

		if (!ok) {
			// Restauration : les deux zones concernées reviennent à l'instantané,
			// puis la ressource retourne d'où elle venait — l'instantané ne la
			// porte plus, puisque seule son ombre y figurait.
			sectionsLocales = sectionsLocales.map((s) => {
				const snap = instantane.sections.find((i) => i.id === s.id);
				return snap ? { ...s, ressources: [...snap.ressources] } : s;
			});
			nonClassees = [...instantane.nonClassees];
			origine = depart;

			const tiree = arrivee.find((r) => r.id === deplaceId);
			if (tiree && depart) reposer(depart, tiree);
		}
	}

	/** Remet une ressource là d'où elle venait, quand le rangement est refusé. */
	function reposer(depart: DragOrigin, ressource: Ressource) {
		if (depart.zone === null) {
			nonClassees = remettreAuRang(nonClassees, depart.index, ressource);
			return;
		}

		const section = sectionsLocales.find((s) => s.id === depart.zone);
		if (section) section.ressources = remettreAuRang(section.ressources, depart.index, ressource);
	}

	// ===== Glisser-déposer : les sections =====

	/**
	 * D'où part la section en cours de glisser — même règle que les ressources :
	 * son ombre occupe déjà le rang d'arrivée quand la dépose arrive, et relire
	 * la liste à ce moment-là ferait conclure « rien n'a bougé ».
	 *
	 * Les sections n'ont qu'UNE zone : seul le rang compte, d'où `zone: null`.
	 */
	let origineSection: DragOrigin | null = null;

	function sectionsConsider(event: CustomEvent<DndEvent<SectionLocale>>) {
		if (event.detail.info.trigger === TRIGGERS.DRAG_STARTED) {
			origineSection = origineDuGlisser(null, event.detail.items, event.detail.info.id);
		}
		sectionsLocales = dedupeById(event.detail.items);
	}

	async function sectionsFinalize(event: CustomEvent<DndEvent<SectionLocale>>) {
		const depart = origineSection;
		// Sans les ombres : on ne restaure jamais une ligne fantôme.
		const instantane = sectionsLocales.filter((s) => !estOmbre(s));
		const apres = dedupeById(event.detail.items);
		sectionsLocales = apres;

		const deplaceId = event.detail.info.id;
		if (resolveDrop(depart, null, apres, deplaceId).kind === 'ignored') return;

		// Le rang qu'on s'apprête à enregistrer devient le nouveau point de départ.
		origineSection = { zone: null, index: apres.findIndex((s) => s.id === deplaceId) };

		busy = true;
		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/reorder`,
			{
				method: 'POST',
				body: JSON.stringify({
					sections: apres.map((s, i) => ({ id: s.id, displayOrder: i }))
				})
			},
			'Impossible de réordonner les sections'
		);
		busy = false;

		if (!ok) {
			// La section déplacée ne figure plus dans l'instantané : il ne portait
			// que son ombre. On la remet à son rang de départ.
			const remise = apres.find((s) => s.id === deplaceId);
			sectionsLocales =
				remise && depart ? remettreAuRang(instantane, depart.index, remise) : instantane;
			origineSection = depart;
		}
	}

	// ===== Sections : créer, renommer, supprimer =====

	async function ajouterSection() {
		const titre = newSectionTitle.trim();
		if (!titre) return;

		busy = true;
		try {
			const reponse = await fetch(`/api/teacher/chapters/${chapterId}/sections`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: titre })
			});

			if (!reponse.ok) {
				const corps = await reponse.json().catch(() => null);
				toaster.error(corps?.message ?? 'Impossible de créer la section');
				return;
			}

			const { section } = await reponse.json();
			sectionsLocales = [
				...sectionsLocales,
				{ id: section.id, title: section.title, ressources: [] }
			];
			newSectionTitle = '';
			isAddingSection = false;
			toaster.success('Section ajoutée');
		} catch {
			toaster.error('Impossible de créer la section');
		} finally {
			busy = false;
		}
	}

	async function renommerSection(sectionId: string) {
		const titre = editTitle.trim();
		if (!titre) return;

		const section = sectionsLocales.find((s) => s.id === sectionId);
		if (!section) return;
		const ancienTitre = section.title;

		section.title = titre;
		editingSectionId = null;

		busy = true;
		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/${sectionId}`,
			{ method: 'PATCH', body: JSON.stringify({ title: titre }) },
			'Impossible de renommer la section'
		);
		busy = false;

		if (!ok) section.title = ancienTitre;
	}

	async function supprimerSection(sectionId: string) {
		const instantaneSections = [...sectionsLocales];
		const instantaneNonClassees = [...nonClassees];

		const section = sectionsLocales.find((s) => s.id === sectionId);
		if (!section) return;

		// Ses ressources ne disparaissent PAS : elles retombent en « Non classé »,
		// exactement ce que fait `on delete set null (section_id)` en base.
		nonClassees = [...nonClassees, ...section.ressources];
		sectionsLocales = sectionsLocales.filter((s) => s.id !== sectionId);

		busy = true;
		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/${sectionId}`,
			{ method: 'DELETE' },
			'Impossible de supprimer la section'
		);
		busy = false;

		if (ok) {
			// Le message dit ce qui NE s'est PAS passé : la crainte, ici, c'est de
			// perdre des ressources avec la section.
			toaster.success('Section supprimée — ses ressources sont passées en « Non classé »');
		} else {
			sectionsLocales = instantaneSections;
			nonClassees = instantaneNonClassees;
		}
	}

	function commencerEdition(section: SectionLocale) {
		editingSectionId = section.id;
		editTitle = section.title;
	}
</script>

{#snippet zoneRessources(sectionId: string | null, liste: Ressource[])}
	<div
		class="flex min-h-16 flex-col gap-1 px-3 py-2"
		use:dndzone={{
			items: liste,
			type: 'chapter-resource',
			flipDurationMs: FLIP_MS,
			dragDisabled: busy,
			dropTargetStyle: { outline: '2px dashed var(--color-ring)', outlineOffset: '4px' }
		}}
		onconsider={(e: CustomEvent<DndEvent<Ressource>>) => ressourcesConsider(sectionId, e)}
		onfinalize={(e: CustomEvent<DndEvent<Ressource>>) => ressourcesFinalize(sectionId, e)}
	>
		{#each liste as ressource (dndKey(ressource))}
			<div
				animate:flip={{ duration: FLIP_MS }}
				class="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5
					{ressource.id === SHADOW_PLACEHOLDER_ITEM_ID || estOmbre(ressource) ? 'opacity-40' : ''}"
			>
				<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
				<Badge variant="secondary" class="shrink-0">{ressource.typeLabel}</Badge>
				<span class="min-w-0 flex-1 truncate text-sm">{ressource.label}</span>

				<!--
					Pendant un glisser, la bibliothèque duplique la ligne : afficher ses
					boutons sur la copie donnerait deux fois la même suppression, et le
					second envoi porterait sur une ligne déjà supprimée.
				-->
				{#if !estOmbre(ressource) && ressource.id !== SHADOW_PLACEHOLDER_ITEM_ID}
					{#if ressource.kind === 'checklistItem'}
						<Button
							variant="ghost"
							size="icon-sm"
							class="shrink-0"
							aria-label="Modifier {ressource.label}"
							onclick={() =>
								onEditChecklistItem({
									id: ressource.contentId,
									content: ressource.label,
									description: ressource.description ?? null
								})}
						>
							<Pencil class="h-4 w-4" />
						</Button>
					{/if}

					{#if ressource.openUrl}
						<Button
							variant="ghost"
							size="icon-sm"
							href={ressource.openUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="shrink-0"
							aria-label="Ouvrir {ressource.label}"
						>
							<ExternalLink class="h-4 w-4" />
						</Button>
					{/if}

					<PublicationToggle
						contentType={TYPE_PUBLICATION[ressource.kind]}
						itemId={ressource.contentId}
						publishedAt={ressource.publishedAt}
						distributed={ressource.distributed}
					/>

					<form
						method="POST"
						action={SUPPRESSION[ressource.kind].action}
						use:enhance
						class="shrink-0"
					>
						<input
							type="hidden"
							name={SUPPRESSION[ressource.kind].champ}
							value={ressource.contentId}
						/>
						<Button
							type="submit"
							variant="ghost"
							size="icon-sm"
							disabled={busy}
							class="text-destructive"
							aria-label="Retirer {ressource.label} du chapitre"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</form>
				{/if}
			</div>
		{/each}
	</div>

	<!--
		⚠️ HORS de la zone : `svelte-dnd-action` apparie ses enfants DIRECTS avec
		`items` par index. Dans une section vide — et un chapitre neuf en a six —
		la zone aurait 0 élément et 1 enfant : ce paragraphe deviendrait
		traînable, annoncé comme élément de liste aux lecteurs d'écran, et le
		tirer produirait une ligne fantôme puis un rangement refusé. La hauteur
		minimale de la zone suffit à garder une cible de dépose.
	-->
	{#if liste.length === 0}
		<p class="px-3 pb-1 text-center text-sm text-muted-foreground italic">
			Glissez une ressource ici, ou ajoutez-en une.
		</p>
	{/if}
{/snippet}

<!--
	⚠️ HORS de la zone de dépose : `dndzone` considère chaque enfant direct
	comme un élément déplaçable. Le bouton y deviendrait traînable, et la
	bibliothèque compterait un élément de plus que la liste.
-->
{#snippet menuAjout(sectionId: string | null)}
	<div class="px-3 pb-1">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="sm" class="text-muted-foreground">
						<Plus class="mr-2 h-4 w-4" />
						Ajouter
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				{#each TYPES_AJOUTABLES as type (type.kind)}
					<DropdownMenu.Item onclick={() => onAdd(type.kind, sectionId)}>
						<type.icon class="mr-2 h-4 w-4" />
						{type.label}
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
{/snippet}

<div class="space-y-4">
	<div
		class="space-y-4"
		use:dndzone={{
			items: sectionsLocales,
			type: 'chapter-section',
			flipDurationMs: FLIP_MS,
			dragDisabled: busy || editingSectionId !== null,
			dropTargetStyle: { outline: '2px dashed var(--color-ring)', outlineOffset: '4px' }
		}}
		onconsider={sectionsConsider}
		onfinalize={sectionsFinalize}
	>
		{#each sectionsLocales as section (dndKey(section))}
			<div animate:flip={{ duration: FLIP_MS }}>
				<Card.Root class={estOmbre(section) ? 'opacity-40' : ''}>
					<Card.Header class="flex flex-row items-center gap-2 space-y-0">
						<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />

						{#if editingSectionId === section.id}
							<Input
								bind:value={editTitle}
								class="flex-1"
								aria-label="Titre de la section"
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter') renommerSection(section.id);
									if (e.key === 'Escape') editingSectionId = null;
								}}
							/>
							<Button
								variant="ghost"
								size="icon"
								disabled={busy}
								aria-label="Valider le titre de {section.title}"
								onclick={() => renommerSection(section.id)}
							>
								<Check class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Annuler le renommage de {section.title}"
								onclick={() => (editingSectionId = null)}
							>
								<X class="h-4 w-4" />
							</Button>
						{:else}
							<Card.Title class="flex-1 text-lg">{section.title}</Card.Title>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Renommer la section {section.title}"
								onclick={() => commencerEdition(section)}
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								disabled={busy}
								aria-label="Supprimer la section {section.title}"
								onclick={() => supprimerSection(section.id)}
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						{/if}
					</Card.Header>

					<Card.Content class="p-0 pb-3">
						{@render zoneRessources(section.id, section.ressources)}
						{@render menuAjout(section.id)}
					</Card.Content>
				</Card.Root>
			</div>
		{/each}
	</div>

	<!--
		« Non classé » reste TOUJOURS affiché côté professeur, même vide : c'est
		une cible de dépose. La masquer quand elle est vide retirerait le seul
		endroit où sortir une ressource d'une section.
	-->
	<Card.Root class="border-dashed">
		<Card.Header class="space-y-1">
			<Card.Title class="text-lg">Non classé</Card.Title>
			<Card.Description>
				Ces ressources ne sont dans aucune section. Les élèves les voient en fin de chapitre.
			</Card.Description>
		</Card.Header>
		<Card.Content class="p-0 pb-3">
			{@render zoneRessources(null, nonClassees)}
			{@render menuAjout(null)}
		</Card.Content>
	</Card.Root>

	{#if isAddingSection}
		<div class="flex items-center gap-2">
			<Input
				bind:value={newSectionTitle}
				placeholder="Nom de la section"
				aria-label="Nom de la nouvelle section"
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter') ajouterSection();
					if (e.key === 'Escape') isAddingSection = false;
				}}
			/>
			<Button disabled={busy || !newSectionTitle.trim()} onclick={ajouterSection}>Ajouter</Button>
			<Button variant="ghost" onclick={() => (isAddingSection = false)}>Annuler</Button>
		</div>
	{:else}
		<Button variant="outline" onclick={() => (isAddingSection = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Ajouter une section
		</Button>
	{/if}
</div>
