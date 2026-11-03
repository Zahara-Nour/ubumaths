// Garde des canaux temps réel publics (écart T2, décision de David du 2026-11-03).
//
// Un canal public (`createChannel(nom)` sans `private: true`, ou `supabase.channel(nom)`)
// peut être rejoint par tout compte connecté qui en connaît le nom. Aujourd'hui, ce n'est
// pas un risque : ces canaux ne portent que des `postgres_changes`, que Supabase filtre
// par la RLS de chaque abonné. Un intrus n'y reçoit que ce qu'il pourrait déjà lire.
//
// Ce qui ne passe PAS par la RLS des tables : les messages `broadcast` et la `presence`.
// Sur un canal public, n'importe qui pourrait les lire ou en injecter. Ce test échoue
// donc dès qu'un fichier qui ouvre un canal public se met à en utiliser : il faut alors
// passer ce canal en privé (policies de `realtime.messages`, comme le chat et le troc).
// Voir docs/systeme/realtime.md.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Types
type SourceFile = { path: string; text: string };

// Constantes
const SRC = join(process.cwd(), 'src');
// Le gestionnaire crée les canaux pour les autres : il contient les deux formes.
const MANAGER = 'src/lib/stores/supabaseRealtime.svelte.ts';
const CREATE_CHANNEL = /createChannel\(([^)]*)\)/g;
const DIRECT_CHANNEL = /supabase\.channel\(([^)]*)\)/g;
const MESSAGES = /['"]broadcast['"]|['"]presence['"]|\.track\(|\.send\(/;

// Functions
function listSources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) return name === '__tests__' ? [] : listSources(full);
		if (!/\.(ts|svelte)$/.test(name) || /\.test\./.test(name)) return [];
		return [full];
	});
}

function readSources(): SourceFile[] {
	return listSources(SRC)
		.map((full) => ({ path: relative(process.cwd(), full), text: readFileSync(full, 'utf8') }))
		.filter((file) => file.path !== MANAGER);
}

function channelCalls(text: string): { isPrivate: boolean }[] {
	return [...text.matchAll(CREATE_CHANNEL), ...text.matchAll(DIRECT_CHANNEL)].map((match) => ({
		isPrivate: /private:\s*true/.test(match[1])
	}));
}

const sources = readSources();
const publicFiles = sources.filter((f) => channelCalls(f.text).some((c) => !c.isPrivate));
const privateFiles = sources.filter((f) => channelCalls(f.text).some((c) => c.isPrivate));

describe('canaux temps réel publics', () => {
	it('repère les canaux connus (la détection ne tourne pas à vide)', () => {
		const publics = publicFiles.map((f) => f.path);
		expect(publics).toEqual(
			expect.arrayContaining([
				'src/lib/stores/multiplayer.svelte.ts',
				'src/lib/stores/presence.svelte.ts',
				'src/lib/stores/notificationsRealtime.svelte.ts',
				'src/lib/stores/achievementsRealtime.svelte.ts'
			])
		);
		expect(privateFiles.map((f) => f.path)).toEqual(
			expect.arrayContaining([
				'src/lib/stores/chat.svelte.ts',
				'src/lib/stores/tradeRealtime.svelte.ts'
			])
		);
	});

	it("un fichier qui ouvre un canal public n'utilise ni broadcast ni presence", () => {
		const fautifs = publicFiles.filter((f) => MESSAGES.test(f.text)).map((f) => f.path);
		expect(fautifs, 'passer ces canaux en privé (voir docs/systeme/realtime.md)').toEqual([]);
	});
});
