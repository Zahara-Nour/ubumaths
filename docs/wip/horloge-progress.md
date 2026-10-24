# Chantier « horloge » — bloc ubumark ` ```horloge `

## Reprendre ici

_Mis à jour le 2026-10-25, après la recette de David._

- **État** : CHANTIER CLOS. Bloc ```horloge livré (#1707, sur `main`, pas en prod) ; recette de David du 2026-10-25 : 24 cas sur 24 OK (21 cas dessinés par le code livré + captures écran clair/sombre et PDF), dont la grande aiguille qui passe sur les chiffres (rendu gardé).
- **Prochaine action** : aucune ici. Modèles CP-046/047 puis CE1/CE2 : chantier « questions ». Archivage de ce journal : avec le prochain passage de code qui touche les 5 commentaires de `src/` qui y renvoient.
- **En attente de David** : vérification en prod après `deploy:prod` (ligne #1707 de `verifications-manuelles.md`).
- **Pièges en cours** : aucun.
- **Worktree / branche** : supprimés.

---

## 1. Origine et périmètre

Issu du chantier « questions » (`docs/wip/questions-progress.md` § 3, outil 1, et § 4 bis, décision 1 :
horloge après les corrections et le groupe A, avant la case « figure »).

Points du programme visés (bornes : `docs/systeme/programmes/bornes/cycle2.json`) :

| Point   | Libellé (abrégé)                                   | Borne                                               |
| ------- | -------------------------------------------------- | --------------------------------------------------- |
| CP-046  | Lire une heure entière sur une horloge à aiguilles | heures entières (trois heures, neuf heures, midi)   |
| CP-047  | Positionner les aiguilles pour une heure donnée    | heures entières de 1 à 12                           |
| CE1-059 | Lire l'heure (entière, et demie, et quart)         | minutes ∈ {0, 15, 30, 45}                           |
| CE1-060 | Positionner les aiguilles (idem)                   | heures < 24, minutes ∈ {0, 15, 30, 45}              |
| CE1-061 | Heures du matin / de l'après-midi                  | « trois heures du matin / de l'après-midi »         |
| CE1-063 | Durée entre deux instants affichés sur une horloge | même journée, minutes ∈ {0, 15, 30, 45}             |
| CE1-104 | Comparer deux durées entre instants affichés       | idem                                                |
| CE2-057 | Lire l'heure sur une horloge à aiguilles           | minutes de 0 à 59 (« quinze heures quarante-deux ») |
| CE2-058 | Positionner les aiguilles (heures et minutes)      | minutes de 0 à 59                                   |
| CE2-059 | Durée entre deux instants affichés                 | même journée (8 h 30 → 8 h 50 ; 15 h 40 → 16 h 05)  |
| CE2-094 | Comparer deux durées entre instants affichés       | idem                                                |

Borne générale CP : « Repérage dans le temps : limité aux heures entières ». Le bloc ne lit pas les
bornes : c'est le modèle de question qui tire des valeurs dans les bornes de son point.

**Hors périmètre v1** :

- **Placer les aiguilles soi-même** (réponse interactive : l'élève fait tourner les aiguilles) — relève
  des « réponses à placer » (questions-progress § 3, outil 4), plus tard. En attendant, « positionner »
  (CP-047, CE1-060, CE2-058) peut s'évaluer par un **QCM d'horloges** (« Quelle horloge indique
  trois heures ? »), si le bloc se rend dans un choix de QCM (Q5).
- Les **secondes** (trotteuse), l'affichage **digital** (c'est du texte : « 14 : 15 » s'écrit dans l'énoncé),
  les horloges décoratives (chiffres romains, couleurs par aiguille au choix de l'auteur).
- Les **modèles de question** CP / CE1 / CE2 qui utilisent l'horloge : chantier « questions ».
- Le **chat élève** (mode restreint) : le bloc n'y est pas rendu (invariant 8 de `ubumark.md`,
  liste blanche ; pas d'ajout sans décision).

## 2. Syntaxe

Clés en français, comme ` ```figure `, ` ```qr ` et les blocs statistiques. Une clé par ligne,
`clé: valeur`. Seule `heure:` est obligatoire.

````text
```horloge
heure: 9 h
```
````

````text
```horloge
heure: {{h}} h {{m}}
chiffres: quarts
graduations: minutes
```
````

Dans un modèle de question, les variables sont résolues **avant** l'analyse du bloc (pipeline
`resolveVariables` + `resolveText` → `parseMarkdown`) : le bloc ne voit que des nombres. Exemple de
modèle (pour illustrer, pas à créer ici) :

````text
Quelle heure indique l'horloge ?

```horloge
heure: {{h}} h
minutes: cachées
```
````

avec `h = {{1..12}}`, réponse attendue `{{h}}`.

### 2.1 L'heure

- `heure: 9 h`, `heure: 9 h 35`, `heure: 15 h 05`, `heure: 9 h 5` (minutes sur un chiffre acceptées,
  pour qu'un tirage `{{m}}` = 5 marche sans `{{eval:…}}`). Espaces facultatives : `9h35`, `9h` acceptés.
- Heures : entier de **0 à 23**. Minutes : entier de **0 à 59** ; absentes = 0.
- 0 h et 12 h → petite aiguille sur le 12 ; 13 h à 23 h → même position que 1 h à 11 h (un cadran
  à aiguilles ne distingue pas le matin de l'après-midi : c'est le texte de l'énoncé qui le fait, CE1-061).
- **La petite aiguille avance avec les minutes** (à 9 h 30, à mi-chemin entre le 9 et le 10), comme
  une vraie horloge : c'est ce que l'élève doit apprendre à lire (« moins le quart » : petite aiguille
  presque sur l'heure suivante).
- Plusieurs horloges côte à côte (durées, CE1-063 et suivants) : voir Q3.

### 2.2 Réglages (tous facultatifs)

| Clé            | Valeurs                                                                             | Défaut     | Effet                                                                                     |
| -------------- | ----------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `chiffres:`    | `tous` · `quarts` (12, 3, 6, 9) · `aucun`                                           | `tous`     | chiffres 1 à 12 autour du cadran                                                          |
| `graduations:` | `minutes` (60 traits, ceux des heures plus longs) · `heures` (12 traits) · `aucune` | `minutes`  | traits du cadran                                                                          |
| `minutes:`     | `visibles` · `cachées`                                                              | `visibles` | `cachées` : la grande aiguille n'est pas dessinée (CP, heure seule)                       |
| `cadran:`      | `12` · `24`                                                                         | `12`       | `24` : seconde couronne intérieure de chiffres 13 à 24 (Q4), comme les horloges de classe |
| `taille:`      | `2cm` à `8cm` (virgule acceptée, `cm` obligatoire)                                  | Q6         | taille au PDF ; à l'écran, proportionnelle, plafonnée à la largeur disponible             |

Une clé inconnue ou une valeur hors liste est une **erreur située** (§ 4, cas 22), pas un réglage ignoré.

## 3. Rendu

- **SVG**, dessiné à partir d'une **scène** pure (`src/lib/ubumark/utils/horloge-scene.ts`) partagée
  par l'écran et le PDF (comme la courbe et les statistiques) : angles des aiguilles, traits, chiffres
  calculés une seule fois — l'écran et le PDF ne peuvent pas diverger.
- **Aiguilles** distinguées par la **forme**, pas seulement la couleur : petite aiguille courte et épaisse,
  grande aiguille longue et fine, point central. Une seule couleur d'accent : la petite aiguille
  (`var(--color-primary)`), le reste en `var(--color-foreground)` sur `var(--color-background)`.
  Lisible en noir et blanc (photocopie).
- **Thème clair / sombre** : uniquement des `var(--color-*)` (docs/pratiques/css-color-tokens.md),
  comme `NumberLine.svelte`.
- **Téléphone** : taille par défaut adaptée à un écran étroit, jamais plus large que le conteneur ;
  chiffres lisibles (taille relative au rayon, pas fixe) ; avec `cadran: 24`, la couronne intérieure
  reste lisible à la taille par défaut, sinon on agrandit le cadran (vérifié à 360 px de large).
- **Accessibilité** : `role="img"` et un nom accessible **qui ne donne pas la réponse** (« Horloge à
  aiguilles », pas « Il est 9 h 35 ») — sinon un lecteur d'écran, ou un simple survol du DOM, livre
  la solution. Rien de l'heure dans le texte du DOM (ni `title`, ni `data-*`).
- **PDF des fiches** (docs/systeme/fiches-et-pdf.md) : générateur `horloge-typst.ts` + `case` dans
  `generateBlock` ; noir sur blanc, accent remplacé par du noir (la forme suffit). Invariant 4 de
  `ubumark.md` : jamais de Typst invalide — un bloc en erreur devient un cadre neutre « Horloge
  indisponible ». Compilation réelle testée (comme `qr-typst-compilation.test.ts`).
- **Éditeur riche** : aller-retour en bloc de code `horloge` (`markdown-import.ts`), sans bouton
  d'insertion en v1 (Q7).
- **`pnpm check:ubumark`** : signale un bloc ` ```horloge ` en erreur.

## 4. Comportements

### Nominal

1. `heure: 9 h` → cadran 12 chiffres, 60 graduations, petite aiguille sur le 9, grande sur le 12.
2. `heure: 9 h 30` → grande aiguille sur le 6, petite à mi-chemin entre le 9 et le 10.
3. `heure: 15 h 45` → grande aiguille sur le 9, petite aux trois quarts entre le 3 et le 4.
4. `heure: 10 h 35` + `chiffres: aucun` → mêmes aiguilles, aucun chiffre, traits seuls.
5. `heure: 3 h` + `minutes: cachées` → petite aiguille seule, sur le 3.
6. `heure: 15 h` + `cadran: 24` → couronne 13 à 24, petite aiguille sur le 3 (et le 15).
7. Dans un modèle, `heure: {{h}} h {{m}}` avec h = 8, m = 5 → identique à `heure: 8 h 05`.
8. Le bloc marche au premier niveau **et** en item de liste (`a) ```horloge …`), comme les autres blocs spéciaux.
9. Même instance à l'écran et au PDF : mêmes angles, mêmes chiffres.

### Limites

10. `heure: 0 h` et `heure: 12 h` → même dessin (aiguilles sur le 12). `heure: 0 h` avec `cadran: 24` → aussi sur le 12 / 24.
11. Minutes non multiples de 5 (`9 h 42`) → grande aiguille entre deux chiffres, sur la graduation 42 ; accepté sans avertissement (CE2-057). Avec `graduations: heures` ou `aucune`, accepté aussi (c'est au modèle de rester lisible).
12. `heure: 9 h 59` → petite aiguille presque sur le 10 (59/60 du chemin), pas arrondie.
13. `minutes: cachées` avec `heure: 9 h 30` → **erreur** : une petite aiguille entre deux chiffres sans grande aiguille ne se lit pas (« aiguille des minutes cachée : l'heure doit être entière »).
14. `heure: 9 h 05` / `9 h 5` / `9h05` / `9h5` → identiques.
15. Bloc dans un énoncé dont le reste contient des formules `$…$` : les formules ne sont pas extraites du bloc (invariant 1).
16. Bloc non fermé : s'arrête à la première ligne vide, n'avale pas la suite (invariant 2).

### Erreurs (messages situés, `Ligne N : …`, vus du prof ; l'élève voit un cadre neutre)

17. Pas de `heure:` → « il manque la ligne heure: (ex. heure: 9 h 30) ».
18. `heure: 24 h`, `heure: 25 h`, `heure: -1 h` → « heure : de 0 à 23 (minuit s'écrit 0 h) ».
19. `heure: 9 h 60`, `9 h 75` → « minutes : de 0 à 59 ».
20. `heure: 9,5 h`, `heure: neuf heures`, `heure: 9:30`, `heure: 9 h 30 min` → « écrire l'heure sous la forme 9 h 30 » (Q2 pour `9:30`).
21. Variable non résolue qui arrive au bloc (`heure: {{h}} h` hors modèle) → même message que 20, pas de plantage.
22. `chiffres: romains`, `cadran: 10`, `taille: 20cm`, clé inconnue `couleur: rouge` → message nommant la clé et les valeurs permises.
23. Deux fois la même clé → « heure: écrite deux fois ».
24. Un bloc en erreur ne fait jamais échouer le PDF de la fiche (cadre neutre « Horloge indisponible »).

## 5. Ce qu'il faut construire (patron « Comment étendre » de `ubumark.md`)

Type `types/horloge.ts` (nœud avec `spec | null` et `errors`) → parseur `parser/horloge-parser.ts`
(léger) → branchement `markdown-parser.ts` (premier niveau, listes, `block-ranges.ts`,
`block-closure.ts`) → scène `utils/horloge-scene.ts` → `nodes/Horloge.svelte` + aiguillage
(`MarkdownRenderer`, `ListNode`, `StaticBlockNode`) → `generators/horloge-typst.ts` → éditeur riche
→ `check:ubumark` → doc `ubumark.md` (ligne du tableau des blocs spéciaux + exemple).

Tests (rouges d'abord) : parseur (grammaire + erreurs 17-23), `parseMarkdown` (premier niveau, liste,
aller-retour éditeur), scène (angles des cas 1-6, 10-12), Typst (texte + une compilation réelle),
composant (rendu SVG, nom accessible sans l'heure), et les cinq tests d'invariants des blocs spéciaux.

Pas de base de données, pas de migration, pas d'API. Revue : `code-reviewer` (Sonnet) sur la PR.

Découpage proposé : **une PR** (parseur + scène + écran + PDF), ou deux si le diff dépasse ~800 lignes
(PR 1 parseur + scène + écran ; PR 2 PDF + éditeur riche).

## 6. Agents

- Parseur, scène, Typst, tests : session principale ou `pedagogy-expert` (code sous `src/lib/ubumark/`).
- Composant Svelte : `frontend-developer` (Sonnet) si délégué.
- Revue : `code-reviewer` (Sonnet).

## 7. Questions à David

1. **Valeurs par défaut** : chiffres `tous`, graduations `minutes`, deux aiguilles. Pour le CP, préfères-tu
   que le modèle écrive `graduations: heures` lui-même (recommandé : le bloc reste neutre) ?
2. **Écriture de l'heure** : seulement `9 h 30` (et `9h30`) — recommandé, c'est la notation française
   des énoncés — ou aussi `9:30` ?
3. **Plusieurs horloges dans un bloc** (durées CE1-063, CE1-104, CE2-059, CE2-094) :
   `heure: 8 h 30 ; 8 h 45` → deux cadrans côte à côte, avec `légendes: Départ ; Arrivée` ;
   jusqu'à 4 cadrans. Recommandé **en v1** (sinon deux blocs l'un sous l'autre, peu lisible sur
   téléphone et au PDF).
4. **Cadran 24 h** : couronne intérieure **13 à 24** (horloges de classe usuelles) ou **13 à 00** ?
   Recommandé : 13 à 24.
5. **QCM d'horloges** pour « positionner » (CP-047, CE1-060, CE2-058) : je vérifie et, si besoin,
   adapte l'affichage des choix (`QuestionPreviewBaseCard` rend déjà le Markdown des choix) pour
   qu'une horloge réduite y tienne, en v1 ? Recommandé : oui, sinon ces trois points attendent les
   « réponses à placer ».
6. **Taille** : défaut 4 cm au PDF (≈ 160 px à l'écran), 3 cm dans un choix de QCM ?
7. **Bouton « Insérer une horloge »** dans l'éditeur riche : en v1 ou plus tard (recommandé : plus tard,
   les modèles s'écrivent en source) ?

## 7 bis. Décisions (David, 2026-10-24)

Toutes les recommandations du § 7 retenues :

1. Défauts `chiffres: tous`, `graduations: minutes`, deux aiguilles ; le modèle règle son niveau.
2. Seulement `9 h 30` (espaces facultatives, `9 h 5` accepté) ; pas de `9:30`.
3. Plusieurs cadrans en v1 : `heure: 8 h 30 ; 8 h 45`, `légendes: Départ ; Arrivée`, 1 à 4 cadrans.
4. Cadran 24 h : couronne intérieure 13 à 24.
5. QCM d'horloges en v1 : vérifier et adapter l'affichage des choix (écran et série figée au PDF).
6. Taille : 4 cm par défaut, 3 cm dans un choix de QCM ; `taille:` de 2 à 8 cm.
7. Pas de bouton « Insérer une horloge » en v1.

## Journal

- 2026-10-24 : worktree créé ; lecture des bornes (CP-046/047, CE1-059 à 063, CE1-104, CE2-057 à 059,
  CE2-094), de `ubumark.md`, de `number-line-parser.ts` et `stat-chart-parser.ts` ; phase 0 écrite.
- 2026-10-24 : phase 0 validée par David (§ 7 bis).
- 2026-10-24 : implémentation. Tests rouges vérifiés puis verts (parseur, scène, Typst + compilation réelle, écran,
  restreint, éditeur riche, invariants des blocs, série figée). Captures écran clair/sombre à 360 px et PDF
  vérifiées à l'œil. Constat : la grande aiguille passe sur les chiffres (12 à midi) comme sur une vraie horloge.
- 2026-10-24 : revue `code-reviewer` : choix de QCM en horloge affichés en texte brut dans la correction
  (`ExpectedResultView`) → corrigé ; `-0 h` refusé ; `;` interdit dans une légende (documenté). #1707 mergée.
- 2026-10-25 : recette de David sur une page d'artefact (21 cas + 3 captures) : tout OK ; la grande aiguille qui
  passe sur les chiffres est gardée. Chantier clos.
