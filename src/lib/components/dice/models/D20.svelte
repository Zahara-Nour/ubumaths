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
	const geometry = new THREE.IcosahedronGeometry(1);

	// Scale the die
	const scaledSize = size * 1.0;

	// Face numbers for D20 - must match faceValueMappings.d20 from dice-geometry.ts
	// Standard icosahedron mapping where opposite faces sum to 21
	const faceNumbers = [17, 3, 7, 1, 19, 16, 10, 15, 13, 9, 8, 12, 5, 11, 6, 20, 2, 18, 4, 14];

	// Setup UVs and material groups for textures
	const numFaces = 20;
	const numVertices = geometry.attributes.position.count;
	const uvs = new Float32Array(numVertices * 2);

	// Set UVs for each vertex to map full texture on each triangular face
	for (let i = 0; i < numFaces; i++) {
		const i0 = i * 3 + 0;
		const i1 = i * 3 + 1;
		const i2 = i * 3 + 2;

		// Triangle corners: map to full texture
		uvs[i0 * 2 + 0] = 0.5;
		uvs[i0 * 2 + 1] = 0; // top
		uvs[i1 * 2 + 0] = 0;
		uvs[i1 * 2 + 1] = 1; // bottom-left
		uvs[i2 * 2 + 0] = 1;
		uvs[i2 * 2 + 1] = 1; // bottom-right
	}

	geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

	// Add material groups (each face = 1 triangle = 3 indices)
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
	angularDamping={0.1}
>
	<!-- AutoColliders with convexHull shape for complex polyhedron -->
	<AutoColliders shape="convexHull" restitution={0.3} friction={0.8}>
		<!-- Die body with number textures -->
		<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
	</AutoColliders>
</RigidBody>
