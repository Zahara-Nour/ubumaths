/**
 * Garde « données sensibles » : ce qu'elle bloque, ce qu'elle laisse passer.
 * Les secrets et adresses sont COUPÉS en deux chaînes : écrits d'un bloc, ils
 * feraient rougir la garde sur ce fichier même.
 */

import { describe, expect, it } from 'vitest';
import { findSensitive, parseAddedLines } from '../garde-donnees-sensibles';

const at = '@';
const line = (text: string, file = 'src/x.ts') => ({ file, lineNo: 1, text });

describe('findSensitive : secrets', () => {
	it.each([
		['clé API Brevo', 'BREVO=' + 'xkey' + 'sib-' + 'a'.repeat(40)],
		['clé SMTP Brevo', 'xsmtp' + 'sib-' + 'b'.repeat(40)],
		['Stripe live', 'sk_' + 'live_' + 'c'.repeat(24)],
		['Groq', 'gs' + 'k_' + 'd'.repeat(30)],
		['clé privée', '-----BEGIN ' + 'PRIVATE KEY-----']
	])('%s → bloqué', (_label, text) => {
		expect(findSensitive([line(text)])).toHaveLength(1);
		expect(findSensitive([line(text)])[0].kind).toBe('secret');
	});

	it('JWT d’un vrai projet Supabase (porte un `ref`) → bloqué', () => {
		const payload = Buffer.from(
			JSON.stringify({ iss: 'supabase', ref: 'abcdefgh', role: 'service_role' })
		).toString('base64url');
		const jwt = 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.' + 's'.repeat(20);
		expect(findSensitive([line(jwt)])[0]?.kind).toBe('secret');
	});

	it('JWT de démo de Supabase local → accepté', () => {
		const payload = Buffer.from(JSON.stringify({ iss: 'supabase-demo', role: 'anon' })).toString(
			'base64url'
		);
		const jwt = 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.' + 's'.repeat(20);
		expect(findSensitive([line(jwt)])).toEqual([]);
	});
});

describe('findSensitive : adresses', () => {
	it.each([
		'eleve' + at + 'example.com',
		'prof' + at + 'exemple.fr',
		'eleve01' + at + 'local.test',
		'contact' + at + 'chiph.re',
		'camille507' + at + 'eleves.chiph.re',
		'logo' + at + '2x.png'
	])('%s → accepté', (text) => {
		expect(findSensitive([line(text)])).toEqual([]);
	});

	it.each([
		['fournisseur réel', 'parent.dupont' + at + 'gmail.com'],
		['domaine d’école réel', 'marie' + at + 'lycee-reel.fr'],
		['adresse d’équipe hors liste', 'prenom.nom' + at + 'chiph.re'],
		['identifiant d’enfant hors prénoms fictifs', 'paul123' + at + 'eleves.chiph.re']
	])('%s → bloqué', (_label, text) => {
		const found = findSensitive([line(text)]);
		expect(found).toHaveLength(1);
		expect(found[0].kind).toBe('adresse');
	});

	it('marqueur `garde-donnees:ok` sur la ligne → accepté', () => {
		expect(
			findSensitive([line('x' + at + 'gmail.com // garde-donnees:ok (exemple de la RFC)')])
		).toEqual([]);
	});

	it('fichiers exclus (lockfile, static/) → ignorés', () => {
		expect(findSensitive([line('x' + at + 'gmail.com', 'pnpm-lock.yaml')])).toEqual([]);
		expect(findSensitive([line('x' + at + 'gmail.com', 'static/vendor.js')])).toEqual([]);
	});

	it('le signalement ne recopie pas la valeur', () => {
		const [hit] = findSensitive([line('parent.dupont' + at + 'gmail.com')]);
		expect(hit.excerpt).not.toContain('parent.dupont');
	});
});

describe('parseAddedLines', () => {
	it('ne garde que les lignes AJOUTÉES, avec fichier et numéro', () => {
		const diff = [
			'diff --git a/src/a.ts b/src/a.ts',
			'+++ b/src/a.ts',
			'@@ -1,0 +10,2 @@',
			'+const a = 1;',
			'+const b = 2;',
			'-const old = 0;',
			'+++ /dev/null'
		].join('\n');
		expect(parseAddedLines(diff)).toEqual([
			{ file: 'src/a.ts', lineNo: 10, text: 'const a = 1;' },
			{ file: 'src/a.ts', lineNo: 11, text: 'const b = 2;' }
		]);
	});
});
