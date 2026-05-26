<!--
	PomodoroSettings
	================

	Collapsible settings panel. Starts collapsed.
	Uses number inputs for durations and MyCheckbox for boolean toggles.

	Input values are derived from the store (so resetSettings() reflects
	immediately) and pushed back on every change event. The store clamps
	all values to their valid ranges, so we pass raw input values directly.
-->

<script lang="ts">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { pomodoroStore } from '$lib/stores/pomodoro/pomodoro.svelte';
	import { requestNotificationPermission } from '$lib/stores/pomodoro/effects';
	import { toaster } from '$lib/stores/toaster.svelte';

	// ---------------------------------------------------------------------------
	// Collapse state
	// ---------------------------------------------------------------------------
	let isOpen = $state(false);

	// ---------------------------------------------------------------------------
	// Settings values — derived directly from the store so resetSettings()
	// is reflected in the inputs without any $effect sync dance.
	// ---------------------------------------------------------------------------
	let workMinutes = $derived(pomodoroStore.settings.workMinutes);
	let shortBreakMinutes = $derived(pomodoroStore.settings.shortBreakMinutes);
	let longBreakMinutes = $derived(pomodoroStore.settings.longBreakMinutes);
	let pomodorosUntilLongBreak = $derived(pomodoroStore.settings.pomodorosUntilLongBreak);
	let soundEnabled = $derived(pomodoroStore.settings.soundEnabled);
	let notificationsEnabled = $derived(pomodoroStore.settings.notificationsEnabled);

	// ---------------------------------------------------------------------------
	// Handlers — each pushes the raw value to the store; the store clamps it.
	// ---------------------------------------------------------------------------

	function handleWorkMinutesChange(e: Event) {
		const value = (e.target as HTMLInputElement).valueAsNumber;
		if (!Number.isNaN(value)) pomodoroStore.updateSettings({ workMinutes: value });
	}

	function handleShortBreakChange(e: Event) {
		const value = (e.target as HTMLInputElement).valueAsNumber;
		if (!Number.isNaN(value)) pomodoroStore.updateSettings({ shortBreakMinutes: value });
	}

	function handleLongBreakChange(e: Event) {
		const value = (e.target as HTMLInputElement).valueAsNumber;
		if (!Number.isNaN(value)) pomodoroStore.updateSettings({ longBreakMinutes: value });
	}

	function handleCycleChange(e: Event) {
		const value = (e.target as HTMLInputElement).valueAsNumber;
		if (!Number.isNaN(value)) pomodoroStore.updateSettings({ pomodorosUntilLongBreak: value });
	}

	function handleSoundChange(checked: boolean) {
		pomodoroStore.updateSettings({ soundEnabled: checked });
	}

	async function handleNotificationsChange(checked: boolean) {
		// Optimistically update so the checkbox visual matches the click.
		// If permission is refused, we roll back below and the bound prop
		// snaps the checkbox back to unchecked.
		pomodoroStore.updateSettings({ notificationsEnabled: checked });
		if (!checked) return;
		const granted = await requestNotificationPermission();
		if (!granted) {
			pomodoroStore.updateSettings({ notificationsEnabled: false });
			toaster.error('Notifications refusées par le navigateur');
		}
	}
</script>

<div class="w-full">
	<!-- Toggle button — aria-controls links to the panel below for SR users -->
	<button
		type="button"
		class="flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
		aria-expanded={isOpen}
		aria-controls="pomodoro-settings-panel"
		onclick={() => (isOpen = !isOpen)}
	>
		<span>Réglages</span>
		{#if isOpen}
			<ChevronUp class="h-4 w-4" aria-hidden="true" />
		{:else}
			<ChevronDown class="h-4 w-4" aria-hidden="true" />
		{/if}
	</button>

	{#if isOpen}
		<div id="pomodoro-settings-panel" class="mt-3 flex flex-col gap-5">
			<!-- Duration inputs -->
			<fieldset class="flex flex-col gap-3">
				<legend class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Durées (minutes)
				</legend>

				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<!--
						The wrapping <label> already supplies the accessible name from
						its visible <span>. Adding aria-label would override that and
						break WCAG 2.5.3 (Label in Name) for voice-control users —
						they'd say "Travail" but the SR target would be the
						aria-label string instead.
					-->
					<label class="flex flex-col gap-1.5">
						<span class="text-xs text-muted-foreground">Travail</span>
						<input
							type="number"
							min="1"
							max="90"
							value={workMinutes}
							onchange={handleWorkMinutesChange}
							class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</label>

					<label class="flex flex-col gap-1.5">
						<span class="text-xs text-muted-foreground">Pause courte</span>
						<input
							type="number"
							min="1"
							max="30"
							value={shortBreakMinutes}
							onchange={handleShortBreakChange}
							class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</label>

					<label class="flex flex-col gap-1.5">
						<span class="text-xs text-muted-foreground">Pause longue</span>
						<input
							type="number"
							min="1"
							max="60"
							value={longBreakMinutes}
							onchange={handleLongBreakChange}
							class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</label>

					<label class="flex flex-col gap-1.5">
						<span class="text-xs text-muted-foreground">Avant pause longue</span>
						<input
							type="number"
							min="2"
							max="8"
							value={pomodorosUntilLongBreak}
							onchange={handleCycleChange}
							class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</label>
				</div>
			</fieldset>

			<!-- Boolean toggles -->
			<fieldset class="flex flex-col gap-3">
				<legend class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Notifications
				</legend>

				<MyCheckbox checked={soundEnabled} label="Son de fin" onchange={handleSoundChange} />

				<!-- Phase 4: browser notification permission flow not yet implemented -->
				<MyCheckbox
					checked={notificationsEnabled}
					label="Notifications du navigateur"
					onchange={handleNotificationsChange}
				/>
			</fieldset>

			<!-- Restore defaults -->
			<Button
				variant="outline"
				size="sm"
				class="w-fit"
				onclick={() => pomodoroStore.resetSettings()}
			>
				Restaurer les valeurs par défaut
			</Button>
		</div>
	{/if}
</div>
