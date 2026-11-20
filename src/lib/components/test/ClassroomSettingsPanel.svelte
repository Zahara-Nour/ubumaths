<!--
	ClassroomSettingsPanel
	======================
	Réglages de la forme « En classe » (chantier `diaporama-reglages`), lus et
	écrits dans `classroomSettings` (gardés dans le navigateur). Le même panneau
	sert sur la page d'attente et dans le ⚙ de la projection.
-->

<script lang="ts">
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import {
		classroomSettings,
		CORRECTION_SECONDS_MAX,
		CORRECTION_SECONDS_MIN,
		CORRECTION_SECONDS_STEP
	} from '#lib/stores/classroomSettings.svelte.ts';
	import { unlockChime } from '#lib/utils/chime.ts';
	import { Minus, Plus } from '@lucide/svelte';

	// Types
	interface Props {
		/** Réglage « Plein écran au lancement » (inutile une fois la série lancée) */
		showFullscreen?: boolean;
	}

	// Props
	let { showFullscreen = true }: Props = $props();

	// Variables
	const settings = $derived(classroomSettings.settings);

	// Functions
	// Le clic qui allume le son est un geste : il débloque le son du navigateur
	function handleChimeChange(value: boolean) {
		if (value) unlockChime();
		classroomSettings.update({ chime: value });
	}

	function changeCorrectionSeconds(delta: number) {
		classroomSettings.update({ correctionSeconds: settings.correctionSeconds + delta });
	}
</script>

<div class="flex flex-col gap-3">
	{#if showFullscreen}
		<MyCheckbox
			checked={settings.fullscreenOnStart}
			label="Plein écran au lancement"
			onchange={(value) => classroomSettings.update({ fullscreenOnStart: value })}
		/>
	{/if}

	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<MyCheckbox
			checked={settings.correctionAfterEach}
			label="Correction après chaque question"
			onchange={(value) => classroomSettings.update({ correctionAfterEach: value })}
		/>
		{#if settings.correctionAfterEach}
			<div class="flex items-center gap-1" role="group" aria-label="Durée de chaque correction">
				<Button
					variant="secondary"
					size="icon"
					class="h-8 w-8"
					aria-label="Réduire la durée de correction"
					aria-disabled={settings.correctionSeconds <= CORRECTION_SECONDS_MIN}
					onclick={() => changeCorrectionSeconds(-CORRECTION_SECONDS_STEP)}
				>
					<Minus class="h-4 w-4" />
				</Button>
				<span
					class="min-w-12 text-center text-sm font-medium tabular-nums"
					data-testid="classroom-correction-seconds">{settings.correctionSeconds} s</span
				>
				<Button
					variant="secondary"
					size="icon"
					class="h-8 w-8"
					aria-label="Augmenter la durée de correction"
					aria-disabled={settings.correctionSeconds >= CORRECTION_SECONDS_MAX}
					onclick={() => changeCorrectionSeconds(CORRECTION_SECONDS_STEP)}
				>
					<Plus class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>

	<MyCheckbox
		checked={settings.pauseAtEnd}
		label="Pause à la fin du temps"
		onchange={(value) => classroomSettings.update({ pauseAtEnd: value })}
	/>

	<MyCheckbox
		checked={settings.chime}
		label="Son entre deux questions"
		onchange={handleChimeChange}
	/>
</div>
