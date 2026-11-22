---
couvre:
  - 'scripts/retours/**'
  - 'src/lib/dev/**'
  - 'src/lib/components/dev/**'
---

# Bouton « Signaler » : envoyer un retour depuis la page (serveur de dev)

> Quand David teste sur l'iPhone ou le MacBook et dit « regarde mon retour » : **`pnpm retours`**
> dans le worktree du serveur qu'il regardait. Le retour dit la page, l'écran, le compte et les
> erreurs de console ; pour l'image, refaire la page avec la commande `pnpm voir` qu'il propose.

```bash
pnpm retours            # le dernier retour de CE worktree
pnpm retours 2          # l'avant-dernier
pnpm retours --liste    # les dix derniers, une ligne chacun
```

## Ce que voit David

Sur le **serveur de dev seulement**, un petit bouton « Signaler » en bas à gauche de toutes les
pages. Un appui ouvre une case de texte **en haut de l'écran** (en bas, le clavier de l'iPhone la
cacherait). « Envoyer » écrit le retour sur le Mac mini ; la note est facultative.

## Ce qui est écrit

Un fichier par retour dans `.captures/retours/` du worktree (ignoré par git), nommé par sa date de
réception. Il contient :

- la note (2 000 caractères au plus) ;
- l'adresse de la page, la taille de l'écran et sa densité, le navigateur ;
- le compte connecté (adresse et rôle : des comptes fictifs, la base est locale), ou « visiteur » ;
- les **50 dernières** erreurs vues depuis le chargement de la page : `console.error`, exceptions
  non rattrapées, promesses rejetées, avec leur heure. Au-delà de 50, le nombre d'erreurs écartées.

**Pas d'image de l'écran** : Safari ne sait pas se photographier. `pnpm retours` affiche la
commande [`pnpm voir`](voir-une-page.md) qui refait la même page, au même format (`--ordi` à partir
de 1 024 px de large) et avec le même rôle de compte.

Les 200 retours les plus récents sont gardés, les plus anciens effacés.

## Limites

- Les erreurs sont gardées **depuis le chargement de la page**, pas depuis l'arrivée sur l'écran
  en cours : une navigation interne ne vide pas la liste (l'heure de chaque erreur permet de trier).
  Une erreur survenue avant le démarrage de l'appli dans le navigateur n'est pas vue.
- Le retour arrive dans le worktree **du serveur regardé** : `pnpm retours` se lance là.
- Sur le MacBook par le tunnel SSH comme sur l'iPhone par le lien du tailnet
  ([tester-sur-un-autre-appareil.md](tester-sur-un-autre-appareil.md)), le bouton marche pareil.

## Ce qui n'existe pas en prod

- **La route** `POST /__dev/retours` n'est pas une route SvelteKit : c'est un middleware du
  serveur de dev de Vite (`scripts/retours/plugin.ts`, `apply: 'serve'`). Elle n'est ni dans le
  build ni sur Vercel.
- **Le bouton** et la collecte des erreurs ne sont chargés que sous `import.meta.env.DEV`
  (`src/routes/+layout.svelte`, `src/hooks.client.ts`), remplacé par `false` au build.
- **Garde** : étape « Bouton signaler absent du build » de la CI (`quality.yml`), qui cherche
  l'adresse de la route et l'identifiant du bouton dans tout le build.

## Refus de la route

- **Base qui n'est pas locale** (`PUBLIC_SUPABASE_URL` ni `localhost` / `127.0.0.1`, ni le Mac
  mini par le tailnet) ou variable `VERCEL` posée : 403, rien n'est écrit. Le bouton est alors
  caché. Raison : le retour porte l'adresse du compte connecté, qui ne doit être que fictive.
- **Requête venue d'un autre site** : l'en-tête `Origin` doit être celui du serveur lui-même, et le
  corps du JSON. Un autre site ouvert dans le même navigateur ne peut pas écrire sur le Mac mini.
- **Corps de plus de 512 Ko**, JSON illisible, champ inconnu ou hors bornes (Zod, objets stricts).
- Le nom du fichier ne reprend rien de l'entrée ; le compte rendu de `pnpm retours` retire les
  caractères de contrôle du terminal.
