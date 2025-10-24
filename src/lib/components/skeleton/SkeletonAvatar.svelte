<!--
	Skeleton Avatar Component
	=========================

	Circular skeleton loader for avatar placeholders.
	Matches the exact size of Avatar.Root component.

	Props:
	- size: Size classes (default: 'h-10 w-10' for 40px)

	Usage:
	<SkeletonAvatar size="h-10 w-10" />
-->
<script lang="ts">
	let { size = 'h-10 w-10' }: { size?: string } = $props();
</script>

<!-- Circular avatar skeleton -->
<div class="skeleton rounded-full {size}"></div>
