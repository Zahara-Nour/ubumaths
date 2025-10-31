<!--
	VipCardHolo Component
	=====================
	Holographic VIP card with interactive 3D effects
	Migrated from Pokemon cards CSS project to Svelte 5

	Features:
	- Mouse/touch tracking with 3D tilt
	- Click-to-expand popover
	- Gyroscope support on mobile
	- Rarity-based holographic effects (common, rare, epic, legendary)
	- Showcase auto-rotation mode
	- Front/back flip control
	- Description overlay on hover
	- Count badge with counter-scaling
	- Rarity gem indicator with glow effects

	All features are independently configurable via props.

	Props:
	- card: VipCard (required) - The card data to display
	- count: number (default: 1) - Show count badge if > 1
	- showcase: boolean (default: false) - Auto-rotation animation
	- enable3d: boolean (default: true) - 3D mouse/touch tracking
	- enablePopover: boolean (default: true) - Click-to-expand feature
	- enableGyroscope: boolean (default: true) - Mobile gyroscope tilt
	- enableHoloEffect: boolean (default: true) - Holographic shine effect
	- showBack: boolean (default: false) - Show card back instead of front
	- enableDescriptionOverlay: boolean (default: false) - Gradient overlay with description on hover
	- enableRarityIndicator: boolean (default: false) - Gem icon with rarity color/glow
	- autoPopover: boolean (default: false) - Automatically trigger popover animation on mount

	Technical Implementation:
	- Uses Svelte 5 runes ($state, $derived, $effect, $props)
	- Spring-based physics animations for smooth, natural movement
	- CSS 3D transforms with hardware acceleration (translate3d)
	- Counter-scaling technique for badges to maintain size during popover zoom
	- Backface visibility for card flip effects
	- Z-index layering for proper element stacking

	Performance:
	- GPU-accelerated transforms
	- Efficient event handling with debouncing where appropriate
	- Minimal reflows through transform-only animations
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
		enableDescriptionOverlay?: boolean;
		enableRarityIndicator?: boolean;
		autoPopover?: boolean;
	}

	let {
		card,
		count = 1,
		showcase = false,
		enable3d = true,
		enablePopover = true,
		enableGyroscope = true,
		enableHoloEffect = true,
		showBack = false,
		enableDescriptionOverlay = false,
		enableRarityIndicator = false,
		autoPopover = false
	}: Props = $props();

	// ====================
	// Rarity Color System
	// ====================
	// Maps card rarity levels to visual gem colors and glow effects
	// Common cards get a gray gem with no glow
	// Rare/Epic/Legendary get colored gems with CSS drop-shadow glow effects
	const rarityColors = {
		common: { color: '#9ca3af', glow: false }, // Gray, no glow
		rare: { color: '#3b82f6', glow: true }, // Blue with glow
		epic: { color: '#a855f7', glow: true }, // Purple with glow
		legendary: { color: '#f59e0b', glow: true } // Gold/orange with glow
	};

	// Get rarity display info for this card, defaulting to common if rarity not set
	const rarityInfo = card.rarity ? rarityColors[card.rarity] : rarityColors.common;

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
	let isVisible = $state(
		typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
	);

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

	// ====================
	// Spring Animation System
	// ====================
	// Updates all spring values simultaneously for smooth, physics-based animations
	// Springs provide natural-feeling motion with configurable stiffness/damping
	function updateSprings(
		background: { x: number; y: number },
		rotate: { x: number; y: number },
		glare: { x: number; y: number; o: number }
	) {
		// Apply interaction settings (fast, responsive)
		springBackground.stiffness = springInteractSettings.stiffness;
		springBackground.damping = springInteractSettings.damping;
		springRotate.stiffness = springInteractSettings.stiffness;
		springRotate.damping = springInteractSettings.damping;
		springGlare.stiffness = springInteractSettings.stiffness;
		springGlare.damping = springInteractSettings.damping;

		// Set new target values - springs will animate smoothly to these
		springBackground.set(background);
		springRotate.set(rotate);
		springGlare.set(glare);
	}

	// ====================
	// Mouse/Touch Interaction Handler
	// ====================
	// Calculates pointer position and updates 3D rotation + holographic effects
	// Converts screen coordinates to percentages and center-relative values
	function interact(e: PointerEvent) {
		// Skip interaction if both 3D and holo effects are disabled (completely static mode)
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
		let targetScale = Math.min(scaleW, scaleH, scaleF);

		setCenter();

		if (firstPop) {
			delay = 1000;
			springRotateDelta.set({
				x: 360,
				y: 0
			});
		}

		firstPop = false;
		springScale.set(targetScale);
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
	function orientate(e: {
		absolute: { alpha: number; beta: number; gamma: number };
		relative: { alpha: number; beta: number; gamma: number };
	}) {
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

	// Handle visibility changes - wrapped in $effect() to prevent memory leak
	$effect(() => {
		const handleVisibilityChange = () => {
			isVisible = document.visibilityState === 'visible';
			endShowcase();
			reset();
		};

		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', handleVisibilityChange);

			// Cleanup on component unmount
			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			};
		}
	});

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
				($springGlare.y - 50) * ($springGlare.y - 50) +
					($springGlare.x - 50) * ($springGlare.x - 50)
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

	// Auto-popover effect - triggers when prop changes to true
	// This effect runs whenever autoPopover or thisCard changes
	$effect(() => {
		if (autoPopover && thisCard && enablePopover) {
			// Small delay to ensure DOM is ready and card is positioned
			const timer = setTimeout(() => {
				if (thisCard && !activeCard.get()) {
					// Only set if no card is currently active
					activeCard.set(thisCard);
					resetBaseOrientation();
				}
			}, 200);

			return () => clearTimeout(timer);
		}
	});

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
			<!-- Card Back (Luxury Gold Design matching VipCard) -->
			<div class="holo-card__back">
				<div
					class="relative h-full w-full overflow-hidden rounded-[2.5%/1.8%] bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600"
				>
					<!-- Geometric Pattern Overlay -->
					<div
						class="absolute inset-0 opacity-20"
						style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.3) 35px, rgba(255,255,255,.3) 70px);"
					></div>

					<!-- Radial Gradient Shine -->
					<div
						class="absolute inset-0"
						style="background: radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%);"
					></div>

					<!-- Center VIP Logo -->
					<div class="absolute inset-0 flex flex-col items-center justify-center text-white">
						<div class="text-center">
							<div
								class="mb-4 text-8xl font-black tracking-wider"
								style="text-shadow: 2px 2px 8px rgba(0,0,0,0.3);"
							>
								VIP
							</div>
							<div
								class="text-lg font-bold tracking-widest"
								style="text-shadow: 1px 1px 4px rgba(0,0,0,0.3);"
							>
								CARTE PRIVILÈGE
							</div>
							<div class="mx-auto mt-6 h-1.5 w-24 rounded-full bg-white/50"></div>
						</div>
					</div>

					<!-- Corner Decorations -->
					<div
						class="absolute top-6 left-6 h-12 w-12 rounded-tl-lg border-t-2 border-l-2 border-white/60"
					></div>
					<div
						class="absolute top-6 right-6 h-12 w-12 rounded-tr-lg border-t-2 border-r-2 border-white/60"
					></div>
					<div
						class="absolute bottom-6 left-6 h-12 w-12 rounded-bl-lg border-b-2 border-l-2 border-white/60"
					></div>
					<div
						class="absolute right-6 bottom-6 h-12 w-12 rounded-br-lg border-r-2 border-b-2 border-white/60"
					></div>
				</div>
			</div>

			<!-- Card Front -->
			<div class="holo-card__front" style={staticStyles}>
				<img src={card.imagePath} alt={card.name} loading="lazy" width="660" height="921" />
				<div class="holo-card__shine"></div>
				<div class="holo-card__glare"></div>

				<!-- Description Overlay (optional, shown on hover) -->
				{#if enableDescriptionOverlay}
					<div class="holo-card__description-overlay">
						<div class="holo-card__description-content">
							<h3 class="holo-card__description-title">{card.name}</h3>
						</div>
						<div class="holo-card__description-content">
							<p class="holo-card__description-text">{card.description}</p>
						</div>
					</div>
				{/if}
			</div>
		</button>

		<!-- Count Badge (follows card transform but maintains size) -->
		{#if count > 1}
			<div class="holo-card__badge-wrapper">
				<div class="holo-card__badge">×{count}</div>
			</div>
		{/if}

		<!-- Rarity Indicator (follows card transform but maintains size) -->
		{#if enableRarityIndicator && card.rarity}
			<div class="holo-card__rarity-wrapper">
				<div class="holo-card__rarity-badge" class:glow={rarityInfo.glow}>
					<svg
						class="holo-card__rarity-gem"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						style="color: {rarityInfo.color}"
					>
						<path
							d="M12 2L4 8L2 12L12 22L22 12L20 8L12 2Z"
							fill="currentColor"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linejoin="round"
						/>
						<path d="M12 2L8 8H16L12 2Z" fill="white" opacity="0.3" />
						<path d="M4 8L8 8L12 22L4 8Z" fill="black" opacity="0.2" />
						<path d="M20 8L16 8L12 22L20 8Z" fill="black" opacity="0.2" />
					</svg>
				</div>
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

	/* Rarity Indicator */
	.holo-card__rarity-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		transform: rotateY(var(--rotate-x)) rotateX(var(--rotate-y));
		transform-style: preserve-3d;
	}

	.holo-card__rarity-badge {
		position: absolute;
		top: 10px;
		left: 10px;
		width: 32px;
		height: 32px;
		z-index: 10;
		pointer-events: none;
		transform: translateZ(2px) scale(calc(1 / var(--card-scale)));
		transform-origin: top left;
		backface-visibility: hidden;
	}

	.holo-card__rarity-badge.glow {
		filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 10px currentColor);
	}

	.holo-card__rarity-gem {
		width: 100%;
		height: 100%;
		display: block;
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

	/* Description Overlay */
	.holo-card__description-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.85) 0%,
			transparent 25%,
			transparent 75%,
			rgba(0, 0, 0, 0.92) 100%
		);
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
		z-index: 5;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 20px;
		transform: translateZ(1.5px);
	}

	.holo-card__rotator:hover .holo-card__description-overlay {
		opacity: 1;
	}

	.holo-card__description-content {
		width: 100%;
		color: white;
		text-align: center;
	}

	.holo-card__description-title {
		font-size: 1.5em;
		font-weight: bold;
		margin: 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
	}

	.holo-card__description-text {
		font-size: 1.1em;
		margin: 0;
		line-height: 1.4;
		text-shadow:
			0 0 8px rgba(0, 0, 0, 1),
			0 0 12px rgba(0, 0, 0, 0.9),
			2px 2px 4px rgba(0, 0, 0, 0.9),
			-1px -1px 3px rgba(0, 0, 0, 0.8);
	}
</style>
