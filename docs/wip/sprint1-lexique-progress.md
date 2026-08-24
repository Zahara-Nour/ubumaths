# Sprint 1 — Lexique ubuesque · doc de progression

> Suivi crash-recovery du câblage du lexique pataphysique sur `src/lib/config/lore.ts`
> (source unique — l'UI référence les clés, changer une valeur propage partout).
> Spec Phase 0 : [`sprint1-lexique-spec.md`](./sprint1-lexique-spec.md). Branche : `feat/sprint1-lexique`.

## État global

- Branche `feat/sprint1-lexique`, **PR #65** (auto-merge armé, merge dès CI verte).
- `pnpm check:incremental` = **0 erreur** vérifié à chaque lot.

## Termes livrés

| Générique                  | → Terme                                                                                                                                                  | Clé `lore`                                    | Genre / notes                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| boutons/actions            | Empocher, Passer à la trappe, Renoncer, **Sceller**, Remettre le couvert, Fouiller, **Tamiser**                                                          | `actions.*`                                   | Sceller=confirm, Tamiser=filter (choisis après rejet de « Décréter »/« Trier ») |
| navigation                 | Cabinet des Phynances, Marché Polonais, Trappe à Trésors, Décrets Royaux, Blason, Quitter le Royaume, Bréviaire Pataphysique, Édits Royaux, Sceau Secret | `nav.*`                                       |                                                                                 |
| élève / élèves             | **Galopin / Galopine**                                                                                                                                   | `entities.student` + helper `galopin(gender)` | épicène dans les strings → masc générique                                       |
| élèves (collectif)         | les Polonais                                                                                                                                             | `entities.studentsCollective`                 | leaderboards                                                                    |
| amis                       | Conjurés                                                                                                                                                 | `entities.friends`                            |                                                                                 |
| classe                     | **Bataillon**                                                                                                                                            | `entities.class`                              | flip **F→M** (la→le, une→un, aucune→aucun…)                                     |
| professeur/enseignant/prof | **Capitaine**                                                                                                                                            | `entities.teacher`                            | même genre M ; **était « Maître Phynancier »**, changé cette session            |
| exercice                   | **Corvée**                                                                                                                                               | `learning.exercise`                           | flip **M→F** (un→une, l'exercice→la Corvée…)                                    |
| examen                     | **Décervelage**                                                                                                                                          | `learning.exam`                               | même genre M                                                                    |
| devoir                     | **Corvée Domestique**                                                                                                                                    | `learning.homework`                           | flip M→F ; **pluriel en littéral** (cf. caveat)                                 |

## Décisions prises (cette session)

- **Marque = « Chiphre » (singulier)** = plateforme (chiph.re). Compendium + Lexique alignés.
- **Capitaine** pour le rôle prof (choisi parmi Précepteur/Régent/Maréchal) — cohérent avec Bataillon. Compendium (`lore-pataphysique.md`) + Lexique (`lexique-pataphysique.md`) mis à jour ; **gardés** : palier d'abonnement « Maître Phynancier » (9,99 €) et titre de Père Ubu (concepts distincts).
- **Pages consentement parental** (`/consent/[token]`, `/consent/success`) **exclues du lore** (RGPD, clarté > immersion) → « élève »/« enseignant » clairs.

## Méthodo & pièges (réutilisables pour les termes restants)

**Pipeline par terme** : inventaire → classifieur (markup-texte / string-attr / script / commentaire) → dry-run relu → application par lot → sanity → `check:incremental` → commit.

**Grammaire** :

- Gender-flip complet (déterminants + accord d'adjectif immédiat ET copule : « la Corvée est configurée », « seront combinées »).
- Élisions : `l'élève→le Galopin`, `l'exercice→la Corvée`, `enseignant·e→Capitaine`.
- Contractions : `de la→du`, `à la→au` (et l'inverse selon le genre).

**Collisions code (exclure)** :

- Homographe FR/anglais : `classe`(FR) vs `classes`(var JS), `exercice`(FR) vs `exercise`(EN), `notification`(FR) vs `notifications`(var).
- **Verbe** : « devoir » (infinitif) ≠ nom ; « s'élève » ≠ élève.
- **Contenu code** : docstrings Python (`class` Python ≠ classe scolaire), enums `value="..."`, URLs (`/classes`, `/exercices`), pages légales, fixtures debug, commentaires.

**Guards regex** :

- Avant : `(?<![.\w{/])` → protège `.prop`, `{var}`, URLs.
- Après : distinguer `classe.` (ponctuation, à flipper) de `classes.method` (propriété) ; **`é` final n'a pas de `\b`** en mode octets → utiliser une lookahead-lettre, pas `\b`.

**⚠️ Classe de bug critique — `{lore.X}` dans une string JS** :
Le flip insère `{lore.X}` (forme markup) là où il faut `${lore.X}` (template literal) ou du bare. Dans une string JS (`'...'`, `"..."`, backtick sans `$`), ça **rend le texte littéral** « {lore.entities.class} » — **non détecté par check / lint / tests**. → **Sanity obligatoire par lot** : scanner tout `{lore.` en string JS (3 motifs : backtick-sans-`$`, single-quote, double-quote). 12 cas trouvés au moment de la PR, sinon déployés en prod.

**Autres** :

- **N° de ligne périmés** : régénérer les buckets frais après chaque commit (prettier décale), ou utiliser du content-based.
- **Imports** : injecter après le 1er `<script>` col-0 ; retirer les imports morts (eslint `no-unused-vars` bloque).
- `svelte-autofixer` (MCP) sur les `.svelte` modifiés.

## Caveats

- **Pluriel des termes à 2 mots** (« Corvées Domestiques », et à venir « Coup de pouce de Conscience », etc.) écrit **en littéral** (le pattern `{terme}s` donnerait « Corvée Domestiques »). → Si renommage futur, les pluriels ne suivent pas automatiquement (le singulier `{lore…}` suit).

## Reste à faire

- **notification → Décret** (~209 occ, collision var `notifications` + flip F→M — le plus lourd).
- **learning divers** : hint→Coup de pouce de Conscience · badge→Médaille de la Gidouille · streak→Constance Royale · vipCard→Carte Pataphysique.
- **economy** : gidouille · phynances · subscription→Pacte Phynancier.
- **feedback / difficulty** (labels).
- **Scope `.ts`** (hors sweep `.svelte`) : messages d'erreur serveur/API, configs (`templateVariables.ts`, `games/leaderboards.ts` `label:'Classe'`, `default-templates.ts`), 2 fallbacks `'Classe inconnue'` serveur.
- Hors lexique : étendre `dependabot.yml` à npm (33 vulns, 1 critique).

## CI / PR (historique)

- 1er run CI **rouge** : Lint (2 imports `lore` morts) + Client Tests (9 `.svelte.test.ts` avec assertions périmées).
- Corrigés : imports morts (ImageNodeView→template literal, geometry-demo→retrait) ; 9 tests réalignés sur `lore` (`getByText(\`Aucun ${lore.entities.student}…\`)`).
- **+12 bugs `{lore}` en string JS** trouvés par la sanity élargie (auraient été déployés en prod car verts en CI).
- Re-push `49fdf53ec` ; CI re-run ; auto-merge armé.
