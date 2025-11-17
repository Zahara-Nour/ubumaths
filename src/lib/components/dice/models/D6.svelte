<!--
	D6 Dice Model (Cube)

	Renders a 6-sided die using Threlte.
	Most common dice type (standard cube).
	Uses textures for numbers instead of 3D text.
-->
<script lang="ts">
	import { T } from '@threlte/core';
	import { RigidBody, AutoColliders } from '@threlte/rapier';
	import { getDiceGeometry } from '../utils/dice-geometry';
	import type { DiceStyleConfig } from '../types';
	import type { Vector3Tuple } from 'three';
	import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
	import * as THREE from 'three';

	// Props
	let {
		style,
		size = 1,
		position = [0, 0, 0] as Vector3Tuple,
		rotation: _rotation = [0, 0, 0] as Vector3Tuple,
		rigidBodyRef = $bindable(undefined)
	}: {
		style: DiceStyleConfig;
		size?: number;
		position?: Vector3Tuple;
		rotation?: Vector3Tuple;
		rigidBodyRef?: RapierRigidBody | undefined;
	} = $props();

	// Internal rigid body reference (use .raw() for 3D objects to avoid proxy overhead)
	let rbRef: RapierRigidBody | undefined = $state.raw(undefined);

	// Sync internal ref with bindable prop
	$effect(() => {
		rigidBodyRef = rbRef;
	});

	// Get D6 geometry data for scale
	const geometryData = getDiceGeometry('d6');

	// Face numbers for D6 - BoxGeometry face order:
	// Right(+X), Left(-X), Top(+Y), Bottom(-Y), Front(+Z), Back(-Z)
	// We map: Right=4, Left=3, Top=5, Bottom=2, Front=1, Back=6
	const faceNumbers = [4, 3, 5, 2, 1, 6];

	// Use Three.js BoxGeometry which has proper UVs for textures
	// Size 2x2x2 (will be scaled later)
	const geometry = new THREE.BoxGeometry(2, 2, 2);

	// Scale geometry
	const scaledSize = size * geometryData.scale;

	// Create number texture on canvas
	function createNumberTexture(number: number): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		const size = 256;
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d')!;

		// Fill background with base color
		ctx.fillStyle = style.baseColor;
		ctx.fillRect(0, 0, size, size);

		// Draw number
		ctx.fillStyle = style.numberColor;
		ctx.font = `bold ${size * 0.7}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(number), size / 2, size / 2);

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	// Create materials immediately (not in onMount)
	const materials = faceNumbers.map((num) => {
		const texture = createNumberTexture(num);
		return new THREE.MeshStandardMaterial({
			map: texture,
			metalness: style.metalness ?? 0.1,
			roughness: style.roughness ?? 0.6,
			emissive: style.emissive ?? '#000000',
			emissiveIntensity: style.emissiveIntensity ?? 0,
			side: THREE.DoubleSide
		});
	});
</script>

<!-- RigidBody for physics simulation -->
<RigidBody
	bind:rigidBody={rbRef}
	type="dynamic"
	{position}
	linearDamping={0.1}
	angularDamping={0.4}
	density={3.0}
>
	<!-- AutoColliders with cuboid shape for D6 (most efficient for cubes) -->
	<AutoColliders shape="cuboid" restitution={0.15} friction={1.2}>
		<!-- Die body with textured materials -->
		{#if materials.length > 0}
			<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
		{/if}
	</AutoColliders>
</RigidBody>
