<!--
	Skeleton Nav Item Component
	===========================

	High-fidelity skeleton loader for navigation items.
	Matches the exact structure of real nav items: icon (circle) + label (text).

	Props:
	- iconSize: Size of the icon skeleton (default: 'h-6 w-6' for 24px)
	- labelLines: Number of text lines (default: 2 for sidebar)
	- fullWidth: Whether label should take full width (default: false)

	Usage:
	<SkeletonNavItem iconSize="h-6 w-6" labelLines={2} />
-->
<script lang="ts">
	let {
		iconSize = 'h-6 w-6',
		labelLines = 2,
		fullWidth = false
	}: {
		iconSize?: string;
		labelLines?: number;
		fullWidth?: boolean;
	} = $props();
</script>

<!-- Container matching nav item structure -->
<div class="flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-3">
	<!-- Icon skeleton (circle) -->
	<div class="skeleton rounded-full {iconSize}"></div>

	<!-- Label skeleton (text lines) -->
	<div class="flex w-full flex-col items-center gap-1">
		{#each Array(labelLines) as _unused, i (i)}
			<div
				class="skeleton h-3 rounded"
				class:w-full={fullWidth}
				class:w-10={!fullWidth && i === 0}
				class:w-8={!fullWidth && i === 1}
			></div>
		{/each}
	</div>
</div>
