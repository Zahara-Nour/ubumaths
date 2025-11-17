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
	import { onMount } from 'svelte';

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

	// Get D6 geometry data
	const geometryData = getDiceGeometry('d6');

	// Face numbers for D6 (matches faceNormals order)
	const faceNumbers = [1, 6, 2, 5, 3, 4];

	// Create Three.js geometry from vertices and indices
	const geometry = new THREE.BufferGeometry();
	const vertices = new Float32Array(geometryData.vertices);
	const indices = new Uint16Array(geometryData.indices);

	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	geometry.computeVertexNormals();

	// Add material groups (each face = 2 triangles = 6 indices)
	for (let i = 0; i < 6; i++) {
		geometry.addGroup(i * 6, 6, i); // start, count, materialIndex
	}

	// Scale geometry
	const scaledSize = size * geometryData.scale;

	// Create materials with textures for each face
	let materials = $state.raw<THREE.MeshStandardMaterial[]>([]);

	// Create number texture on canvas
	function createNumberTexture(number: number): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		const size = 256;
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d')!;

		// Fill background with transparent (texture will blend with material color)
		ctx.clearRect(0, 0, size, size);

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

	// Initialize materials on mount
	onMount(() => {
		materials = faceNumbers.map((num) => {
			const texture = createNumberTexture(num);
			return new THREE.MeshStandardMaterial({
				color: style.baseColor,
				map: texture,
				metalness: style.metalness ?? 0.1,
				roughness: style.roughness ?? 0.6,
				emissive: style.emissive ?? '#000000',
				emissiveIntensity: style.emissiveIntensity ?? 0,
				side: THREE.DoubleSide
			});
		});
	});
</script>

<!-- RigidBody for physics simulation -->
<RigidBody
	bind:rigidBody={rbRef}
	type="dynamic"
	{position}
	linearDamping={0.1}
	angularDamping={0.1}
>
	<!-- AutoColliders with cuboid shape for D6 (most efficient for cubes) -->
	<AutoColliders shape="cuboid" restitution={0.3} friction={0.8}>
		<!-- Die body with textured materials -->
		{#if materials.length > 0}
			<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
		{/if}
	</AutoColliders>
</RigidBody>
