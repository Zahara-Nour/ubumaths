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
- **Pas de mémoire en v1** : le stade se recalcule à chaque affichage. En l'absence de la table de
  mémoire (meilleur stade jamais atteint, prévue pour la PR suivante), un point acquis puis perdu
  (`is_acquired` repassé à faux) fait encore **rapetisser** le Mathou.
- **Nom** (`mathouName`) : premier mot terminé par -s ou -x → « le Mathou des Fractions : calculs » ;
  sinon, le genre ne se devine pas (« de la Dérivation », « du Second degré ») → « le Mathou
  « Dérivation » ». Cas grammaticaux mais maladroits : « le Mathou des Autres lois », « le Mathou
  des Généralités sur les fonctions ». D'autres noms sont à chercher plus tard (décision de David).
  L'élève ne nomme pas ses Mathoux en v1 (texte libre d'un mineur : modération).

Niveaux : en octobre 2026, seuls les niveaux du lycée ont des questions taguées. Ailleurs, la
Chatterie dit « Aucune notion travaillable pour ta classe pour l'instant » (le Compendium interdit
« niveau » à l'écran) ; elle se remplira avec
le tagage, sans changement de code.

## Code

| Fichier                                                | Rôle                                                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathoux/collection-logic.ts`                  | logique pure : stades, noms, regroupement, phrases (importable au client)                                                   |
| `src/lib/mathoux/summary.ts`                           | schéma Zod du résumé `{ born, napping, toDiscover }`                                                                        |
| `src/lib/server/mathoux/collection.ts`                 | `loadMathouCollection` : les lectures, puis la logique pure                                                                 |
| `src/lib/components/mathoux/`                          | `MathouAvatar` (SVG paramétré : race, stade, sieste, silhouette), le dessin `mathou-dessin.ts`, les races `mathou-races.ts` |
| `dashboard/student/chatterie/+page.{server.ts,svelte}` | la page ; `unavailable` si une lecture échoue                                                                               |
| `api/student/mathoux/+server.ts`                       | `GET` élève : les compteurs, pour le Palotin                                                                                |

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

Cinq allers-retours :

1. `grade_ancestors` ;
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
440 nœuds, 31 points travaillables. Soit 1 + 12 + (17 + 1 + 5) + (1 + 1) + 1 = **39 requêtes**.

Les tags sont lus par pages : un lot de 100 points peut dépasser 1 000 tags (14 au plus par point,
1 499 en tout en prod), et PostgREST tronquerait en silence. ⚠️ `computePointBadges`
(`src/lib/server/srs/capacity-badge.ts`) garde ce plafond latent sur ses propres lots : il est
partagé avec le tableau de bord, et n'est pas corrigé ici.

C'est trop pour `dashboard/student/+layout.server.ts`, qui tourne à chaque page de l'espace élève :
le Palotin demande donc le résumé **après l'affichage**, une fois par montage du widget
(`GET /api/student/mathoux`).

## Les dessins

Direction **AB3**, choisie par David le 2026-10-18 dans l'exploration graphique : le **chat-poire
bonhomme-digne**, gidouille sur la panse, trait souple et aplats, posé sur une **affiche jaune**
(pastille arrondie, viewBox 200 × 200) avec une **auréole** derrière la tête. Le dessin porte son
propre fond : il se lit pareil en clair et en sombre.

- **Visage « juste milieu »** : yeux en amande à pupille fendue, paupière posée à plat, l'œil droit
  un rien plus couvert, sourcils courts (le droit à peine levé), bouche neutre au coin à peine
  relevé.
- **Stades** (`pearGeometry`) : le **chaton** attendrit par ses proportions (grosse tête, petite
  panse, grands yeux, pieds en dedans et dépareillés) ; le **matou** ; le **grand matou**, panse
  royale, solennel (paupières mi-closes), couronne, fraise et bâton dans une **gloire** rayonnante.
- **Sieste** : yeux fermés, bonnet de nuit rayé, lune, « Zzz » en traits ; le grand matou garde sa
  fraise, le bonnet remplace la couronne.
- **Silhouette** (« à découvrir ») : forme unie sable éteint, gidouille en pointillé, auréole en
  tirets ; aucune couleur de race (ni pelage, ni motif, ni auréole).
- **Races** (`mathou-races.ts`, noms provisoires) : 19 couples pelage + motif distincts — uni noir,
  tigré roux, smoking, pointes siamoises, gidouille rouge épaisse, chartreux uni, écaille, tacheté,
  tricolore, arlequin (losanges), masque de bandit, marbré, fumé, van, chaussettes, bicolore,
  croissant de lune autour de la gidouille, étoile au front, tigré argent. L'auréole varie (rouge
  de Steinlen, bleu nuit, vert bouteille, violet) pour le contraste avec le pelage.
- `mathou-dessin.ts` est pur (chemins et couleurs) ; `MathouAvatar.svelte` assemble. Les ids
  internes (découpes, dégradé du fumé) sont préfixés par `$props.id()`. Environ 8 Ko de SVG par
  instance au plus chargé.

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
« Fait la sieste » et « Réveiller » vers la révision du programme
(`/dashboard/revisions/decks/programme`, là où tombent les cartes dues). Les silhouettes montrent
le nom de la notion, pas celui du Mathou. Aucun mot interdit par le Compendium (XP, niveau, score).

## Hors v1

Annonce d'un nouveau chaton en fin de séance, combats (réécriture de Navadra), accessoires en
gidouilles, vue de la Chatterie par le professeur.
