<!--
	D10 Dice Model (Pentagonal Dipyramid)

	Renders a 10-sided die using Threlte.
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

	// Internal rigid body reference
	let rbRef: RapierRigidBody | undefined = $state.raw(undefined);

	$effect(() => {
		rigidBodyRef = rbRef;
	});

	// Scale the die (threejs-dice uses 0.9 for D10)
	const scaledSize = size * 0.9;

	// Face numbers for D10 (0-9, standard D10 numbering)
	const faceNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

	// Pentagonal dipyramid vertices (from threejs-dice)
	// 10 vertices in circular pattern with alternating heights + 2 apex vertices
	const vertices: Vector3Tuple[] = [];
	for (let i = 0, b = 0; i < 10; i++, b += (Math.PI * 2) / 10) {
		const height = 0.105 * (i % 2 ? 1 : -1);
		vertices.push([Math.cos(b), Math.sin(b), height]);
	}
	vertices.push([0, 0, -1]); // Bottom apex (vertex 10)
	vertices.push([0, 0, 1]); // Top apex (vertex 11)

	// 10 numbered faces (kite-shaped quadrilaterals)
	// Each face has 4 vertices forming a kite shape
	const faces: number[][] = [
		[5, 7, 11, 0], // Face 0
		[4, 2, 10, 1], // Face 1
		[1, 3, 11, 2], // Face 2
		[0, 8, 10, 3], // Face 3
		[7, 9, 11, 4], // Face 4
		[8, 6, 10, 5], // Face 5
		[9, 1, 11, 6], // Face 6
		[2, 0, 10, 7], // Face 7
		[3, 5, 11, 8], // Face 8
		[6, 4, 10, 9] // Face 9
	];

	// Calculate face normals
	const faceNormals: Vector3Tuple[] = faces.map((face) => {
		// Calculate centroid
		let cx = 0,
			cy = 0,
			cz = 0;
		face.forEach((vertexIndex) => {
			const [x, y, z] = vertices[vertexIndex];
			cx += x;
			cy += y;
			cz += z;
		});
		cx /= face.length;
		cy /= face.length;
		cz /= face.length;

		// Normalize to get normal
		const length = Math.sqrt(cx * cx + cy * cy + cz * cz);
		return [cx / length, cy / length, cz / length];
	});

	// Store face normals for detectTopFace
	const customGeometry = getDiceGeometry('d10');
	customGeometry.faceNormals = faceNormals;

	// Create custom D10 geometry with UV mapping
	function createD10Geometry(): THREE.BufferGeometry {
		const geometry = new THREE.BufferGeometry();
		const positions: number[] = [];
		const uvs: number[] = [];

		// Process each kite-shaped face (4 vertices)
		for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
			const face = faces[faceIndex];

			// Kite face has 4 vertices - split into 2 triangles using fan triangulation
			// Triangle 1: [v0, v1, v3]
			// Triangle 2: [v1, v2, v3]

			const v0 = vertices[face[0]];
			const v1 = vertices[face[1]];
			const v2 = vertices[face[2]];
			const v3 = vertices[face[3]];

			// Triangle 1: [v0, v1, v3]
			positions.push(...v0, ...v1, ...v3);
			// UVs mapping texture to kite shape
			uvs.push(0, 1, 1, 1, 0, 0);

			// Triangle 2: [v1, v2, v3]
			positions.push(...v1, ...v2, ...v3);
			// UVs mapping texture to kite shape
			uvs.push(1, 1, 1, 0, 0, 0);
		}

		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

		// Add material groups (two triangles per face)
		for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
			geometry.addGroup(faceIndex * 6, 6, faceIndex);
		}

		geometry.computeVertexNormals();
		return geometry;
	}

	const geometry = createD10Geometry();

	// Create number texture on canvas
	function createNumberTexture(number: number): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		const canvasSize = 256;
		canvas.width = canvasSize;
		canvas.height = canvasSize;
		const ctx = canvas.getContext('2d')!;

		// Fill background
		ctx.fillStyle = style.baseColor;
		ctx.fillRect(0, 0, canvasSize, canvasSize);

		// Font setup
		ctx.fillStyle = style.numberColor;
		const fontSize = canvasSize * 0.5;
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// Draw number centered
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

<RigidBody
	bind:rigidBody={rbRef}
	type="dynamic"
	{position}
	linearDamping={0.1}
	angularDamping={0.4}
	density={3.0}
>
	<AutoColliders shape="convexHull" restitution={0.15} friction={1.2}>
		<T.Mesh {geometry} material={materials} scale={scaledSize} castShadow receiveShadow />
	</AutoColliders>
</RigidBody>
