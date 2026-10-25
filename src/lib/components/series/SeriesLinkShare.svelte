<!--
	SeriesLinkShare — « Copier le lien » d'une série, avec le choix de sa forme (Q44)

	- « Sans forme (ouvre le panier) » (défaut) : le lien met la série dans le
	  panier du destinataire ;
	- une forme : le lien lance directement la série sous cette forme ; une Course
	  aux nombres porte son temps limite (mêmes réglages que la fenêtre du panier).

	Utilisé par le panier et par la page « Séries » (Q46).

	Le QR code porte un lien court (`/l/<code>`) : le lien de série dépasse
	toujours ce qu'un QR lisible contient. Seuls un prof et l'admin en créent
	(le panier est public) ; ailleurs, le QR est indisponible et le lien long
	reste copiable. Phase 0 : docs/archive/wip/liens-courts-phase0.md.
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import QrCodeButton from '$lib/components/qr/QrCodeButton.svelte';
	import { fetchShortLinkPath } from '$lib/qr/short-link';
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
		/** Prof ou admin connecté : lui seul crée le lien court du QR (`create_short_link`) */
		canMakeQr?: boolean;
	}

	let { categories, compact = false, canMakeQr = false }: Props = $props();

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
	/** La cible du lien court du QR (chemin seul), ou la raison de son absence */
	let qrLink = $derived(linkToCopy(''));
	let qrUnavailableReason = $derived(
		'error' in qrLink
			? qrLink.error
			: canMakeQr
				? undefined
				: 'le QR code d’une série est réservé aux profs, copie le lien'
	);

	function isTestMode(value: string): value is TestMode {
		return TEST_MODES.includes(value);
	}

	/**
	 * Lien à copier, ou message si le temps limite est hors bornes. Le QR code
	 * le demande sans origine : il prend toujours celle du domaine canonique.
	 */
	function linkToCopy(origin = window.location.origin): { link: string } | { error: string } {
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
	<QrCodeButton
		url={canMakeQr && 'link' in qrLink ? qrLink.link : null}
		label="la série"
		unavailableReason={qrUnavailableReason}
		resolveUrl={fetchShortLinkPath}
		size={compact ? 'sm' : 'default'}
	/>
</div>
