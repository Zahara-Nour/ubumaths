<script lang="ts">
	/**
	 * Admin Settings Page
	 *
	 * This page provides system settings and information for administrators.
	 * Currently displays:
	 * - Application version number
	 *
	 * Future additions could include:
	 * - System configuration settings
	 * - Feature flags
	 * - Performance metrics
	 * - Database statistics
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { getVersion, getRawVersion } from '$lib/utils/version';
	import { Settings, Info } from 'lucide-svelte';
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
			<Settings class="h-8 w-8" />
			Settings
		</h1>
		<p class="mt-2 text-muted-foreground">System settings and application information</p>
	</div>

	<Separator />

	<!-- Application Information Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Info class="h-5 w-5" />
				Application Information
			</Card.Title>
			<Card.Description>Current version and system details</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<!-- Version Display -->
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-foreground">Version</p>
						<p class="text-xs text-muted-foreground">Current application version</p>
					</div>
					<Badge variant="outline" class="px-4 py-1 text-base">
						{getVersion()}
					</Badge>
				</div>

				<Separator />

				<!-- Raw Version (for debugging) -->
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-foreground">Raw Version</p>
						<p class="text-xs text-muted-foreground">Semantic version number</p>
					</div>
					<code class="rounded bg-muted px-2 py-1 text-xs">
						{getRawVersion()}
					</code>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Version Update Instructions Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Version Management</Card.Title>
			<Card.Description>How to update the application version</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				<p class="text-sm text-muted-foreground">
					Use the following commands to bump the version before deployment:
				</p>

				<div class="space-y-2 text-sm">
					<div class="flex items-start gap-2">
						<code class="flex-shrink-0 rounded bg-muted px-2 py-1 text-xs">pnpm version patch</code>
						<span class="text-muted-foreground">Bug fixes (0.0.1 → 0.0.2)</span>
					</div>

					<div class="flex items-start gap-2">
						<code class="flex-shrink-0 rounded bg-muted px-2 py-1 text-xs">pnpm version minor</code>
						<span class="text-muted-foreground">New features (0.0.1 → 0.1.0)</span>
					</div>

					<div class="flex items-start gap-2">
						<code class="flex-shrink-0 rounded bg-muted px-2 py-1 text-xs">pnpm version major</code>
						<span class="text-muted-foreground">Breaking changes (0.0.1 → 1.0.0)</span>
					</div>
				</div>

				<p class="mt-4 text-xs text-muted-foreground">
					These commands automatically update package.json and create a git tag.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
