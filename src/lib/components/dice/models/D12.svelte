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
	const geometry = new THREE.DodecahedronGeometry(1);

	// Scale the die
	const scaledSize = size * 1.0;

	// Face numbers for D12 - must match faceValueMappings.d12 from dice-geometry.ts
	const faceNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

	// Setup UVs and material groups for textures
	const numFaces = 12;
	const numVertices = geometry.attributes.position.count;
	const uvs = new Float32Array(numVertices * 2);

	// DodecahedronGeometry has 12 pentagonal faces, each split into 5 triangles
	// Each pentagon is made of 5 vertices, so we need to map UVs for all vertices
	// We'll map the full texture to each pentagonal face
	for (let i = 0; i < numVertices; i++) {
		// Simple UV mapping - can be improved for better appearance
		const _faceIndex = Math.floor(i / 3);
		const vertexInFace = i % 3;

		// Map each triangle to full texture
		if (vertexInFace === 0) {
			uvs[i * 2 + 0] = 0.5;
			uvs[i * 2 + 1] = 0; // top
		} else if (vertexInFace === 1) {
			uvs[i * 2 + 0] = 0;
			uvs[i * 2 + 1] = 1; // bottom-left
		} else {
			uvs[i * 2 + 0] = 1;
			uvs[i * 2 + 1] = 1; // bottom-right
		}
	}

	geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

	// Add material groups - DodecahedronGeometry triangulates pentagons
	// Each pentagon is split into 3 triangles
	const trianglesPerFace = 3;
	for (let i = 0; i < numFaces; i++) {
		geometry.addGroup(i * trianglesPerFace * 3, trianglesPerFace * 3, i);
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
