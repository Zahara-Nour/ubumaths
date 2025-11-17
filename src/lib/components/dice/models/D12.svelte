<!--
	D12 Dice Model (Dodecahedron)

	Renders a 12-sided die using Threlte.
	Dodecahedron shape with 12 pentagonal faces.
	Uses custom geometry with polar UV mapping (inspired by threejs-dice).
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

	// Golden ratio for dodecahedron vertices
	const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618
	const invPhi = 1 / phi; // ≈ 0.618

	// Scale the die
	const scaledSize = size * 1.0;

	// Face numbers for D12 - must match faceValueMappings.d12 from dice-geometry.ts
	const faceNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

	// Dodecahedron vertices using golden ratio (20 vertices)
	const vertices: Vector3Tuple[] = [
		// Rectangle on XY plane
		[1, 1, 1],
		[1, 1, -1],
		[1, -1, 1],
		[1, -1, -1],
		[-1, 1, 1],
		[-1, 1, -1],
		[-1, -1, 1],
		[-1, -1, -1],
		// Rectangle on YZ plane
		[0, invPhi, phi],
		[0, invPhi, -phi],
		[0, -invPhi, phi],
		[0, -invPhi, -phi],
		// Rectangle on XZ plane
		[invPhi, phi, 0],
		[invPhi, -phi, 0],
		[-invPhi, phi, 0],
		[-invPhi, -phi, 0],
		// Remaining vertices
		[phi, 0, invPhi],
		[phi, 0, -invPhi],
		[-phi, 0, invPhi],
		[-phi, 0, -invPhi]
	];

	// Pentagon faces (each array: 5 vertex indices)
	const faces: number[][] = [
		[0, 8, 10, 2, 16],
		[0, 16, 17, 1, 12],
		[0, 12, 14, 4, 8],
		[1, 17, 3, 11, 9],
		[1, 9, 5, 14, 12],
		[2, 10, 6, 15, 13],
		[2, 13, 3, 17, 16],
		[3, 13, 15, 7, 11],
		[4, 14, 5, 19, 18],
		[4, 18, 6, 10, 8],
		[5, 9, 11, 7, 19],
		[6, 18, 19, 7, 15]
	];

	// Create custom geometry with polar UV mapping
	function createDodecahedronGeometry(): THREE.BufferGeometry {
		const geometry = new THREE.BufferGeometry();
		const positions: number[] = [];
		const uvs: number[] = [];

		// Angular parameters for UV mapping
		const numVerticesPerFace = 5; // Pentagon
		const angleIncrement = (Math.PI * 2) / numVerticesPerFace; // 72 degrees
		const angleOffset = -Math.PI / 4 / 2; // Rotation offset
		const texMargin = 0.2; // Texture margin

		// Process each pentagonal face
		for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
			const face = faces[faceIndex];

			// Fan triangulation: create 3 triangles from pentagon
			// Triangle 1: vertices[0], vertices[1], vertices[2]
			// Triangle 2: vertices[0], vertices[2], vertices[3]
			// Triangle 3: vertices[0], vertices[3], vertices[4]
			for (let j = 0; j < numVerticesPerFace - 2; j++) {
				// Triangle vertices
				const v0 = vertices[face[0]];
				const v1 = vertices[face[j + 1]];
				const v2 = vertices[face[j + 2]];

				// Add positions
				positions.push(...v0, ...v1, ...v2);

				// Calculate UVs using polar coordinates
				// Center vertex (v0) always at same UV
				const u0 = (Math.cos(angleOffset) + 1 + texMargin) / 2 / (1 + texMargin);
				const v0_uv = (Math.sin(angleOffset) + 1 + texMargin) / 2 / (1 + texMargin);

				// v1 vertex
				const angle1 = angleIncrement * (j + 1) + angleOffset;
				const u1 = (Math.cos(angle1) + 1 + texMargin) / 2 / (1 + texMargin);
				const v1_uv = (Math.sin(angle1) + 1 + texMargin) / 2 / (1 + texMargin);

				// v2 vertex
				const angle2 = angleIncrement * (j + 2) + angleOffset;
				const u2 = (Math.cos(angle2) + 1 + texMargin) / 2 / (1 + texMargin);
				const v2_uv = (Math.sin(angle2) + 1 + texMargin) / 2 / (1 + texMargin);

				// Add UVs
				uvs.push(u0, v0_uv, u1, v1_uv, u2, v2_uv);
			}
		}

		// Set geometry attributes
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

		// Add material groups (3 triangles per pentagon = 9 vertices per face)
		for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
			const startVertex = faceIndex * (numVerticesPerFace - 2) * 3; // 9 vertices per face
			const vertexCount = (numVerticesPerFace - 2) * 3; // 9 vertices
			geometry.addGroup(startVertex, vertexCount, faceIndex);
		}

		geometry.computeVertexNormals();

		return geometry;
	}

	// Create the geometry
	const geometry = createDodecahedronGeometry();

	// Create number texture on canvas
	function createNumberTexture(number: number): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		const canvasSize = 256;
		canvas.width = canvasSize;
		canvas.height = canvasSize;
		const ctx = canvas.getContext('2d')!;

		// Fill background with base color
		ctx.fillStyle = style.baseColor;
		ctx.fillRect(0, 0, canvasSize, canvasSize);

		// Draw number at center
		ctx.fillStyle = style.numberColor;
		ctx.font = `bold ${canvasSize * 0.45}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(number), canvasSize / 2, canvasSize / 2);

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	// Create materials for each face
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
	<!-- AutoColliders with convexHull shape for dodecahedron -->
	<AutoColliders shape="convexHull" restitution={0.15} friction={1.2}>
		<!-- Die body with number textures -->
		<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
	</AutoColliders>
</RigidBody>
