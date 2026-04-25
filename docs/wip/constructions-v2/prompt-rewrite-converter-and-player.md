# Prompt : Reecrire le convertisseur XML→DSL et le player v2

## Contexte

Le module `constructions-v2` a un convertisseur XML→DSL (`src/lib/constructions-v2/converter.ts`) et un ConstructionPlayer (`src/lib/constructions-v2/components/ConstructionPlayer.svelte`) qui ne fonctionnent pas correctement. Les animations ne marchent pas.

L'ancien module `constructions` (v1) fonctionne parfaitement : le convertisseur XML→JSON produit un format JSON que le ConstructionPlayer v1 lit et anime correctement.

**Objectif** : analyser en detail l'ancien systeme qui marche, puis reecrire le nouveau pour qu'il produise les memes resultats.

## Phase 1 : Analyser l'ancien systeme (v1)

### 1.1 Ancien convertisseur XML→JSON

**Fichier** : `src/lib/constructions/converter.ts` (~800 LOC)

Analyser en detail :

- Le parsing XML et l'extraction des attributs de chaque `<action>`
- La machine a etats pour le crayon : position courante, comment `translation` et `tracer` la mettent a jour, comment le point de depart d'un segment est determine
- La machine a etats pour le compas : position, ecart (rayon), comment `translation`, `ecarter`, `rotation` la mettent a jour, comment le centre et rayon d'un arc sont determines lors d'un `tracer`
- La resolution de l'attribut `cible` : comment il reference un point par son ID IEP et comment la position est resolue
- La transformation de coordonnees pixel → canvas (attention : le JSON v1 utilise peut-etre un systeme de coordonnees different du DSL)
- La deduplication des points : tolerance, quand un nouveau point est cree vs quand un point existant est reutilise
- Le traitement de `tempo` : calcul en ms, filtrage des pauses courtes, evitement des pauses consecutives
- Le traitement des textes : nettoyage de l'encodage IEP (`£lt£`, `£gt£`, etc.)
- Le traitement des formes speciales : `forme="libre"` (main levee), `forme="demidroite"` (demi-droite), `pointille`, `style="vecteur"` (fleche)
- Le format JSON exact produit pour chaque type d'action (point, segment, arc, instrument, texte, pause, etc.)

### 1.2 Types JSON des etapes

**Fichier** : `src/lib/constructions/types.ts`

Documenter le catalogue complet des types de steps JSON :
- Chaque type de step avec tous ses champs
- Les types d'objets geometriques (point, segment, arc, cercle, etc.)
- Les types d'actions (show, hide, moveTo, drawLine, drawArc, etc.)
- Le format des pauses et instructions

### 1.3 Ancien ConstructionEngine

**Fichier** : `src/lib/constructions/engine.ts` (ou similaire — chercher dans `src/lib/constructions/`)

Analyser :
- Comment il recoit le script JSON et prepare l'execution
- Comment `step()` applique une etape : quel objet geometrique est cree, quel etat d'instrument est modifie
- Comment le seek/scrub fonctionne : peut-on aller a une etape arbitraire ? Comment l'etat est reconstruit ?
- Le tracking des etapes appliquees (`#appliedSteps` ou equivalent)
- La gestion des instruments : quels etats sont maintenus (position, rotation, visibilite, rayon compas)
- Le positionnement automatique des instruments sur les objets traces

### 1.4 Ancien ConstructionPlayer

**Fichier** : `src/lib/constructions/components/ConstructionPlayer.svelte`

Analyser :
- Les props recues (script JSON, options d'affichage)
- Le mecanisme de timing/animation : comment les etapes sont jouees dans le temps, quelle est la duree de chaque etape
- Les controles de lecture : play, pause, step forward/backward, reset, scrub par slider
- Le rendu du canvas geometrique : quel composant est utilise, comment la figure est passee
- Le rendu des instruments : comment les SVG sont positionnes et animes
- L'affichage des instructions textuelles
- La reactivite Svelte : comment les changements d'etat declenchent des mises a jour du DOM

### 1.5 Composants instruments v1

**Dossier** : `src/lib/constructions/components/`

Lister tous les composants (Ruler, Compass, etc.) et comment ils sont rendus/positionnes.

## Phase 2 : Comparer avec le systeme v2 actuel

### 2.1 Convertisseur XML→DSL actuel

**Fichier** : `src/lib/constructions-v2/converter.ts`

Comparer avec l'ancien convertisseur :
- Est-ce que la machine a etats du crayon est identique ?
- Est-ce que la machine a etats du compas est identique ?
- Est-ce que la transformation de coordonnees est correcte ?
- Est-ce que la deduplication des points fonctionne pareil ?
- Est-ce que des types d'actions sont manques ou mal convertis ?

### 2.2 ConstructionPlayer v2 actuel

**Fichier** : `src/lib/constructions-v2/components/ConstructionPlayer.svelte`

Comparer avec l'ancien :
- Le mecanisme de timing est-il equivalent ?
- Le `handleStepChange` qui fait `reset()` + re-step a chaque changement d'etape : est-ce correct ou faut-il un mecanisme incremental comme dans v1 ?
- La reactivite Svelte : les variables `$state` sont-elles correctement mises a jour quand l'executor change d'etat ?

### 2.3 ConstructionExecutor v2

**Fichier** : `src/lib/constructions-v2/core/executor.ts`

Comparer avec l'ancien engine :
- Le `step()` produit-il les memes objets geometriques ?
- Le `reset()` + re-step est-il equivalent au seek de v1 ?
- Les directives (@instrument, @cacher, @pause, @instruction) sont-elles correctement gerees ?

### 2.4 DSL builtins

**Fichiers** : `src/lib/geometry-core/dsl/builtins.ts`, `src/lib/geometry-core/dsl/interpreter.ts`

Verifier :
- Est-ce que `arc(center, rayon=r, debut=d, fin=f)` cree bien un arc visible dans la figure ?
- Est-ce que `segment(A, B)` cree bien un segment visible ?
- Est-ce que les directives `@instrument`, `@cacher`, `@pause`, `@instruction` sont bien reconnues et executees ?

## Phase 3 : Reecrire

### 3.1 Convertisseur XML→DSL

Reecrire `src/lib/constructions-v2/converter.ts` en s'assurant que :

1. **La machine a etats du crayon est identique a v1** : meme logique pour determiner le point de depart et d'arrivee de chaque segment
2. **La machine a etats du compas est identique a v1** : meme logique pour determiner le centre, le rayon, les angles de debut/fin de chaque arc
3. **La resolution `cible` est identique a v1** : meme facon de resoudre les references par ID
4. **La transformation de coordonnees est correcte** : pixel → coordonnees math du DSL (origine centre, Y vers le haut, 1 unite = 40 pixels)
5. **Le DSL produit est parsable** par `parseDsl()` et executable par `createStepper()`
6. **Chaque step JSON de v1 a un equivalent DSL** : mapper explicitement chaque type de step vers du DSL

### 3.2 ConstructionPlayer v2

Reecrire `src/lib/constructions-v2/components/ConstructionPlayer.svelte` en s'assurant que :

1. **Le mecanisme de timing reproduit celui de v1** : memes durees, meme rythme d'animation
2. **La reactivite fonctionne** : quand l'executor avance d'une etape, le canvas se met a jour immediatement
3. **Les instruments sont correctement positionnes et visibles** au bon moment
4. **Les controles fonctionnent** : play, pause, step, reset, scrub
5. **Le seek/scrub est efficace** : soit incremental comme v1, soit reset+replay si c'est assez rapide

### 3.3 Tests

Mettre a jour `src/lib/constructions-v2/core/__tests__/converter.test.ts` :
- Tester avec les fixtures XML `extern/instrumenpoche-main/devServer/fixtures/1.xml` et `3.xml`
- Verifier que le DSL produit est parsable
- Verifier que le nombre de points/segments/arcs correspond a ce que l'ancien convertisseur produisait
- Verifier les positions des points nommes (A, B, etc.)

## Fichiers a connaitre

| Fichier | Role |
|---------|------|
| `src/lib/constructions/converter.ts` | Ancien convertisseur XML→JSON (REFERENCE) |
| `src/lib/constructions/types.ts` | Types JSON des steps v1 |
| `src/lib/constructions/engine.ts` | Ancien moteur d'execution JSON |
| `src/lib/constructions/components/ConstructionPlayer.svelte` | Ancien player (FONCTIONNE) |
| `src/lib/constructions/components/` | Anciens composants instruments |
| `src/lib/constructions-v2/converter.ts` | Nouveau convertisseur XML→DSL (A REECRIRE) |
| `src/lib/constructions-v2/core/executor.ts` | Nouveau moteur DSL |
| `src/lib/constructions-v2/components/ConstructionPlayer.svelte` | Nouveau player (A REECRIRE) |
| `src/lib/constructions-v2/components/ConstructionCanvas.svelte` | Canvas v2 |
| `src/lib/geometry-core/dsl/builtins.ts` | Builtins DSL (point, segment, arc, etc.) |
| `src/lib/geometry-core/dsl/interpreter.ts` | Interpreteur/stepper DSL |
| `src/lib/geometry-core/dsl/parser.ts` | Parseur DSL |
| `src/lib/components/geometry/GeometryCanvas.svelte` | Canvas geometrique generique |
| `extern/instrumenpoche-main/devServer/fixtures/*.xml` | Fichiers XML de test |
| `src/routes/(protected)/constructions/[id]/+page.svelte` | Page de visualisation |
| `src/routes/(protected)/constructions/conversion/+page.svelte` | Page de conversion |

## Resultat attendu

Apres la reecriture, on doit pouvoir :

1. Uploader un fichier XML sur `/constructions/conversion`
2. Le convertisseur produit un DSL correct
3. Sauvegarder en base (format DSL)
4. Ouvrir sur `/constructions/[id]`
5. **Voir la meme animation que l'ancien player v1** : memes points, memes segments, memes arcs, memes instruments, memes pauses, memes instructions
