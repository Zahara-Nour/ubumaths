<!--
	D4 Dice Model (Tetrahedron)

	Renders a 4-sided die using Threlte.
	Uses custom geometry with canvas textures (inspired by threejs-dice).
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

	// Scale the die
	const scaledSize = size * 1.2;

	// Face numbers for D4 - from threejs-dice d4FaceTexts[0] (indices 2-5)
	const faceNumbers: number[][] = [
		[2, 4, 3], // Face 1
		[1, 3, 4], // Face 2
		[2, 1, 4], // Face 3
		[1, 2, 3] // Face 4
	];

	// Tetrahedron vertices (alternating corners of a cube)
	const vertices: Vector3Tuple[] = [
		[1, 1, 1],
		[-1, -1, 1],
		[-1, 1, -1],
		[1, -1, -1]
	];

	// Triangular faces (each array: 3 vertex indices)
	const faces: number[][] = [
		[1, 0, 2],
		[0, 1, 3],
		[0, 3, 2],
		[1, 2, 3]
	];

	// Calculate face normals (centroid of vertices, normalized)
	const faceNormals: Vector3Tuple[] = faces.map((face) => {
		// Calculate centroid
		const v0 = vertices[face[0]];
		const v1 = vertices[face[1]];
		const v2 = vertices[face[2]];

		let cx = (v0[0] + v1[0] + v2[0]) / 3;
		let cy = (v0[1] + v1[1] + v2[1]) / 3;
		let cz = (v0[2] + v1[2] + v2[2]) / 3;

		// Normalize to get normal (since tetrahedron is centered at origin)
		const length = Math.sqrt(cx * cx + cy * cy + cz * cz);
		return [cx / length, cy / length, cz / length];
	});

	// Store face normals for detectTopFace to use
	// Override the default D4 geometry normals with our custom ones
	const customGeometry = getDiceGeometry('d4');
	customGeometry.faceNormals = faceNormals;

	// Create custom tetrahedron geometry with UV mapping
	function createTetrahedronGeometry(): THREE.BufferGeometry {
		const geometry = new THREE.BufferGeometry();
		const positions: number[] = [];
		const uvs: number[] = [];

		// Angular parameters for UV mapping (from threejs-dice)
		const angleIncrement = (Math.PI * 2) / 3; // 120 degrees for triangle
		const angleOffset = (Math.PI * 7) / 6; // Rotation offset
		const texMargin = -0.1; // Negative margin (chamfer)

		// Process each triangular face
		for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
			const face = faces[faceIndex];

			// Add triangle vertices
			const v0 = vertices[face[0]];
			const v1 = vertices[face[1]];
			const v2 = vertices[face[2]];

			positions.push(...v0, ...v1, ...v2);

			// Calculate UVs using polar coordinates
			// Each vertex of the triangle
			for (let j = 0; j < 3; j++) {
				const angle = angleIncrement * j + angleOffset;
				const u = (Math.cos(angle) + 1 + texMargin) / 2 / (1 + texMargin);
				const v = (Math.sin(angle) + 1 + texMargin) / 2 / (1 + texMargin);
				uvs.push(u, v);
			}
		}

		// Set geometry attributes
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

		// Add material groups (one per face)
		for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
			geometry.addGroup(faceIndex * 3, 3, faceIndex);
		}

		geometry.computeVertexNormals();

		return geometry;
	}

	// Create the geometry
	const geometry = createTetrahedronGeometry();

	// Create number texture on canvas (D4 style: 3 different numbers with 120° rotation)
	// Exact implementation from threejs-dice customTextTextureFunction
	function createNumberTexture(numbers: number[]): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		const canvasSize = 256;
		canvas.width = canvasSize;
		canvas.height = canvasSize;
		const ctx = canvas.getContext('2d')!;

		// Fill background with base color
		ctx.fillStyle = style.baseColor;
		ctx.fillRect(0, 0, canvasSize, canvasSize);

		// Font setup
		ctx.fillStyle = style.numberColor;
		const fontSize = canvasSize / 5; // ts/5 from threejs-dice
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// Draw 3 different numbers with 120° rotations (threejs-dice pattern)
		// Important: Draw THEN rotate (not rotate then draw)
		for (let i = 0; i < numbers.length; i++) {
			// Draw number at current rotation (offset from center)
			ctx.fillText(String(numbers[i]), canvasSize / 2, canvasSize / 2 - canvasSize * 0.3);

			// Rotate for next number (translate to center, rotate, translate back)
			ctx.translate(canvasSize / 2, canvasSize / 2);
			ctx.rotate((Math.PI * 2) / 3); // 120 degrees
			ctx.translate(-canvasSize / 2, -canvasSize / 2);
		}

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
	<!-- AutoColliders with convexHull shape for tetrahedron -->
	<AutoColliders shape="convexHull" restitution={0.15} friction={1.2}>
		<!-- Die body with number textures -->
		<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
	</AutoColliders>
</RigidBody>
