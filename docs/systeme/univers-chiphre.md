# Univers Chiphre : Cabinet Noir, Almanach, Shtam, lore

> Vérifié contre le code le 2026-10-10. Le **contenu éditorial** (personnages, pays, voix, calendrier)
> vit dans [docs/Chiphres/](../Chiphres/README.md) — le Compendium fait foi ; cette doc ne décrit que
> le **code** qui le sert. Rédiger un article : [shtam-articles.md](../pratiques/shtam-articles.md).

## À quoi ça sert

Quatre pièces publiques, sans compte, qui habillent la plateforme de l'univers pataphysique
(Jarry / Ubu) :

- le **Cabinet Noir de Turingrad** (`/chiffrement`) : établis de chiffrement et défis ;
- l'**Almanach des Chiphres** (`/almanach`, date de l'accueil et du tableau de bord) ;
- le **Shtam** (`/shtam`) : la gazette parodique, chaque article fermé par son **Vrai du faux** ;
- le **lore de l'interface** (`src/lib/config/lore.ts`) : le vocabulaire des boutons et menus.

Termes ([CONTEXT.md](../../CONTEXT.md)) : Chiphre (marque, singulier), chiphres, Mathres, Shtam,
Vrai du faux (§ « La plateforme ») ; Cabinet Noir, chiffrer / déchiffrer / décrypter, chiffre (un)
(§ « Le Cabinet Noir »). ⛔ « crypter ». Le **contenu mathématique** (énoncés, corrections) n'est
jamais rebrandé : seul le décor l'est.

## Carte du code

### Cabinet Noir (`src/lib/ciphers/`, 100 % client, aucune donnée en base)

| Fichier                                                    | Rôle                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/lib/ciphers/alphabet.ts`                              | A-Z normalisé (`normalizeText`), `mapLetters`, `CipherResult` / `CipherStep`                         |
| `caesar.ts`, `atbash.ts`, `substitution.ts`, `polybius.ts` | Chiffres du collège                                                                                  |
| `scytale.ts`                                               | Transposition, sans bourrage (`scytaleCandidates` pour décrypter)                                    |
| `affine.ts`, `vigenere.ts`, `hill.ts`, `rsa.ts`            | Chiffres du lycée, avec leurs attaques (`affineBruteForce`, `kasiski`, `hillRowAttack`, `factorize`) |
| `modular.ts`                                               | `gcd`, `modInverse`, écriture des réductions modulo 26                                               |
| `frequency.ts`                                             | `letterFrequencies`, `FRENCH_FREQUENCIES`, `chiSquared`, `caesarBruteForce`                          |
| `solver.ts`                                                | Décryptage manuel d'une substitution (`applyGuesses`, `guessConflicts`)                              |
| `errors.ts`, `outcome.ts`                                  | `CipherInputError` (message français affiché) ; `attempt` → `CipherOutcome`                          |
| `dispatches.ts`                                            | Les Dépêches du Czar : `DISPATCHES` (neuf messages, un par chiffre), `checkAnswer`, `isUnlocked`     |
| `dispatch-progress.ts`                                     | Progression et indices en `localStorage` seulement (`PROGRESS_KEY`, `HINTS_KEY`)                     |
| `tool-link.ts`                                             | Lien d'une dépêche vers l'établi (`?decrypter=…`, `MAX_URL_MESSAGE`)                                 |

Interface : `src/lib/components/ciphers/` (`CipherWorkbench.svelte` = trois onglets Chiffrer ·
Déchiffrer · Décrypter, `DispatchCampaign.svelte`, une attaque par chiffre du lycée). Pages :
`src/routes/(public)/chiffrement/` — accueil, `depeches/`, et une page par chiffre (`cesar`,
`atbash`, `substitution`, `scytale`, `polybe`, `affine`, `vigenere`, `hill`, `rsa`).

### Almanach (`src/lib/almanach/`)

| Fichier                                                 | Rôle                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/almanach/calendar.ts`                          | Grégorien ↔ pataphysique : `civilToPataphysical`, `toPataphysicalDate`, `fromPataphysicalDate`, fêtes (`FEASTS`), formats |
| `src/lib/almanach/palettes.ts`                          | Ambiance du mois (halo, traits d'Ubu, clair / sombre) : `MONTH_PALETTES`, `paletteCssVars`                                 |
| `src/routes/(public)/almanach/`                         | Page de l'Almanach + convertisseur (`AlmanachConverter.svelte`)                                                            |
| `src/lib/components/almanach/AlmanachHeaderDate.svelte` | Date du jour dans l'en-tête du tableau de bord                                                                             |

Appelants : `src/routes/(public)/+page.server.ts` (ambiance de l'accueil),
`src/routes/(protected)/dashboard/+layout.server.ts` (`almanachToday`), la page `/almanach`.

### Shtam (`src/lib/server/shtam/`, serveur seulement)

| Fichier                                   | Rôle                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/shtam/articles/<slug>.md` | Un article : en-tête YAML, corps ubumark, section `## Le vrai du faux` obligatoire                                           |
| `src/lib/server/shtam/articles.ts`        | `ARTICLE_SOURCES` (glob embarqué au build), `parseArticle`, `publishedArticles`, `findPublishedArticle`, `pickRandomArticle` |
| `src/lib/server/shtam/present.ts`         | `todayIsoInParis`, `toSummary` (avec la date de l'Almanach), `toArticleView`                                                 |
| `src/routes/(public)/shtam/`              | La une, `[slug]/` (l'article), `ShtamFooter.svelte` (avertissement « gazette parodique »)                                    |

Autres lecteurs : l'accueil (`pickRandomArticle` : un lien vers un article paru) et
`src/routes/sitemap.xml/+server.ts` (articles parus seulement).

### Lore de l'interface

`src/lib/config/lore.ts` : l'objet `lore` (actions, navigation, libellés : « Empocher », « Mon
Cabinet », « Marché Polonais »…) et `galopin(gender)`. Clés en anglais, valeurs en français ; plus
de 250 fichiers l'importent.

## Invariants

- **Cabinet Noir** : aucune donnée ne quitte l'appareil (pas de base, progression en
  `localStorage`, tout reste jouable si le stockage est refusé). Le texte chiffré d'une dépêche est
  **calculé** depuis le clair et la clé (`dispatchCiphertext`) : il ne peut pas diverger de la
  réponse attendue. Alphabet A-Z normalisé ; ce qui n'est pas une lettre traverse inchangé.
  Polybe : J fusionné avec I (assumé). Une erreur qui n'est pas une `CipherInputError` est un bug
  et remonte.
- **Almanach** : la source de vérité du calendrier est le Compendium, section VIII (An 1 =
  23 août 1896 ; 7 mois de 52 jours ; Cloche du Grand Reset le 22 août ; Surnuméraire le 18 mars
  des années bissextiles). Fonctions pures ; la date du jour est celle de la **requête** à Paris
  (pages `prerender = false`). Contraste traits / corps d'Ubu ≥ 3:1, testé.
- **Shtam** : un brouillon (`draft: true`) ou un article daté du futur **n'atteint jamais le
  navigateur** : filtrés côté serveur, même 404 qu'un slug inconnu, absents du sitemap ; pages
  jamais prérendues (un article daté de demain paraît demain, sans rebuild). Le **Vrai du faux** est
  obligatoire (`parseArticle` lève sinon). Titre sans formule (`~`) : il sert aussi au `<title>`.
  Auteur dans une liste fermée (`AUTHOR_LABELS`). Slug kebab-case (`SLUG_PATTERN`), validé par Zod.
- **Rien du Collège** (de ’Pataphysique) dans le contenu : règle éditoriale du Compendium.

## Comment étendre

- **Un article du Shtam** : suivre [shtam-articles.md](../pratiques/shtam-articles.md) (fichier,
  en-tête, voix, Vrai du faux). Aucune autre déclaration : le glob le prend au build.
- **Un chiffre** : module pur dans `src/lib/ciphers/` rendant un `CipherResult` (étapes affichées),
  erreurs de saisie en `CipherInputError`, tests d'aller-retour ; page sous
  `src/routes/(public)/chiffrement/` montée sur `CipherWorkbench` ; éventuellement une dépêche
  (`DispatchKey`, `CIPHER_PATHS`) et un `seeAlso` du dictionnaire (`SEE_ALSO_PATHS`, dans
  `src/lib/dictionary/model.ts`, + contrainte SQL, voir [dictionnaire.md](dictionnaire.md)).
- **Un terme d'interface** : l'ajouter à `lore` (en accord avec le Compendium et
  `docs/Chiphres/lexique-pataphysique.md` ; en cas de divergence, le Compendium prime).

## Tests

| Test                                              | Prouve                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/lib/ciphers/__tests__/` (17 fichiers)        | Chaque chiffre (aller-retours), attaques, dépêches, progression, lien d'outil         |
| `src/routes/(public)/chiffrement/__tests__/`      | Pages rendues, campagne des dépêches, ouverture de l'établi depuis une dépêche        |
| `src/lib/almanach/__tests__/`                     | Conversion dans les deux sens, palettes, contraste du héros                           |
| `src/routes/(public)/almanach/__tests__/`         | Chargement serveur, page, convertisseur                                               |
| `src/lib/server/shtam/__tests__/articles.test.ts` | En-tête, Vrai du faux obligatoire, filtrage brouillon / futur, vrais articles valides |
| `src/routes/(public)/shtam/__tests__/`            | 404 indiscernable, rendu                                                              |
| `src/routes/sitemap.xml/__tests__/server.test.ts` | Ni brouillon ni article futur dans le sitemap                                         |

## Décisions et journaux

Pas d'ADR propre. Décisions consignées dans les journaux de chantier :
[chiffrement-progress.md](../wip/chiffrement-progress.md) (section autonome, trois onglets, J = I,
scytale sans bourrage, 100 % client) ·
[almanach-progress.md](../archive/wip/almanach-progress.md) ·
[shtam-progress.md](../archive/wip/shtam-progress.md) ·
[shtam-relecture-progress.md](../archive/wip/shtam-relecture-progress.md). Lore de l'interface :
spec archivée [sprint1-lexique-spec.md](../archive/wip/sprint1-lexique-spec.md).

## Écarts connus

- Le journal du chiffrement est encore sous `docs/wip/` alors que les lots sont livrés : à archiver
  comme ceux de l'Almanach et du Shtam (à confirmer par David : récits des dépêches à relire).
- Shtam : 54 articles dans le dépôt, dont 6 parus au 2026-10-10 et 48 datés du futur (parution
  programmée jusqu'au 2027-03-29).
- `SEE_ALSO_PATHS` (liens du glossaire vers le Cabinet Noir) ne couvre pas `atbash`, `polybe`,
  `scytale` : aucune entrée du dictionnaire ne les vise aujourd'hui.
- « lexique » : le mot désigne le lore (`lore.ts`, `docs/Chiphres/lexique-pataphysique.md`), mais
  le module des mots cliquables s'appelle `src/lib/lexicon/` (voir [dictionnaire.md](dictionnaire.md)).
