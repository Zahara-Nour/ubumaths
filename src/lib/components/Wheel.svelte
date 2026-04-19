<!--
	@component Wheel - Wheel of Fortune Component

	A customizable spinning wheel component for randomly selecting students.

	FEATURES:
	- Smooth spinning animation with ease-out easing (4 seconds)
	- Confetti celebration on winner selection (3 seconds, dual-origin)
	- Optional gidouille rewards integration
	- Customizable colors and wheel size
	- Automatic text color contrast (white on pink, dark on blue)
	- Continuous spinning from current position (no reset needed)
	- Winner display below the wheel with primary color styling
	- Single "Lancer la roue" button (no separate "Recommencer")
	- Svelte 5 with runes and reactive state management

	WHEEL DESIGN:
	- Alternating pink (#e7c9de) and blue (#3a507e) slices
	- Blue-gray outer ring with drop shadow
	- Yellow decorative dots around perimeter (3 per slice)
	- Yellow-stroked center circle
	- Gradient orange-yellow pointer/marker at top
	- Blur animation during spinning
	- SVG-based with GPU acceleration

	WINNER CALCULATION:
	The wheel uses the formula: `Math.floor((angle * studentCount) / 360)`
	- Accounts for the wheel's -90deg initial rotation
	- Works on first spin and all subsequent spins
	- Calculates based on final normalized angle (0-360)
	- Pointer at top naturally aligns with correct slice

	USAGE IN MODALS:
	When used inside a modal, set `confettiZIndex={100}` to ensure confetti
	appears above the modal overlay (which typically uses z-50).

	@example Basic usage
	```svelte
	<Wheel
		students={[
			{ id: '1', firstname: 'Alice' },
			{ id: '2', firstname: 'Bob' }
		]}
		onWinner={(student) => console.log('Winner:', student.firstname)}
	/>
	```

	@example With gidouille rewards
	```svelte
	<Wheel
		students={myStudents}
		gidouilleReward={10}
		onRewardGiven={async (id, amount) => {
			await fetch('/api/teacher/rewards/update-student', {
				method: 'POST',
				body: JSON.stringify({ studentId: id, classId, delta: amount })
			});
		}}
	/>
	```

	@example In a modal with custom colors
	```svelte
	<Dialog.Root>
		<Dialog.Content>
			<Wheel
				students={myStudents}
				primaryColor="#ff6b9d"
				secondaryColor="#1a1a1a"
				confettiZIndex={100}
			/>
		</Dialog.Content>
	</Dialog.Root>
	```
-->
<script lang="ts">
	import confetti from 'canvas-confetti';

	/**
	 * Student interface for wheel participants
	 */
	interface Student {
		id: string; // Unique identifier (used for rewards)
		firstname: string; // Display name on wheel and winner card
		lastname?: string; // Optional (not currently displayed)
		avatar_url?: string; // Optional (not currently displayed)
	}

	/**
	 * Component props with extensive customization options
	 */
	interface Props {
		// ============================================================
		// REQUIRED
		// ============================================================

		/** Array of students to display on the wheel (minimum 2 recommended) */
		students: Student[];

		// ============================================================
		// VISUAL CUSTOMIZATION
		// ============================================================

		/** Wheel radius in em units (default: 18) - affects overall size */
		wheelRadius?: number;

		/** Primary color for alternating slices (default: '#e7c9de' pink) */
		primaryColor?: string;

		/** Secondary color for alternating slices (default: '#3a507e' dark blue) */
		secondaryColor?: string;

		/** Accent color for outer ring and center circle (default: '#788bb2' gray-blue) */
		accentColor?: string;

		// ============================================================
		// BEHAVIOR
		// ============================================================

		/** Add a "Joker" slice if student count is odd (default: false) */
		addJokerIfOdd?: boolean;

		/** Spin animation duration in seconds (default: 4) */
		spinDuration?: number;

		/** Show confetti celebration on winner selection (default: true) */
		showConfetti?: boolean;

		/**
		 * Z-index for confetti particles (default: 0)
		 * Set to 100+ when used inside modals to appear above overlay
		 */
		confettiZIndex?: number;

		// ============================================================
		// REWARDS INTEGRATION
		// ============================================================

		/**
		 * Optional: Amount of gidouilles to award to winner
		 * If set, displays "+X gidouilles" below winner name
		 */
		gidouilleReward?: number;

		/**
		 * Optional: Async callback to handle gidouille reward distribution
		 * Called after winner is selected if gidouilleReward is set
		 */
		onRewardGiven?: (studentId: string, amount: number) => Promise<void>;

		// ============================================================
		// EVENT CALLBACKS
		// ============================================================

		/** Called when a winner is selected (after spin completes) */
		onWinner?: (student: Student) => void;

		/** Called when the winner's name is clicked on the wheel */
		onWinnerClick?: (student: Student) => void;

		/** Called when spin animation starts */
		onSpinStart?: () => void;

		/** Called when spin animation ends */
		onSpinEnd?: () => void;
	}

	let {
		students,
		wheelRadius = 18,
		primaryColor = '#e7c9de',
		secondaryColor = '#3a507e',
		accentColor = '#788bb2',
		addJokerIfOdd = false,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		spinDuration = 4, // Prop defined but duration is hardcoded in CSS (4s)
		showConfetti = true,
		confettiZIndex = 0,
		gidouilleReward,
		onRewardGiven,
		onWinner,
		onWinnerClick,
		onSpinStart,
		onSpinEnd
	}: Props = $props();

	// ================================================================
	// REACTIVE STATE
	// ================================================================

	/** Whether the wheel is currently spinning (prevents multiple spins) */
	let isSpinning = $state(false);

	/** Whether the wheel has been spun at least once (for winner display) */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let hasSpun = $state(false);

	/** Currently selected student (winner) */
	let selectedStudent = $state<Student | null>(null);

	/** Index of the winning slice for on-wheel highlighting */
	let highlightedIndex = $state<number | null>(null);

	/**
	 * Current rotation angle in degrees
	 * Accumulates with each spin (e.g., 0 -> 3240 -> 6480)
	 * Gets normalized to 0-360 after each spin completes
	 */
	let angle = $state(0);

	/** Reference to the SVG wheel element for animation control */
	let wheelElement = $state<SVGSVGElement | null>(null);

	// ================================================================
	// DERIVED STATE
	// ================================================================

	/**
	 * Array of student names to display on the wheel
	 * Optionally adds "Joker" if odd number of students
	 */
	let wheelData = $derived(() => {
		// Group students by firstname to detect duplicates
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const firstnameGroups = new Map<string, number[]>();
		for (let i = 0; i < students.length; i++) {
			const key = students[i].firstname;
			const group = firstnameGroups.get(key);
			if (group) {
				group.push(i);
			} else {
				firstnameGroups.set(key, [i]);
			}
		}

		const names = students.map((s, i) => {
			const group = firstnameGroups.get(s.firstname)!;
			if (group.length === 1) return s.firstname;

			// Find minimum lastname prefix to disambiguate
			const lastname = s.lastname || '';
			const others = group.filter((j) => j !== i).map((j) => students[j].lastname || '');

			let len = 1;
			const maxLen = Math.max(lastname.length, ...others.map((o) => o.length));
			while (len <= maxLen) {
				const prefix = lastname.slice(0, len).toLowerCase();
				const unique = others.every((o) => o.slice(0, len).toLowerCase() !== prefix);
				if (unique) break;
				len++;
			}

			if (!lastname) return s.firstname;
			return `${s.firstname} ${lastname.slice(0, len)}.`;
		});

		// Add joker to balance odd numbers (prevents asymmetric wheel)
		if (addJokerIfOdd && names.length % 2 !== 0) {
			names.push('Joker');
		}

		return names;
	});

	/** Angle in degrees per slice (e.g., 45° for 8 students) */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let sliceAngle = $derived(360 / wheelData().length);

	/**
	 * Angle in radians per slice (used for stroke-dasharray calculation)
	 * The SVG stroke-dasharray technique creates alternating colored slices
	 */
	let pieceAngle = $derived((2 * Math.PI) / wheelData().length);

	// ================================================================
	// HELPER FUNCTIONS
	// ================================================================

	/**
	 * Get slice background color based on index
	 * Currently returns same colors for all slices (not used)
	 * Kept for potential future customization per slice
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const getSliceColor = (index: number): string => {
		const colors = [primaryColor, secondaryColor, accentColor];
		return colors[index % colors.length];
	};

	/**
	 * Determine text color for optimal contrast
	 * - Pink slices (index % 2 === 0): White text
	 * - Blue slices (index % 2 === 1): Dark text
	 *
	 * This ensures readability on both light and dark backgrounds
	 */
	const getTextColor = (index: number): string => {
		return index % 2 === 0 ? 'white' : '#1a1a1a';
	};

	// ================================================================
	// CORE FUNCTIONS
	// ================================================================

	/**
	 * Spin the wheel to randomly select a student
	 *
	 * ALGORITHM:
	 * 1. Clear previous winner state
	 * 2. Generate random target angle (avoiding slice boundaries)
	 * 3. Rotate 9 full times + random angle from current position
	 * 4. When animation completes, calculate winner based on final angle
	 * 5. Display winner, show confetti, award gidouilles (if configured)
	 *
	 * WINNER CALCULATION:
	 * Uses the formula: Math.floor((angle * studentCount) / 360)
	 * - Works with the wheel's -90deg initial rotation offset
	 * - Accurately determines which slice the top pointer indicates
	 * - Tested and proven formula from original implementation
	 *
	 * CONTINUOUS SPINNING:
	 * The wheel continues from its current position, so subsequent spins
	 * build on previous rotations (e.g., 0° -> 3240° -> 6480°)
	 * The angle is normalized after each spin completes
	 */
	const spin = () => {
		// Guard: Prevent spinning if already spinning or no students
		if (isSpinning || students.length === 0) return;

		// Reset winner state for new spin
		hasSpun = false;
		selectedStudent = null;
		highlightedIndex = null;

		// Notify that spin is starting
		onSpinStart?.();

		/**
		 * Calculate random landing angle
		 * Ensures we don't land exactly on a slice boundary (causes ambiguity)
		 * Minimum 2° away from boundaries for clear winner determination
		 */
		let randomAngle;
		const sliceSize = Math.floor(360 / wheelData().length);
		do {
			randomAngle = Math.floor(Math.random() * 360) + 1;
		} while (randomAngle % sliceSize < 2); // Avoid boundary ±2°

		/**
		 * Calculate total rotation
		 * 9 full rotations (3240°) + random angle ensures dramatic spin
		 * Starts from current angle for continuous spinning effect
		 */
		const totalRotation = angle + 360 * 9 + randomAngle;
		angle = totalRotation;

		// Mark as spinning (disables button, shows "Tourne..." text)
		isSpinning = true;

		/**
		 * Handle when spin animation completes
		 * The CSS transition ends after 4 seconds (default spinDuration)
		 */
		const handleTransitionEnd = (e: TransitionEvent) => {
			// Ignore transitions from child elements (text highlights)
			if (e.target !== wheelElement) return;
			isSpinning = false;
			hasSpun = true;

			// Normalize angle to 0-360 range for next spin
			const normalizedAngle = angle % 360;
			angle = normalizedAngle;

			/**
			 * WINNER CALCULATION - CRITICAL SECTION
			 *
			 * Formula: Math.floor((angle * studentCount) / 360)
			 *
			 * Why this works:
			 * - The wheel SVG has transform: rotate(-{angle + 90}deg)
			 * - This -90deg offset aligns the first slice with the top pointer
			 * - As the wheel rotates, this formula correctly maps the final
			 *   angle to the student index under the pointer
			 * - Works on first spin (angle 0-360) and all subsequent spins
			 *
			 * Example with 8 students (45° per slice):
			 * - angle = 0°   -> index = 0 (first student)
			 * - angle = 45°  -> index = 1 (second student)
			 * - angle = 90°  -> index = 2 (third student)
			 * - angle = 270° -> index = 6 (seventh student)
			 */
			const winIdx = Math.floor((normalizedAngle * wheelData().length) / 360);
			const winner = students[winIdx];

			if (winner) {
				selectedStudent = winner;
				highlightedIndex = winIdx;

				// Celebrate with confetti (if enabled)
				if (showConfetti) {
					fireConfetti();
				}

				// Award gidouilles (if configured)
				if (gidouilleReward && gidouilleReward > 0 && onRewardGiven) {
					onRewardGiven(winner.id, gidouilleReward);
				}

				// Notify parent component of winner
				onWinner?.(winner);
			}

			// Notify that spin has ended
			onSpinEnd?.();

			// Clean up event listener
			wheelElement?.removeEventListener('transitionend', handleTransitionEnd);
		};

		// Listen for animation completion
		wheelElement?.addEventListener('transitionend', handleTransitionEnd);
	};

	/**
	 * Fire confetti celebration animation
	 *
	 * ANIMATION DETAILS:
	 * - Duration: 3 seconds
	 * - Dual origin: Left (10-30%) and right (70-90%) of screen
	 * - Particle count: Decreases over time (starts at 50, fades to 0)
	 * - Fires every 250ms for smooth continuous effect
	 * - Uses configurable z-index (important for modals)
	 *
	 * CONFETTI CONFIGURATION:
	 * - startVelocity: 30 (moderate upward speed)
	 * - spread: 360 (full circular spread)
	 * - ticks: 60 (particle lifetime)
	 * - origin.y: Slightly above viewport (Math.random() - 0.2)
	 *
	 * Note: Uses canvas-confetti library
	 */
	const fireConfetti = () => {
		const duration = 3000; // 3 seconds total
		const animationEnd = Date.now() + duration;
		const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: confettiZIndex };

		// Helper to generate random number in range
		const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

		// Fire confetti particles every 250ms
		const interval = setInterval(() => {
			const timeLeft = animationEnd - Date.now();

			// Stop when duration expires
			if (timeLeft <= 0) {
				clearInterval(interval);
				return;
			}

			// Decrease particle count over time for fade-out effect
			const particleCount = 50 * (timeLeft / duration);

			// Left side confetti burst
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
			});

			// Right side confetti burst
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
			});
		}, 250);
	};

	/**
	 * Reset wheel to initial state
	 * Currently unused (kept for potential future use)
	 * Note: The wheel now spins continuously without needing reset
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const reset = () => {
		angle = 0;
		hasSpun = false;
		selectedStudent = null;
		highlightedIndex = null;
	};
</script>

<div class="flex flex-col items-center gap-6">
	<!-- Wheel Container -->
	<div class="relative inline-block">
		<!-- SVG Wheel -->
		<svg
			bind:this={wheelElement}
			class="transition-all duration-300"
			class:blur-wheel={isSpinning}
			height="{2 * wheelRadius + 3}em"
			width="{2 * wheelRadius + 3}em"
			style="transform: rotate(-{angle + 90}deg); transition: {isSpinning
				? 'all 4s ease-out'
				: 'none'};"
		>
			<!-- Filters for shadows and winner glow -->
			<defs>
				<filter id="shadow">
					<feDropShadow dx="0" dy="0" stdDeviation="10" />
				</filter>
				<filter id="shadow2">
					<feDropShadow dx="0" dy="0" stdDeviation="5" />
				</filter>
				<filter id="winner-outline">
					<feMorphology in="SourceAlpha" operator="dilate" radius="2" result="expanded" />
					<feFlood flood-color="#1a1a1a" flood-opacity="0.7" result="color" />
					<feComposite in="color" in2="expanded" operator="in" result="outline" />
					<feMerge>
						<feMergeNode in="outline" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			<!-- Base pink circle -->
			<circle r="{wheelRadius}em" cx="50%" cy="50%" fill={primaryColor} />

			<!-- Alternating dark blue slices (using stroke-dasharray trick) -->
			<circle
				r="{wheelRadius / 2}em"
				cx="50%"
				cy="50%"
				fill="transparent"
				stroke={secondaryColor}
				stroke-width="{wheelRadius}em"
				stroke-dasharray="{(pieceAngle * wheelRadius) / 2}em {(pieceAngle * wheelRadius) / 2}em"
			/>

			<!-- Outer blue/gray decorative ring with shadow -->
			<circle
				r="{wheelRadius - 1}em"
				cx="50%"
				cy="50%"
				fill="transparent"
				stroke={accentColor}
				stroke-width="2em"
				filter="url(#shadow)"
			/>

			<!-- Center circle (clickable to spin) -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<g
				onclick={spin}
				class="center-button"
				class:center-disabled={isSpinning || students.length === 0}
				role="button"
				tabindex="-1"
				style="outline: none;"
			>
				<circle r="3em" cx="50%" cy="50%" fill={accentColor} />
				<circle
					r="3em"
					cx="50%"
					cy="50%"
					fill="transparent"
					stroke="#f9ef69"
					stroke-width="0.5em"
					filter="url(#shadow2)"
				/>
			</g>

			<!-- Yellow decorative dots around perimeter -->
			{#each Array(wheelData().length * 3)
				.fill(0)
				.map((_, i) => i) as i (i)}
				<circle
					r="0.1em"
					cx="{2 * wheelRadius + 0.5}em"
					cy="50%"
					fill="#f9ef69"
					stroke="#f9ef69"
					stroke-width="0.5em"
					transform-origin="50% 50%"
					transform="rotate({(i * 360) / (wheelData().length * 3)})"
				/>
			{/each}

			<!-- Student names -->
			{#each wheelData() as name, i (i)}
				<text
					fill={highlightedIndex === i ? '#fbbf24' : getTextColor(i)}
					font-weight="bold"
					font-size="1em"
					opacity={highlightedIndex !== null && highlightedIndex !== i ? 0.25 : 1}
					filter={highlightedIndex === i ? 'url(#winner-outline)' : 'none'}
					stroke={highlightedIndex === i ? '#f59e0b' : 'none'}
					stroke-width={highlightedIndex === i ? '0.3' : '0'}
					x="{(3 / 4) * (2 * wheelRadius + 3)}em"
					y="50%"
					text-anchor="middle"
					dominant-baseline="middle"
					transform-origin="50% 50%"
					transform="rotate({((i + 0.5) * 360) / wheelData().length})"
					class="wheel-text-transition {highlightedIndex === i && onWinnerClick
						? 'winner-clickable'
						: ''}"
					onclick={highlightedIndex === i && onWinnerClick
						? () => onWinnerClick(students[i])
						: undefined}
				>
					{name}
				</text>
			{/each}
		</svg>

		<!-- Marker/Pointer at top -->
		<span class="absolute top-0 left-1/2" style="translate: -50% 0;">
			<svg width="60" height="80" viewBox="0 0 60 80">
				<defs>
					<linearGradient id="markerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" style="stop-color:#f9ef69;stop-opacity:1" />
						<stop offset="100%" style="stop-color:#ff9800;stop-opacity:1" />
					</linearGradient>
				</defs>
				<polygon points="30,80 0,0 60,0" fill="url(#markerGradient)" filter="url(#shadow)" />
			</svg>
		</span>
	</div>

	<!-- Gidouille reward info (winner is highlighted on wheel) -->
	{#if selectedStudent && gidouilleReward && gidouilleReward > 0}
		<p class="text-sm text-muted-foreground">
			{selectedStudent.firstname} : +{gidouilleReward} gidouille{gidouilleReward > 1 ? 's' : ''}
		</p>
	{/if}
</div>

<style>
	.blur-wheel {
		animation: blur 4s;
	}

	@keyframes blur {
		0% {
			filter: blur(0px);
		}
		10% {
			filter: blur(1px);
		}
		90% {
			filter: blur(0px);
		}
		100% {
			filter: blur(0px);
		}
	}

	.wheel-text-transition {
		transition:
			fill 0.5s ease,
			opacity 0.5s ease,
			stroke 0.5s ease;
	}

	.winner-clickable {
		cursor: pointer;
	}

	.center-button {
		cursor: pointer;
	}

	.center-button:hover circle {
		filter: brightness(1.2);
	}

	.center-disabled {
		cursor: not-allowed;
		pointer-events: none;
	}
</style>
