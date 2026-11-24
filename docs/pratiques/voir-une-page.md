---
couvre:
  - 'scripts/voir/**'
---

# `pnpm voir` : regarder une page sans écran

> Quand il faut **voir** une page du serveur de dev (rendu sur téléphone, erreurs de console) et
> que David n'est pas devant le Mac mini : `pnpm voir <page>`, lire l'image, la lui envoyer.
> Remplace Claude dans Chrome, qui ne marche pas à distance avec une adresse locale
> ([pourquoi](tester-sur-un-autre-appareil.md#les-deux-pièges)).

```bash
pnpm voir /atelier                      # format iPhone, moteur de Safari (WebKit)
pnpm voir /dashboard --compte prof      # connecté : prof, eleve ou admin (comptes fictifs)
pnpm voir /shtam --ordi                 # grand écran (1440 × 900)
pnpm voir /atelier --petit              # petit téléphone : iPhone SE, 375 px de large
pnpm voir /atelier --chrome             # Chromium au lieu de WebKit
pnpm voir /atelier --port 5177          # si deux serveurs tournent dans le worktree
```

## Ce qu'elle fait

1. Trouve le serveur de dev lancé **depuis ce worktree** (le process `node` qui écoute et dont le
   dossier de lancement est la racine du worktree). Elle **n'en lance jamais** : sans serveur, elle
   donne la commande et s'arrête.
2. Ouvre la page dans un navigateur sans écran (Playwright), attend la fin du chargement (calme
   réseau, 10 s au plus, puis polices).
3. Écrit dans `.captures/voir/` (ignoré par git) :
   - `<date>-<page>-<format>-<moteur>[-<compte>].png` : la page entière, un pixel par pixel CSS ;
   - `…-partie-N.png` : la même image en tranches de 1 600 px quand elle est plus haute. **Lire
     les tranches** : une image très haute est réduite à la lecture et devient illisible ;
   - `….json` : adresse finale, titre, erreurs de console (exceptions comprises), requêtes en
     échec (réseau, ou réponse ≥ 400).
4. Affiche le même compte rendu dans le terminal.

## Limites

- **Page très longue** : image coupée à 6 000 px, signalée (`cut` dans le compte rendu).
- **Page qui renvoie vers la connexion** : signalé ; relancer avec `--compte`.
- **Hauteur de la page** : l'appli défile dans un cadre intérieur, pas dans la fenêtre. La commande
  agrandit donc la fenêtre du navigateur de ce qui reste à faire défiler : un élément dimensionné
  sur la hauteur de l'écran (`h-screen`, `vh`) paraît plus haut que sur un vrai téléphone. Les
  660 premiers pixels sont fidèles ; pour un doute sur le reste, le vrai iPhone fait foi.
- **Élève** : `eleve01@local.test` (base remplie par `pnpm db:neuf`), à défaut
  `student@local.test` (seed de base, sans classe ni activité). Le compte utilisé est affiché.
- WebKit de Playwright n'est pas Safari d'iOS : même moteur, pas le même clavier ni les mêmes
  barres. Un bug de clavier ou de zone de sécurité se vérifie sur l'iPhone
  ([tester-sur-un-autre-appareil.md](tester-sur-un-autre-appareil.md)).

## Refus

- **Autre site que le serveur local** (`https://…`, `//hôte`, autre port) : refusé avant tout.
- **`--compte` sans preuve que le serveur vise la base locale** : refusé. Il faut
  `PUBLIC_SUPABASE_URL` locale dans `.env.local`, et **aucune** adresse de Supabase distante, ni
  dans `.env.local`, `.env.development`, `.env.development.local`, ni dans la commande qui a lancé
  le serveur. Le serveur publié pour l'iPhone par `pnpm lien` est un serveur ordinaire (Supabase
  local y est relayé, cf. [tester-sur-un-autre-appareil.md](tester-sur-un-autre-appareil.md)) :
  `--compte` y marche. Seul un serveur lancé à l'ancienne, avec l'adresse de Supabase du tailnet
  dans la commande, est refusé : le relancer sans variable.
- **Redirection de la page vers un autre site** : coupée (elle apparaît dans les requêtes en échec).
- **Navigateur absent** (Playwright mis à jour) : la commande dit quoi lancer
  (`pnpm exec playwright install webkit`).

## Code

`scripts/voir/logique.ts` (tout ce qui se décide sans navigateur, testé par
`scripts/__tests__/voir.test.ts`) · `scripts/voir/index.ts` (pilotage du navigateur, vérifié en
lançant la commande) · `scripts/voir/serveurs.ts` (serveurs de dev du Mac et leur environnement,
partagé avec `pnpm lien`, cf. [tester-sur-un-autre-appareil.md](tester-sur-un-autre-appareil.md)).
