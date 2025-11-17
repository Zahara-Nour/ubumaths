<!--
	D8 Dice Model (Octahedron)

	Renders an 8-sided die using Threlte.
	Octahedron shape with 8 triangular faces.
-->
<script lang="ts">
	import { T } from '@threlte/core';
	import { Text } from '@threlte/extras';
	import { getDiceGeometry, getFaceTransform } from '../utils/dice-geometry';
	import type { DiceStyleConfig } from '../types';
	import type { Vector3Tuple } from 'three';
	import * as THREE from 'three';

	// Props
	let {
		style,
		size = 1,
		position = [0, 0, 0] as Vector3Tuple,
		rotation = [0, 0, 0] as Vector3Tuple
	}: {
		style: DiceStyleConfig;
		size?: number;
		position?: Vector3Tuple;
		rotation?: Vector3Tuple;
	} = $props();

	// Get D8 geometry data
	const geometryData = getDiceGeometry('d8');

	// Create Three.js geometry from vertices and indices
	const geometry = new THREE.BufferGeometry();
	const vertices = new Float32Array(geometryData.vertices);
	const indices = new Uint16Array(geometryData.indices);

	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	geometry.computeVertexNormals();

	// Scale geometry
	const scaledSize = size * geometryData.scale;

	// Face numbers for D8
	const faceNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

	// Calculate font size based on die size (smaller for more faces)
	const fontSize = scaledSize * 0.45;
</script>

<T.Group {position} {rotation}>
	<!-- Die body -->
	<T.Mesh {geometry} scale={scaledSize} castShadow receiveShadow>
		<T.MeshStandardMaterial
			color={style.baseColor}
			metalness={style.metalness ?? 0.1}
			roughness={style.roughness ?? 0.6}
			emissive={style.emissive ?? '#000000'}
			emissiveIntensity={style.emissiveIntensity ?? 0}
		/>
	</T.Mesh>

	<!-- Numbers on each face -->
	{#each geometryData.faceNormals as faceNormal, index (index)}
		{@const transform = getFaceTransform(faceNormal, scaledSize, 0.02)}
		<Text
			text={String(faceNumbers[index])}
			position={transform.position}
			rotation={transform.rotation}
			fontSize={fontSize}
			color={style.numberColor}
			anchorX="center"
			anchorY="middle"
		/>
	{/each}
</T.Group>
