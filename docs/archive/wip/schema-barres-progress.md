# Chantier « schema-barres » — bloc ` ```schema-barres ` (schéma en barres)

> Outil neuf de la 6e (point 6-142), aussi pour CM1-063 et CM2-066. Phase 0 validée par David le 2026-11-12 :
> [`questions-6`](../../wip/questions-6-progress.md) § 29. Ligne 31 de [`outils-manquants.md`](../../wip/outils-manquants.md).
> Recette : `docs/systeme/ubumark.md` § « Comment étendre — nouveau bloc spécial » ; patron : ` ```partage `.

## Reprendre ici

_Mis à jour le 2026-11-12, après #2597. Chantier clos, journal archivé._

- **État** : bloc ` ```schema-barres ` (affichage) mergé, #2597 ; doc durable dans `docs/systeme/ubumark.md`.
  Vitrine `/demo/blocs` à 10 blocs (David, 2026-11-12 : garder).
- **Prochaine action** : aucune ici ; les modèles 6-142 sont le lot 13 de `questions-6`.
- **En attente de David** : rien.
- **Pièges** : `-80` retire de la longueur (la barre « 80 de moins » est plus COURTE que la référence) ; un `=`
  dans une étiquette ouvre l'accolade.
- **Worktree / branche** : supprimés.

## 1. Décisions (phase 0, `questions-6` § 29)

- Nom du bloc : ` ```schema-barres ` (pas `barres` : confusion avec le diagramme en barres).
- Longueurs écrites par le prof, jamais calculées sur les nombres.
- Affichage seulement : pas de geste « compléter le schéma » (`outils-manquants.md` ligne 32).
- Écran SVG, PDF Typst, catalogue, éditeur riche ; chat élève : jamais rendu.

## 2. Comportements (spécification des tests)

Syntaxe :

````text
```schema-barres
Or : ? (4) ; 70 (2)
Argent : ? (4)
Bronze : ? (2,5) ; -80 (1,5)
total : 320 €
```
````

### Nominal

1. Une ligne `Nom : segments` = une barre ; les barres sont dessinées l'une sous l'autre, alignées à gauche, dans
   l'ordre du texte. Le nom (texte libre, peut être vide : `: ? ; ?`) est écrit à gauche, colonne alignée à droite.
2. Segments séparés par `;`. Un segment = `étiquette (longueur)` ou `étiquette` seule (longueur 1). Longueur en
   unités, décimale à virgule ou à point (`1,5` = `1.5`). L'étiquette (texte libre : `?`, `70`, `70 €`, `P`) est
   écrite au centre du segment.
3. Échelle commune : la plus longue barre (segments en pointillés compris) occupe toute la largeur de dessin ;
   une unité a la même longueur sur toutes les barres.
4. Étiquette commençant par `-` (`-80 (1,5)`) : **partie manquante**, rectangle en pointillés, sans fond,
   étiquette écrite sans le signe (`80`).
5. `= texte` en fin de ligne (`: P (3) ; A (2) = 9 €`) : accolade horizontale **sous** la barre, de son début à la
   fin de son dernier segment plein, texte sous l'accolade.
6. Ligne `total : texte` (mot `total`, casse indifférente) : accolade verticale **à droite** de toutes les barres,
   de la première à la dernière, texte à droite de l'accolade. Une barre ne peut donc pas s'appeler « total ».
7. Variables `{{a}}` : lues sur l'énoncé résolu, comme les autres blocs (le parseur ne voit que le texte résolu).
8. Écran : un SVG à la largeur de la colonne (plafonné), traits `currentColor`, segments pleins sur un fond
   discret (jeton `--color-*`, une seule couleur d'accent au plus). Nom accessible « Schéma en barres » suivi des
   noms des barres (« Schéma en barres : Or, Argent, Bronze »), jamais les étiquettes.
9. PDF : Typst natif, traits noirs, fond blanc, pointillés pour la partie manquante ; même scène que l'écran.
10. Dans une case choix et dans une liste : rendu comme ailleurs, réduit à la colonne.
11. Éditeur riche : bloc de code `schema-barres`, aller-retour sans perte.

### Limites

12. Lignes vides et espaces autour des `;`, `:`, `=` ignorés.
13. Une seule barre, un seul segment : permis.
14. Au plus 6 barres et 12 segments par barre ; longueur d'un segment de 0,1 à 50.
15. `total :` sans aucune barre : erreur (voir 18).

### Erreurs (messages au prof « Ligne N : … », cadre « Schéma en barres indisponible » pour l'élève)

16. Ligne sans `:` → « Ligne N : écris le nom de la barre, puis « : », puis ses segments. »
17. Segment vide (`? ; ; 7`), longueur illisible, nulle, négative ou hors bornes, parenthèse non fermée.
18. Aucune barre ; plus de 6 barres ; plus de 12 segments ; `total` écrit deux fois ou vide ; `=` vide ; barre
    faite seulement de parties manquantes.

## 3. Historique

- 2026-11-12 — PR 1 écrite (agent `frontend-developer`) : parseur, scène, `SchemaBarres.svelte`, Typst, catalogue,
  éditeur riche, vitrine `/demo/blocs`, doc `ubumark.md` ; 53 tests du dossier `schema-barres`, compilation Typst
  réelle. Rendu vérifié à l'écran (clair, sombre, colonne de 358 px) et au PDF (4 exemples). Exemple des primes
  corrigé (bronze plus court). Revue `code-reviewer` : aucun bloquant ; mineur corrigé (barre sans nom désignée
  par son rang).
- 2026-11-12 — #2597 mergé (CI verte). Chantier clos, journal archivé.
