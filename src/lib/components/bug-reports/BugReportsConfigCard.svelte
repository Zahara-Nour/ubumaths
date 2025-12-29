<script lang="ts">
	/**
	 * Bug Reports Configuration Card
	 *
	 * Admin UI for toggling bug reports feature flags.
	 * Used in both admin bug-reports page and admin settings page.
	 */
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Loader2, Settings2 } from 'lucide-svelte';
	import { bugReportsConfigStore } from '$lib/stores/bugReportsConfig.svelte';
	import {
		BUG_REPORTS_CONFIG_LABELS,
		BUG_REPORTS_CONFIG_DESCRIPTIONS
	} from '$lib/types/bug-reports';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		/** Show compact version (less padding, smaller text) */
		compact?: boolean;
	}

	let { compact = false }: Props = $props();

	// Local state for debouncing
	let fabEnabled = $state(true);
	let freezeDetectionEnabled = $state(true);
	let freezePromptEnabled = $state(true);
	let autoReportEnabled = $state(true);
	let updating = $state<string | null>(null);

	// Sync local state with store
	$effect(() => {
		fabEnabled = bugReportsConfigStore.fabEnabled;
		freezeDetectionEnabled = bugReportsConfigStore.freezeDetectionEnabled;
		freezePromptEnabled = bugReportsConfigStore.freezePromptEnabled;
		autoReportEnabled = bugReportsConfigStore.autoReportEnabled;
	});

	onMount(() => {
		bugReportsConfigStore.load();
	});

	// Handle toggle with debounce
	async function handleToggle(
		key: 'fabEnabled' | 'freezeDetectionEnabled' | 'freezePromptEnabled' | 'autoReportEnabled',
		value: boolean
	) {
		updating = key;

		const success = await bugReportsConfigStore.update({ [key]: value });

		if (success) {
			toaster.success('Configuration mise à jour');
		} else {
			toaster.error('Erreur lors de la mise à jour');
		}

		updating = null;
	}
</script>

<Card.Root class={compact ? 'p-4' : ''}>
	<Card.Header class={compact ? 'pb-3' : ''}>
		<Card.Title class="flex items-center gap-2 {compact ? 'text-base' : ''}">
			<Settings2 class="h-5 w-5" />
			Configuration
		</Card.Title>
		{#if !compact}
			<Card.Description>
				Activer ou désactiver les fonctionnalités de signalement de bugs
			</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content class={compact ? 'pt-0' : ''}>
		{#if bugReportsConfigStore.loading}
			<div class="flex items-center justify-center py-4">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else}
			<div class="space-y-4">
				<!-- FAB Toggle -->
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-0.5">
						<label for="fab-toggle" class="text-sm font-medium">
							{BUG_REPORTS_CONFIG_LABELS.fabEnabled}
						</label>
						<p class="text-xs text-muted-foreground">
							{BUG_REPORTS_CONFIG_DESCRIPTIONS.fabEnabled}
						</p>
					</div>
					<div class="flex items-center gap-2">
						{#if updating === 'fabEnabled'}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						<MyCheckbox
							id="fab-toggle"
							bind:checked={fabEnabled}
							onCheckedChange={(v) => handleToggle('fabEnabled', v)}
							disabled={updating !== null}
						/>
					</div>
				</div>

				<!-- Freeze Detection Toggle -->
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-0.5">
						<label for="freeze-detection-toggle" class="text-sm font-medium">
							{BUG_REPORTS_CONFIG_LABELS.freezeDetectionEnabled}
						</label>
						<p class="text-xs text-muted-foreground">
							{BUG_REPORTS_CONFIG_DESCRIPTIONS.freezeDetectionEnabled}
						</p>
					</div>
					<div class="flex items-center gap-2">
						{#if updating === 'freezeDetectionEnabled'}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						<MyCheckbox
							id="freeze-detection-toggle"
							bind:checked={freezeDetectionEnabled}
							onCheckedChange={(v) => handleToggle('freezeDetectionEnabled', v)}
							disabled={updating !== null}
						/>
					</div>
				</div>

				<!-- Freeze Prompt Toggle -->
				<div
					class="flex items-start justify-between gap-4 {!freezeDetectionEnabled
						? 'opacity-50'
						: ''}"
				>
					<div class="space-y-0.5">
						<label for="freeze-prompt-toggle" class="text-sm font-medium">
							{BUG_REPORTS_CONFIG_LABELS.freezePromptEnabled}
						</label>
						<p class="text-xs text-muted-foreground">
							{BUG_REPORTS_CONFIG_DESCRIPTIONS.freezePromptEnabled}
						</p>
					</div>
					<div class="flex items-center gap-2">
						{#if updating === 'freezePromptEnabled'}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						<MyCheckbox
							id="freeze-prompt-toggle"
							bind:checked={freezePromptEnabled}
							onCheckedChange={(v) => handleToggle('freezePromptEnabled', v)}
							disabled={updating !== null || !freezeDetectionEnabled}
						/>
					</div>
				</div>

				<!-- Auto Report Toggle -->
				<div
					class="flex items-start justify-between gap-4 {!freezeDetectionEnabled
						? 'opacity-50'
						: ''}"
				>
					<div class="space-y-0.5">
						<label for="auto-report-toggle" class="text-sm font-medium">
							{BUG_REPORTS_CONFIG_LABELS.autoReportEnabled}
						</label>
						<p class="text-xs text-muted-foreground">
							{BUG_REPORTS_CONFIG_DESCRIPTIONS.autoReportEnabled}
						</p>
					</div>
					<div class="flex items-center gap-2">
						{#if updating === 'autoReportEnabled'}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						<MyCheckbox
							id="auto-report-toggle"
							bind:checked={autoReportEnabled}
							onCheckedChange={(v) => handleToggle('autoReportEnabled', v)}
							disabled={updating !== null || !freezeDetectionEnabled}
						/>
					</div>
				</div>

				<!-- Dependency note -->
				{#if !freezeDetectionEnabled}
					<p class="text-xs text-muted-foreground italic">
						Les options d'alerte et de rapport automatique nécessitent la détection des freezes.
					</p>
				{/if}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
