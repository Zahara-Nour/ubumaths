<!--
	Grille de régularité (chantier `regularite`, P5) : élève × semaine depuis
	la rentrée. Charge la grille de la classe ; le tableau (paliers, vacances,
	clavier) est dans `RegularityTable`.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import RegularityTable from './RegularityTable.svelte';

	// Types

	type Tier = 0 | 1 | 2 | 3;

	interface RegularityWeek {
		start: string;
		holiday: boolean;
	}
	interface RegularityStudent {
		id: string;
		display_name: string;
		tiers: Tier[];
	}
	interface RegularityGrid {
		weeks: RegularityWeek[];
		students: RegularityStudent[];
	}

	interface Props {
		classId: string;
		anonymized?: boolean;
		refreshNonce?: number;
	}

	// Variables

	let { classId, anonymized = false, refreshNonce = 0 }: Props = $props();

	let data = $state<RegularityGrid | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	/** Jeton de la dernière requête : une réponse périmée ne remplace pas la plus récente */
	let requestSeq = 0;

	// Functions

	async function load(forClass: string, keepGrid: boolean) {
		const seq = ++requestSeq;
		loading = true;
		error = null;
		if (!keepGrid) data = null;
		try {
			const res = await fetch(`/api/teacher/classes/${forClass}/analytics/regularity`);
			if (seq !== requestSeq) return;
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				if (seq === requestSeq) error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			const grid = (await res.json()) as RegularityGrid;
			if (seq === requestSeq) data = grid;
		} catch (e) {
			if (seq === requestSeq) error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			if (seq === requestSeq) loading = false;
		}
	}

	// Changement de classe : la grille de l'ancienne classe disparaît ;
	// simple actualisation : elle reste affichée pendant le chargement.
	let loadedClass: string | null = null;
	$effect(() => {
		void refreshNonce;
		const forClass = classId;
		const keepGrid = loadedClass === forClass;
		loadedClass = forClass;
		void load(forClass, keepGrid);
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Régularité</Card.Title>
		<Card.Description>
			Jours actifs par semaine depuis la rentrée. Un jour est actif quand l'{lore.entities.student}
			donne au moins 5 réponses en travail autonome ; les contrôles ne comptent pas.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if loading && !data}
			<Skeleton class="h-40 w-full" />
		{:else if error}
			<p class="text-sm text-destructive" role="alert">
				⚠ La régularité n'a pas pu être chargée : {error}
			</p>
		{:else if !data || data.students.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">
				Aucun {lore.entities.student} dans cette classe.
			</p>
		{:else}
			<RegularityTable weeks={data.weeks} students={data.students} {anonymized} />
		{/if}
	</Card.Content>
</Card.Root>
