<!--
	Skeleton Icon Component
	=======================

	Small square/circular skeleton loader for icon placeholders.

	Props:
	- size: Size classes (default: 'h-6 w-6' for 24px)
	- circle: Whether to make it circular (default: false)

	Usage:
	<SkeletonIcon size="h-6 w-6" />
	<SkeletonIcon size="h-5 w-5" circle={true} />
-->
<script lang="ts">
	let {
		size = 'h-6 w-6',
		circle = false
	}: {
		size?: string;
		circle?: boolean;
	} = $props();
</script>

<!-- Icon skeleton -->
<div class="skeleton {size}" class:rounded-full={circle} class:rounded={!circle}></div>
