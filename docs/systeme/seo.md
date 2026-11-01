---
couvre:
  - src/lib/seo/JsonLd.svelte
  - src/lib/seo/SeoHead.svelte
  - src/lib/seo/site.ts
---

# Référencement (SEO) : en-tête des pages et données structurées

> Vérifié contre le code le 2026-10-12 (commit 4ab55c5e8).
> Voisins, non recopiés ici : la liste des pages proposées aux moteurs (`src/lib/seo/sitemap-pages.ts`)
> est dans [carte-des-fonctionnalites.md](carte-des-fonctionnalites.md) ; le plan du site
> (`src/routes/sitemap.xml/`) est dans [univers-chiphre.md](univers-chiphre.md).

## À quoi ça sert

Une page publique dit aux moteurs et aux réseaux sociaux ce qu'elle est : un titre, une
description, son adresse canonique, une image de partage. Trois fichiers portent ça :

| Fichier                      | Rôle                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| `src/lib/seo/site.ts`        | Domaine canonique, nom, logo, image par défaut ; trois fonctions pures |
| `src/lib/seo/SeoHead.svelte` | Le `<svelte:head>` d'une page : titre, description, canonique, partage |
| `src/lib/seo/JsonLd.svelte`  | Une balise `<script type="application/ld+json">` (données schema.org)  |

## Comment c'est construit

### `site.ts`

- `SITE_URL = 'https://www.chiph.re'`, `SITE_NAME = 'Chiphre'`, `SITE_LOGO = '/logo.png'`,
  `DEFAULT_OG_IMAGE = '/og-image.png'` (1200 × 630, dans `static/`).
- `absoluteUrl(path)` : préfixe un chemin par `SITE_URL`. **Toujours le domaine de prod**, même
  servi depuis une préproduction : sinon Google indexerait l'adresse d'un déploiement de test.
- `canonicalUrl(pathOrUrl)` : la même adresse sur `SITE_URL`, quelle que soit son origine (serveur
  local, aperçu Vercel, `chiph.re` qui redirige en 308 vers `www`) ; chemin, requête et fragment
  gardés. Sert aux QR codes ([qr-codes.md](qr-codes.md)).
- `toJsonLdScript(data)` : `JSON.stringify` puis `<`, `>`, `&` échappés en `<`… Le JSON relu
  est identique, mais un titre d'article ne peut ni fermer la balise ni ouvrir un commentaire.
- `toPlainText(text)` : texte ubumark → texte brut (formules `~…~` et `$…$` aplaties, `\pi` → π,
  gras retiré). Sert à la description d'un article du Shtam.

### `SeoHead.svelte`

Props : `title`, `description`, `type` (`website` par défaut, `article` pour le Shtam), `image`
(chemin dans `static/`, défaut `DEFAULT_OG_IMAGE`), `noindex`. Écrit `<title>`, `description`,
`<link rel="canonical">`, Open Graph (`og:*`, locale `fr_FR`, image 1200 × 630 et son `alt`),
`twitter:card = summary_large_image`, et `<meta name="robots" content="noindex">` si demandé.

L'URL canonique est `absoluteUrl(page.url.pathname)` : **le chemin seul**, la query string est
ignorée (`?depuis=…` ne fait pas une autre page).

Utilisé par 32 pages de `src/routes/(public)/` (accueil, Shtam, chiffrement, outils, pages
légales, `/a-propos`, `/upsilon`, page d'un terme du glossaire `/glossaire/[slug]`…) et par `src/lib/components/kingdom-tour/AudienceView.svelte`
(pages `/eleves`, `/parents`, `/professeurs`).

### `JsonLd.svelte`

Prend `data: Record<string, unknown>`, rend `{@html toJsonLdScript(data)}` dans `<svelte:head>`.
Deux appelants :

- `src/routes/(public)/+page.svelte` : `WebSite` + `Organization` (nom, URL, logo) ;
- `src/routes/(public)/shtam/[slug]/+page.svelte` : `SatiricalArticle` (titre tronqué à 110
  caractères, date, auteur, éditeur, `isPartOf` le périodique Le Shtam).

### Ce qui n'est pas dans `src/lib/seo/`

- `static/robots.txt` : interdit `/dashboard/`, `/auth/`, `/api/`, `/dev` (`/dev$` et `/dev/`, pour épargner un futur `/devoirs`), `/aide-ecriture`, et les pages de démo
  (`/geometry-demo`, ancienne adresse redirigée, `/construction-demo`, `/test-`, `/slides/`, `/blockly`) — la vitrine `/demo` est ouverte (chantier demo-debug, phase 7) ; interdit tout le site aux robots d'**entraînement** des IA (`GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Applebot-Extended`…) en laissant passer ceux de recherche et de réponse, qui citent la page (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `PerplexityBot`) ; annonce `https://www.chiph.re/sitemap.xml`.
- En-tête HTTP `X-Robots-Tag: noindex, nofollow` posé par les pages à jeton (cahier de textes,
  cours : `src/routes/(public)/cahier/[token]/`, `src/routes/(public)/cours/[token]/`).

## Tests

- `src/lib/seo/__tests__/site.test.ts` : URL absolue, JSON-LD relisible, aucun texte ne ferme la
  balise, formule ubumark en texte brut, logo carré d'au moins 512 px.
- `src/lib/seo/__tests__/SeoHead.svelte.test.ts` : balises écrites ; type `article` et `noindex`.

## Pièges

- **Ne pas passer une URL absolue à `image`** : `absoluteUrl` préfixe toujours `SITE_URL`.
- **`robots.txt` bloque l'exploration, pas l'indexation.** Une page `Disallow` n'est pas lue,
  donc son `noindex` non plus. Les pages de mise au point qui ont aussi un `noindex`
  (sous `/dev`, réservé à l'admin : `/dev/structure`, `/dev/cadres`, `/dev/erreurs/page` et d'autres) le doublent par précaution.
- `SeoHead` écrit `<title>` : une page qui l'utilise ne doit pas en ajouter un second dans son
  propre `<svelte:head>`.

## Écarts connus

- **Deux `SITE_URL`** : `src/lib/seo/site.ts` (`https://www.chiph.re`, sans barre finale) et
  `src/lib/email-templates/welcome.ts` (`https://www.chiph.re/`, avec). Le second ne passe pas
  par `site.ts`.
- **Données structurées limitées à deux pages** (accueil, article du Shtam). Pas de JSON-LD pour
  les exercices publics ni les pages outils.
