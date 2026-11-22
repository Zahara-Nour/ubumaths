---
couvre:
  - 'scripts/lien/**'
---

# Tester sur l'iPhone ou le MacBook (Tailscale)

> Quand David demande « un lien pour tester sur mon téléphone / mon MacBook » : **`pnpm lien`**
> dans le worktree (ci-dessous). Le reste de la page explique ce que fait la commande, et les
> méthodes de secours (tunnel SSH, `--host`).

Le serveur de dev tourne sur le Mac mini. Les autres appareils de David (iPhone, MacBook) le
joignent par **Tailscale** : adresse du Mac mini `100.79.226.105`, nom
`serveur.tail99357e.ts.net`.

## `pnpm lien` : le lien en une commande

Dans le worktree, serveur de dev lancé **avec les deux variables du tailnet** (sans elles le lien
répond « Blocked request », ou la connexion échoue : la commande le dit et donne la ligne à
relancer) :

```bash
PUBLIC_SUPABASE_URL=https://serveur.tail99357e.ts.net:8443 \
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=serveur.tail99357e.ts.net \
pnpm dev --port <n> --strictPort

pnpm lien            # publie CE serveur, rend le lien, un QR code et les comptes fictifs
pnpm lien --liste    # tous les liens du Mac mini, avec le chantier de chacun
pnpm lien --stop     # retire le lien de ce worktree (fait à la main compris), et lui seul
pnpm lien --port <n> # si deux serveurs tournent dans le worktree
```

Ce qu'elle fait :

- trouve le serveur lancé **depuis ce worktree** (jamais celui d'un autre dossier) et le publie par
  Tailscale Serve sur le premier port HTTPS libre à partir de 8444 ; un lien qui existe déjà est
  redonné tel quel ;
- publie Supabase local sur 8443 s'il ne l'est pas encore. Ce lien-là est partagé par tous les
  chantiers : `--stop` ne le retire jamais ;
- vérifie après coup que chaque lien est « tailnet only » (un lien ouvert par Funnel est retiré) ;
- s'arrête sans rien publier si l'état de Serve n'a plus la forme connue, ou si le port choisi
  vient d'être pris par une autre session ;
- avertit si le serveur a été lancé avant le dernier pull, merge, rebase ou reset de la branche
  (« serveur périmé », cf. plus bas) ;
- tient le registre des liens par chantier dans `.git/liens-tailnet.json` du dépôt principal
  (commun aux worktrees, jamais commité) : c'est lui qui permet à `--stop` et à `--liste` de
  reconnaître un lien dont le serveur est arrêté. Un lien fait à la main apparaît avec le chantier
  du serveur qui écoute derrière, ou « ? ».

Ce qu'elle refuse : le dépôt principal ; un serveur dont rien ne prouve qu'il vise la base locale
(`.env.local` absent, adresse de Supabase distante, même garde que `pnpm voir --compte`, l'adresse
de Supabase du tailnet en plus) ; le port 8443 s'il mène à autre chose que Supabase. Elle ne lance
ni ne relance aucun serveur, et ne fait jamais `funnel` ni `serve reset`.

Code : `scripts/lien/logique.ts` (décisions, testées par `scripts/__tests__/lien.test.ts`) ·
`scripts/lien/index.ts` (commandes `tailscale`, vérifiées en vrai) · `scripts/voir/serveurs.ts`
(serveurs de dev du Mac, partagé avec `pnpm voir`).

## Les deux pièges

1. **Le cookie de session exige HTTPS ou `localhost`.** Hors `localhost`, SvelteKit pose les
   cookies en `Secure`. Sur `http://100.79.226.105:<port>`, le navigateur jette le cookie : la
   connexion « ne fait rien » (côté serveur : « login successful » puis « Profile missing »).
   `crypto.randomUUID` n'existe pas non plus en HTTP sur une adresse IP (commit c05eadaa1, tableau de
   variations). ⚠️ **L'Atelier plante alors au premier objet créé** (rien ne se trace, l'expression
   disparaît de sa carte, 2026-11-14) : même page publique, l'Atelier se teste en HTTPS (Tailscale
   Serve) ou par le tunnel SSH, jamais par `http://100.79.226.105`.
2. **Le navigateur appelle Supabase lui-même**, à l'adresse `PUBLIC_SUPABASE_URL` de `.env.local`
   (`http://127.0.0.1:54321`, la base LOCALE). Sur un autre appareil, `127.0.0.1` désigne cet
   appareil : il faut lui rendre le port 54321 du Mac mini, ou changer cette adresse.

**Claude dans Chrome, David à distance** : l'extension pilote le Chrome de l'appareil où David
est assis (le MacBook), pas celui du Mac mini. Une adresse `localhost`, `127.0.0.1` ou `[::1]`
y désigne le MacBook, où rien n'écoute : la page ne s'ouvre pas (constat de David, 2026-11-22 ;
non reproduit). Deux voies : `pnpm voir <page>` ([voir-une-page.md](voir-une-page.md)), qui se
passe de Chrome ; ou donner à Chrome le lien de `pnpm lien`, jamais une adresse locale.

⛔ Jamais `.env` (base de PROD) pour ces essais : données d'élèves mineurs. Toujours `.env.local`.

## Quelle méthode

| Appareil | Page                    | Méthode                                          | État                         |
| -------- | ----------------------- | ------------------------------------------------ | ---------------------------- |
| MacBook  | avec ou sans connexion  | tunnel SSH (ci-dessous)                          | ✅ utilisé souvent           |
| iPhone   | sans connexion (public) | `--host 0.0.0.0`, `http://100.79.226.105:<port>` | ✅ utilisé (pages publiques) |
| iPhone   | avec connexion          | Tailscale Serve (HTTPS) : `pnpm lien`            | ✅ réussi le 2026-10-27      |

### MacBook : tunnel SSH

Sur le Mac mini, un serveur ordinaire (sans `--host`, sans rien changer à l'environnement) :
le dépôt principal sur 5175, un worktree sur 5176+.

Sur le **MacBook** (commande que David tape lui-même) :

```bash
ssh -L <port>:localhost:<port> -L 54321:localhost:54321 david@100.79.226.105
```

puis ouvrir `http://localhost:<port>`. Raccourci sur le MacBook (fonction dans `~/.zshrc`) :
`tunnel` (5175) ou `tunnel 5176` :

```zsh
# Tunnel vers le serveur de dev du Mac mini (Chiphre) : tunnel [port], 5175 par défaut
tunnel() {
	local port=${1:-5175}
	echo "→ http://localhost:${port}"
	ssh -L "${port}:localhost:${port}" -L 54321:localhost:54321 david@100.79.226.105
}
```

⚠️ `${port}` avec accolades : en zsh, `"$port:localhost"` lit `:l` comme un modificateur
(minuscules) et donne `5175ocalhost` (« Bad local forwarding specification »).

« bind [127.0.0.1]:54321: Address already in use » = un ancien tunnel tourne encore sur le
MacBook. Sans gravité : il mène au même Supabase, le nouveau port de l'appli marche. Pour
nettoyer : `untunnel` (ci-dessous), `exit` dans l'ancien terminal, ou
`lsof -nP -iTCP:54321 -sTCP:LISTEN` puis `kill <pid>`.

Fermer tous les tunnels vers le Mac mini (à côté de `tunnel`, dans `~/.zshrc`) :

```zsh
# Ferme tous les tunnels ouverts vers le Mac mini (lancés par `tunnel`)
untunnel() {
	local pids
	pids=$(pgrep -f 'ssh -L.*david@100\.79\.226\.105')
	if [[ -z $pids ]]; then
		echo "Aucun tunnel ouvert."
		return
	fi
	echo "Fermeture : $(echo $pids | tr '\n' ' ')"
	kill ${=pids}
}
```

Le navigateur se croit sur `localhost` : cookie accepté,
Supabase joint par le tunnel 54321. « channel N: open failed: connect failed » = aucun serveur
sur ce port au Mac mini : relancer le serveur, ou donner le bon port.

### iPhone, page publique : `--host`

```bash
pnpm dev --port <n> --strictPort --host 0.0.0.0
```

Lien : `http://100.79.226.105:<n>/<page>`. Suffit pour une page sans compte (`/demo/…`). Toute
page derrière une connexion échoue (piège 1).

### iPhone, page avec connexion : Tailscale Serve

> `pnpm lien` fait tout ce qui suit. Les commandes à la main restent pour comprendre, ou en
> secours.

Serve publie un port du Mac mini en **HTTPS, sur le tailnet seulement** (jamais `funnel`, qui
ouvre à Internet). Il faut l'activer une fois dans la console Tailscale (lien donné par
`tailscale serve` la première fois, à ouvrir par David).

```bash
# 1. L'appli, avec Supabase joint par le tailnet (8443) et le nom du Mac mini autorisé par Vite
PUBLIC_SUPABASE_URL=https://serveur.tail99357e.ts.net:8443 \
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=serveur.tail99357e.ts.net \
pnpm dev --port <n> --strictPort

# 2. Les deux ports en HTTPS sur le tailnet
tailscale serve --bg --https=443 http://localhost:<n>
tailscale serve --bg --https=8443 http://localhost:54321

# Arrêter après l'essai
tailscale serve reset
```

Lien : `https://serveur.tail99357e.ts.net/<page>`. Comptes locaux :
`supabase/seed/dev_accounts.sql` (`teacher@local.test` / `local-teacher`…).

✅ Vérifiée de bout en bout le 2026-10-27 (connexion prof, droite à placer au doigt). Rien à
corriger dans les commandes ; deux points de mise en route :

- **Activation, une fois pour toutes (faite le 2026-10-27).** La page d'activation propose deux
  cases : « HTTPS certificates » (obligatoire) et « Tailscale Funnel » (**à décocher**).
- **Le nom de la machine est public.** Un certificat HTTPS inscrit le nom dans les registres
  publics de Certificate Transparency (crt.sh), sans retour possible. Le nom ne donne aucun accès
  (il ne répond que sur le tailnet), mais il ne doit rien dire : le Mac mini a été renommé
  `serveur` dans la console Tailscale avant l'activation (son nom d'avant contenait un prénom).
- `tailscale serve`, lancé sans terminal (agent, tâche de fond), reste muet tant que Serve n'est
  pas activé : le lancer par `script -q /dev/null tailscale serve …` pour voir le lien
  d'activation.
- Vérifier avant de donner le lien : `tailscale serve status` affiche **(tailnet only)** sur les
  deux ports.
- **Le port 443 est peut-être celui d'une autre session** (`tailscale serve status` le montre).
  Ne pas le reprendre : publier son serveur sur `--https=10000` (lien
  `https://serveur.tail99357e.ts.net:10000/`), et ne jamais faire `tailscale serve reset`, qui
  couperait le lien de l'autre. Arrêter le sien seul : `tailscale serve --https=10000 off`.
- **Avant de pointer Serve sur un port, vérifier qu'il sert SON serveur** :
  `lsof -nP -iTCP:<port> -sTCP:LISTEN`, puis le dossier du processus
  (`lsof -p <pid> | awk '$4=="cwd"'`). Les worktrees occupent 5176 et au-delà, sans ordre fixe.
- **« Failed to fetch dynamically imported module » qui résiste au rechargement forcé**, alors que
  les modules répondent en 200 : le serveur de dev tourne depuis avant un `git pull` ou un merge
  (2026-11-19). Relancer un serveur neuf et y pointer Serve.

## Limiteur de connexion

Sous `pnpm dev`, une connexion venue de `127.0.0.1` ne compte pas (`skipsLoginRateLimit`,
`docs/systeme/auth.md`). Le tunnel SSH et Serve arrivent en `127.0.0.1` : ils contournent le
limiteur. C'est acceptable parce qu'ils restent privés : **jamais de tunnel public** (ngrok,
`tailscale funnel`…). Depuis une autre IP (`--host`), le limiteur s'applique : 5 essais par IP
en 15 min.
