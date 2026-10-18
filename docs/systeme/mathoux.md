---
couvre:
  - 'src/lib/mathoux/**'
  - 'src/lib/server/mathoux/**'
  - 'src/lib/components/mathoux/**'
  - 'src/routes/(protected)/dashboard/student/chatterie/**'
  - 'src/routes/api/student/mathoux/**'
---

# Mathoux — la Chatterie de Faustroll

> Vérifié contre le code le 2026-10-18 (Mathoux v1, mémoire comprise). Spécification validée par David :
> [mathoux-conception.md § 9](../wip/mathoux-conception.md).

## À quoi ça sert

Les **Mathoux** sont les chats du Docteur Faustroll : une collection que l'élève fait grandir **en
travaillant**. Un Mathou par **notion** de l'arbre des notions, de la **race** de sa **branche**
(19 races). Ils sont muets ; le Palotin les commente (voir [buddy-palotins.md](buddy-palotins.md)).

La collection se **calcule** à chaque affichage depuis l'acquisition des points et les badges de
révision espacée ; une **mémoire** (`student_mathoux`) retient ce que le calcul ne peut pas
retrouver : le meilleur stade atteint et les étoiles. **Un Mathou ne rapetisse jamais.**

## Règles

Comptent les points du programme de **tout le parcours** de l'élève : son niveau
(`profiles.grade`) **et ses niveaux antérieurs** (`grade_ancestors`, clôture transitive de
`grade_predecessors` ; complément de David, 2026-10-18). Seuls ceux qui sont non archivés,
rattachés à un nœud **et tagués par au moins un modèle de question publié**
(`question_template_points` → `question_templates.status = 'published'`) comptent : ce sont les
points **travaillables**. Un point tagué seulement par des brouillons ne compte pas : il donnerait
une silhouette impossible à faire naître (mesuré le 2026-10-18 : 269 points dans ce cas).

Points travaillables par niveau en prod (2026-10-18, modèles publiés / tous les modèles) :
2de 13 / 27, 1re spé 16 / 78, Tle spé 2 / 90, Tle comp 1 / 57, Tle exp 0 / 49 ; aucun ailleurs.

- **Notion d'un point** : son nœud s'il est une notion, le parent s'il est une sous-notion. Un nœud,
  une notion ou une branche archivés font ignorer le point.
- **Race** : rang de la branche dans l'ordre `position` des branches non archivées (0 à 18) ; le
  dessin (`MathouAvatar`, `mathou-races.ts`) en tire la couleur et le motif, modulo 19.
- **Stade** (`mathouGrowth`), calculé **niveau par niveau** sur les seuls points de ce niveau ; le
  stade calculé est **le meilleur** d'entre eux (`bestGrowth`) : un grand matou de 5e reste grand
  matou en 4e même si les points de 4e ne sont pas acquis. Le détail est dans `Mathou.byGrade`
  (points, acquis, stade par niveau, du plus ancien au plus récent). Le stade **affiché** est le
  meilleur du stade calculé et du stade mémorisé (voir « Mémoire ») :
  - aucune réussite → **à découvrir** (silhouette, pour donner un but) ;
  - au moins une réussite (`total_successes > 0` ou `last_success_at` non nul) → **chaton** ;
  - acquis ≥ la moitié des points travaillables, **arrondie au supérieur** (3 sur 5) → **matou** ;
  - tous acquis → **grand matou**. Une notion d'un seul point passe de chaton à grand matou.
- **Étoiles** : une par niveau du parcours où la notion est **entièrement acquise** (stade du
  niveau = grand matou), unies aux étoiles mémorisées, du plus ancien au plus récent
  (`Mathou.stars`). La page les montre avec le nom court de la classe (`starGradeLabel`,
  `GRADES[…].shortName`) : « ★ 2nde ★ 1ère Spé ».
- **Sieste** : au moins un point de la notion, **de n'importe quel niveau du parcours**, a le badge
  FSRS `a_renforcer` ou `a_remedier` (`computePointBadges`, une question taguée est due), **ou** un
  point est **oublié** : le stade mémorisé dépasse le stade calculé (s'il reste des points
  travaillables), ou un niveau étoilé encore au parcours n'est plus entièrement acquis. Une
  silhouette ne dort jamais : elle n'est pas encore un Mathou. Le Mathou n'est jamais perdu ; une
  révision le réveille.
- **Nom** (`mathouName`) : premier mot terminé par -s ou -x → « le Mathou des Fractions : calculs » ;
  sinon, le genre ne se devine pas (« de la Dérivation », « du Second degré ») → « le Mathou
  « Dérivation » ». Cas grammaticaux mais maladroits : « le Mathou des Autres lois », « le Mathou
  des Généralités sur les fonctions ». D'autres noms sont à chercher plus tard (décision de David).
  L'élève ne nomme pas ses Mathoux en v1 (texte libre d'un mineur : modération).

Niveaux : en octobre 2026, seuls les niveaux du lycée ont des questions taguées. Ailleurs, la
Chatterie dit « Aucune notion travaillable pour ta classe pour l'instant » (le Compendium interdit
« niveau » à l'écran) ; elle se remplira avec
le tagage, sans changement de code.

## Mémoire (`student_mathoux`)

Spécification : [mathoux-conception.md § 9, « Changement d'année et oubli »](../wip/mathoux-conception.md).
Une ligne par élève et par notion : `best_stage` (chaton, matou, grand matou), `starred_grades`
(codes de niveau valides, 20 au plus, sans doublon : à la charge du serveur), `first_seen_at`,
`updated_at` (trigger). Migration `20261017090200_mathoux_memoire.sql`.

- **Lecture** au client de l'élève, en parallèle du parcours (`readMathouMemory`) : l'élève lit ses
  lignes, le prof celles de ses élèves. Une lecture en échec lève (la page dit « fermée »), sinon un
  Mathou rapetisserait à l'écran.
- **Mathou de la seule mémoire** : une notion mémorisée sans aucun point travaillable au parcours
  (modèles dépubliés, changement de voie) reste affichée à son stade, avec ses étoiles, sans
  sieste ; une notion ou une branche archivée la fait disparaître, comme pour les points.
- **Identité** : `loadMathouCollection` vérifie que l'élève demandé est l'utilisateur du client
  passé (`auth.getUser`) ; sinon il lève, avant toute écriture (audit de la PR 3).
- **Écriture** au client **service** seulement (`authenticated` n'a que SELECT), pour l'élève de la
  session, à la fin de chaque calcul (page et `GET /api/student/mathoux`), **seulement s'il y a du
  nouveau** (`memoryUpdates` : Mathou né sans ligne, stade ou étoile gagnés). Une panne
  d'écriture est journalisée et ne change pas l'affichage.
- **Jamais en baisse, même en concurrence** (`rememberMathoux`, `src/lib/server/mathoux/memory.ts`) :
  les lignes neuves partent en **un** insert groupé `ON CONFLICT DO NOTHING` (toutes les colonnes
  dans chaque ligne) ; une ligne existante — ou perdue au conflit, relue — se met à jour
  **conditionnellement** (`WHERE updated_at = <lu>`, comparer-et-échanger). Zéro ligne rendue :
  relecture, fusion (meilleur stade, union des étoiles), nouvel essai (3 au plus). Sans fonction
  SQL, c'est l'écriture sûre par PostgREST ; un Mathou qui grandit coûte une requête.
- **Export RGPD** : catégorie `gaming` de `/api/account/export`
  ([rgpd.md § 7.3](conformite/rgpd.md)). Effacement : cascade depuis `profiles`.

Limite connue : l'oubli se déduit par comparaison avec la mémoire, pas point par point. Un point
**nouvellement** travaillable (modèle publié) dans un niveau étoilé, ou qui fait baisser la part
acquise, endort le Mathou comme un oubli, jusqu'à ce qu'il soit acquis.

## Code

| Fichier                                                | Rôle                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `src/lib/mathoux/collection-logic.ts`                  | logique pure : stades, noms, regroupement, phrases (importable au client) |
| `src/lib/mathoux/summary.ts`                           | schéma Zod du résumé `{ born, napping, toDiscover }`                      |
| `src/lib/server/mathoux/collection.ts`                 | `loadMathouCollection` : les lectures, la logique pure, puis la mémoire   |
| `src/lib/server/mathoux/memory.ts`                     | lecture (élève) et écriture (service) de `student_mathoux`                |
| `src/lib/components/mathoux/`                          | `MathouAvatar` (SVG paramétré : race, stade, sieste, silhouette)          |
| `dashboard/student/chatterie/+page.{server.ts,svelte}` | la page ; `unavailable` si une lecture échoue                             |
| `api/student/mathoux/+server.ts`                       | `GET` élève : les compteurs, pour le Palotin                              |

### Lectures et RLS

Tout est lu avec le **client de l'élève** (la mémoire comprise ; seule son écriture passe par le
client service). `grade_ancestors` est SECURITY INVOKER et lit
`grade_predecessors`, lisible par tous ; `curriculum_points`, `question_template_points` et
`classification_nodes` sont lisibles par tout utilisateur connecté ; `student_point_state` et
`srs_card_stats` par l'élève lui-même (et le professeur). ⚠️ Un refus RLS rendrait une Chatterie
vide sans erreur : le cas « des points travaillables mais aucun nœud lu » est tracé
(`logger.warn`), et `tests/integration/mathoux-collection.test.ts` prouve qu'un élève lit sa
collection (parcours compris : un élève de Tle spé lit ses points de 1re spé) et qu'un autre élève,
même en passant l'identifiant du premier, n'en lit rien.

Une lecture en échec **lève** : la page affiche « La Chatterie est fermée pour l'instant », jamais
une collection vide.

### Coût

Cinq allers-retours (six s'il y a du nouveau à retenir) :

1. `grade_ancestors`, la mémoire et l'identité (`auth.getUser`), en parallèle ;
2. une requête de points **par niveau** du parcours, en parallèle (239 points au plus par niveau,
   alors que le parcours entier d'une Terminale dépasserait le plafond de 1 000 lignes de
   PostgREST) ;
3. en parallèle : les tags par un modèle publié (lots de 100 points, chaque lot lu par pages de
   1 000 lignes avec `.range()`), l'arbre (branches et notions, environ 160 lignes) et les
   sous-notions référencées (lots de 100 nœuds) ;
4. sur les seuls points **travaillables** : les états de l'élève, et les tags de
   `computePointBadges` ;
5. les états FSRS de `computePointBadges`.

Pour un parcours de Tle spé, mesuré en prod le 2026-10-18 : 12 niveaux, 1 624 points rattachés,
440 nœuds, 31 points travaillables. Soit 1 + 12 + (17 + 1 + 5) + (1 + 1) + 1 = **39 requêtes**, plus 1 pour la mémoire ; l'écriture
n'ajoute rien quand rien n'a changé (le cas courant), 1 requête pour les naissances et 1 par
Mathou qui grandit.

Les tags sont lus par pages : un lot de 100 points peut dépasser 1 000 tags (14 au plus par point,
1 499 en tout en prod), et PostgREST tronquerait en silence. ⚠️ `computePointBadges`
(`src/lib/server/srs/capacity-badge.ts`) garde ce plafond latent sur ses propres lots : il est
partagé avec le tableau de bord, et n'est pas corrigé ici.

C'est trop pour `dashboard/student/+layout.server.ts`, qui tourne à chaque page de l'espace élève :
le Palotin demande donc le résumé **après l'affichage**, une fois par montage du widget
(`GET /api/student/mathoux`).

## Le Palotin, gardien de la Chatterie

`BuddyWidget` demande le résumé au montage (s'il y a un Palotin). Si au moins un Mathou fait la
sieste, il dit « 2 Mathoux font la sieste. » (« 1 Mathou fait la sieste. »), avec le lien « Aller à
la Chatterie » ; la bulle reste 20 s au lieu de 5 et vit dans une zone `aria-live="polite"`. Sinon,
le Palotin salue : la salutation **attend la réponse**, pour qu'une réponse tardive ne la fasse pas
précéder l'annonce. Après une Constance perdue, l'annonce vient après sa bulle, sans salutation.
Sur la Chatterie elle-même, le widget ne demande rien et n'annonce rien : la page a déjà calculé,
et le lien mènerait à elle-même. Réponse en échec ou mal formée (Zod) → pas d'annonce.

## La page

`/dashboard/student/chatterie`, entrée « La Chatterie » de la navigation élève (pas de bouton
retour : page de la navigation). Titre « La Chatterie de Faustroll », compteurs (« 7 Mathoux, 2 en
sieste, 12 à découvrir »), une section titrée par race, une liste de Mathoux : dessin, nom, stade,
étoiles (« ★ 2nde ★ 1ère Spé », le symbole masqué aux lecteurs d'écran), « Fait la sieste » et
« Réveiller » (un Mathou endormi par oubli comme un autre) vers la révision du programme
(`/dashboard/revisions/decks/programme`, là où tombent les cartes dues). Les silhouettes montrent
le nom de la notion, pas celui du Mathou. Aucun mot interdit par le Compendium (XP, niveau, score).

## Hors v1

Annonce d'un nouveau chaton en fin de séance, combats (réécriture de Navadra), accessoires en
gidouilles, vue de la Chatterie par le professeur.
