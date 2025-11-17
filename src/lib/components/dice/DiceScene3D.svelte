<!--
	DiceScene3D Component

	Main 3D scene with physics-enabled dice rolling.
	Uses Threlte and Rapier for realistic physics simulation.
-->
<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { T } from '@threlte/core';
	import { World } from '@threlte/rapier';
	import type { DiceConfig, DiceRollResult, SingleDiceResult, PhysicsConfig } from './types';
	import { getStyleConfig } from './styles';
	import { browser } from '$app/environment';

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
		duration = 2500
	}: {
		config?: DiceConfig[];
		onRollStart?: () => void;
		onRollComplete?: (result: DiceRollResult[]) => void;
		physics?: Partial<PhysicsConfig>;
		duration?: number;
	} = $props();

	// State
	let isRolling = $state(false);

	// Dice components map
	const diceComponents = {
		d4: D4,
		d6: D6,
		d8: D8,
		d10: D10,
		d12: D12,
		d20: D20
	};

	/**
	 * Roll the dice with physics simulation
	 */
	export function roll() {
		if (isRolling) return;

		isRolling = true;

		// Call start callback
		if (onRollStart) {
			onRollStart();
		}

		// For now, simulate the roll with a timeout
		// TODO: Implement actual physics simulation with Rapier
		setTimeout(() => {
			// Generate random results
			const results: DiceRollResult[] = config.map((diceConfig) => {
				const count = diceConfig.count ?? 1;
				const diceResults: SingleDiceResult[] = [];
				let total = 0;

				const maxValue = parseInt(diceConfig.type.substring(1));

				for (let i = 0; i < count; i++) {
					const value = Math.floor(Math.random() * maxValue) + 1;
					diceResults.push({
						type: diceConfig.type,
						value,
						id: `${diceConfig.type}-${Date.now()}-${i}`
					});
					total += value;
				}

				return {
					dice: diceConfig.type,
					results: diceResults,
					total,
					timestamp: Date.now()
				};
			});

			isRolling = false;

			// Call complete callback
			if (onRollComplete) {
				onRollComplete(results);
			}
		}, duration);
	}
</script>

{#if browser}
	<div class="scene-container h-full w-full">
		<Canvas>
			<!-- Camera -->
			<T.PerspectiveCamera makeDefault position={[0, 8, 12]} fov={50}>
				<T.Object3D position={[0, 0, 0]} />
			</T.PerspectiveCamera>

			<!-- Lighting -->
			<T.DirectionalLight position={[10, 10, 10]} intensity={1.5} castShadow />
			<T.DirectionalLight position={[-10, 10, -10]} intensity={0.5} />
			<T.AmbientLight intensity={0.4} />

			<!-- Physics World -->
			<World gravity={{ x: 0, y: -9.81, z: 0 }}>
				<!-- Floor/Table -->
				<T.Mesh position={[0, -0.5, 0]} receiveShadow>
					<T.BoxGeometry args={[20, 1, 20]} />
					<T.MeshStandardMaterial color="#2a2a2a" roughness={0.8} />
				</T.Mesh>

				<!-- Dice -->
				{#if isRolling || config.length > 0}
					{#each config as diceConfig, index (`${diceConfig.type}-${index}`)}
						{@const DiceComponent = diceComponents[diceConfig.type]}
						{@const style = getStyleConfig(diceConfig.style ?? 'classic')}
						{@const count = diceConfig.count ?? 1}

						{#each Array(count) as _, diceIndex (`${diceConfig.type}-${index}-${diceIndex}`)}
							{@const spacing = 2}
							{@const totalDice = config.reduce((sum, c) => sum + (c.count ?? 1), 0)}
							{@const overallIndex =
								config.slice(0, index).reduce((sum, c) => sum + (c.count ?? 1), 0) + diceIndex}
							{@const xOffset = (overallIndex - totalDice / 2) * spacing}
							{@const yStart = 5 + Math.random() * 2}

							<DiceComponent
								{style}
								size={diceConfig.size ?? 1}
								position={[xOffset, yStart, 0]}
								rotation={[
									Math.random() * Math.PI * 2,
									Math.random() * Math.PI * 2,
									Math.random() * Math.PI * 2
								]}
							/>
						{/each}
					{/each}
				{/if}
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
