import { describe, it, expect } from 'vitest';
import { googlePhotoUrl } from '../google-photo';

describe('googlePhotoUrl', () => {
	it('rend la photo servie par Google (picture)', () => {
		const url = 'https://lh3.googleusercontent.com/a/ACg8oc=s96-c';
		expect(googlePhotoUrl({ picture: url })).toBe(url);
	});

	it('se rabat sur avatar_url quand picture manque', () => {
		const url = 'https://lh3.googleusercontent.com/a/xyz';
		expect(googlePhotoUrl({ avatar_url: url })).toBe(url);
	});

	it('picture prime sur avatar_url', () => {
		expect(
			googlePhotoUrl({
				picture: 'https://lh3.googleusercontent.com/a/p',
				avatar_url: 'https://lh3.googleusercontent.com/a/q'
			})
		).toBe('https://lh3.googleusercontent.com/a/p');
	});

	it('refuse toute autre adresse, même proche', () => {
		for (const url of [
			'https://exemple.com/photo.png',
			'http://lh3.googleusercontent.com/a/x',
			'https://lh3.googleusercontent.com.pirate.net/a/x',
			'https://lh4.googleusercontent.com/a/x',
			'javascript:alert(1)',
			'/avatars/galopin/x.webp',
			''
		]) {
			expect(googlePhotoUrl({ picture: url })).toBeNull();
		}
	});

	it('refuse une valeur absente ou qui n’est pas une chaîne', () => {
		expect(googlePhotoUrl(undefined)).toBeNull();
		expect(googlePhotoUrl(null)).toBeNull();
		expect(googlePhotoUrl({})).toBeNull();
		expect(googlePhotoUrl({ picture: 42 })).toBeNull();
	});
});
