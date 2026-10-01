<!--
	SeriesLinkShare — « Copier le lien » d'une série, avec le choix de sa forme (Q44)

	- « Sans forme (ouvre le panier) » (défaut) : le lien met la série dans le
	  panier du destinataire ;
	- une forme : le lien lance directement la série sous cette forme ; une Course
	  aux nombres porte son temps limite (mêmes réglages que la fenêtre du panier).

	Utilisé par le panier et par la page « Séries » (Q46).
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Link } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { buildSeriesLink, type SeriesCategories } from '$lib/validation/series';
	import {
		COURSE_TIME_LIMIT_MAX_MINUTES,
		COURSE_TIME_LIMIT_MIN_MINUTES
	} from '$lib/types/evaluation';
	import type { TestMode } from '$lib/types/test';

	interface Props {
		categories: SeriesCategories;
		/** Mise en page serrée (pied de carte de la page « Séries ») */
		compact?: boolean;
	}

	let { categories, compact = false }: Props = $props();

	/** Pas de forme : le lien ouvre le panier */
	const NO_FORM = 'none';
	/** Même défaut que la fenêtre de choix du panier (`TestModeDialog`) */
	const DEFAULT_COURSE_MINUTES = 5;
	const TEST_MODES: readonly string[] = ['display', 'interactive', 'course', 'flash'];

	const formItems: { value: TestMode | typeof NO_FORM; label: string }[] = [
		{ value: NO_FORM, label: 'Sans forme (ouvre le panier)' },
		{ value: 'display', label: 'En classe' },
		{ value: 'interactive', label: 'Entraînement' },
		{ value: 'course', label: 'Course aux nombres' },
		{ value: 'flash', label: 'Flash-cards' }
	];

	const uid = $props.id();
	let selectedForm = $state<string>(NO_FORM);
	let courseMinutes = $state(String(DEFAULT_COURSE_MINUTES));

	let isCourse = $derived(selectedForm === 'course');

	function isTestMode(value: string): value is TestMode {
		return TEST_MODES.includes(value);
	}

	/** Lien à copier, ou message si le temps limite est hors bornes */
	function linkToCopy(): { link: string } | { error: string } {
		const origin = window.location.origin;
		if (!isTestMode(selectedForm)) {
			return { link: buildSeriesLink(origin, categories) };
		}
		if (selectedForm !== 'course') {
			return { link: buildSeriesLink(origin, categories, { mode: selectedForm }) };
		}

		const minutes = Number(courseMinutes);
		if (
			!Number.isInteger(minutes) ||
			minutes < COURSE_TIME_LIMIT_MIN_MINUTES ||
			minutes > COURSE_TIME_LIMIT_MAX_MINUTES
		) {
			return {
				error: `Le temps limite va de ${COURSE_TIME_LIMIT_MIN_MINUTES} à ${COURSE_TIME_LIMIT_MAX_MINUTES} minutes`
			};
		}
		return {
			link: buildSeriesLink(origin, categories, { mode: 'course', timeLimit: minutes * 60 })
		};
	}

	async function handleCopy() {
		const result = linkToCopy();
		if ('error' in result) {
			toaster.error(result.error);
			return;
		}
		try {
			await navigator.clipboard.writeText(result.link);
			toaster.success('Lien copié');
		} catch {
			toaster.error('Impossible de copier le lien');
		}
	}
</script>

<div class="flex flex-wrap items-end gap-2 {compact ? 'w-full' : ''}">
	<div class="min-w-48 flex-1">
		<!-- Nom accessible du menu : son `placeholder` (aria-label de MySelect) -->
		<MySelect
			type="single"
			bind:value={selectedForm}
			items={formItems}
			placeholder="Forme du lien"
		/>
	</div>

	{#if isCourse}
		<div class="space-y-1">
			<Label for="{uid}-time" class="text-sm">Temps limite (minutes)</Label>
			<Input
				id="{uid}-time"
				type="number"
				bind:value={courseMinutes}
				min={COURSE_TIME_LIMIT_MIN_MINUTES}
				max={COURSE_TIME_LIMIT_MAX_MINUTES}
				class="h-9 w-24"
			/>
		</div>
	{/if}

	<Button size={compact ? 'sm' : 'default'} variant="outline" onclick={handleCopy}>
		<Link class="mr-2 h-4 w-4" />
		Copier le lien
	</Button>
</div>
