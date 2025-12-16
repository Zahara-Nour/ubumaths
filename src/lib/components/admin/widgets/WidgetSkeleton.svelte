<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	// Props
	type Props = {
		type: 'metric' | 'status' | 'chart';
	};

	let { type }: Props = $props();
</script>

<Card.Root>
	<Card.Content class="p-6">
		{#if type === 'metric'}
			<!-- Metric card skeleton -->
			<div class="flex items-start justify-between">
				<div class="flex-1 space-y-3">
					<!-- Label skeleton -->
					<div class="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
					<!-- Value skeleton -->
					<div class="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
					<!-- Trend skeleton -->
					<div class="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
				</div>
				<!-- Icon skeleton -->
				<div class="h-12 w-12 animate-pulse rounded-lg bg-gray-200"></div>
			</div>
		{:else if type === 'status'}
			<!-- Status card skeleton -->
			<div class="flex items-start justify-between">
				<div class="flex flex-1 items-center gap-3">
					<!-- Status dot skeleton -->
					<div class="h-3 w-3 animate-pulse rounded-full bg-gray-200"></div>
					<div class="flex-1 space-y-2">
						<!-- Service name skeleton -->
						<div class="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
						<!-- Details skeleton -->
						<div class="flex items-center gap-3">
							<div class="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
							<div class="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
						</div>
					</div>
				</div>
			</div>
		{:else if type === 'chart'}
			<!-- Chart skeleton -->
			<div class="space-y-3">
				<!-- Header skeleton -->
				<div class="flex items-center justify-between">
					<div class="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
					<div class="flex items-center gap-2">
						<div class="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
						<div class="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
					</div>
				</div>
				<!-- Chart area skeleton -->
				<div class="h-12 w-full animate-pulse rounded bg-gray-200"></div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<style>
	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	:global(.animate-pulse) {
		animation: shimmer 2s infinite linear;
		background: linear-gradient(
			90deg,
			rgba(229, 231, 235, 1) 0%,
			rgba(243, 244, 246, 1) 50%,
			rgba(229, 231, 235, 1) 100%
		);
		background-size: 200% 100%;
	}
</style>
