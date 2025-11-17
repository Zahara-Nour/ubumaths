<!--
	DiceScene3D Component

	Main 3D scene with physics-enabled dice rolling.
	Uses Threlte and Rapier for realistic physics simulation.
-->
<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { World, RigidBody, AutoColliders } from '@threlte/rapier';
	import type { DiceConfig, DiceRollResult, SingleDiceResult, PhysicsConfig } from './types';
	import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
	import { getStyleConfig } from './styles';
	import { detectTopFace } from './utils/dice-geometry';
	import { browser } from '$app/environment';
	import type { Vector3Tuple } from 'three';

	// Dice model imports
	import D4 from './models/D4.svelte';
	import D6 from './models/D6.svelte';
	import D8 from './models/D8.svelte';
	import D10 from './models/D10.svelte';
	import D12 from './models/D12.svelte';
	import D20 from './models/D20.svelte';

	// Props
	let {
		config = [],
		onRollStart,
		onRollComplete,
		physics: _physics,
		duration: _duration = 2500
	}: {
		config?: DiceConfig[];
		onRollStart?: () => void;
		onRollComplete?: (result: DiceRollResult[]) => void;
		physics?: Partial<PhysicsConfig>;
		duration?: number;
	} = $props();

	// State
	let isRolling = $state(false);
	let rollTrigger = $state(0); // Increments on each roll to trigger animation
	let diceRefs = $state.raw<(RapierRigidBody | undefined)[]>([]); // Use .raw() for 3D objects
	let settlingCheckInterval: ReturnType<typeof setInterval> | undefined = $state(undefined);
	let rollStartTime = $state(0); // Track roll start for timeout fallback

	// Dice components map
	const diceComponents = {
		d4: D4,
		d6: D6,
		d8: D8,
		d10: D10,
		d12: D12,
		d20: D20
	};

	// Helper: Apply quaternion rotation to a vector
	function applyQuaternionToVector(
		vec: Vector3Tuple,
		quat: { x: number; y: number; z: number; w: number }
	): Vector3Tuple {
		const [vx, vy, vz] = vec;
		const { x: qx, y: qy, z: qz, w: qw } = quat;

		// Quaternion multiplication: q * v * q^-1
		const ix = qw * vx + qy * vz - qz * vy;
		const iy = qw * vy + qz * vx - qx * vz;
		const iz = qw * vz + qx * vy - qy * vx;
		const iw = -qx * vx - qy * vy - qz * vz;

		return [
			ix * qw + iw * -qx + iy * -qz - iz * -qy,
			iy * qw + iw * -qy + iz * -qx - ix * -qz,
			iz * qw + iw * -qz + ix * -qy - iy * -qx
		];
	}

	// Helper: Complete the roll and read results
	function completeRoll() {
		// Clear interval
		if (settlingCheckInterval) {
			clearInterval(settlingCheckInterval);
			settlingCheckInterval = undefined;
		}

		// Read results
		readResults();
	}

	// Helper: Check if all dice have settled (velocity near zero)
	function checkSettling() {
		if (!isRolling) return;

		// Fallback: Force completion after maximum duration (prevents infinite waiting)
		const elapsed = Date.now() - rollStartTime;
		const MAX_ROLL_DURATION = 5000; // 5 seconds

		if (elapsed > MAX_ROLL_DURATION) {
			console.warn('Dice roll exceeded maximum duration, forcing completion');
			completeRoll();
			return;
		}

		let allSettled = true;

		for (const ref of diceRefs) {
			if (!ref) continue;

			const linvel = ref.linvel();
			const angvel = ref.angvel();

			const linearSpeed = Math.sqrt(linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2);
			const angularSpeed = Math.sqrt(angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2);

			// Thresholds for "settled" (lowered to 0.05 for more accurate detection)
			if (linearSpeed > 0.05 || angularSpeed > 0.05) {
				allSettled = false;
				break;
			}
		}

		if (allSettled) {
			completeRoll();
		}
	}

	// Helper: Read dice results after settling
	function readResults() {
		const results: DiceRollResult[] = [];
		let refIndex = 0;

		// Group results by dice type
		for (const diceConfig of config) {
			const count = diceConfig.count ?? 1;
			const diceResults: SingleDiceResult[] = [];
			let total = 0;

			for (let i = 0; i < count; i++) {
				const ref = diceRefs[refIndex];
				refIndex++;

				if (!ref) continue;

				// Get rotation (quaternion)
				const rotation = ref.rotation();

				// Apply INVERSE rotation to world "up" vector [0, 1, 0] to get it in dice local space
				// We need the conjugate (inverse) of the quaternion
				const rotationInverse = {
					x: -rotation.x,
					y: -rotation.y,
					z: -rotation.z,
					w: rotation.w
				};
				const upVector = applyQuaternionToVector([0, 1, 0], rotationInverse);

				// Detect which face is on top
				const faceValue = detectTopFace(diceConfig.type, upVector);

				diceResults.push({
					type: diceConfig.type,
					value: faceValue,
					id: `${diceConfig.type}-${Date.now()}-${i}`
				});
				total += faceValue;
			}

			results.push({
				dice: diceConfig.type,
				results: diceResults,
				total,
				timestamp: Date.now()
			});
		}

		isRolling = false;

		// Call complete callback
		if (onRollComplete) {
			onRollComplete(results);
		}
	}

	/**
	 * Roll the dice with physics simulation
	 */
	export function roll() {
		if (isRolling) return;

		isRolling = true;
		rollStartTime = Date.now(); // Track start time for timeout fallback
		rollTrigger++; // Trigger re-render to reset positions

		console.log('[DiceScene3D] Starting roll, config:', config);
		console.log(
			'[DiceScene3D] Total dice:',
			config.reduce((sum, c) => sum + (c.count ?? 1), 0)
		);

		// Call start callback
		if (onRollStart) {
			onRollStart();
		}

		// After render, apply physics forces
		setTimeout(() => {
			console.log('[DiceScene3D] Applying physics, diceRefs count:', diceRefs.length);
			console.log(
				'[DiceScene3D] DiceRefs populated:',
				diceRefs.filter((r) => r !== undefined).length
			);

			diceRefs.forEach((ref, index) => {
				if (!ref) {
					console.warn('[DiceScene3D] Missing rigidBody ref at index:', index);
					return;
				}

				// Calculate position spread
				const totalDice = config.reduce((sum, c) => sum + (c.count ?? 1), 0);
				const spacing = 6;
				const xOffset = (index - totalDice / 2) * spacing;

				// Set initial position (high above table)
				ref.setTranslation(
					{
						x: xOffset + (Math.random() - 0.5) * 1,
						y: 5 + Math.random() * 2,
						z: (Math.random() - 0.5) * 1
					},
					true
				);

				// Set random rotation
				ref.setRotation(
					{
						x: Math.random(),
						y: Math.random(),
						z: Math.random(),
						w: Math.random()
					},
					true
				);

				// Apply random throw velocity with realistic parabolic trajectory
				ref.setLinvel(
					{
						x: (Math.random() - 0.5) * 4, // Horizontal dispersion
						y: Math.random() * 2, // Upward lift for parabolic arc
						z: (Math.random() - 0.5) * 4 // Horizontal dispersion
					},
					true
				);

				// Apply random spin
				ref.setAngvel(
					{
						x: (Math.random() - 0.5) * 10,
						y: (Math.random() - 0.5) * 10,
						z: (Math.random() - 0.5) * 10
					},
					true
				);
			});

			// Start checking for settling every 100ms
			settlingCheckInterval = setInterval(checkSettling, 100);
		}, 50);
	}
</script>

{#if browser}
	<div class="scene-container h-full w-full">
		<Canvas size={{ width: '100%', height: 400 }}>
			<!-- Camera -->
			<T.PerspectiveCamera makeDefault position={[0, 8, 12]} fov={50}>
				<OrbitControls target={[0, 0, 0]} enableDamping />
			</T.PerspectiveCamera>

			<!-- Lighting -->
			<T.DirectionalLight position={[10, 10, 10]} intensity={2} castShadow />
			<T.DirectionalLight position={[-10, 10, -10]} intensity={1} />
			<T.DirectionalLight position={[0, 10, 0]} intensity={1.5} />
			<T.AmbientLight intensity={0.8} />

			<!-- Physics World -->
			<World gravity={[0, -9.81, 0]}>
				<!-- Static Floor/Table (RigidBody with fixed type) -->
				<RigidBody type="fixed">
					<AutoColliders shape="cuboid" restitution={0.3} friction={0.8}>
						<T.Mesh position={[0, -0.5, 0]} receiveShadow>
							<T.BoxGeometry args={[20, 1, 20]} />
							<T.MeshStandardMaterial color="#2a2a2a" roughness={0.8} />
						</T.Mesh>
					</AutoColliders>
				</RigidBody>

				<!-- Invisible Walls (prevent dice from falling off) -->
				<!-- North Wall (Z+) -->
				<RigidBody type="fixed" position={[0, 2.5, 10]}>
					<AutoColliders shape="cuboid" restitution={0.5} friction={0.5}>
						<T.Mesh visible={false}>
							<T.BoxGeometry args={[20, 5, 0.5]} />
						</T.Mesh>
					</AutoColliders>
				</RigidBody>

				<!-- South Wall (Z-) -->
				<RigidBody type="fixed" position={[0, 2.5, -10]}>
					<AutoColliders shape="cuboid" restitution={0.5} friction={0.5}>
						<T.Mesh visible={false}>
							<T.BoxGeometry args={[20, 5, 0.5]} />
						</T.Mesh>
					</AutoColliders>
				</RigidBody>

				<!-- East Wall (X+) -->
				<RigidBody type="fixed" position={[10, 2.5, 0]}>
					<AutoColliders shape="cuboid" restitution={0.5} friction={0.5}>
						<T.Mesh visible={false}>
							<T.BoxGeometry args={[0.5, 5, 20]} />
						</T.Mesh>
					</AutoColliders>
				</RigidBody>

				<!-- West Wall (X-) -->
				<RigidBody type="fixed" position={[-10, 2.5, 0]}>
					<AutoColliders shape="cuboid" restitution={0.5} friction={0.5}>
						<T.Mesh visible={false}>
							<T.BoxGeometry args={[0.5, 5, 20]} />
						</T.Mesh>
					</AutoColliders>
				</RigidBody>

				<!-- Dice -->
				{#each config as diceConfig, index (`${diceConfig.type}-${index}`)}
					{@const DiceComponent = diceComponents[diceConfig.type]}
					{@const style = getStyleConfig(diceConfig.style ?? 'classic')}
					{@const count = diceConfig.count ?? 1}

					{#each Array(count) as _, diceIndex (`${diceConfig.type}-${index}-${diceIndex}-${rollTrigger}`)}
						{@const spacing = 3}
						{@const totalDice = config.reduce((sum, c) => sum + (c.count ?? 1), 0)}
						{@const overallIndex =
							config.slice(0, index).reduce((sum, c) => sum + (c.count ?? 1), 0) + diceIndex}
						{@const xOffset = (overallIndex - totalDice / 2) * spacing}
						{@const yStart = isRolling ? 3 : 1.5}
						{@const zOffset = 0}

						<DiceComponent
							{style}
							size={diceConfig.size ?? 2}
							position={[xOffset, yStart, zOffset]}
							bind:rigidBodyRef={diceRefs[overallIndex]}
						/>
					{/each}
				{/each}
			</World>
		</Canvas>
	</div>
{:else}
	<div class="flex h-full w-full items-center justify-center">
		<p class="text-muted-foreground">Chargement de la scène 3D...</p>
	</div>
{/if}

<style>
	.scene-container {
		min-height: 400px;
		background: linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%);
		border-radius: 0.5rem;
		overflow: hidden;
	}
</style>
