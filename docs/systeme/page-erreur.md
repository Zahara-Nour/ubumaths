---
couvre:
  - src/routes/+error.svelte
  - 'src/lib/error-page/**'
  - 'src/lib/components/error-page/**'
  - 'src/routes/(public)/test-erreur/**'
  - src/lib/server/maintenance.ts
---

# Page d'erreur (404, 403, 500…)

> Vérifié contre le code le 2026-10-11.

## À quoi ça sert

Une seule page pour toutes les erreurs du site, rendue par `src/routes/+error.svelte` (il n'y en a
pas d'autre : toute erreur, même sous `/dashboard`, arrive ici). Elle reprend la page 404 de
l'ancien site ubumaths.fr — la spirale des décimales de π qui tourne et sa question « As-tu
regardé à la 2 567 241ème décimale ? » — avec trois changements de fond :

- **la blague est devenue vraie.** La 2 567 241ᵉ décimale de π est un 9 (…0959 0848…), pas un 404.
  La page cite désormais la **vraie** première apparition du code dans π : 404 commence à la
  1 272ᵉ décimale (…684710**404**753464…), et ces trois chiffres sont colorés dans la spirale ;
- **chaque code a son texte** : l'ancienne page disait « Page introuvable » même quand le serveur
  plantait ;
- **une sortie claire** : un bouton d'action au lieu d'un lien caché dans l'image, et suggestions
  de pages proches pour une 404.

## Ce que voit l'utilisateur

1. La spirale de π (thème clair ou sombre), Père Ubu au centre, immobile. Sur grand écran (`lg`),
   deux colonnes — spirale à gauche, texte à droite — pour tout voir sans défiler.
2. « Erreur 404 » et le titre (`<h1>`) propre au code (`describeError`,
   `src/lib/error-page/error-copy.ts`). Aucune explication dessous : le titre, la phrase sur π et
   les actions suffisent.
3. Pour une erreur 4xx, le message précis (`error(404, 'Exercice introuvable')`) **remplace le
   titre** (« Exercice introuvable » au lieu de « Page introuvable », onglet compris), sauf s'il
   n'est qu'une formule générique (« Not Found », « Unauthorized », « Accès refusé »…, liste
   `GENERIC_MESSAGES`, comparée sans casse ni accents) : le titre français reste alors.
4. Pour un code de la table π : « Le nombre {code} {`piVerb`} Nᵉ décimale de π{`piTwist`}. » — le
   verbe porte sa préposition (« à la », « jusqu'à la », « dès la »), la chute sa ponctuation
   d'attache. Pas d'extrait des décimales en clair : le code est déjà coloré dans la spirale. Les
   phrases, choisies par David :

   | Code | Titre                 | Phrase                                                                                                           |
   | ---- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
   | 400  | Demande impossible    | Le nombre 400 est bien formé à la 1 174ᵉ décimale de π ; ta demande, elle, ne l'est pas.                         |
   | 401  | Connexion requise     | Le nombre 401 se présente à la 1 197ᵉ décimale de π ; ta page, elle, voudrait que tu en fasses autant.           |
   | 403  | Accès refusé          | Le nombre 403 a été autorisé à s'installer à la 723ᵉ décimale de π ; toi, sur cette page, tu ne l'es pas.        |
   | 404  | Page introuvable      | Le nombre 404 apparaît à la 1 272ᵉ décimale de π, mais la page, elle, reste introuvable.                         |
   | 408  | Délai dépassé         | Le nombre 408 arrive dès la 145ᵉ décimale de π ; ta demande, elle, a mis trop de temps.                          |
   | 410  | Page disparue         | Le nombre 410 a un bail éternel à la 162ᵉ décimale de π ; cette page, elle, a rendu les clés.                    |
   | 429  | Trop de demandes      | Le nombre 429 a attendu jusqu'à la 1 229ᵉ décimale de π ; toi, quelques secondes suffiront.                      |
   | 500  | Le serveur a trébuché | Le nombre 500 tient bon jusqu'à la 6 238ᵉ décimale de π ; le serveur, lui, a trébuché bien avant.                |
   | 503  | Service indisponible  | Le nombre 503 est de service à la 837ᵉ décimale de π ; cette page, elle, est hors service pour quelques minutes. |
   | 4xx  | Demande impossible    | Le nombre 413 apparaît à la 1 075ᵉ décimale de π ; ta demande, elle, n'a pas abouti.                             |
   | 5xx  | Le serveur a trébuché | Le nombre 502 apparaît à la 31ᵉ décimale de π ; le serveur, lui, a perdu le fil.                                 |

   503 dit « cette page » et non « Chiphre » : une 503 de route (glossaire, Mathémo) laisse le reste
   du site debout. Les deux dernières lignes sont les replis des codes rares (405, 413, 415, 422 ;
   501, 502, 504). Un code absent de la table π (418…) n'a pas de phrase.

5. Pour une 404 : une phrase « Tu cherchais peut-être A, B ou C ? », jusqu'à trois pages proches
   en liens.
6. Un seul bouton plein : « Se connecter » (401) ou « Réessayer » (5xx, 408, 429), sinon « Retour
   à l'accueil ». Le reste en simples liens : « Retour à l'accueil » (toujours présent) et
   « ← Page précédente » (seulement s'il ramène sur Chiphre).
7. Repliés sous « Détails techniques » : le message et le début de la pile d'une erreur
   inattendue côté client (`App.Error.detail`), ou le message d'une erreur 5xx — il peut venir
   brut de la base (noms de tables) et n'a pas à s'afficher en grand devant un élève.

Onglet : « {titre} | Chiphre » (« Page introuvable | Chiphre », « Exercice introuvable |
Chiphre »…), `noindex`. SvelteKit renvoie le bon code HTTP.

## Carte du code

| Fichier                                         | Rôle                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `src/routes/+error.svelte`                      | La page                                                              |
| `src/lib/error-page/error-copy.ts`              | Titre, phrase sur π (`piVerb`, `piTwist`), actions, détail technique |
| `src/lib/error-page/pi-status.ts`               | Table code → première apparition dans π (rang, chiffres voisins)     |
| `src/lib/error-page/pi-decimals.ts`             | 1 800 premières décimales, pour la spirale                           |
| `src/lib/error-page/pi-spiral.ts`               | Géométrie de la spirale (pure, testée)                               |
| `src/lib/error-page/suggestions.ts`             | « Tu cherchais peut-être… »                                          |
| `src/lib/components/error-page/PiSpiral.svelte` | Rendu SVG de la spirale                                              |
| `src/lib/error-page/pi-spiral-svg.ts`           | La même spirale en texte SVG, pour la page de maintenance            |
| `src/lib/server/maintenance.ts`                 | Page de maintenance (HTML autonome, même famille)                    |
| `src/routes/(public)/test-erreur/`              | Démo : tous les cas, vraie erreur par code                           |
| `src/hooks.client.ts` (`handleError`)           | Remplit `detail` ; journalise une 404 de navigation en avertissement |
| `src/lib/seo/sitemap-pages.ts`                  | Pages candidates aux suggestions (leur `title` est le texte du lien) |

## Invariants

- **`+error.svelte` est préchargé sur toutes les pages** : SvelteKit importe le layout racine ET
  l'erreur racine au démarrage (`default_error_loader`, `client.js`). Il doit rester léger. La
  spirale y est importée **statiquement** malgré tout : rendue par le serveur, elle est visible dès
  le HTML. Chargée à la demande (première version), elle apparaissait en retard. Coût mesuré au
  build : chunk préchargé de 4,6 Ko à 6,2 Ko gzip (les 1 800 décimales se compressent bien). La
  table de `pi-status.ts` reste précalculée, pas calculée.
- **Rotation fluide** : la spirale est une couche à part (`will-change: transform`) — dessinée une
  fois, puis seulement tournée, au lieu de redessiner ~1 660 chiffres à chaque image.
- **Les boutons ne doivent jamais disparaître** : le layout racine masque en-tête et barre
  latérale sous `/dashboard`, une erreur y est donc rendue sans aucune navigation.
- **Tout chiffre affiché est vrai.** `pi-status.test.ts` recalcule π (formule de Machin, en
  BigInt, 7 000 décimales) et vérifie chaque ligne de la table — rang de la **première**
  apparition et chiffres voisins — ainsi que `PI_DECIMALS`. Le rang de 404 a aussi été vérifié
  contre l'API pi.delivery de Google.
- **Mouvement réduit** : avec `prefers-reduced-motion`, la spirale ne tourne pas.
- **Couleurs** : la spirale est en `currentColor` (suit le thème), le code en ambre ; l'ancien PNG
  (chiffres noirs sur fond transparent) était invisible en mode sombre.
- **« Page précédente »** n'apparaît qu'après une navigation interne (`afterNavigate`, `from`) ou
  une arrivée depuis une page du site (`document.referrer`) : `history.length` compte aussi
  l'onglet neuf, et le bouton aurait fait quitter le site.
- **Exception à la règle `BackLink`** (CLAUDE.md, règle 7 ; [composants-ui.md](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire)),
  confirmée par David le 2026-10-11 : « Page précédente » reste un `history.back()`. L'adresse
  demandée n'existe pas ou n'est pas ouverte : on n'en peut pas lire une page parente fiable, et
  l'endroit utile est bien celui d'où l'élève vient (le lien cassé). Les pages parentes passent
  déjà par « Tu cherchais peut-être… ».

## La spirale

Spirale logarithmique : à chaque tour, le rayon est multiplié par 0,92 et la taille des chiffres
suit le rayon. L'angle entre deux chiffres est donc constant et l'écart entre deux tours reste
proportionnel aux chiffres : rien ne se chevauche. Réglages (`DEFAULT_SPIRAL_OPTIONS`) choisis pour
que le 404 tombe vers la mi-rayon, encore lisible, et que la spirale s'arrête autour du disque
de Père Ubu (~1 660 chiffres). Les codes situés au-delà (500 : 6 238ᵉ décimale) ne sont pas
colorés dans la spirale ; la phrase reste affichée.

## Page de maintenance

Le mode maintenance (`pnpm maintenance:on`, `src/lib/server/maintenance.ts`) ne passe **pas** par
`+error.svelte` : il coupe la requête avant Supabase et l'authentification, et doit tenir pendant
qu'on fige la base. Sa page est donc du HTML autonome — ni JS, ni base, ni ressource externe —
mais de la même famille : spirale de π avec le 503 en ambre (`piSpiralSvg`,
`src/lib/error-page/pi-spiral-svg.ts`, même géométrie que `PiSpiral.svelte`), Père Ubu intégré
dans la page (`?inline`, ~45 Ko), « Erreur 503 », « Maintenance en cours », « Le nombre 503 est de
service à la 837ᵉ décimale de π ; Chiphre, lui, est hors service le temps d'une mise à jour. »,
l'heure de retour prévue si `MAINTENANCE_UNTIL` est fixé, et « Réessayer » (simple lien vers la
même adresse). Poids : ~175 Ko, ~64 Ko compressés.

Un élève déjà sur le site au début de la maintenance, qui navigue, voit en revanche la page
d'erreur 503 de l'application (« …cette page, elle, est hors service pour quelques minutes »),
sans l'heure de retour.

## Page de démonstration

`/test-erreur` (`src/routes/(public)/test-erreur/`) liste tous les cas, chacun avec ce qu'on doit
voir : fautes de frappe et suggestions, message précis en titre, chaque code de la table, repli
sur la famille, message brut d'une 5xx. `/test-erreur/<code>?message=…` lève une vraie erreur
HTTP (code 400-599 et message validés par Zod). `/test-erreur/plantage` lève une exception
inattendue, **en dev seulement** (404 en prod, pour ne pas polluer le journal des erreurs) : suivi
depuis la démo, il montre la pile sous « Détails techniques » ; en chargement complet, le rendu
serveur sans pile. Exclue par `robots.txt`, `noindex`.

## Comment étendre

- **Un nouveau code dans la table** : calculer sa première apparition (le test donne la méthode),
  ajouter la ligne dans `PI_STATUS_OCCURRENCES` ; le test la vérifie.
- **Un nouveau texte pour un code** : `COPY_BY_STATUS` dans `error-copy.ts` — `title`, `piTwist`
  (obligatoire, ponctuation d'attache comprise) et `piVerb` si « apparaît à la » ne convient pas ;
  une ligne dans le tableau ci-dessus et dans `error-copy.test.ts`.
- **Une page à suggérer** : l'ajouter à `SITEMAP_PAGES` (publique et pérenne), avec son `title`.

## Tests

- `src/lib/error-page/__tests__/` : π (contre un calcul indépendant), spirale et son texte SVG,
  suggestions, textes (une ligne par code).
- `src/lib/server/__tests__/maintenance.test.ts` : page de maintenance (503 coloré dans la
  spirale, image intégrée, aucune ressource externe) et comportement du mode.
- `src/__tests__/hooks-client-erreurs.test.ts` : message affiché sans pile, `detail`, 404 en
  avertissement.
- `src/lib/__tests__/messages-erreur-en-francais.test.ts` : messages 4xx en français (garde).

## Écarts connus

- Les messages 4xx des chargements de page et de `src/lib/server` sont en français correct
  depuis le 2026-10-11 (~100 messages traduits), et le restent : le garde
  `src/lib/__tests__/messages-erreur-en-francais.test.ts` refuse un mot anglais ou un mot sans
  accent dans un `error(4xx, '…')` de ces fichiers. Hors garde : les `+server.ts` (API, réponse
  JSON qui n'atteint pas la page d'erreur) et les messages dynamiques venus de la base
  (`warnings.ts` relaie le texte d'une RPC).
