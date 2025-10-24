<!--
	Skeleton Button Component
	=========================

	Rectangular skeleton loader for button placeholders.
	Matches common button sizes and shapes.

	Props:
	- size: Size preset ('sm', 'icon-sm', 'default') or custom classes
	- variant: Optional button variant (affects styling)

	Usage:
	<SkeletonButton size="icon-sm" />
	<SkeletonButton size="h-9 w-9" />
-->
<script lang="ts">
	let {
		size = 'default',
		customClass = ''
	}: {
		size?: 'sm' | 'icon-sm' | 'default' | string;
		customClass?: string;
	} = $props();

	// Map size presets to Tailwind classes
	const sizeClasses = {
		sm: 'h-9 w-20',
		'icon-sm': 'h-9 w-9',
		default: 'h-10 w-24'
	};

	const sizeClass = size in sizeClasses ? sizeClasses[size as keyof typeof sizeClasses] : size;
</script>

<!-- Button skeleton -->
<div class="skeleton rounded-md {sizeClass} {customClass}"></div>
