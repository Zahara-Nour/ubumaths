<!--
	D20 Dice Model (Icosahedron)

	Renders a 20-sided die using Threlte.
	Icosahedron shape - the iconic RPG die.
-->
<script lang="ts">
	import { T } from '@threlte/core';
	import { RigidBody, AutoColliders } from '@threlte/rapier';
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

	// Use Three.js IcosahedronGeometry (D20)
	const baseGeometry = new THREE.IcosahedronGeometry(1);

	// Convert to non-indexed geometry so each face has independent vertices and UVs
	// This is critical because indexed geometry shares vertices between faces,
	// making it impossible to have different UV coordinates per face
	const geometry = baseGeometry.toNonIndexed();

	// Scale the die
	const scaledSize = size * 1.0;

	// Face numbers for D20 - must match faceValueMappings.d20 from dice-geometry.ts
	// Standard icosahedron mapping where opposite faces sum to 21
	const faceNumbers = [17, 3, 7, 1, 19, 16, 10, 15, 13, 9, 8, 12, 5, 11, 6, 20, 2, 18, 4, 14];

	// Setup UVs and material groups for textures
	const numFaces = 20;
	// After toNonIndexed(), we have 60 vertices (3 per face)
	const uvs = new Float32Array(numFaces * 3 * 2);

	// Set UVs for each vertex to map full texture on each triangular face
	for (let faceIndex = 0; faceIndex < numFaces; faceIndex++) {
		const v0 = faceIndex * 3 + 0;
		const v1 = faceIndex * 3 + 1;
		const v2 = faceIndex * 3 + 2;

		// Triangle corners: map to full texture
		uvs[v0 * 2 + 0] = 0.5;
		uvs[v0 * 2 + 1] = 0; // top
		uvs[v1 * 2 + 0] = 0;
		uvs[v1 * 2 + 1] = 1; // bottom-left
		uvs[v2 * 2 + 0] = 1;
		uvs[v2 * 2 + 1] = 1; // bottom-right
	}

	geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

	// Add material groups (each face = 1 triangle = 3 vertices)
	for (let i = 0; i < numFaces; i++) {
		geometry.addGroup(i * 3, 3, i);
	}

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

		// Flip vertically to correct upside-down numbers
		ctx.save();
		ctx.translate(size / 2, size / 2);
		ctx.scale(1, -1); // Flip vertically

		// Draw number - smaller font for D20's triangular faces
		// Position at triangle centroid: Y offset = +(2/3 - 1/2) * size = +size/6 (positive because Y is flipped)
		ctx.fillStyle = style.numberColor;
		ctx.font = `bold ${size * 0.4}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(number), 0, size / 6);

		ctx.restore();

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
	angularDamping={0.1}
>
	<!-- AutoColliders with convexHull shape for complex polyhedron -->
	<AutoColliders shape="convexHull" restitution={0.3} friction={0.8}>
		<!-- Die body with number textures -->
		<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
	</AutoColliders>
</RigidBody>
