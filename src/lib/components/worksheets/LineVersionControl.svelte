<!--
	LineVersionControl
	==================

	La version d'un exercice dans la fiche (ADR 0044, points 5 et 6), sous son titre dans la liste :
	un menu de toutes les versions (numéro, note, date) et, si la fiche n'est pas à la dernière,
	« une version plus récente existe (v3) » avec un bouton pour y passer.

	Changer de version : direct sur une fiche sans affectation en cours, après confirmation sinon
	(les élèves verront la nouvelle rédaction). La page se recharge ensuite (`onchanged`), refus
	compris : la liste des versions a pu changer entre-temps.

	Rendu seulement pour un exercice à plusieurs versions (la page ne fournit rien pour les autres).
-->
<script lang="ts">
	import { lore } from '#lib/config/lore.ts';
	import MySelect from '#lib/components/MySelect.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import ConfirmDialog from '#lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import {
		lineVersionState,
		versionChangeConfirmation,
		versionOptionLabel,
		type LineVersionChoice,
		type VersionOption
	} from '#lib/worksheets/line-version.ts';

	// Types
	interface Props {
		worksheetId: string;
		lineId: string;
		/** Numéro de l'exercice sur la fiche imprimée (messages) */
		exerciseNumber: number | undefined;
		choice: LineVersionChoice;
		activeAssignments: number;
		/** Fiche archivée : la version se lit, ne se change pas */
		disabled?: boolean;
		onchanged?: () => void | Promise<void>;
	}

	// Constantes
	const CORVEE = lore.learning.exercise;

	// Props
	let {
		worksheetId,
		lineId,
		exerciseNumber,
		choice,
		activeAssignments,
		disabled = false,
		onchanged
	}: Props = $props();

	// Variables
	let saving = $state(false);
	let pendingTarget = $state<VersionOption | null>(null);
	let confirmOpen = $state(false);
	/** Remonte le menu après une confirmation refusée : il revient à la version de la fiche */
	let selectKey = $state(0);

	let lineState = $derived(lineVersionState(choice));
	let items = $derived(
		lineState
			? choice.versions.map((v) => ({
					value: v.id,
					label: versionOptionLabel(v, lineState.latest.number)
				}))
			: []
	);
	let confirmation = $derived(versionChangeConfirmation(activeAssignments));
	let exerciseName = $derived(exerciseNumber ? `${CORVEE} ${exerciseNumber}` : CORVEE);

	// Functions
	function request(versionId: string) {
		const target = choice.versions.find((v) => v.id === versionId);
		if (!target || target.id === choice.current_version_id) return;
		if (confirmation) {
			pendingTarget = target;
			confirmOpen = true;
			return;
		}
		void apply(target);
	}

	function cancel() {
		pendingTarget = null;
		selectKey++;
	}

	async function confirm() {
		const target = pendingTarget;
		pendingTarget = null;
		confirmOpen = false;
		if (target) await apply(target);
	}

	async function apply(target: VersionOption) {
		saving = true;
		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/exercises/${lineId}/version`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exercise_version_id: target.id })
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message || 'Impossible de changer la version');
			}
			toaster.success(`${exerciseName} : version ${target.number}`);
		} catch (err) {
			toaster.error(err instanceof Error ? err.message : 'Impossible de changer la version');
		} finally {
			// Recharger d'abord : le menu ne revient pas sur l'ancienne version, et reste fermé
			// aux clics, le temps du rechargement
			await onchanged?.();
			saving = false;
			selectKey++;
		}
	}

	/**
	 * Boîte fermée sans confirmer (Échap, clic dehors : `onCancel` n'est appelé que par le bouton
	 * « Renoncer ») : le menu revient à la version de la fiche.
	 */
	function setConfirmOpen(open: boolean) {
		confirmOpen = open;
		if (!open && pendingTarget) cancel();
	}
</script>

{#if lineState}
	<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" data-line-version>
		{#key selectKey}
			<MySelect
				{items}
				value={choice.current_version_id}
				onValueChange={request}
				disabled={disabled || saving}
				fitContent
				triggerClass="h-7 text-xs"
				triggerAriaLabel="Version de la {exerciseName.toLowerCase()} dans la fiche"
			/>
		{/key}
		{#if !lineState.isLatest}
			<span class="text-muted-foreground">
				une version plus récente existe (v{lineState.latest.number})
			</span>
			{#if !disabled}
				<Button
					variant="outline"
					size="sm"
					class="h-7 px-2 text-xs"
					disabled={saving}
					onclick={() => request(lineState.latest.id)}
				>
					Passer à la v{lineState.latest.number}
				</Button>
			{/if}
		{/if}
	</div>

	<ConfirmDialog
		bind:open={() => confirmOpen, setConfirmOpen}
		title="Changer la version de la {exerciseName.toLowerCase()}"
		description={confirmation ?? ''}
		confirmLabel={pendingTarget ? `Passer à la v${pendingTarget.number}` : 'Changer'}
		variant="default"
		onConfirm={confirm}
		onCancel={cancel}
	/>
{/if}
