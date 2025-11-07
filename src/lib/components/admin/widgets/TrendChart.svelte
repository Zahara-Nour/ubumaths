<script lang="ts">
	import { cn } from '$lib/utils';

	// Props
	type Props = {
		data: number[];
		label: string;
		color?: 'green' | 'blue' | 'red';
	};

	let { data, label, color = 'blue' }: Props = $props();

	// Local state
	let hoveredIndex = $state<number | undefined>(undefined);

	// Derived values
	const minValue = $derived(Math.min(...data));
	const maxValue = $derived(Math.max(...data));
	const range = $derived(maxValue - minValue || 1); // Avoid division by zero

	const colorClasses = $derived.by(() => {
		switch (color) {
			case 'green':
				return {
					stroke: 'stroke-green-500',
					fill: 'fill-green-500',
					bg: 'bg-green-50'
				};
			case 'blue':
				return {
					stroke: 'stroke-blue-500',
					fill: 'fill-blue-500',
					bg: 'bg-blue-50'
				};
			case 'red':
				return {
					stroke: 'stroke-red-500',
					fill: 'fill-red-500',
					bg: 'bg-red-50'
				};
		}
	});

	// Generate SVG path for sparkline
	const svgPath = $derived.by(() => {
		const width = 100;
		const height = 40;
		const padding = 5;
		const effectiveHeight = height - padding * 2;
		const effectiveWidth = width - padding * 2;
		const stepX = effectiveWidth / (data.length - 1 || 1);

		const points = data.map((value, index) => {
			const x = padding + index * stepX;
			const normalizedValue = (value - minValue) / range;
			const y = padding + effectiveHeight - normalizedValue * effectiveHeight;
			return { x, y, value };
		});

		// Create smooth curve using quadratic bezier curves
		let path = `M ${points[0].x} ${points[0].y}`;

		for (let i = 0; i < points.length - 1; i++) {
			const current = points[i];
			const next = points[i + 1];
			const midX = (current.x + next.x) / 2;
			const midY = (current.y + next.y) / 2;

			path += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
		}

		// Complete the last segment
		const last = points[points.length - 1];
		path += ` T ${last.x} ${last.y}`;

		return { path, points };
	});

	const handleMouseMove = (event: MouseEvent, index: number) => {
		hoveredIndex = index;
	};

	const handleMouseLeave = () => {
		hoveredIndex = undefined;
	};
</script>

<div class={cn('rounded-lg p-3', colorClasses().bg)}>
	<div class="mb-2 flex items-center justify-between">
		<span class="text-xs font-medium text-gray-600">{label}</span>
		<div class="flex items-center gap-2 text-xs text-gray-500">
			<span>Min: {minValue}</span>
			<span>Max: {maxValue}</span>
		</div>
	</div>

	<div class="relative">
		<svg viewBox="0 0 100 40" class="h-12 w-full" preserveAspectRatio="none">
			<!-- Line path -->
			<path
				d={svgPath().path}
				class={cn(colorClasses().stroke, 'fill-none')}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			<!-- Data points (only visible on hover) -->
			{#each svgPath().points as point, index (index)}
				<circle
					cx={point.x}
					cy={point.y}
					r={hoveredIndex === index ? '3' : '0'}
					class={cn(colorClasses().fill, 'transition-all duration-150')}
					onmouseenter={(e) => handleMouseMove(e, index)}
					onmouseleave={handleMouseLeave}
					role="presentation"
				/>

				<!-- Invisible larger circles for better hover detection -->
				<circle
					cx={point.x}
					cy={point.y}
					r="8"
					class="cursor-pointer fill-transparent"
					onmouseenter={(e) => handleMouseMove(e, index)}
					onmouseleave={handleMouseLeave}
					role="presentation"
				/>
			{/each}
		</svg>

		<!-- Tooltip showing exact value -->
		{#if hoveredIndex !== undefined}
			{@const point = svgPath().points[hoveredIndex]}
			<div
				class="pointer-events-none absolute z-10 rounded bg-gray-900 px-2 py-1 text-xs text-white"
				style="left: {point.x}%; top: -25px; transform: translateX(-50%);"
			>
				{data[hoveredIndex]}
			</div>
		{/if}
	</div>
</div>
