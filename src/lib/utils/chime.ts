/**
 * Son discret entre deux questions (forme « En classe »)
 * ======================================================
 *
 * Synthétisé par Web Audio, sans fichier. Les navigateurs ne jouent un son
 * qu'après un geste de l'utilisateur : `unlockChime()` est appelée depuis le
 * clic sur « C'est parti ! ». Sans Web Audio, ou sans déblocage, rien ne sonne
 * et rien ne casse.
 */

// Constantes
// Note haute et courte (Hz, s), volume bas : un signal, pas une sonnerie
const FREQUENCY_HZ = 880;
const DURATION_S = 0.35;
const PEAK_GAIN = 0.12;

// Variables
let audioContext: AudioContext | null = null;

// Functions
function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (audioContext) return audioContext;
	// Safari : ancien constructeur préfixé
	type AudioContextGlobals = typeof globalThis & {
		AudioContext?: typeof AudioContext;
		webkitAudioContext?: typeof AudioContext;
	};
	const globals = globalThis as AudioContextGlobals;
	const Constructor = globals.AudioContext ?? globals.webkitAudioContext;
	if (!Constructor) return null;
	try {
		audioContext = new Constructor();
		return audioContext;
	} catch {
		return null;
	}
}

/** À appeler depuis un geste de l'utilisateur (clic) */
export function unlockChime(): void {
	const context = getAudioContext();
	if (context?.state === 'suspended') void context.resume().catch(() => {});
}

/** Joue le son, s'il peut l'être */
export function playChime(): void {
	const context = getAudioContext();
	if (!context || context.state !== 'running') return;
	try {
		const start = context.currentTime;
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(FREQUENCY_HZ, start);
		gain.gain.setValueAtTime(0, start);
		gain.gain.linearRampToValueAtTime(PEAK_GAIN, start + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + DURATION_S);
		oscillator.connect(gain).connect(context.destination);
		oscillator.start(start);
		oscillator.stop(start + DURATION_S);
	} catch {
		// Son impossible : la projection continue en silence
	}
}
