# Boutique d'avatars — prompts du premier lot (Nano Banana)

Proposition du 2026-11-06, **à valider par David** (noms, sujets, palier). Une nouvelle conversation Nano Banana par image, avec le nuancier numérique seul en pièce jointe (`avatars-nuancier-reference-ia.png`).

## Modèle commun

Remplacer `<SUJET>` par la ligne du tableau.

```text
Draw a round profile picture (avatar) for a student aged 11 to 17: <SUJET>. Playful, friendly and a bit absurd, never scary.

Style: 1896 Montmartre lithographic poster in the manner of Théophile-Alexandre Steinlen. Bold thick dark contours, flat color areas, no gradients, no 3D, no shading beyond flat shadow shapes.

Colors: use only the colors of the attached palette image, with navy ink for the outlines.

Composition: square 1:1 format, the subject centered and filling about 70% of the image, entirely inside the central circle (the image will be cropped to a circle), head and shoulders for a character, plain flat cream parchment background. No text, no letters, no numbers, no signature.
```

## Les 21 avatars

| Famille                 | Nom affiché             | Palier | `<SUJET>`                                                                                                                                                       |
| ----------------------- | ----------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emblèmes                | La Chandelle verte      | 15     | a lit candle with a green flame and green wax, in a small golden candlestick, a thin curl of smoke shaped like a spiral                                         |
| Emblèmes                | Le Croc à phynances     | 15     | a big golden hook on a short wooden handle, holding a small bag of coins, a navy spiral engraved on the hook                                                    |
| Emblèmes                | Le Bateau-passoire      | 15     | a small boat made of a giant kitchen colander with holes, floating on stylized waves, a tiny oar resting on its rim                                             |
| Galopins                | La Galopine aux tresses | 30     | a cheerful girl of about 13 with two braids and a mischievous smile, wearing a floppy emerald green cap with a small golden spiral badge, white collar          |
| Galopins                | Le Galopin bouclé       | 30     | a cheerful boy of about 13 with curly dark hair, brown skin and a confident grin, wearing a deep crimson cap tilted sideways, golden spiral badge, white collar |
| Galopins                | Le Galopin à lunettes   | 30     | a cheerful child of about 13 with short hair, round glasses and a curious look, wearing a navy beret with a white feather, a golden scarf                       |
| Polyèdres d'Achras      | Le Cube-vache           | 30     | a cube-shaped cow with flat faces and sharp edges, white with navy spots, two small horns, a golden cowbell, big friendly eyes                                  |
| Polyèdres d'Achras      | Le Dodécaèdre-mouton    | 30     | a dodecahedron-shaped sheep with pentagonal faces covered in fluffy white wool, small black face and legs, happy expression                                     |
| Polyèdres d'Achras      | Le Tétraèdre-chèvre     | 30     | a tetrahedron-shaped goat with triangular faces, a small pointed beard, two curled horns, a stubborn but funny look                                             |
| Créatures des Mathres   | Le Pi moustachu         | 15     | the Greek letter pi as a little gentleman character with a curled moustache, tiny top hat and a monocle                                                         |
| Créatures des Mathres   | L'Infini-chenille       | 15     | a caterpillar whose body forms the infinity symbol (a figure eight lying on its side), smiling, with small antennae                                             |
| Créatures des Mathres   | Le Ruban de Möbius      | 15     | a Möbius strip ribbon shaped like a playful snake biting its own tail, emerald green on one side and marigold yellow on the other                               |
| Marionnettes du Théâtre | Le Pantin rouge         | 30     | a wooden string puppet head with painted rosy cheeks, a crimson pointed hat with a pompom, the strings going up out of frame                                    |
| Marionnettes du Théâtre | Le Bouffon à gidouille  | 30     | a jester puppet with a two-colored hood (emerald and crimson) with small bells, a navy spiral painted on the cheek, wooden face                                 |
| Marionnettes du Théâtre | Le Pantin du Czar       | 30     | a wooden toy-soldier puppet in an ice-blue uniform with a tall fur hat covered in snowflakes, a comically stern painted moustache                               |
| Animaux de la Cour      | L'Ours de Lituanie      | 30     | a big brown bear in a small golden crown slightly too small for him, a green cape, surprised but kind face                                                      |
| Animaux de la Cour      | Le Hibou savant         | 30     | an owl wearing round glasses and a navy academic cap, holding a quill pen, wise and slightly smug                                                               |
| Animaux de la Cour      | Le Renard palotin       | 30     | a fox in a green soldier uniform with golden buttons and a crimson square-topped cap, saluting with one paw                                                     |
| Automates de Turingrad  | L'Automate calculateur  | 60     | a brass steampunk robot head with gear wheels visible, round glass eyes, a small steam puff from a chimney on its head                                          |
| Automates de Turingrad  | Le Rossignol mécanique  | 60     | a mechanical nightingale made of copper and brass with a wind-up key on its back, singing                                                                       |
| Automates de Turingrad  | Le Chat à vapeur        | 60     | a mechanical cat made of brass plates and rivets, a little steam whistle tail, green glowing eyes                                                               |

## Noms des fichiers (PR 3)

Enregistrer chaque image sous la clé du catalogue (`.png` ou `.jpg`), toutes dans un même dossier, puis `pnpm avatars:convertir <dossier>` → `static/avatars/<clé>.webp`.

| Nom affiché             | Fichier              | Nom affiché            | Fichier                  |
| ----------------------- | -------------------- | ---------------------- | ------------------------ |
| La Chandelle verte      | `green_candle`       | L'Infini-chenille      | `infinity_caterpillar`   |
| Le Croc à phynances     | `phynance_hook`      | Le Ruban de Möbius     | `mobius_ribbon`          |
| Le Bateau-passoire      | `colander_boat`      | Le Pantin rouge        | `red_puppet`             |
| La Galopine aux tresses | `galopine_braids`    | Le Bouffon à gidouille | `gidouille_jester`       |
| Le Galopin bouclé       | `galopin_curly`      | Le Pantin du Czar      | `czar_puppet`            |
| Le Galopin à lunettes   | `galopin_glasses`    | L'Ours de Lituanie     | `lithuanian_bear`        |
| Le Cube-vache           | `cube_cow`           | Le Hibou savant        | `scholar_owl`            |
| Le Dodécaèdre-mouton    | `dodecahedron_sheep` | Le Renard palotin      | `palotin_fox`            |
| Le Tétraèdre-chèvre     | `tetrahedron_goat`   | L'Automate calculateur | `calculating_automaton`  |
| Le Pi moustachu         | `mustached_pi`       | Le Rossignol mécanique | `mechanical_nightingale` |
|                         |                      | Le Chat à vapeur       | `steam_cat`              |

## Les 3 cadres (anneau seul, centre vide)

Modèle : remplacer `<ANNEAU>`.

```text
Draw a decorative circular frame (ring) for a profile picture: <ANNEAU>. The center of the ring must be completely empty, plain flat cream parchment color, so a picture can be placed inside.

Style: 1896 Montmartre lithographic poster in the manner of Théophile-Alexandre Steinlen. Bold thick dark contours, flat color areas, no gradients, no 3D.

Colors: use only the colors of the attached palette image, with navy ink for the outlines.

Composition: square 1:1 format, the ring centered, touching the edges of the image, ring thickness about 12% of the image width. No text, no letters, no numbers, no signature.
```

| Nom affiché             | Palier | `<ANNEAU>`                                                                                     |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| L'Anneau de gidouilles  | 15     | a ring made of small navy spirals linked together on an emerald green band                     |
| La Couronne de lauriers | 30     | a ring of golden laurel leaves, two branches meeting at the bottom with a small crimson ribbon |
| Le Cercle glacé du Czar | 60     | a ring of ice crystals and small snowflakes in pale ice blue and white, with tiny golden stars |
