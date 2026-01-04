<!--
	ScheduleEntryModal Component
	============================

	Modal dialog for creating, editing, and deleting schedule entries.
	Uses Shadcn Dialog component with form validation.

	MODES:
	- create: Empty form for new entry, shows "Créer" button
	- edit: Pre-filled form with existing entry, shows "Enregistrer" and "Supprimer" buttons
	- view: Read-only form, shows only "Fermer" button

	FEATURES:
	- Day of week selector (Dimanche-Jeudi)
	- Time range inputs with validation (end > start)
	- Optional fields: subject, room, notes
	- Delete confirmation for edit mode
	- Auto-reset form when modal opens/closes
	- Reactive form state with Svelte 5 runes

	Props:
	- open: boolean (bindable) - Whether modal is open
	- mode: 'create' | 'edit' | 'view' - Modal mode determines available actions
	- entry?: ClassSchedule - Existing entry to edit/view (undefined for create mode)
	- defaultDay?: number - Default day (0-4) for new entries (default: 0 = Sunday)
	- defaultTime?: string - Default start time for new entries (default: 08:00:00)
	- onClose: () => void - Callback when modal is closed (Cancel/X button)
	- onSave: (data: ScheduleFormData) => void - Callback when form is submitted
	- onDelete?: () => void - Callback when delete button is clicked (edit mode only)

	VALIDATION:
	- End time must be after start time
	- Required fields: day_of_week, start_time, end_time
	- Optional fields: subject, room, notes

	USAGE:
	<ScheduleEntryModal
		bind:open={modalOpen}
		mode="create"
		defaultDay={1}
		defaultTime="08:00:00"
		onClose={() => modalOpen = false}
		onSave={async (data) => {
			await createScheduleEntry(data);
			modalOpen = false;
		}}
	/>
-->

<script lang="ts">
	import type { Tables } from '$lib/types/database';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import { getDayName } from '$lib/utils/schedule';
	import { formatPeriodDisplay, type SchoolPeriod } from '$lib/utils/timetable';

	type ClassSchedule = Tables<'class_schedules'>;
	import { Trash2 } from 'lucide-svelte';

	export interface ScheduleFormData {
		id?: string;
		day_of_week: number;
		start_time: string;
		end_time: string;
		period_number: number;
		subject: string;
		room: string;
		notes: string;
	}

	interface Props {
		open: boolean;
		mode: 'create' | 'edit' | 'view';
		entry?: ClassSchedule;
		defaultDay?: number;
		periods: SchoolPeriod[];
		onClose: () => void;
		onSave: (data: ScheduleFormData) => void;
		onDelete?: () => void;
	}

	let {
		open = $bindable(),
		mode,
		entry,
		defaultDay = 0,
		periods,
		onClose,
		onSave,
		onDelete
	}: Props = $props();

	// Form state - stores current values for all form fields
	let formData = $state<ScheduleFormData>({
		id: entry?.id,
		day_of_week: entry?.day_of_week ?? defaultDay,
		start_time: entry?.start_time ?? (periods[0]?.start_time || '08:00:00'),
		end_time: entry?.end_time ?? (periods[0]?.end_time || '09:00:00'),
		period_number: entry?.period_number ?? (periods[0]?.number || 1),
		subject: entry?.subject ?? '',
		room: entry?.room ?? '',
		notes: entry?.notes ?? ''
	});

	/**
	 * Reset form when modal opens or entry changes
	 * This effect ensures the form always shows fresh data when opened
	 */
	$effect(() => {
		if (open) {
			const dayOfWeek = entry?.day_of_week ?? defaultDay;
			const periodNumber = entry?.period_number ?? (periods[0]?.number || 1);

			formData = {
				id: entry?.id,
				day_of_week: dayOfWeek,
				start_time: entry?.start_time ?? (periods[0]?.start_time || '08:00:00'),
				end_time: entry?.end_time ?? (periods[0]?.end_time || '09:00:00'),
				period_number: periodNumber,
				subject: entry?.subject ?? '',
				room: entry?.room ?? '',
				notes: entry?.notes ?? ''
			};

			// Update select values
			selectedDay = String(dayOfWeek);
			selectedPeriod = String(periodNumber);
		}
	});

	/**
	 * Handle form submission
	 * Calls onSave callback with form data
	 */
	function handleSubmit() {
		onSave(formData);
		open = false;
	}

	/**
	 * Handle delete button click
	 * Calls onDelete callback if provided (edit mode only)
	 */
	function handleDelete() {
		if (onDelete) {
			onDelete();
			open = false;
		}
	}

	/**
	 * Handle cancel/close button click
	 * Closes modal and calls onClose callback
	 */
	function handleCancel() {
		open = false;
		onClose();
	}

	// Day options for select (convert number to string for MySelect)
	const dayOptions = [0, 1, 2, 3, 4].map((day) => ({
		value: String(day),
		label: getDayName(day)
	}));

	// Period options for select (convert number to string for MySelect)
	const periodOptions = $derived(
		periods.map((period) => ({
			value: String(period.number),
			label: formatPeriodDisplay(period)
		}))
	);

	// Selected values as strings for MySelect binding
	// Initialize with derived values to avoid capturing stale initial state
	let selectedDay = $state(String(entry?.day_of_week ?? defaultDay));
	let selectedPeriod = $state(String(entry?.period_number ?? (periods[0]?.number || 1)));

	// Sync formData when selections change
	$effect(() => {
		formData.day_of_week = parseInt(selectedDay);
	});

	$effect(() => {
		const periodNum = parseInt(selectedPeriod);
		const period = periods.find((p) => p.number === periodNum);
		if (period) {
			formData.period_number = period.number;
			formData.start_time = period.start_time;
			formData.end_time = period.end_time;
		}
	});

	// Modal title based on mode
	const modalTitle = $derived(
		mode === 'create'
			? 'Ajouter un Créneau'
			: mode === 'edit'
				? 'Modifier le Créneau'
				: 'Détails du Créneau'
	);

	const readonly = $derived(mode === 'view');
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>{modalTitle}</Dialog.Title>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<!-- Day of Week -->
			<div>
				<Label class="mb-2 block">
					Jour <span class="text-destructive">*</span>
				</Label>
				<MySelect
					type="single"
					bind:value={selectedDay}
					items={dayOptions}
					placeholder="Sélectionner un jour"
					disabled={readonly}
					triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
				/>
			</div>

			<!-- Period Selection -->
			<div>
				<Label class="mb-2 block">
					Période <span class="text-destructive">*</span>
				</Label>
				{#if periods.length === 0}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						Aucune période définie pour cette école. Contactez l'administrateur pour configurer
						l'emploi du temps.
					</div>
				{:else}
					<MySelect
						type="single"
						bind:value={selectedPeriod}
						items={periodOptions}
						placeholder="Sélectionner une période"
						disabled={readonly}
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				{/if}
			</div>

			<!-- Subject -->
			<div>
				<Label for="subject" class="mb-2 block">Matière</Label>
				<Input
					id="subject"
					type="text"
					bind:value={formData.subject}
					placeholder="Ex: Mathématiques"
					disabled={readonly}
				/>
			</div>

			<!-- Room -->
			<div>
				<Label for="room" class="mb-2 block">Salle</Label>
				<Input
					id="room"
					type="text"
					bind:value={formData.room}
					placeholder="Ex: A101"
					disabled={readonly}
				/>
			</div>

			<!-- Notes -->
			<div>
				<Label for="notes" class="mb-2 block">Notes</Label>
				<Textarea
					id="notes"
					bind:value={formData.notes}
					placeholder="Notes optionnelles..."
					rows={3}
					disabled={readonly}
				/>
			</div>

			<!-- Action Buttons -->
			<Dialog.Footer class="flex items-center justify-between">
				<!-- Delete Button (left side, edit mode only) -->
				{#if mode === 'edit' && onDelete}
					<Button type="button" variant="destructive" onclick={handleDelete} class="gap-2">
						<Trash2 class="h-4 w-4" />
						Supprimer
					</Button>
				{:else}
					<div></div>
				{/if}

				<!-- Cancel/Save Buttons (right side) -->
				<div class="flex gap-2">
					<Button type="button" variant="outline" onclick={handleCancel}>
						{readonly ? 'Fermer' : 'Annuler'}
					</Button>
					{#if !readonly}
						<Button type="submit">
							{mode === 'create' ? 'Créer' : 'Enregistrer'}
						</Button>
					{/if}
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
