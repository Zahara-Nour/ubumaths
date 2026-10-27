# Tester sur l'iPhone ou le MacBook (Tailscale)

> Quand David demande « un lien pour tester sur mon téléphone / mon MacBook » : lire cette page,
> choisir la ligne du tableau, donner le lien. Ne pas re-chercher la méthode à chaque fois.

Le serveur de dev tourne sur le Mac mini. Les autres appareils de David (iPhone, MacBook) le
joignent par **Tailscale** : adresse du Mac mini `100.79.226.105`, nom
`macmini-de-david.tail99357e.ts.net`.

## Les deux pièges

1. **Le cookie de session exige HTTPS ou `localhost`.** Hors `localhost`, SvelteKit pose les
   cookies en `Secure`. Sur `http://100.79.226.105:<port>`, le navigateur jette le cookie : la
   connexion « ne fait rien » (côté serveur : « login successful » puis « Profile missing »).
   `crypto.randomUUID` n'existe pas non plus en HTTP sur une adresse IP (commit c05eadaa1, tableau de
   variations).
2. **Le navigateur appelle Supabase lui-même**, à l'adresse `PUBLIC_SUPABASE_URL` de `.env.local`
   (`http://127.0.0.1:54321`, la base LOCALE). Sur un autre appareil, `127.0.0.1` désigne cet
   appareil : il faut lui rendre le port 54321 du Mac mini, ou changer cette adresse.

⛔ Jamais `.env` (base de PROD) pour ces essais : données d'élèves mineurs. Toujours `.env.local`.

## Quelle méthode

| Appareil | Page                    | Méthode                                          | État                              |
| -------- | ----------------------- | ------------------------------------------------ | --------------------------------- |
| MacBook  | avec ou sans connexion  | tunnel SSH (ci-dessous)                          | ✅ utilisé souvent                |
| iPhone   | sans connexion (public) | `--host 0.0.0.0`, `http://100.79.226.105:<port>` | ✅ utilisé (pages publiques)      |
| iPhone   | avec connexion          | Tailscale Serve (HTTPS)                          | ⚠️ pas encore réussi (2026-10-27) |

### MacBook : tunnel SSH

Sur le Mac mini, un serveur ordinaire (sans `--host`, sans rien changer à l'environnement) :
le dépôt principal sur 5175, un worktree sur 5176+.

Sur le **MacBook** (commande que David tape lui-même) :

```bash
ssh -L <port>:localhost:<port> -L 54321:localhost:54321 david@100.79.226.105
```

puis ouvrir `http://localhost:<port>`. Le navigateur se croit sur `localhost` : cookie accepté,
Supabase joint par le tunnel 54321. « channel N: open failed: connect failed » = aucun serveur
sur ce port au Mac mini : relancer le serveur, ou donner le bon port.

### iPhone, page publique : `--host`

```bash
pnpm dev --port <n> --strictPort --host 0.0.0.0
```

Lien : `http://100.79.226.105:<n>/<page>`. Suffit pour une page sans compte (`/demo/…`). Toute
page derrière une connexion échoue (piège 1).

### iPhone, page avec connexion : Tailscale Serve

Serve publie un port du Mac mini en **HTTPS, sur le tailnet seulement** (jamais `funnel`, qui
ouvre à Internet). Il faut l'activer une fois dans la console Tailscale (lien donné par
`tailscale serve` la première fois, à ouvrir par David).

```bash
# 1. L'appli, avec Supabase joint par le tailnet (8443) et le nom du Mac mini autorisé par Vite
PUBLIC_SUPABASE_URL=https://macmini-de-david.tail99357e.ts.net:8443 \
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=macmini-de-david.tail99357e.ts.net \
pnpm dev --port <n> --strictPort

# 2. Les deux ports en HTTPS sur le tailnet
tailscale serve --bg --https=443 http://localhost:<n>
tailscale serve --bg --https=8443 http://localhost:54321

# Arrêter après l'essai
tailscale serve reset
```

Lien : `https://macmini-de-david.tail99357e.ts.net/<page>`. Comptes locaux :
`supabase/seed/dev_accounts.sql` (`teacher@local.test` / `local-teacher`…).

⚠️ Recette pas encore vérifiée de bout en bout. Au premier essai réussi, passer la ligne du
tableau à ✅ et noter ce qu'il a fallu corriger.

## Limiteur de connexion

Sous `pnpm dev`, une connexion venue de `127.0.0.1` ne compte pas (`skipsLoginRateLimit`,
`docs/systeme/auth.md`). Le tunnel SSH et Serve arrivent en `127.0.0.1` : ils contournent le
limiteur. C'est acceptable parce qu'ils restent privés : **jamais de tunnel public** (ngrok,
`tailscale funnel`…). Depuis une autre IP (`--host`), le limiteur s'applique : 5 essais par IP
en 15 min.
