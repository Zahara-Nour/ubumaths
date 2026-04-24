# Prompt : Reecrire le convertisseur XML InstrumenPoche → DSL

## Contexte

Le module `constructions-v2` utilise un DSL etendu avec directives `@` pour decrire des constructions geometriques animees. Il faut un convertisseur fiable pour importer les fichiers XML InstrumenPoche (format IEP) directement en DSL.

Le convertisseur actuel (`src/lib/constructions-v2/converter.ts`) est simpliste et peu fiable. Le script de migration (`scripts/migrate-constructions-to-dsl.ts`) passe par un intermediaire JSON, ce qui ajoute une couche d'interpretation inutile.

**Objectif** : reecrire le convertisseur XML→DSL proprement, en lisant directement le XML source.

## Format XML InstrumenPoche

Les fichiers XML IEP ont cette structure :

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<INSTRUMENPOCHE version="2" auteur="Jean-Louis Kahn" licence="CC-BY-SA">
  <viewBox width="800" height="600" />
  <commentaire texteCommentaire="..." />
  <action objet="point" mouvement="creer" id="12" abscisse="173.45" ordonnee="457.45" couleur="forestgreen" />
  <action objet="point" mouvement="nommer" id="12" nom="A" couleur="noir" />
  <action objet="crayon" mouvement="tracer" abscisse="468" ordonnee="424" epaisseur="1.5" couleur="noir" id="AB" />
  <action objet="regle" mouvement="montrer" />
  <action objet="compas" mouvement="tracer" sens="5" couleur="forestgreen" epaisseur="1.5" fin="155" debut="138" id="c1" />
  ...
</INSTRUMENPOCHE>
```

### Coordonnees

- **Origine** : haut-gauche (0,0)
- **Y** : vers le bas (convention SVG)
- **Unites** : pixels
- **ViewBox** : typiquement `0 0 800 600`, defini par `<viewBox width="800" height="600" />`

Le DSL de geometry-core utilise des coordonnees math :

- **Origine** : centre du canvas
- **Y** : vers le haut
- **Unites** : unites math (1 unite = 40 pixels par defaut, `pixelsPerUnit = 40`)

**Transformation** :

```
x_math = (x_pixel - viewBoxWidth / 2) / ppu
y_math = (viewBoxHeight / 2 - y_pixel) / ppu
rayon_math = rayon_pixel / ppu
```

Avec `ppu = 40` (defaut de GeometryCanvas).

### Types d'actions IEP

Chaque `<action>` a un attribut `objet` (le type d'objet) et `mouvement` (l'action). Voici TOUS les types utilises dans les 9 fichiers de test :

#### Objets geometriques

| objet   | mouvement     | Description                              | Conversion DSL                           |
| ------- | ------------- | ---------------------------------------- | ---------------------------------------- |
| `point` | `creer`       | Cree un point a (abscisse, ordonnee)     | `NOM = point(x, y)`                      |
| `point` | `nommer`      | Nomme un point existant (attribut `nom`) | Utiliser le nom pour le point (pre-scan) |
| `point` | `masquer`     | Cache un point                           | `@cacher("NOM")`                         |
| `point` | `montrer`     | Montre un point                          | `@montrer("NOM")`                        |
| `point` | `translation` | Deplace un point a (abscisse, ordonnee)  | Ignorer (animation)                      |

#### Traces (geometrie visible)

| objet    | mouvement             | Description                                                                                                                                | Conversion DSL                                          |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `crayon` | `tracer`              | Trace un segment du point courant a (abscisse, ordonnee). Attributs: `id`, `epaisseur`, `couleur`, `pointille`, `style` (vecteur = fleche) | `segment(p1, p2)` — dedupliquer les points par position |
| `crayon` | `translation`         | Deplace le crayon (sans tracer)                                                                                                            | Ignorer (animation)                                     |
| `crayon` | `montrer`             | Montre le crayon                                                                                                                           | `@instrument("crayon")`                                 |
| `crayon` | `masquer`             | Cache le crayon                                                                                                                            | `@cacher`                                               |
| `compas` | `tracer`              | Trace un arc. Attributs: `debut` et `fin` (angles en degres), `couleur`, `epaisseur`, `sens` (direction), `id`                             | `arc(centre, rayon=r, debut=d, fin=f)`                  |
| `compas` | `ecarter`             | Regle l'ecartement du compas (attribut `ecart` = rayon en pixels)                                                                          | Ignorer (le rayon est dans `tracer`)                    |
| `compas` | `lever` / `coucher`   | Animation 3D du compas                                                                                                                     | Ignorer                                                 |
| `compas` | `retourner`           | Retourne le compas                                                                                                                         | Ignorer                                                 |
| `compas` | `montrer` / `masquer` | Visibilite                                                                                                                                 | `@instrument("compas")` / `@cacher`                     |
| `compas` | `translation`         | Deplace le compas                                                                                                                          | Ignorer (auto-positionne)                               |
| `compas` | `rotation`            | Tourne le compas                                                                                                                           | Ignorer                                                 |

#### Instruments (animation seulement)

| objet     | mouvement                                                    | Description  | Conversion DSL                       |
| --------- | ------------------------------------------------------------ | ------------ | ------------------------------------ |
| `regle`   | `montrer` / `masquer`                                        | Visibilite   | `@instrument("regle")` / `@cacher`   |
| `regle`   | `translation` / `rotation` / `zoom` / `vide` / `graduations` | Manipulation | Ignorer                              |
| `equerre` | `montrer` / `masquer`                                        | Visibilite   | `@instrument("equerre")` / `@cacher` |
| `equerre` | autre                                                        | Manipulation | Ignorer                              |

#### Annotations

| objet         | mouvement | Description                                              | Conversion DSL                                                 |
| ------------- | --------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `longueur`    | `creer`   | Marque de longueur (position, forme: `\\` ou `/` ou `x`) | `# marque de longueur` (commentaire, ou convertir si possible) |
| `angle_droit` | `creer`   | Marque d'angle droit a 3 points                          | `angle_droit(P1, V, P2)` si les points sont identifiables      |
| `marque`      | `creer`   | Marque sur segment                                       | `# marque` (commentaire)                                       |

#### Texte

| objet   | mouvement     | Description                                                                                                                     | Conversion DSL                           |
| ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `texte` | `creer`       | Reserve un emplacement pour texte                                                                                               | Ignorer (le contenu vient avec `ecrire`) |
| `texte` | `ecrire`      | Ecrit du texte (attribut `texte`). Encodage special: `£lt£` = `<`, `£gt£` = `>`, `£guillemet£` = `"`, `<br£gt£` = saut de ligne | `@instruction("texte nettoye")`          |
| `texte` | `masquer`     | Cache le texte                                                                                                                  | Ignorer                                  |
| `texte` | `translation` | Deplace le texte                                                                                                                | Ignorer                                  |

#### Attribut `tempo`

N'importe quelle action peut avoir un attribut `tempo`. La duree en ms = `tempo * 50`. Convertir en `@pause(ms)` mais :

- Ignorer les pauses < 200ms
- Ne pas emettre deux pauses consecutives
- Le `tempo` est sur l'action elle-meme, pas une action separee

## Architecture du convertisseur

### Fichier : `src/lib/constructions-v2/converter.ts`

Reecrire completement. Le convertisseur doit :

1. **Parser le XML** (DOMParser en browser, xml2js en Node.js — deja fait)
2. **Pre-scan** : extraire les noms de points (actions `nommer` avec attribut `nom`)
3. **Index des positions** : tracker les positions des points crees pour deduplication
4. **Gerer l'etat du crayon** : tracker la position courante du crayon (mise a jour par `translation` et `tracer`) pour savoir le point de depart de chaque `tracer`
5. **Transformer les coordonnees** : pixel → math avec la taille du viewBox
6. **Generer le DSL** proprement

### Etat du crayon

C'est le point le plus delicat. Le `crayon tracer` trace **du point courant** vers la destination. La position courante est mise a jour par :

- `crayon translation` (deplacement sans trace)
- `crayon tracer` (la destination devient la nouvelle position courante)

Donc la sequence :

```xml
<action objet="crayon" mouvement="translation" abscisse="173" ordonnee="457" />  <!-- move to A -->
<action objet="crayon" mouvement="tracer" abscisse="468" ordonnee="424" />       <!-- draw to B -->
```

Produit : `segment(A, B)` (si les positions correspondent aux points A et B)

### Deduplication des points

Quand un `crayon tracer` part d'une position qui correspond a un point existant (A, B, etc.), reutiliser ce point au lieu d'en creer un nouveau. Tolerance : ~6 pixels (0.15 unites math).

### Position du compas

Pour les `compas tracer`, le centre de l'arc est la position courante du compas (mise a jour par `compas translation`). Le rayon est le dernier `ecart` defini par `compas ecarter`.

## Fichiers de test XML

9 fichiers dans `extern/instrumenpoche-main/devServer/fixtures/` :

- `0.xml` — Calcul mental (texte seulement, pas de geometrie)
- `1.xml` — Partage d'un segment en 3 (regle, compas, points)
- `2.xml` — Calcul mental (texte)
- `3.xml` — Construction d'un carre (regle, compas, equerre)
- `4.xml` — Texte MathJax
- `5.xml` — Points avec images
- `6.xml` — Construction avec longueurs
- `7.xml` — Symetrie (angle droit, compas)
- `8.xml` — Marques sur segment

Les fichiers 1, 3, 6, 7 sont les plus importants (vraies constructions geometriques).

## Resultat attendu

Le convertisseur doit produire un DSL valide (parsable par `parseDsl()`) qui, joue dans le ConstructionPlayer :

- Affiche les memes points aux memes positions
- Trace les memes segments
- Trace les memes arcs de compas
- Affiche les instruments au bon moment
- Affiche les instructions textuelles
- A des pauses raisonnables entre les etapes

## Tests

- Convertir chaque fixture XML et verifier que le DSL est parsable
- Verifier que le nombre de points/segments/arcs est correct
- Verifier les noms de points (A, B, etc.)
- Verifier que les coordonnees sont dans la bonne plage (± 10 unites pour un canvas 800x600)

## Aussi mettre a jour

1. **`scripts/migrate-constructions-to-dsl.ts`** — utiliser le pipeline XML→DSL directement (lire les XML des fixtures, convertir, uploader)
2. **Page `/constructions/conversion`** — utiliser le nouveau convertisseur au lieu de l'ancien
3. **Tests dans `src/lib/constructions-v2/core/__tests__/converter.test.ts`** — mettre a jour

## Fichiers existants a connaitre

- Ancien convertisseur XML→JSON (reference) : `src/lib/constructions/converter.ts` (~800 LOC)
- Convertisseur actuel (a reecrire) : `src/lib/constructions-v2/converter.ts`
- Script de migration (a adapter) : `scripts/migrate-constructions-to-dsl.ts`
- Format du DSL : `src/lib/geometry-core/dsl/` (tokenizer, parser, interpreter, builtins)
- Demo page : `src/routes/(public)/construction-demo/+page.svelte`
