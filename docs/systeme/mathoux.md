---
couvre:
  - 'src/lib/mathoux/**'
  - 'src/lib/server/mathoux/**'
  - 'src/lib/components/mathoux/**'
  - 'src/routes/(protected)/dashboard/student/chatterie/**'
  - 'src/routes/api/student/mathoux/**'
  - 'src/routes/(protected)/dashboard/teacher/gamification/mathoux/**'
  - 'src/routes/(protected)/dashboard/teacher/students/*/chatterie/**'
---

# Mathoux — la Chatterie de Faustroll

> Vérifié contre le code le 2026-10-21 (Mathoux v1, mémoire comprise, « Faire grandir » v1.1, noms propres, annonce des nouveautés v1.2, vue du professeur, animations). Spécification validée par David :
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
  point de la notion est **perdu** (`isPointLost`, règle tranchée par David le 2026-10-18) : le
  seuil de réussites de son régime est atteint mais il n'est plus acquis (échecs récents) —
  régime `diversite` (`curriculum_points.regime_acquisition`) : `distinct_template_successes ≥ 2` ;
  régime `fluence` (répétition) : `total_successes ≥ 5` (seuils de `recalc_point_state`). Un point
  **jamais acquis** (neuf, ou en apprentissage sous le seuil) n'endort pas : il empêche seulement
  l'étoile de sa classe. Un stade calculé sous le stade mémorisé n'endort pas à lui seul (un point
  nouvellement tagué le fait baisser sans oubli). Une silhouette ne dort jamais : elle n'est pas
  encore un Mathou. Le Mathou n'est jamais perdu ; une révision le réveille. `Mathou.dueForRevision`
  dit si une carte due est en cause (sinon, seul un point perdu l'endort).
- **Faire grandir** (v1.1, spec de David du 2026-10-18) : chaque Mathou **né** porte les catégories d'un
  **Entraînement** sur sa notion (`Mathou.trainingCategories`) ; la page en fait le lien au rendu
  (`resolve('/automaths/test')` + `?` + `trainingQuery`, encodé par `buildSeriesLink`, relu par
  `resolveTestLaunch` ; mode interactif). Il est fait des modèles **publiés**
  qui taguent les points de la notion, sur tout le parcours (`selectTrainingTemplates`) : d'abord
  ceux des points **perdus**, puis des points **non acquis** (jamais travaillés compris), puis des
  autres ; **au plus 10**, **une question par modèle** (un modèle qui tague plusieurs points vient
  une fois, au rang du plus prioritaire). À priorité égale, les points sont servis tour à tour
  (ordre du parcours, puis id), les modèles d'un point par id. Un modèle dont la catégorie
  dépasserait les bornes d'un lien de série (`cartItemSchema`) est écarté
  (`trainingTemplateFrom`) ; durée = celle du modèle, 20 s sinon, 600 s au plus. Silhouette, ou
  notion sans modèle publié : `null`, pas de bouton. Avec 10 modèles aux noms longs et accentués, le
  lien fait environ 4 Ko (test : moins de 6 000 caractères) ; c'est pourquoi les données de la page
  portent les catégories (≈ 1,5 Ko par Mathou) et non le lien : pour 40 Mathoux de 10 modèles,
  172 Ko de données avec les liens, 80 Ko avec les catégories (mesuré le 2026-10-18).
- **Nom** (`mathouName`) : d'abord le **nom propre** de la notion (`mathou-noms.ts`, 134 noms,
  clé = nom de la notion comme dans la migration de seed, car les identifiants diffèrent entre la
  base locale et la prod) : « Tangentin » pour « Dérivation ». Relus en partie par David le
  2026-10-19, le reste validé par défaut (à revoir : [mathoux-noms.md](../wip/mathoux-noms.md)).
  Une notion hors table (renommée, nouvelle) garde un nom générique : premier mot terminé par -s
  ou -x → « le Mathou des Fractions : calculs » ; sinon, le genre ne se devine pas → « le Mathou
  « Dérivation » ». Renommer une notion fait donc perdre son nom propre : mettre la table à jour.
  L'élève ne nomme pas ses Mathoux en v1 (texte libre d'un mineur : modération).

Niveaux : en octobre 2026, seuls les niveaux du lycée ont des questions taguées. Ailleurs, la
Chatterie dit « Aucune notion travaillable pour ta classe pour l'instant » (le Compendium interdit
« niveau » à l'écran) ; elle se remplira avec
le tagage, sans changement de code.

## Mémoire (`student_mathoux`)

Spécification : [mathoux-conception.md § 9, « Changement d'année et oubli »](../wip/mathoux-conception.md).
Une ligne par élève et par notion : `best_stage` (chaton, matou, grand matou), `starred_grades`
(codes de niveau valides, 20 au plus, sans doublon : à la charge du serveur), `asleep` (la sieste
écrite par le dernier calcul, pour annoncer le réveil ; migration `20261021200000`),
`first_seen_at`, `updated_at` (trigger). Migration `20261017090200_mathoux_memoire.sql`.

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
  nouveau** (`memoryUpdates` : Mathou né sans ligne, stade ou étoile gagnés, sieste qui change
  dans un sens ou dans l'autre). La sieste n'est pas un acquis : la fusion garde celle du calcul
  qui écrit. Un Mathou **de la seule mémoire** (aucun point travaillable) garde sa sieste
  mémorisée : affiché sans sieste, il serait sinon annoncé réveillé à tort. Une panne
  d'écriture est journalisée et ne change pas l'affichage.
- **Jamais en baisse, même en concurrence** (`rememberMathoux`, `src/lib/server/mathoux/memory.ts`) :
  les lignes neuves partent en **un** insert groupé `ON CONFLICT DO NOTHING` (toutes les colonnes
  dans chaque ligne) ; une ligne existante — ou perdue au conflit, relue — se met à jour
  **conditionnellement** (`WHERE updated_at = <lu>`, comparer-et-échanger). Zéro ligne rendue :
  relecture, fusion (meilleur stade, union des étoiles), nouvel essai (3 au plus). Sans fonction
  SQL, c'est l'écriture sûre par PostgREST ; un Mathou qui grandit coûte une requête.
- **Export RGPD** : catégorie `gaming` de `/api/account/export`
  ([rgpd.md § 7.3](conformite/rgpd.md)). Effacement : cascade depuis `profiles`.

Réveil d'un Mathou endormi par un point perdu **sans carte due** : le paquet Programme ne propose
que les cartes dues, donc « Réveiller » mène alors à l'**Entraînement** de la notion (« Faire
grandir »), dont les premières questions sont celles des points perdus (v1.1 ; avant, il attendait la
prochaine révision due). Sans Entraînement possible (aucun modèle publié lisible), pas de
« Réveiller » : le Mathou dort, une révision vide n'aurait rien à proposer.

## Code

| Fichier                                                | Rôle                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathoux/collection-logic.ts`                  | logique pure : stades, noms, regroupement, Entraînement « Faire grandir », phrases (importable au client)                                                                                                                                             |
| `src/lib/mathoux/mathou-noms.ts`                       | les noms propres des Mathoux, par nom de notion                                                                                                                                                                                                       |
| `src/lib/mathoux/summary.ts`                           | schéma Zod du résumé `{ born, napping, toDiscover, news }`                                                                                                                                                                                            |
| `src/lib/mathoux/news.ts`                              | logique pure des nouveautés (naissance, croissance, étoile) et leurs phrases                                                                                                                                                                          |
| `src/lib/server/mathoux/collection.ts`                 | `loadMathouCollection(WithNews)` : les lectures, la logique pure, la mémoire, puis les nouveautés ; `readMathouCollection` : le même calcul en lecture seule (vue du professeur)                                                                      |
| `src/lib/server/mathoux/teacher.ts`                    | `loadMathouxCountsByStudent` : Mathoux nés et grands matous par élève, d'après la mémoire (liste du professeur)                                                                                                                                       |
| `src/lib/server/mathoux/memory.ts`                     | lecture (élève) et écriture (service) de `student_mathoux` ; rend les notions que l'appel a écrites                                                                                                                                                   |
| `src/lib/components/mathoux/`                          | `ChatterieRaces` (les Mathoux par race, `readOnly` pour le prof), `MathouAvatar` (SVG paramétré : race, stade, sieste, silhouette), le dessin `mathou-dessin.ts`, les races `mathou-races.ts` ; `MathouNewsCard` et `fetchMathouNews` (fin de séance) |
| `dashboard/student/chatterie/+page.{server.ts,svelte}` | la page ; `unavailable` si une lecture échoue                                                                                                                                                                                                         |
| `api/student/mathoux/+server.ts`                       | `GET` élève : les compteurs et les nouveautés, pour le Palotin et la fin de séance                                                                                                                                                                    |
| `dashboard/teacher/gamification/mathoux/`              | onglet « Mathoux » du prof : élèves par classe, compteurs de la mémoire                                                                                                                                                                               |
| `dashboard/teacher/students/[studentId]/chatterie/`    | la Chatterie d'un élève vue par le prof, en lecture seule                                                                                                                                                                                             |

### Lectures et RLS

Tout est lu avec le **client de l'élève** (la mémoire comprise ; seule son écriture passe par le
client service). `grade_ancestors` est SECURITY INVOKER et lit
`grade_predecessors`, lisible par tous ; `curriculum_points`, `question_template_points` et
`classification_nodes` sont lisibles par tout utilisateur connecté ; `student_point_state` et
`srs_card_stats` par l'élève lui-même et par le professeur (`srs_card_stats` : seulement depuis la
migration `20261021173000` ; avant, le prof ne lisait que les cartes des élèves à qui il avait
assigné un paquet). ⚠️ Un refus RLS rendrait une Chatterie
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
   1 000 lignes avec `.range()` ; la jointure rapporte aussi la catégorie et la durée du modèle,
   d'où « Faire grandir » sans requête de plus), l'arbre (branches et notions, environ 160 lignes) et les
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
- **Races** (`mathou-races.ts`, noms validés par David le 2026-10-18, de « le Noir de Nombrilie »
  à « le Tigré de Glitchistan ») : 19 couples pelage + motif distincts — uni noir,
  tigré roux, smoking, pointes siamoises, gidouille rouge épaisse, chartreux uni, écaille, tacheté,
  tricolore, arlequin (losanges), masque de bandit, marbré, fumé, van, chaussettes, bicolore,
  croissant de lune autour de la gidouille, étoile au front, tigré argent. L'auréole varie (rouge
  de Steinlen, bleu nuit, vert bouteille, violet) pour le contraste avec le pelage.
- `mathou-dessin.ts` est pur (chemins et couleurs) ; `MathouAvatar.svelte` assemble. Les ids
  internes (découpes, dégradé du fumé) sont préfixés par `$props.id()`. Environ 8 Ko de SVG par
  instance au plus chargé.

### Animations

Décidées avec David le 2026-10-21 ([journal](../wip/mathoux-anim-progress.md), démo :
https://claude.ai/artifact/2FLaS3M52bNHzZtxkoKJK1). Tout est en CSS dans `MathouAvatar.svelte`,
sauf la transformation d'un stade à l'autre (image par image, `requestAnimationFrame`).

- **Au repos** (`animated`, vrai par défaut ; jamais en silhouette) : respiration, clignement, queue,
  oreille droite qui frémit ; vif chez le chaton, lent chez le grand matou (clignement à demi, gloire
  qui tourne en une minute) ; en sieste, respiration ample et « Zzz » qui montent. Gestes communs à
  toutes les races ; chaque race a son décalage (`--mathou-phase`), pour que la Chatterie ne respire
  pas en chœur. Partout où un Mathou s'affiche : Chatterie de l'élève, vue du professeur, annonce.
- **Réactions** (`reaction`, rejouée à chaque `reactionKey`) :
  - `apparition` (naissance) : le chaton grandit en 1,5 s, l'auréole s'allume et lance deux ondes,
    16 confettis aux couleurs de l'affiche et de l'auréole, 5 étoiles qui scintillent
    (`celebration`, déterministe) ;
  - `bond` avec `growFrom` (croissance) : le dessin se transforme en 1,4 s depuis le stade d'avant
    (`blendStages` interpole les mesures, `youth` va de 1 à 0), en bondissant, avec auréole, ondes et
    confettis ; vers le grand matou, couronne, fraise, bâton et gloire arrivent en fondu à la fin ;
  - `bond` seul (étoile) : un bond ;
  - `reveil` : en 2,6 s, les « Zzz » s'envolent, la lune laisse place à l'auréole, il se redresse,
    ouvre les yeux en deux temps, son bonnet s'envole, puis il s'étire.
- **Réduire les animations** (`prefers-reduced-motion`) : rien ne bouge, le nouveau stade s'affiche
  directement ; ni confettis, ni ondes, ni restes de sieste ; étoiles et « Zzz » restent posés.

## Le Palotin, gardien de la Chatterie

`BuddyWidget` demande le résumé au montage (s'il y a un Palotin). S'il y a une **nouveauté** (voir
plus bas), il l'annonce d'abord, avec le même lien et la même bulle ; sinon, si au moins un Mathou fait la
sieste, il dit « 2 Mathoux font la sieste. » (« 1 Mathou fait la sieste. »), avec le lien « Aller à
la Chatterie » ; la bulle reste 20 s au lieu de 5 et vit dans une zone `aria-live="polite"`. Sinon,
le Palotin salue : la salutation **attend la réponse**, pour qu'une réponse tardive ne la fasse pas
précéder l'annonce. Après une Constance perdue, l'annonce vient après sa bulle, sans salutation.
Sur la Chatterie elle-même, le widget ne demande rien et n'annonce rien : la page a déjà calculé,
et le lien mènerait à elle-même. Réponse en échec ou mal formée (Zod) → pas d'annonce.

## Annonce des nouveautés en fin de séance (v1.2)

Spécification validée par David le 2026-10-21 ([journal](../wip/mathoux-annonce-progress.md)).

- **Nouveauté** = un Mathou dont **ce calcul** a écrit la ligne de mémoire : `rememberMathoux` rend
  les notions qu'il a réellement insérées ou mises à jour, **chacune avec la ligne qu'il a remplacée**
  (`null` : insérée) ; une ligne déjà écrite par un autre calcul (la page, le widget, un autre
  onglet) n'en est pas une. Le genre se lit contre cette ligne remplacée, pas contre la mémoire lue
  avant le calcul : si un autre calcul a inséré « chaton » entre-temps et que celui-ci écrit « matou »
  par-dessus, c'est une croissance, pas une seconde naissance. Une nouveauté n'est donc **jamais
  annoncée deux fois** (prouvé en intégration : deux calculs identiques en parallèle, deux calculs de
  stades différents). Genre, un par Mathou : **naissance** (aucune ligne avant) > **croissance**
  (stade au-dessus de la ligne remplacée, étoiles jointes) > **réveil** (la ligne remplacée dormait,
  le Mathou ne dort plus et a des points travaillables ; étoiles jointes ; s'endormir n'annonce
  rien) > **étoile** (de nouvelles étoiles seules)
  (`mathouNews`, `news.ts`). Une écriture qui tombe en panne en cours de route annonce ce qu'elle a
  déjà écrit (`MathouMemoryWriteError.written`), rien d'autre.
- **Phrases** : « Un chaton est né à la Chatterie : Pile-Poil ! » (« Un matou est arrivé… » si né
  plus grand), « Pile-Poil est devenu un grand matou ! », « Pile-Poil s'est réveillé ! »,
  « Pile-Poil gagne l'étoile ★ 2nde ! ». 3 au
  plus, naissances d'abord, puis « Et 2 autres nouveautés à la Chatterie. ». **Premier calcul** de
  l'élève (mémoire vide) avec plusieurs Mathoux : une seule phrase, « 7 Mathoux t'attendent à la
  Chatterie ! ».
- **Animation** (`MathouNewsCard`) : naissance → `apparition` ; croissance → `bond` depuis
  `previousStage` (le stade de la ligne remplacée, porté par la nouveauté ; un chaton peut sauter
  à grand matou) ; réveil → `reveil` ; étoile → `bond` seul. Le premier passage (« N Mathoux t'attendent ») ne joue rien.
- **Où** : `GET /api/student/mathoux` rend `news` avec les compteurs. La fin de séance la demande
  (`fetchMathouNews`) **après** l'enregistrement, quand l'acquisition est à jour : Entraînement et
  Course (`automaths/test`, carte `MathouNewsCard` dans `TestResults` sous celle du Palotin), révision
  (`ReviewSession`). Les résultats s'affichent d'abord, l'annonce suit. Jamais demandée après une
  **évaluation** (ni l'aperçu du prof) ni après des **flash-cards** (aucun écran pour la montrer) :
  la nouveauté reste en attente, et le Palotin la dit à la prochaine page de l'espace élève (s'il y
  en a un ; sinon la page de la Chatterie la montre). Sans Palotin, la carte s'affiche quand même ;
  compte non élève (403), panne ou réponse mal formée : rien.
- **Limite connue** : le widget, la page de la Chatterie ou un autre onglet qui calculent entre la
  séance et son écran de fin « consomment » la nouveauté ; elle est alors dite par eux, ou vue sur la
  page. Coût assumé du « une seule fois » : si la réponse se perd après le calcul (réseau coupé), la
  nouveauté est écrite mais jamais annoncée ; le Mathou est bien sur la page de la Chatterie.

## La page

`/dashboard/student/chatterie`, entrée « La Chatterie » de la navigation élève (pas de bouton
retour : page de la navigation). Titre « La Chatterie de Faustroll », compteurs (« 7 Mathoux, 2 en
sieste, 12 à découvrir »), une section titrée par race, une liste de Mathoux : dessin, « Nom, Race » (« Tangentin, le Chartreux de
Yoyolande », la race en gris), le nom de la notion dessous, stade,
étoiles (« ★ 2nde ★ 1ère Spé », le symbole masqué aux lecteurs d'écran), « Fait la sieste » et
« Réveiller » : vers la révision du programme (`/dashboard/revisions/decks/programme`, là où
tombent les cartes dues) s'il y a une carte due, sinon vers l'Entraînement de la notion (aucun bouton s'il n'y en a pas). Chaque
Mathou né porte aussi « Faire grandir » (nom accessible « Faire grandir Tangentin ») vers
cet Entraînement, s'il existe ; jamais sur une silhouette, ni sur un Mathou endormi sans carte due
(son « Réveiller » y mène déjà : un seul bouton). Liens passés par `resolve()`, la requête ajoutée après `?`. Les silhouettes montrent
le nom de la notion, pas celui du Mathou. Aucun mot interdit par le Compendium (XP, niveau, score).

## Vue du professeur

Phase 0 validée par David le 2026-10-21 ([journal](../wip/mathoux-prof-progress.md)).

- **Onglet « Mathoux »** de la Gamification (`/dashboard/teacher/gamification/mathoux`) : une carte
  par classe active, dépliée à la demande ; par élève, « 7 Mathoux, dont 2 grands matous »
  (`memoryCountsPhrase`). Ces compteurs viennent de la **mémoire seule**
  (`loadMathouxCountsByStudent`) : le calcul complet coûterait une quarantaine de requêtes par
  élève. Un Mathou né depuis la dernière séance de l'élève n'y paraît donc qu'à la suivante, et les
  siestes ne s'y voient pas. Une notion archivée, ou dont la branche l'est, n'est pas comptée. La
  mémoire est lue par lots de 100 élèves, par pages de 1 000 lignes.
- **Chatterie d'un élève** (`/dashboard/teacher/students/[studentId]/chatterie`) : prof seul (comme
  l'onglet, dont le layout refuse l'admin),
  élève du prof (`verifyTeacherStudentWithRole`, sinon 403) **avant toute lecture**, identifiant
  validé par Zod (sinon 400). Même rendu que chez l'élève (`ChatterieRaces`), sans « Réveiller » ni
  « Faire grandir » ; « Pas encore de niveau : pas de Chatterie » sans niveau ; « fermée » si une
  lecture échoue. Retour vers l'onglet Mathoux.
- **Jamais d'écriture** : `readMathouCollection` refait le calcul au client du prof sans écrire la
  mémoire. Écrire « consommerait » les nouveautés que l'élève doit voir annoncées en fin de séance.
  `readMathouCollection` n'a pas de garde d'identité : seule la RLS borne ce qu'elle lit, d'où la
  garde de la page.
- Prouvé en intégration (`tests/integration/mathoux-vue-prof.test.ts`) : le prof lit la même
  Chatterie que l'élève, siestes et mémoire comprises ; sa visite n'écrit rien et l'élève voit
  encore ses naissances ; un élève ne lit ni la Chatterie ni les compteurs d'un autre.

## Hors v1

Combats (réécriture de Navadra), accessoires en gidouilles. (L'annonce des nouveautés en fin de
séance est livrée en v1.2, la vue du professeur ensuite, ci-dessus.)
