<!--
	D12 Dice Model (Dodecahedron)

	Renders a 12-sided die using Threlte.
	Dodecahedron shape with 12 pentagonal faces.
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

	// Use Three.js DodecahedronGeometry (D12)
	const baseGeometry = new THREE.DodecahedronGeometry(1);

	// Convert to non-indexed geometry so each face has independent vertices and UVs
	const geometry = baseGeometry.toNonIndexed();

	// Scale the die
	const scaledSize = size * 1.0;

	// Face numbers for D12 - must match faceValueMappings.d12 from dice-geometry.ts
	const faceNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

	// Setup UVs and material groups for textures
	const numFaces = 12;
	const trianglesPerPentagon = 3; // Each pentagonal face is triangulated into 3 triangles
	const totalTriangles = numFaces * trianglesPerPentagon; // 36 triangles
	const totalVertices = totalTriangles * 3; // 108 vertices

	const uvs = new Float32Array(totalVertices * 2);

	// DodecahedronGeometry triangulates each pentagon into 3 triangles
	// We map the full texture to ALL 3 triangles of each pentagon
	for (let triangleIndex = 0; triangleIndex < totalTriangles; triangleIndex++) {
		const v0 = triangleIndex * 3 + 0;
		const v1 = triangleIndex * 3 + 1;
		const v2 = triangleIndex * 3 + 2;

		// Map each triangle to full texture (same texture will appear on all 3 triangles of pentagon)
		uvs[v0 * 2 + 0] = 0.5;
		uvs[v0 * 2 + 1] = 0; // top
		uvs[v1 * 2 + 0] = 0;
		uvs[v1 * 2 + 1] = 1; // bottom-left
		uvs[v2 * 2 + 0] = 1;
		uvs[v2 * 2 + 1] = 1; // bottom-right
	}

	geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

	// Add material groups - group 3 triangles per pentagon face
	for (let faceIndex = 0; faceIndex < numFaces; faceIndex++) {
		const startVertex = faceIndex * trianglesPerPentagon * 3; // 9 vertices per pentagon
		const vertexCount = trianglesPerPentagon * 3; // 9 vertices
		geometry.addGroup(startVertex, vertexCount, faceIndex);
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

		// Draw number
		ctx.fillStyle = style.numberColor;
		ctx.font = `bold ${size * 0.7}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(number), 0, 0);

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
	angularDamping={0.4}
	density={3.0}
>
	<!-- AutoColliders with convexHull shape for complex polyhedron -->
	<AutoColliders shape="convexHull" restitution={0.15} friction={1.2}>
		<!-- Die body with number textures -->
		<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
	</AutoColliders>
</RigidBody>
