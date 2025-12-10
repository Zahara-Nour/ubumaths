<!--
	ChapterTemplateIndicator Component
	===================================

	Badge showing template link status for a chapter.
	Displays template name, version, and update availability.
	Provides actions to update or detach from template.

	@module components/templates/ChapterTemplateIndicator
-->
<script lang="ts">
	import type { InstantiationWithStatus } from '$lib/types/chapter-templates';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import { Package, ArrowUpCircle, Unlink, AlertCircle } from 'lucide-svelte';

	// Props
	interface Props {
		instantiation: InstantiationWithStatus | null;
		hasUpdate?: boolean;
		onUpdate?: () => void;
		onDetach?: () => void;
		class?: string;
	}

	let {
		instantiation,
		hasUpdate = false,
		onUpdate,
		onDetach,
		class: className = ''
	}: Props = $props();

	// Check if template is deleted
	const isDeleted = $derived(
		instantiation && (!instantiation.templateTitle || instantiation.templateId === null)
	);

	// Check if detached
	const isDetached = $derived(instantiation?.isDetached ?? false);
</script>

{#if instantiation}
	<div class={cn('flex items-center gap-2', className)}>
		<!-- Template badge -->
		<Badge
			variant={isDeleted ? 'outline' : isDetached ? 'secondary' : 'default'}
			class={cn(
				'flex items-center gap-1.5 px-2 py-1',
				isDeleted && 'border-destructive/50 text-destructive'
			)}
		>
			<Package class="h-3 w-3" />
			<span class="text-xs">
				{#if isDeleted}
					Template supprimé
				{:else if instantiation.templateTitle}
					{instantiation.templateTitle}
				{:else}
					Template
				{/if}
				{#if !isDetached && !isDeleted}
					<span class="ml-1 opacity-60">v{instantiation.templateVersion}</span>
				{/if}
			</span>
			{#if isDetached}
				<Tooltip.Root>
					<Tooltip.Trigger asChild let:builder>
						<span use:builder.action {...builder}>
							<AlertCircle class="h-3 w-3 text-orange-500" />
						</span>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Détaché du template</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		</Badge>

		<!-- Update available badge -->
		{#if hasUpdate && !isDetached && !isDeleted && instantiation.latestVersion}
			<Badge variant="outline" class="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30">
				<ArrowUpCircle class="mr-1 h-3 w-3" />
				<span class="text-xs">
					Mise à jour v{instantiation.latestVersion}
				</span>
			</Badge>
		{/if}

		<!-- Actions -->
		<div class="flex items-center gap-1">
			{#if hasUpdate && !isDetached && !isDeleted && onUpdate}
				<Tooltip.Root>
					<Tooltip.Trigger asChild let:builder>
						<Button
							variant="ghost"
							size="icon-sm"
							onclick={onUpdate}
							class="h-7 w-7"
							{...builder}
							use:builder.action
						>
							<ArrowUpCircle class="h-4 w-4 text-blue-600" />
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Mettre à jour depuis le template</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}

			{#if !isDetached && onDetach}
				<Tooltip.Root>
					<Tooltip.Trigger asChild let:builder>
						<Button
							variant="ghost"
							size="icon-sm"
							onclick={onDetach}
							class="h-7 w-7"
							{...builder}
							use:builder.action
						>
							<Unlink class="h-4 w-4 text-muted-foreground hover:text-destructive" />
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Détacher du template</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		</div>
	</div>
{/if}
