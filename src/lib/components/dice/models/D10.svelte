<!--
	D10 Dice Model (Pentagonal Trapezohedron)

	Renders a 10-sided die using Threlte.
	Pentagonal trapezohedron shape (numbered 0-9 or 1-10).
-->
<script lang="ts">
	import { T } from '@threlte/core';
	import { getDiceGeometry } from '../utils/dice-geometry';
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

	// Get D10 geometry data
	const geometryData = getDiceGeometry('d10');

	// Create Three.js geometry from vertices and indices
	const geometry = new THREE.BufferGeometry();
	const vertices = new Float32Array(geometryData.vertices);
	const indices = new Uint16Array(geometryData.indices);

	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	geometry.computeVertexNormals();

	// Scale geometry
	const scaledSize = size * geometryData.scale;
</script>

<T.Mesh {geometry} {position} {rotation} scale={scaledSize} castShadow receiveShadow>
	<T.MeshStandardMaterial
		color={style.baseColor}
		metalness={style.metalness ?? 0.1}
		roughness={style.roughness ?? 0.6}
		emissive={style.emissive ?? '#000000'}
		emissiveIntensity={style.emissiveIntensity ?? 0}
	/>
</T.Mesh>
