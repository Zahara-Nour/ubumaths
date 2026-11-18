# La Descente de la Vistule — bestiaire et coups de la recrue

Proposition du 2026-11-18, **à valider par David** avant l'étape 4 (chantier `navadra`, journal `navadra-progress.md`). Elle remplace les noms provisoires de `src/lib/descente/bestiary.ts` (« Bête de Nombrilie n° 1 »…) et de `src/lib/descente/moves.ts` (« Coup de Nombrilie »…).

## Règles suivies

- **Trois Bêtes par Province** (fourchette « 3 ou 4 » du 2026-11-09) ; la grosse Bête de la semaine est l'une d'elles, en plus grosse.
- **Drôles, jamais effrayantes** (le primaire est inclus).
- **Aucun chat** : les Mathoux sont des chats, une Bête se reconnaît au premier coup d'œil. Aucun polyèdre-bétail non plus : les Polyèdres d'Achras sont déjà des avatars de la boutique.
- **Nées du Clinamen**, la déviation : trait commun proposé, **chaque Bête est un peu de travers** (penchée, un œil plus haut que l'autre, une patte de trop…). Jamais nées des erreurs des élèves.
- La Province donne l'allure. Aucun nom ni dessin repris de Navadra.
- Clés en base : les clés provisoires (`nombrilie-1`…) ne sont jamais arrivées en prod (aucune page n'appelle l'apparition), on peut donc les remplacer par des clés parlantes, figées ensuite.

## Les 18 Bêtes

| Province    | Clé                  | Nom                   | Allure                                                                                                              | Caractère                                                               |
| ----------- | -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Nombrilie   | `retenue`            | La Retenue            | Petite boule en peignoir de bain rayé, qui porte sur son dos un gros « 1 » de bronze, trop lourd pour elle.         | Têtue : elle ne pose jamais son « 1 » et répète « je retiens ».         |
| Nombrilie   | `pince-monnaie`      | Le Pince-Monnaie      | Crabe en gilet de garçon de café du Grand Hôtel, deux pinces plates en forme de signe moins.                        | Chipe les pièces sur les tables en criant « Patron, la soustraction ! » |
| Nombrilie   | `bulle-de-zero`      | La Bulle de Zéro      | Anneau de vapeur échappé des bains, rond et creux, deux yeux ronds et des joues roses.                              | Vaniteuse : elle ne vaut rien et s'en vante.                            |
| Bedonstan   | `rapporteur`         | Le Rapporteur         | Demi-lune graduée à petites jambes, de grands yeux en haut de l'arc, un doigt toujours levé.                        | Il rapporte tout à Achras, au degré près.                               |
| Bedonstan   | `equerrouille`       | L'Équerrouille        | Équerre rouillée à deux pattes raides, qui grince à chaque pas.                                                     | Rigide : tout doit être à angle droit, même la sieste.                  |
| Bedonstan   | `compas-sauterelle`  | Le Compas-Sauterelle  | Sauterelle aux pattes de compas, qui laisse dans l'herbe de la steppe des cercles parfaits.                         | Tourne en rond, très fière de ses cercles.                              |
| Yoyolande   | `sinuserpent`        | Le Sinuserpent        | Serpent de mer qui ondule en vagues bien régulières, la tête montant et descendant au rythme du phare de Sinusborg. | Périodique : il raconte la même blague toutes les deux minutes.         |
| Yoyolande   | `mouetton`           | Le Mouetton           | Mouette pendue au fil d'un yoyo, qui monte et descend sans jamais se poser.                                         | Indécis : « je monte ? je descends ? »                                  |
| Yoyolande   | `asymptortue`        | L'Asymptortue         | Tortue qui s'approche de la rive à petits pas, sans jamais l'atteindre.                                             | Patiente : « presque arrivée ».                                         |
| Pifométrie  | `depipe`             | Le Dépipé             | Dé à pattes, un peu bancal, qui retombe toujours sur la même face (le six) ; un clin d'œil sur chaque face.         | Tricheur et fier de l'être.                                             |
| Pifométrie  | `pile-ou-farce`      | Le Pile-ou-Farce      | Pièce de monnaie qui roule sur sa tranche : un côté rit, l'autre boude.                                             | Change d'humeur à chaque lancer.                                        |
| Pifométrie  | `moyennouille`       | La Moyennouille       | Grenouille en tenue de croupier qui saute toujours pile au milieu de deux nénuphars.                                | Tiède : ni trop ni trop peu, jamais.                                    |
| Glitchistan | `boucleur`           | Le Boucleur           | Petit automate de laiton à clé de remontoir, qui tourne en rond et refait sans fin le même geste.                   | Ne sait pas s'arrêter ; « ha ha », comme son gouverneur.                |
| Glitchistan | `hoqueteur`          | Le Hoqueteur          | Petite locomotive à vapeur sur pattes, qui hoquette des ronds de fumée : deux crans en avant, un en arrière.        | Le raté fait machine ; toujours un peu en retard.                       |
| Glitchistan | `bogue`              | Le Bogue              | Insecte de cuivre aux rouages apparents, le dos hérissé de piquants comme une bogue de châtaigne.                   | Se cache dans les rouages des usines de Turingrad.                      |
| Patatovie   | `patate-de-venn`     | La Patate de Venn     | Trois patates soudées qui se chevauchent, chacune avec sa tête et son humeur.                                       | Ne sait jamais dans quelle enceinte elle se trouve.                     |
| Patatovie   | `doryphore-menteur`  | Le Doryphore menteur  | Doryphore rayé, le mangeur de patates, avec un sourire en coin.                                                     | Il dit « je mens » : on ne sait plus s'il ment.                         |
| Patatovie   | `tubercule-sans-fin` | Le Tubercule sans fin | Tubercule-ver qui n'en finit pas de sortir de terre, en anneaux de plus en plus petits.                             | Interminable, « surtout vers la fin ».                                  |

## Les 6 coups de la recrue

Un coup par Province (la recrue n'a pas de magie). Gestes burlesques, sans arme blanche : le coup ne blesse pas, il fait reculer la Bête.

| Province    | Clé (code seul)    | Nom                  | Ce qu'on voit                                                      |
| ----------- | ------------------ | -------------------- | ------------------------------------------------------------------ |
| Nombrilie   | `coup-nombrilie`   | Le Coup de Gidouille | L'avatar bombe le ventre, spirale de la gidouille comprise.        |
| Bedonstan   | `coup-bedonstan`   | Le Lancer de Cube    | Un cube de pierre de la steppe, lancé à deux mains.                |
| Yoyolande   | `coup-yoyolande`   | Le Coup de Yoyo      | Le yoyo part, frappe, revient.                                     |
| Pifométrie  | `coup-pifometrie`  | Le Tir au Pif        | Un tir lancé au jugé, qui touche quand même.                       |
| Glitchistan | `coup-glitchistan` | Le Tour de Manivelle | Un grand tour de manivelle qui fait tourner la Bête sur elle-même. |
| Patatovie   | `coup-patatovie`   | Le Lancer de Patate  | Une patate de Patatovie, bien ronde.                               |

## Dessins (Nano Banana)

Une conversation par Bête, avec le nuancier numérique seul en pièce jointe (`~/Downloads/avatars-nuancier-reference-ia.png`, le même que pour les avatars). Le carnet montre les Bêtes pas encore rencontrées en silhouette : un fond uni suffit pour la tirer du dessin.

```text
Draw a creature for a children's math adventure game: <SUJET>. Funny, friendly and a bit absurd, never scary, clearly NOT a cat. The creature is slightly crooked (one eye higher than the other, or leaning to one side).

Style: 1896 Montmartre lithographic poster in the manner of Théophile-Alexandre Steinlen. Bold thick dark contours, flat color areas, no gradients, no 3D, no shading beyond flat shadow shapes.

Colors: use only the colors of the attached palette image, with navy ink for the outlines.

Composition: square 1:1 format, the whole creature visible, centered and filling about 70% of the image, plain flat cream parchment background. No text, no letters, no signature.
```

Exception au « no numbers » : la Retenue porte un « 1 », le Dépipé des points de dé.

| Bête                  | `<SUJET>`                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| La Retenue            | a small round creature in a striped bathrobe, carrying on its back a big bronze number "1" that is too heavy for it              |
| Le Pince-Monnaie      | a crab wearing a café waiter's waistcoat and bow tie, its two flat claws shaped like minus signs, holding a stolen gold coin     |
| La Bulle de Zéro      | a ring of steam shaped like a hollow zero, floating, with two big round eyes and pink cheeks, looking proud                      |
| Le Rapporteur         | a half-moon protractor with graduation marks and tiny legs, big eyes at the top of the arc, raising one finger like a tattletale |
| L'Équerrouille        | a rusty set square (right-angle ruler) walking on two stiff legs, squeaking, with a very serious face                            |
| Le Compas-Sauterelle  | a grasshopper whose long legs are drawing compasses, drawing a perfect circle in the grass                                       |
| Le Sinuserpent        | a sea serpent whose body forms regular sine waves above the water, smiling, a small lighthouse in the far background             |
| Le Mouetton           | a seagull hanging from the string of a yo-yo, wings open, looking hesitant                                                       |
| L'Asymptortue         | a slow turtle walking toward a river bank, almost touching it, with a patient smile                                              |
| Le Dépipé             | a slightly wonky six-sided die with little legs, every face showing six dots, winking with a mischievous grin                    |
| Le Pile-ou-Farce      | a coin rolling on its edge, one side laughing and the other side sulking                                                         |
| La Moyennouille       | a frog wearing a casino croupier's waistcoat and visor, jumping exactly halfway between two lily pads                            |
| Le Boucleur           | a small brass clockwork automaton with a wind-up key in its back, turning in circles                                             |
| Le Hoqueteur          | a tiny steam locomotive with legs, hiccupping puffs of round smoke rings                                                         |
| Le Bogue              | a copper beetle with visible clockwork gears, its back covered in spikes like a chestnut husk                                    |
| La Patate de Venn     | three potatoes fused together and overlapping like a Venn diagram, each with its own face and mood                               |
| Le Doryphore menteur  | a striped Colorado potato beetle with a sly sideways smile                                                                       |
| Le Tubercule sans fin | a worm-like tuber coming out of the ground in rings that get smaller and smaller, endlessly                                      |
