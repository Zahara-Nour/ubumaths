# Chantier « bloc-scratch » — bloc ubumark ` ```scratch `

## Reprendre ici

_Mis à jour le 2026-11-01, palier 1 écrit (§ 7)._

- **État** : palier 1 écrit et vert en local ; PR à ouvrir / en CI.
- **Prochaine action** : CI verte → revue `code-reviewer` → merge ; puis palier 2 (PDF en image SVG si Typst
  le lit ; bouton « Insérer » de l'éditeur riche) ou retour au lot 7 de `questions-3` (au choix de David).
- **En attente de David** : rien.
- **Pièges en cours** : le dessin mesure le texte avec un canvas → navigateur seulement (pas de rendu
  serveur, pas de jsdom) ; le parseur ne doit jamais importer `scratchblocks` (chunk de toutes les pages).
- **Worktree / branche** : `../ubumaths-wt-bloc-scratch`, `feat/bloc-scratch`.

---

## 1. Origine et périmètre

Issu du chantier `questions-3` (§ 14 : lot 7, algorithmique ; décision de David du 2026-11-01). Les
exemples 2026 du cycle 4 (p. 46-50) donnent **tous leurs programmes en blocs Scratch** ; l'appli ne sait
montrer un programme qu'en bloc de code ordinaire (texte monospace).

Relevé MCP du 2026-11-01 : **aucun modèle d'algorithmique en prod, à aucun niveau.** Points que le bloc
rend possibles (lire, exécuter, analyser un programme donné) :

| Niveau | Points                                                                              |
| ------ | ----------------------------------------------------------------------------------- |
| 6e     | 6-194, 6-195, 6-196, 6-210                                                          |
| 5e     | 5-101 (entrées et sorties), 5-105 (analyser, modifier), 5-106 (répéter n fois)      |
| 4e     | 4-065, 4-066 (conditions), 4-067 (une variable)                                     |
| 3e     | 3-047 (plusieurs variables), 3-048 (et / ou), 3-049 (répéter jusqu'à ce que), 3-050 |

**Hors périmètre** : écrire ou assembler un programme (geste de réponse ; Blockly, futur chantier) ;
exécuter le programme (lutin, scène) ; les modèles de questions (chantiers `questions-<niveau>`) ; le chat
élève (invariant 8 de `ubumark.md`, liste blanche).

## 2. La bibliothèque `scratchblocks` (évaluée le 2026-11-01)

- `scratchblocks@3.7.1`, **MIT**, maintenue (dernière publication 2026-07-14), sans dépendance.
- Poids : 129 Ko minifié (**38 Ko gzip**) + `locales/fr.json` 12 Ko ; chargée **à la demande** (import
  dynamique, comme `highlight.js` pour les blocs de code).
- **Français : vérifié** (sonde dans le scratchpad, supprimée) — le parseur reconnaît tout ce dont ont
  besoin les points du § 1 : `quand le drapeau vert pressé`, `demander [...] et attendre`, `mettre [reste v]
à (réponse)`, `ajouter (1) à [i v]`, `répéter (4) fois`, `répéter jusqu'à ce que <…>`, `si <…> alors` /
  `sinon`, `<<…> et <…>>`, `<<…> ou <…>>`, `dire (reste)`, `avancer de (côté) pas`, `tourner ↻ de (90)
degrés`, `définir dessine carré (côté)` et son appel. Un bloc mal écrit est signalé (`isUnknown`).
- **Rendu** : SVG au style Scratch 3 ; il mesure le texte avec un canvas → **navigateur seulement**.

## 3. Syntaxe (proposée)

Le corps du bloc **est** le programme, dans la syntaxe des `scratchblocks` en français, une instruction par
ligne, `fin` pour fermer une boucle ou un `si`. Les `{{variables}}` du modèle sont remplacées avant.

````text
```scratch
quand le drapeau vert pressé
demander [Quel est le nombre à diviser ?] et attendre
mettre [reste v] à (réponse)
demander [Quel est le diviseur ?] et attendre
répéter jusqu'à ce que <(reste) < (réponse)>
mettre [reste v] à ((reste) - (réponse))
fin
dire (reste)
```
````

````text
```scratch
mettre [a v] à ({{n}})
mettre [b v] à ({{m}})
mettre [a v] à ((a) + (b))
mettre [b v] à ((a) - (b))
```
````

## 4. Comportements (phase 0)

**Nominal**

1. Un bloc ` ```scratch ` bien écrit se dessine en blocs Scratch 3, couleurs de Scratch, à l'écran, dans un
   énoncé, un corrigé, une fiche, un aperçu admin, l'Atelier.
2. **Dans une case « choix »** : chaque option peut être un programme (3-047 : « lequel échange a et b ? »).
3. Avant le chargement (rendu serveur, première image) : le programme en **texte monospace**, lisible, puis
   remplacé par le dessin.
4. Nom accessible : le texte du programme (le lecteur d'écran lit les instructions).
5. Thème sombre : les blocs gardent leurs couleurs Scratch (ils ont leur propre fond).
6. Éditeur riche : aller-retour en bloc de code de langage `scratch`.

**Limites**

7. Programme long (> 25 lignes) : dessiné tel quel ; la largeur s'adapte à la colonne (réduction, comme les
   autres blocs dessinés dans un choix).
8. Plusieurs scripts dans un même bloc (ligne vide entre eux) : côte à côte si la place le permet, sinon
   l'un sous l'autre (ex. 3-050 : `définir dessine carré` à côté du programme principal).

**Erreurs**

9. Bloc inconnu ou mal fermé : messages situés pour le prof (ligne, instruction non reconnue) ; pour
   l'élève, cadre « Programme indisponible » ; jamais un dessin faux sans le dire.
10. Bloc vide : erreur prof.

**PDF** (compilé dans le navigateur, ADR 0004)

11. Le SVG du dessin posé en image, comme le QR code (`#image(bytes(…), format: "svg")`) ; à vérifier :
    Typst lit-il le SVG de `scratchblocks` (styles CSS, polices) ? À défaut, le programme en texte
    monospace.

**Paliers** : palier 1 = parseur + rendu écran + choix + page de démo (une PR) ; palier 2 = PDF + éditeur
riche (une PR).

## 5. Questions à David

1. **Syntaxe** du § 3 (celle des `scratchblocks`, en français seulement) — d'accord ? L'anglais est refusé
   (un auteur écrit en français).
2. **Ajout de la dépendance** `scratchblocks@3.7.1` (MIT, 38 Ko gzip, chargée à la demande, version
   épinglée) — d'accord ?
3. **Paliers** du § 4 (écran et choix d'abord, PDF ensuite) ?
4. **PDF** : image SVG si Typst la lit, sinon texte monospace — d'accord pour ce repli ?
5. **Nom du bloc** : ` ```scratch ` (le nom que connaissent élèves et profs) ou ` ```programme ` ?

**Question d'accès** : aucune (ni table, ni règle d'accès, ni donnée d'élève).

## 6. Décisions (David, 2026-11-01, « je te suis » sur les recommandations)

1. Syntaxe des `scratchblocks`, **français seulement** (l'anglais refusé, erreur prof).
2. Dépendance `scratchblocks@3.7.1` épinglée, chargée à la demande.
3. Palier 1 = parseur + écran + case choix + page de démo ; palier 2 = PDF + éditeur riche.
4. PDF : SVG en image si Typst le lit, sinon texte monospace.
5. Nom : ` ```scratch `.

## 7. Palier 1 : écrit (2026-11-01)

- Parseur léger `scratch-parser.ts` (programme gardé tel quel ; bloc vide, non fermé) ; vérification
  `utils/scratch-check.ts` (instruction non reconnue, anglais compris, « fin » en trop, « sinon » sans « si »,
  ligne retrouvée en suivant la structure) ; dessin `utils/scratch-render.ts` (Scratch 3, échelle 0,675) ;
  `ScratchBlock.svelte` (texte avant le chargement, erreurs prof / « Programme indisponible » élève, nom
  accessible) ; branché au premier niveau, en liste, dans la case choix.
- Faits en plus, petits : repli texte au PDF (sinon le bloc disparaissait), aller-retour de l'éditeur riche
  (sinon le bloc était **perdu** : `default: return null`), `check:ubumark` vérifie les programmes (et lit
  désormais les choix d'un ```choix, pour tous les blocs), fiche du catalogue `/aide-ecriture/blocs/scratch`
  avec une section « Instructions » (`settingsKind`).
- Tests : parseur 8, vérification 10, PDF 2, éditeur riche 4, rendu restreint 2, composant (navigateur) 7 ;
  suites ubumark / markdown / rich-text / catalogue / worksheets : 6 824 verts.
- Vu dans Chrome (prof local, port 5176) : les 4 exemples dessinés juste, erreurs situées ; un dessin se
  réduit à sa colonne (300 px : pas de débordement). **Écart au § 4.8** : deux scripts l'un sous l'autre
  (la bibliothèque ne les met pas côte à côte). Thème clair non vu (bascule non trouvée) : à regarder.
- Hors palier : la vitrine `/demo/blocs` (sélection validée, pas touchée).

## 8. Revue `code-reviewer` (2026-11-01) : 3 findings, corrigés

1. (Important) Lignes des messages décalées par un commentaire `//` ou un `Fin` / `Sinon` en majuscules
   (la bibliothèque les accepte) → comparaison sans commentaire et sans casse ; test rouge puis vert.
2. (Mineur) Une exception de la bibliothèque cassait le rendu → repli sur le programme en texte.
3. (Mineur) Des ``` au milieu d'une ligne fermaient le texte brut du PDF → clôture plus longue que la plus
   longue suite d'accents graves ; test rouge puis vert.
