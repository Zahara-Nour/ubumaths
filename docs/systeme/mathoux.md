---
couvre:
  - 'src/lib/mathoux/**'
  - 'src/lib/server/mathoux/**'
  - 'src/lib/components/mathoux/**'
  - 'src/routes/(protected)/dashboard/student/chatterie/**'
  - 'src/routes/api/student/mathoux/**'
---

# Mathoux — la Chatterie de Faustroll

> Vérifié contre le code le 2026-10-18 (Mathoux v1). Spécification validée par David :
> [mathoux-conception.md § 9](../wip/mathoux-conception.md).

## À quoi ça sert

Les **Mathoux** sont les chats du Docteur Faustroll : une collection que l'élève fait grandir **en
travaillant**. Un Mathou par **notion** de l'arbre des notions, de la **race** de sa **branche**
(19 races). Ils sont muets ; le Palotin les commente (voir [buddy-palotins.md](buddy-palotins.md)).

La collection n'est **pas stockée** : aucune table, aucune migration. Elle se calcule à chaque
affichage depuis l'acquisition des points et les badges de révision espacée.

## Règles

Comptent les points du programme de **tout le parcours** de l'élève : son niveau
(`profiles.grade`) **et ses niveaux antérieurs** (`grade_ancestors`, clôture transitive de
`grade_predecessors` ; complément de David, 2026-10-18). Seuls ceux qui sont non archivés,
rattachés à un nœud **et qui ont au moins une question taguée** (`question_template_points`)
comptent : ce sont les points **travaillables**.

- **Notion d'un point** : son nœud s'il est une notion, le parent s'il est une sous-notion. Un nœud,
  une notion ou une branche archivés font ignorer le point.
- **Race** : rang de la branche dans l'ordre `position` des branches non archivées (0 à 18) ; le
  dessin (`MathouAvatar`, `mathou-races.ts`) en tire la couleur et le motif, modulo 19.
- **Stade** (`mathouGrowth`), calculé **niveau par niveau** sur les seuls points de ce niveau ; le
  stade affiché est **le meilleur** d'entre eux (`bestGrowth`) : un grand matou de 5e reste grand
  matou en 4e même si les points de 4e ne sont pas acquis. Le détail est gardé dans
  `Mathou.byGrade` (points, acquis, stade par niveau, du plus ancien au plus récent) pour la
  mémoire des stades à venir (meilleur stade jamais atteint, une étoile par niveau acquis) :
  - aucune réussite → **à découvrir** (silhouette, pour donner un but) ;
  - au moins une réussite (`total_successes > 0` ou `last_success_at` non nul) → **chaton** ;
  - acquis ≥ la moitié des points travaillables, **arrondie au supérieur** (3 sur 5) → **matou** ;
  - tous acquis → **grand matou**. Une notion d'un seul point passe de chaton à grand matou.
- **Sieste** : au moins un point de la notion, **de n'importe quel niveau du parcours**, a le badge FSRS `a_renforcer` ou `a_remedier`
  (`computePointBadges`, une question taguée est due). Une silhouette ne dort jamais : elle n'est
  pas encore un Mathou. Le Mathou n'est jamais perdu ; une révision le réveille.
- **Nom** (`mathouName`) : premier mot terminé par -s ou -x → « le Mathou des Fractions : calculs » ;
  sinon, le genre ne se devine pas (« de la Dérivation », « du Second degré ») → « le Mathou
  « Dérivation » ». Cas grammaticaux mais maladroits : « le Mathou des Autres lois », « le Mathou
  des Généralités sur les fonctions ». D'autres noms sont à chercher plus tard (décision de David).
  L'élève ne nomme pas ses Mathoux en v1 (texte libre d'un mineur : modération).

Niveaux : en octobre 2026, seuls les niveaux du lycée ont des questions taguées. Ailleurs, la
Chatterie dit « Aucune notion travaillable pour ton niveau pour l'instant » ; elle se remplira avec
le tagage, sans changement de code.

## Code

| Fichier                                                | Rôle                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `src/lib/mathoux/collection-logic.ts`                  | logique pure : stades, noms, regroupement, phrases (importable au client) |
| `src/lib/mathoux/summary.ts`                           | schéma Zod du résumé `{ born, napping, toDiscover }`                      |
| `src/lib/server/mathoux/collection.ts`                 | `loadMathouCollection` : les lectures, puis la logique pure               |
| `src/lib/components/mathoux/`                          | `MathouAvatar` (SVG paramétré : race, stade, sieste, silhouette)          |
| `dashboard/student/chatterie/+page.{server.ts,svelte}` | la page ; `unavailable` si une lecture échoue                             |
| `api/student/mathoux/+server.ts`                       | `GET` élève : les compteurs, pour le Palotin                              |

### Lectures et RLS

Tout est lu avec le **client de l'élève**. `grade_ancestors` est SECURITY INVOKER et lit
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

Quatre allers-retours : `grade_ancestors` ; puis une requête de points **par niveau** du parcours,
en parallèle (chaque niveau a moins de 300 points, alors que le parcours entier d'une Terminale
dépasserait le plafond de 1 000 lignes de PostgREST) ; puis, en parallèle, les tags, l'arbre
(branches et notions, environ 160 lignes) avec les sous-notions référencées, et les états de
l'élève ; puis les deux de `computePointBadges` (tags des points travaillables, états FSRS). Les
listes `.in()` passent par `fetchInChunks` (lots de 100). Pour une Tle spé : 12 niveaux, environ
2 000 points rattachés, une vingtaine de lots de tags et d'états.

⚠️ Plafond connu, partagé avec `computePointBadges` : un lot de 100 points dont les tags
dépasseraient 1 000 lignes serait tronqué en silence. Mesuré en prod le 2026-10-18 : 14 tags au plus par point, 1 499 en tout ; 239 points au plus par niveau (Tle spé).

C'est trop pour `dashboard/student/+layout.server.ts`, qui tourne à chaque page de l'espace élève :
le Palotin demande donc le résumé **après l'affichage**, une fois par montage du widget
(`GET /api/student/mathoux`).

## Le Palotin, gardien de la Chatterie

`BuddyWidget` demande le résumé au montage (s'il y a un Palotin). Si au moins un Mathou fait la
sieste, il dit « 2 Mathoux font la sieste. » (« 1 Mathou fait la sieste. »), avec le lien « Aller à
la Chatterie » ; la bulle reste 10 s au lieu de 5. Cette annonce remplace la salutation au hasard ;
après une Constance perdue, elle vient après sa bulle. Réponse en échec ou mal formée (Zod) → rien.

## La page

`/dashboard/student/chatterie`, entrée « La Chatterie » de la navigation élève (pas de bouton
retour : page de la navigation). Titre « La Chatterie de Faustroll », compteurs (« 7 Mathoux, 2 en
sieste, 12 à découvrir »), une section titrée par race, une liste de Mathoux : dessin, nom, stade,
« Fait la sieste » et « Réveiller » vers la révision du programme
(`/dashboard/revisions/decks/programme`, là où tombent les cartes dues). Les silhouettes montrent
le nom de la notion, pas celui du Mathou. Aucun mot interdit par le Compendium (XP, niveau, score).

## Hors v1

Annonce d'un nouveau chaton en fin de séance, combats (réécriture de Navadra), accessoires en
gidouilles, vue de la Chatterie par le professeur.
