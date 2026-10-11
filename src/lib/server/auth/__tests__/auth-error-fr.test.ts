import { describe, expect, it } from 'vitest';
import { AUTH_ERROR_FALLBACK, authErrorToFrench } from '../auth-error-fr';

describe('authErrorToFrench', () => {
	it.each([
		['same_password', /différent de l’ancien/],
		['weak_password', /trop faible/],
		['session_not_found', /lien a expiré/],
		['session_expired', /lien a expiré/],
		['otp_expired', /lien a expiré/],
		['reauthentication_needed', /reconnecte-toi/],
		['over_request_rate_limit', /Trop de tentatives/],
		['over_email_send_rate_limit', /Trop de tentatives/]
	])('traduit le code %s', (code, expected) => {
		expect(authErrorToFrench({ code })).toMatch(expected);
	});

	it('ne laisse jamais passer le message anglais de Supabase', () => {
		const error = { code: 'unexpected_failure', message: 'Something went wrong on our side' };
		expect(authErrorToFrench(error)).toBe(AUTH_ERROR_FALLBACK);
		// Une AuthError sans code : seul le message anglais est présent.
		const withoutCode = { code: undefined, message: 'New password should be different' };
		expect(authErrorToFrench(withoutCode)).toBe(AUTH_ERROR_FALLBACK);
	});

	it('accepte un message de repli propre à la page', () => {
		expect(authErrorToFrench({ code: 'inconnu' }, 'Repli.')).toBe('Repli.');
	});
});
