<script lang="ts">
	/**
	 * SchoolConfigModal - Modal for configuring school timezone and week settings
	 *
	 * Phase 5: Daily summaries timezone and week configuration
	 *
	 * Features:
	 * - Configure school timezone (IANA timezones)
	 * - Configure week settings (school days, weekend, first/last day)
	 * - Save to API endpoint
	 * - Toast notifications for success/error
	 *
	 * @example
	 * <SchoolConfigModal bind:open={showModal} school={selectedSchool} onsave={handleSave} />
	 */

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import TimezoneSelect from './TimezoneSelect.svelte';
	import WeekConfigEditor from './WeekConfigEditor.svelte';
	import { DEFAULT_TIMEZONE } from '$lib/utils/timezones';
	import { DEFAULT_WEEK_CONFIG } from '$lib/utils/week-config';
	import type { WeekConfig, SchoolTimetable } from '$lib/types/database';

	type School = {
		id: string;
		name: string;
		timezone: string | null;
		timetable: SchoolTimetable | null;
	};

	let {
		open = $bindable(false),
		school,
		onsave
	}: {
		open?: boolean;
		school: School;
		onsave?: (updatedSchool: School) => void;
	} = $props();

	// Form state
	let timezone = $state<string>(DEFAULT_TIMEZONE);
	let weekConfig = $state<WeekConfig>(structuredClone(DEFAULT_WEEK_CONFIG));
	let isSaving = $state(false);

	// Initialize form when school changes or modal opens
	$effect(() => {
		if (open && school) {
			timezone = school.timezone || DEFAULT_TIMEZONE;
			weekConfig = structuredClone(school.timetable?.week_config || DEFAULT_WEEK_CONFIG);
		}
	});

	async function handleSave() {
		if (!school) return;

		isSaving = true;

		try {
			const response = await fetch(`/api/admin/schools/${school.id}/config`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					timezone,
					week_config: weekConfig
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Échec de la mise à jour');
			}

			const result: {
				success: boolean;
				message: string;
				school: School;
			} = await response.json();

			toaster.success(result.message);

			// Call onsave callback if provided
			if (onsave) {
				onsave(result.school);
			}

			// Close modal
			open = false;
		} catch (error) {
			console.error('[SchoolConfigModal] Save error:', error);
			toaster.error(error instanceof Error ? error.message : 'Échec de la mise à jour');
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		// Reset form to original values
		if (school) {
			timezone = school.timezone || DEFAULT_TIMEZONE;
			weekConfig = structuredClone(school.timetable?.week_config || DEFAULT_WEEK_CONFIG);
		}
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Configuration de l'école</Dialog.Title>
			<Dialog.Description>
				Configurez le fuseau horaire et la semaine scolaire pour {school.name}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Timezone Configuration -->
			<div class="space-y-4">
				<div>
					<h3 class="text-lg font-medium text-foreground">Fuseau horaire</h3>
					<p class="text-sm text-muted-foreground">
						Définit le fuseau horaire pour les résumés quotidiens et hebdomadaires. Par défaut:
						Europe/Paris
					</p>
				</div>
				<TimezoneSelect bind:value={timezone} disabled={isSaving} required />
			</div>

			<div class="border-t border-border"></div>

			<!-- Week Configuration -->
			<div class="space-y-4">
				<div>
					<h3 class="text-lg font-medium text-foreground">Configuration de la semaine</h3>
					<p class="text-sm text-muted-foreground">
						Définit les jours scolaires et le weekend pour les récompenses hebdomadaires
					</p>
				</div>
				<WeekConfigEditor bind:config={weekConfig} disabled={isSaving} />
			</div>
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={handleCancel} disabled={isSaving}>
				Annuler
			</Button>
			<Button type="button" onclick={handleSave} disabled={isSaving}>
				{isSaving ? 'Enregistrement...' : 'Enregistrer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
