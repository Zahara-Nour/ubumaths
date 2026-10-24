/**
 * Limiteur de connexion levé sur le serveur de dev local.
 *
 * En local, toutes les sessions et les scripts Playwright viennent de la même IP et partagent
 * le compteur `rate_limits` de Supabase local : quelques connexions de test bloquent tout le
 * monde 15 minutes. On saute donc les limiteurs de connexion quand les DEUX conditions tiennent :
 * - `dev` (de `$app/environment`) est vrai : seulement sous `pnpm dev`, jamais dans un build
 *   (Vercel, aperçu) ;
 * - l'IP est une boucle locale, sous l'une de ses trois formes exactes.
 * Pas de variable d'environnement : elle pourrait être recopiée sur Vercel.
 */

const LOOPBACK_IPS: ReadonlySet<string> = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function skipsLoginRateLimit(dev: boolean, ip: string): boolean {
	return dev && LOOPBACK_IPS.has(ip);
}
