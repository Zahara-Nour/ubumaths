<!--
	VipCardHolo Component
	=====================
	Holographic VIP card with interactive 3D effects
	Migrated from Pokemon cards CSS project to Svelte 5

	Features:
	- Mouse/touch tracking with 3D tilt
	- Click-to-expand popover
	- Gyroscope support on mobile
	- Rarity-based holographic effects
	- Showcase auto-rotation mode
-->

<script lang="ts">
	import { spring } from 'svelte/motion';
	import { onMount } from 'svelte';
	import type { VipCard } from '$lib/types/vip-card';
	import { activeCard, orientation, resetBaseOrientation } from '$lib/stores/holo-card.svelte';
	import { clamp, round, adjust } from '$lib/utils/holo-math';

	interface Props {
		card: VipCard;
		count?: number;
		showcase?: boolean;
		enable3d?: boolean;
		enablePopover?: boolean;
		enableGyroscope?: boolean;
		enableHoloEffect?: boolean;
		showBack?: boolean;
	}

	let {
		card,
		count = 1,
		showcase = false,
		enable3d = true,
		enablePopover = true,
		enableGyroscope = true,
		enableHoloEffect = true,
		showBack = false
	}: Props = $props();

	// Random seed for cosmos effect positioning
	const randomSeed = {
		x: Math.random(),
		y: Math.random()
	};

	const cosmosPosition = {
		x: Math.floor(randomSeed.x * 734),
		y: Math.floor(randomSeed.y * 1280)
	};

	// Component state
	let thisCard: HTMLElement | undefined = $state();
	let repositionTimer: number | undefined = $state();
	let active = $state(false);
	let interacting = $state(false);
	let firstPop = $state(true);
	let isVisible = $state(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);

	// Spring animation settings
	const springInteractSettings = { stiffness: 0.066, damping: 0.25 };
	const springPopoverSettings = { stiffness: 0.033, damping: 0.45 };

	let springRotate = spring({ x: 0, y: 0 }, springInteractSettings);
	let springGlare = spring({ x: 50, y: 50, o: 0 }, springInteractSettings);
	let springBackground = spring({ x: 50, y: 50 }, springInteractSettings);
	let springRotateDelta = spring({ x: 0, y: 0 }, springPopoverSettings);
	let springTranslate = spring({ x: 0, y: 0 }, springPopoverSettings);
	let springScale = spring(1, springPopoverSettings);

	// Showcase mode timers
	let showcaseInterval: number | undefined = $state();
	let showcaseTimerStart: number | undefined = $state();
	let showcaseTimerEnd: number | undefined = $state();
	let showcaseRunning = $state(showcase);

	// End showcase animation
	function endShowcase() {
		if (showcaseRunning) {
			clearTimeout(showcaseTimerEnd);
			clearTimeout(showcaseTimerStart);
			clearInterval(showcaseInterval);
			showcaseRunning = false;
		}
	}

	// Start showcase animation
	function startShowcase(delay: number = 0) {
		if (!isVisible) return;

		endShowcase(); // Clear any existing animation
		showcaseRunning = true;
		firstPop = false; // Prevent the 360-degree flip animation

		const s = 0.02;
		const d = 0.5;
		let r = 0;

		showcaseTimerStart = setTimeout(() => {
			interacting = true;
			active = true;
			springRotate.stiffness = s;
			springRotate.damping = d;
			springGlare.stiffness = s;
			springGlare.damping = d;
			springBackground.stiffness = s;
			springBackground.damping = d;

			if (isVisible) {
				showcaseInterval = setInterval(function () {
					r += 0.05;
					springRotate.set({ x: Math.sin(r) * 25, y: Math.cos(r) * 25 });
					springGlare.set({
						x: 55 + Math.sin(r) * 55,
						y: 55 + Math.cos(r) * 55,
						o: 0.8
					});
					springBackground.set({
						x: 20 + Math.sin(r) * 20,
						y: 20 + Math.cos(r) * 20
					});
				}, 20) as unknown as number;

				showcaseTimerEnd = setTimeout(() => {
					clearInterval(showcaseInterval);
					interactEnd(0);
					showcaseRunning = false;
				}, 4000) as unknown as number;
			} else {
				interacting = false;
				active = false;
				showcaseRunning = false;
			}
		}, delay) as unknown as number;
	}

	// Update all springs with new values
	function updateSprings(
		background: { x: number; y: number },
		rotate: { x: number; y: number },
		glare: { x: number; y: number; o: number }
	) {
		springBackground.stiffness = springInteractSettings.stiffness;
		springBackground.damping = springInteractSettings.damping;
		springRotate.stiffness = springInteractSettings.stiffness;
		springRotate.damping = springInteractSettings.damping;
		springGlare.stiffness = springInteractSettings.stiffness;
		springGlare.damping = springInteractSettings.damping;

		springBackground.set(background);
		springRotate.set(rotate);
		springGlare.set(glare);
	}

	// Handle mouse/touch interaction
	function interact(e: PointerEvent) {
		// Skip interaction if both 3D and holo effects are disabled
		if (!enable3d && !enableHoloEffect) return;

		endShowcase();

		if (!isVisible) {
			interacting = false;
			return;
		}

		// Prevent interaction with background cards
		if (activeCard.get() && activeCard.get() !== thisCard) {
			interacting = false;
			return;
		}

		interacting = true;

		const el = e.target as HTMLElement;
		const rect = el.getBoundingClientRect();

		const absolute = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};

		const percent = {
			x: clamp(round((100 / rect.width) * absolute.x)),
			y: clamp(round((100 / rect.height) * absolute.y))
		};

		const center = {
			x: percent.x - 50,
			y: percent.y - 50
		};

		// Update springs based on what effects are enabled
		updateSprings(
			{
				x: adjust(percent.x, 0, 100, 37, 63),
				y: adjust(percent.y, 0, 100, 33, 67)
			},
			{
				// Only apply 3D rotation if enable3d is true
				x: enable3d ? round(-(center.x / 3.5)) : 0,
				y: enable3d ? round(center.y / 2) : 0
			},
			{
				x: round(percent.x),
				y: round(percent.y),
				o: enableHoloEffect ? 1 : 0
			}
		);
	}

	// Handle interaction end
	function interactEnd(delay: number = 500) {
		setTimeout(function () {
			const snapStiff = 0.01;
			const snapDamp = 0.06;
			interacting = false;

			springRotate.stiffness = snapStiff;
			springRotate.damping = snapDamp;
			springRotate.set({ x: 0, y: 0 }, { soft: 1 });

			springGlare.stiffness = snapStiff;
			springGlare.damping = snapDamp;
			springGlare.set({ x: 50, y: 50, o: 0 }, { soft: 1 });

			springBackground.stiffness = snapStiff;
			springBackground.damping = snapDamp;
			springBackground.set({ x: 50, y: 50 }, { soft: 1 });
		}, delay);
	}

	// Activate/expand card
	function activate() {
		// Skip activation if popover is disabled
		if (!enablePopover) return;

		if (activeCard.get() && activeCard.get() === thisCard) {
			activeCard.clear();
		} else {
			activeCard.set(thisCard);
			resetBaseOrientation();
		}
	}

	// Deactivate card
	function deactivate() {
		interactEnd(0);
		activeCard.clear();
	}

	// Reposition card on scroll
	function reposition() {
		clearTimeout(repositionTimer);
		repositionTimer = setTimeout(() => {
			if (activeCard.get() && activeCard.get() === thisCard) {
				setCenter();
			}
		}, 300) as unknown as number;
	}

	// Center card in viewport
	function setCenter() {
		if (!thisCard) return;
		const rect = thisCard.getBoundingClientRect();
		const view = document.documentElement;

		const delta = {
			x: round(view.clientWidth / 2 - rect.x - rect.width / 2),
			y: round(view.clientHeight / 2 - rect.y - rect.height / 2)
		};

		springTranslate.set({
			x: delta.x,
			y: delta.y
		});
	}

	// Popover (expand) animation
	function popover() {
		if (!thisCard) return;
		const rect = thisCard.getBoundingClientRect();
		let delay = 100;
		let scaleW = (window.innerWidth / rect.width) * 0.9;
		let scaleH = (window.innerHeight / rect.height) * 0.9;
		let scaleF = 1.75;

		setCenter();

		if (firstPop) {
			delay = 1000;
			springRotateDelta.set({
				x: 360,
				y: 0
			});
		}

		firstPop = false;
		springScale.set(Math.min(scaleW, scaleH, scaleF));
		interactEnd(delay);
	}

	// Retreat (collapse) animation
	function retreat() {
		springScale.set(1, { soft: true });
		springTranslate.set({ x: 0, y: 0 }, { soft: true });
		springRotateDelta.set({ x: 0, y: 0 }, { soft: true });
		interactEnd(100);
	}

	// Reset all springs
	function reset() {
		interactEnd(0);
		springScale.set(1, { hard: true });
		springTranslate.set({ x: 0, y: 0 }, { hard: true });
		springRotateDelta.set({ x: 0, y: 0 }, { hard: true });
		springRotate.set({ x: 0, y: 0 }, { hard: true });
	}

	// Handle gyroscope orientation
	function orientate(e: { absolute: { alpha: number; beta: number; gamma: number }; relative: { alpha: number; beta: number; gamma: number } }) {
		const x = e.relative.gamma;
		const y = e.relative.beta;
		const limit = { x: 16, y: 18 };

		const degrees = {
			x: clamp(x, -limit.x, limit.x),
			y: clamp(y, -limit.y, limit.y)
		};

		updateSprings(
			{
				x: adjust(degrees.x, -limit.x, limit.x, 37, 63),
				y: adjust(degrees.y, -limit.y, limit.y, 33, 67)
			},
			{
				x: round(degrees.x * -1),
				y: round(degrees.y)
			},
			{
				x: adjust(degrees.x, -limit.x, limit.x, 0, 100),
				y: adjust(degrees.y, -limit.y, limit.y, 0, 100),
				o: 1
			}
		);
	}


	// Watch for active card changes
	$effect(() => {
		if (activeCard.get() && activeCard.get() === thisCard) {
			popover();
			active = true;
		} else {
			retreat();
			active = false;
		}
	});

	// Watch for orientation changes
	$effect(() => {
		if (enableGyroscope && activeCard.get() && activeCard.get() === thisCard) {
			interacting = true;
			orientate(orientation.get());
		}
	});

	// Handle visibility changes
	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', () => {
			isVisible = document.visibilityState === 'visible';
			endShowcase();
			reset();
		});
	}

	// Computed styles
	const staticStyles = $derived(`
		--seedx: ${randomSeed.x};
		--seedy: ${randomSeed.y};
		--cosmosbg: ${cosmosPosition.x}px ${cosmosPosition.y}px;
	`);

	const dynamicStyles = $derived(`
		--pointer-x: ${$springGlare.x}%;
		--pointer-y: ${$springGlare.y}%;
		--pointer-from-center: ${clamp(
			Math.sqrt(
				($springGlare.y - 50) * ($springGlare.y - 50) + ($springGlare.x - 50) * ($springGlare.x - 50)
			) / 50,
			0,
			1
		)};
		--pointer-from-top: ${$springGlare.y / 100};
		--pointer-from-left: ${$springGlare.x / 100};
		--card-opacity: ${$springGlare.o};
		--rotate-x: ${$springRotate.x + $springRotateDelta.x}deg;
		--rotate-y: ${$springRotate.y + $springRotateDelta.y}deg;
		--background-x: ${$springBackground.x}%;
		--background-y: ${$springBackground.y}%;
		--card-scale: ${$springScale};
		--translate-x: ${$springTranslate.x}px;
		--translate-y: ${$springTranslate.y}px;
	`);

	// Showcase animation on mount
	onMount(() => {
		if (showcase && isVisible) {
			startShowcase(2000); // Start with 2 second delay
		}

		// Cleanup
		return () => {
			endShowcase();
		};
	});
</script>

<svelte:window onscroll={reposition} />

<div
	class="holo-card interactive"
	class:active
	class:interacting
	class:show-back={showBack}
	data-rarity={enableHoloEffect ? card.rarity || 'common' : 'none'}
	style={dynamicStyles}
	bind:this={thisCard}
>
	<div class="holo-card__translater">
		<button
			class="holo-card__rotator"
			onclick={activate}
			onpointermove={interact}
			onmouseout={() => interactEnd(500)}
			onblur={deactivate}
			aria-label="Expand the VIP Card: {card.name}"
			tabindex="0"
		>
			<!-- Card Back -->
			<img
				class="holo-card__back"
				src="/images/vip-cards/bonus1@0.5x.jpg"
				alt="VIP Card Back"
				loading="lazy"
				width="660"
				height="921"
			/>

			<!-- Card Front -->
			<div class="holo-card__front" style={staticStyles}>
				<img
					src={card.imagePath}
					alt={card.name}
					loading="lazy"
					width="660"
					height="921"
				/>
				<div class="holo-card__shine"></div>
				<div class="holo-card__glare"></div>
			</div>
		</button>

		<!-- Count Badge (follows card transform but maintains size) -->
		{#if count > 1}
			<div class="holo-card__badge-wrapper">
				<div class="holo-card__badge">×{count}</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:root {
		--pointer-x: 50%;
		--pointer-y: 50%;
		--card-scale: 1;
		--card-opacity: 0;
		--translate-x: 0px;
		--translate-y: 0px;
		--rotate-x: 0deg;
		--rotate-y: 0deg;
		--background-x: var(--pointer-x);
		--background-y: var(--pointer-y);
		--pointer-from-center: 0;
		--pointer-from-top: var(--pointer-from-center);
		--pointer-from-left: var(--pointer-from-center);
	}

	.holo-card__badge-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		transform: rotateY(var(--rotate-x)) rotateX(var(--rotate-y));
		transform-style: preserve-3d;
	}

	.holo-card__badge {
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 6px 12px;
		border-radius: 12px;
		font-weight: bold;
		font-size: 16px;
		line-height: 1;
		z-index: 10;
		pointer-events: none;
		transform: translateZ(2px) scale(calc(1 / var(--card-scale)));
		transform-origin: top right;
		backface-visibility: hidden;
	}

	/* Make VIP card images fill the entire card area */
	.holo-card__front img,
	.holo-card__back {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}

	/* Add transition for smooth flipping, but disable during interaction */
	.holo-card__rotator {
		transition: transform 0.6s ease-in-out;
	}

	/* Disable transition when interacting for smooth 3D tracking */
	.holo-card.interacting .holo-card__rotator,
	.holo-card.active .holo-card__rotator {
		transition: none;
	}

	/* Flip card to show back when showBack is true */
	.holo-card.show-back .holo-card__rotator {
		transform: rotateY(180deg) rotateX(var(--rotate-y));
	}
</style>
