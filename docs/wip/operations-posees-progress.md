# Chantier « operations-posees » — opérations posées en colonnes

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0._

- **État** : phase 0 écrite (§ 1 à 7), questions posées à David (§ 7).
- **Prochaine action** : recueillir les décisions (§ 7 bis), puis tests rouges du lot 1.
- **En attente de David** : réponses aux questions du § 7.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-operations-posees`, `feat/operations-posees`.

---

## 1. Origine et périmètre

Ce qui manque : ubumark n'a aucun rendu « en colonnes », et une question n'a aucune saisie chiffre
par chiffre, retenues comprises. Modèle suivi : le chantier horloge (`docs/wip/horloge-progress.md`),
bloc ubumark + case de réponse.

Points débloqués (bornes : `docs/systeme/programmes/bornes/cycle2.json`, `cycle3.json`) :

| Point   | Libellé (abrégé)                         | Borne                                                         |
| ------- | ---------------------------------------- | ------------------------------------------------------------- |
| CP-016  | Additions en colonnes                    | 2 ou 3 nombres à 1 ou 2 chiffres (45 + 37 ; 28 + 8 + 56)      |
| CE1-022 | Addition en colonnes                     | 2 ou 3 nombres à 1, 2 ou 3 chiffres (76 + 7 + 568)            |
| CE2-016 | Addition en colonnes                     | entiers ≤ 10 000 ; montants en euros                          |
| CE1-100 | Soustraction en colonnes                 | entiers ≤ 1 000 ; « par cassage » **ou** « par compensation » |
| CE2-090 | Soustraction en colonnes                 | entiers ≤ 10 000 ; montants en euros                          |
| CE2-019 | Multiplication posée                     | 2-3 chiffres × 1-2 chiffres (16 × 548)                        |
| CM1-051 | Multiplication de deux entiers           | 3 chiffres × 3 chiffres (876 × 208), produit ≤ 999 999        |
| CM1-052 | Décimal × entier < 10                    | 7 × 46,55 ; 8 × 17,3                                          |
| CM2-055 | Décimal × entier                         | 876 × 20,8 ; 8,76 × 208                                       |
| CM1-053 | Division euclidienne, diviseur 1 chiffre | dividende ≤ 5 chiffres (9 456 ÷ 7)                            |
| CM2-056 | Division décimale, dividende entier      | arrêt au centième, reste nul (785 ÷ 4)                        |
| CM2-057 | Division décimale, dividende décimal     | arrêt au centième, reste nul (148,2 ÷ 5)                      |
| CM1-050 | Addition de décimaux en colonnes         | ≤ 2 décimales, entiers mêlés, 3 termes (56,75 + 234 + 0,8)    |
| CM1-165 | Soustraction de décimaux en colonnes     | ≤ 2 décimales (34,5 − 2,58)                                   |
| CE2-055 | Additions de montants en euros           | écriture à virgule, 2 décimales                               |
| CE2-056 | Soustractions de montants en euros       | idem                                                          |

**Hors périmètre** : les modèles de question eux-mêmes (chantier « questions ») ; le chat élève
(invariant 8 de `ubumark.md`).

## 2. Syntaxe proposée

Un bloc ` ```operation `, clés en français, une par ligne (comme ` ```horloge `). Seule `calcul:`
est obligatoire.

````text
```operation
calcul: 245 + 437
```
````

````text
```operation
calcul: {{a}} × {{b}}
retenues: oui
```
````

- `calcul:` : `a + b (+ c)`, `a − b` (ou `-`), `a × b` (ou `x`, `*`), `a ÷ b` (ou `:`). Virgule
  décimale (point accepté). Variables résolues avant l'analyse, comme l'horloge.
- Le bloc **calcule lui-même** le résultat, les retenues, les produits partiels, les étapes de la
  division : l'auteur n'écrit jamais la réponse (pas de divergence possible).
- Réglages pressentis : `cases: résultat | tout | aucune` (`aucune` = opération posée et résolue,
  pour la correction et les cours), `retenues: oui | non`, `taille:` (PDF).

## 3. Rendu

- Grille à carreaux, chiffres alignés à droite (unités sous unités, virgule sous virgule), signe à
  gauche, trait de l'opération ; division en potence.
- Scène pure partagée écran / PDF (`utils/operation-scene.ts`), comme `horloge-scene.ts`.
- Retenues en petit, au-dessus de la colonne (addition, multiplication) ; pour la soustraction, selon
  l'algorithme (Q2 ci-dessous).
- `var(--color-*)` seulement ; téléphone : jamais plus large que le conteneur, carreaux ≥ 40 px pour
  le doigt.
- Accessibilité : nom accessible qui ne donne pas le résultat ; aucune valeur attendue dans le DOM.
- PDF : grille vide à compléter (ou résolue avec `cases: aucune`) ; Typst valide toujours (cadre
  neutre en cas d'erreur).

## 4. Comportements (à détailler après les décisions)

### Nominal

1. `calcul: 45 + 37` → 2 lignes alignées, trait, 2 cases de résultat (+ case de retenue au-dessus
   des dizaines si `retenues: oui`).
2. L'élève tape les chiffres de **droite à gauche** ; après un chiffre, le curseur passe à la case de
   gauche (comme sur papier) ; sur téléphone, clavier numérique.
3. Réponse « 82 » → juste ; « 72 » → faux, la correction montre l'opération résolue.
4. `calcul: 56,75 + 234 + 0,8` → virgules alignées, 0 implicites non affichés (ou grisés : Q à voir).

### Limites

5. Résultat avec un chiffre de plus que les termes (99 + 1) → une case de plus à gauche.
6. Soustraction à résultat avec zéros de tête (1 000 − 998) → cases de tête : vides acceptées comme 0.

### Erreurs (messages situés, vus du prof)

7. `calcul:` absent, opérateur inconnu, soustraction négative, division par 0, division décimale qui
   ne s'arrête pas au centième (si le modèle ne le borne pas) → erreur située, l'élève voit un cadre
   neutre.

## 5. Ce qu'il faut construire

Patron « Comment étendre » de `ubumark.md` (type, parseur, branchements, scène, nœud Svelte, Typst,
éditeur riche, `check:ubumark`), **plus** une nouvelle nature de case côté questions (patron
« nouvelle nature » de `questions.md` : `InstanceBlank`, juge, saisie, `expected-result.ts`).

## 6. Agents

- Parseur, scène, calcul des étapes, Typst : session principale ou `pedagogy-expert`.
- Saisie (composant) : `frontend-developer` (Sonnet).
- Juge / branchement questions : `pedagogy-expert`.
- Revue : `code-reviewer` (Opus : correction des réponses).

## 7. Questions à David

Voir le message de la session du 2026-10-25 (Q1 à Q8).

## 7 bis. Décisions

_À recueillir._

## Journal

- 2026-10-25 : worktree créé, phase 0 rédigée.
