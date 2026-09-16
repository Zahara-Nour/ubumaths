/**
 * Atelier — le cycle de vie d'un atelier ouvert
 *
 * Charger au démarrage, ranger en différé, écouter les autres onglets. Tout ce
 * qui doit être dit à l'élève passe par `onNotice` : ce module ne décide jamais
 * seul de taire quelque chose (§5).
 *
 * @module atelier/session
 */

import type { Atelier } from './atelier.svelte';
import { loadAtelier, saveAtelier, readForeignWrite } from './persistence';

/** Délai avant de ranger, pour ne pas écrire à chaque frappe. */
const SAVE_DELAY_MS = 500;

/** Ce que la session a à dire à l'élève. */
export interface SessionNotice {
	readonly kind: 'info' | 'warning';
	readonly message: string;
}

export interface SessionOptions {
	/** `null` pour un atelier qui ne conserve rien (navigation privée). */
	readonly storage: Storage | null;
	/** Où écouter les écritures des autres onglets. */
	readonly target?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null;
	readonly onNotice?: (notice: SessionNotice) => void;
}

export interface Session {
	/** Signaler que l'atelier a changé — déclenche une sauvegarde différée. */
	touch(): void;
	/** Ranger tout de suite, sans attendre le délai. */
	saveNow(): void;
	close(): void;
}

/**
 * Ouvrir un atelier : le remplir avec ce qui était rangé, puis le suivre.
 *
 * ⚠️ Une écriture venue d'un autre onglet **prévient sans rien écraser** : ce
 * que l'élève a sous les yeux lui appartient, et remplacer son travail parce
 * qu'une autre page a enregistré serait exactement la perte silencieuse que le
 * §5 interdit.
 */
export function openSession(atelier: Atelier, options: SessionOptions): Session {
	const { storage, target = null, onNotice } = options;
	const say = (kind: SessionNotice['kind'], message: string) => onNotice?.({ kind, message });

	let timer: ReturnType<typeof setTimeout> | null = null;
	let closed = false;

	// --- Charger ---------------------------------------------------------------
	const loaded = loadAtelier(storage);
	if (loaded.kind === 'loaded') {
		const report = atelier.restore(loaded.state);
		if (report.skipped.length > 0) {
			const names = report.skipped.map((s) => `« ${s.name} »`).join(', ');
			say('warning', `${names} n'a pas pu être retrouvé dans l'atelier enregistré.`);
		}
		if (loaded.dropped > 0) {
			say('warning', `${loaded.dropped} objet(s) enregistré(s) étaient illisibles.`);
		}
	} else if (loaded.kind === 'corrupt') {
		say('warning', `${loaded.message} L'atelier repart vide.`);
	} else if (loaded.kind === 'too-recent') {
		say(
			'warning',
			"Cet atelier a été enregistré par une version plus récente : il n'est pas ouvert ici, et il ne sera pas écrasé."
		);
	} else if (loaded.kind === 'unavailable') {
		say('info', "Ce navigateur n'enregistre rien : l'atelier sera perdu en fermant l'onglet.");
	}

	// --- Ranger ---------------------------------------------------------------
	function saveNow(): void {
		if (closed) return;
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}

		const outcome = saveAtelier(storage, atelier.serialize());
		if (outcome.kind === 'quota' || outcome.kind === 'too-large') {
			say('warning', outcome.message);
		} else if (outcome.kind === 'refused-newer') {
			say(
				'warning',
				"Un atelier plus récent occupe la place : rien n'a été enregistré, et il n'a pas été écrasé."
			);
		}
	}

	function touch(): void {
		if (closed || storage === null) return;
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(saveNow, SAVE_DELAY_MS);
	}

	// --- Écouter les autres onglets -------------------------------------------
	const onStorage = (event: StorageEvent) => {
		const outcome = readForeignWrite(event);
		if (outcome.kind === 'ignored') return;
		// On prévient ; l'élève décide. On ne remplace jamais son travail d'office.
		say('info', outcome.message);
	};
	target?.addEventListener('storage', onStorage as EventListener);

	// Fermeture d'onglet, navigation, mise en arrière-plan sur mobile : `pagehide`
	// est le dernier moment fiable pour ranger. `beforeunload` ne se déclenche pas
	// sur iOS.
	const onPagehide = () => {
		if (timer !== null) saveNow();
	};
	target?.addEventListener('pagehide', onPagehide as EventListener);

	return {
		touch,
		saveNow,
		close() {
			// ⚠️ Ranger AVANT de fermer : une sauvegarde différée jetée, c'est le
			// travail de l'élève perdu parce qu'il a cliqué un lien dans la demi-
			// seconde. `saveNow` annule le minuteur lui-même.
			if (timer !== null) saveNow();
			closed = true;
			target?.removeEventListener('storage', onStorage as EventListener);
			target?.removeEventListener('pagehide', onPagehide as EventListener);
		}
	};
}
