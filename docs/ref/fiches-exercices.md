# Créer des fiches d'exercices — démarche, choix et pièges

> Rédigé le 2026-09-26, après les 18 fiches de 1re spécialité (8 thèmes + géométrie repérée).
> Outillage : `scripts/fiches/` (#453). Scripts de création : `scripts/create-*-1spe.ts`.

Une fiche se fabrique **hors de l'application** : les exercices sont rédigés en fichiers `.md`
(ubumark), vérifiés (calculs, rendu écran, PDF de production), puis écrits en base par un script
gardé. On ne passe par l'éditeur qu'ensuite, pour retoucher.

---

## 1. Ce qui existe (1re spécialité, brouillons FR + EN)

Deux fiches par thème : **Entraînement technique** (catégorie `automatisme`, exercices numérotés,
sans section) et **Applications** (catégorie `application`, 3 sections, variantes `guided` et
parfois `autonomous`).

| Thème (topic en base)      | Entraînement technique               | Applications                     | Script                                        |
| -------------------------- | ------------------------------------ | -------------------------------- | --------------------------------------------- |
| Second degré               | `b5ca9ed3`                           | `d6c03510` (de David, complétée) | `create-fiche-technique-second-degre.ts`      |
| Suites                     | `f09992e6`                           | `2d043bf5`                       | `create-suites-1spe.ts`                       |
| Fonction exponentielle     | `ad1083a2`                           | `18f2252a`                       | `create-exponentielle-1spe.ts`                |
| Dérivation                 | `139ec069` (12 neufs + 17 existants) | `4fea9f37`                       | `create-derivation-1spe.ts`                   |
| Fonctions trigonométriques | `808e2eee`                           | `dde45b26`                       | `create-trigonometrie-1spe.ts`                |
| Géométrie (produit scal.)  | `c20d4094` (10 neufs + 6 existants)  | `7d94d681` (7 + 5 existants)     | `create-produit-scalaire-1spe.ts`             |
| Probabilités               | `570376ab`                           | `eaf297d5`                       | `create-probabilites-conditionnelles-1spe.ts` |
| Variables aléatoires       | `0ef45afb`                           | `d720d039`                       | `create-variables-aleatoires-1spe.ts`         |
| Géométrie repérée          | `6ee9c178` (10 neufs + 2 existants)  | `bb53d116`                       | `create-geometrie-reperee-1spe.ts`            |

Restent (priorité) : automatismes transverses (évolutions, droites, lectures graphiques,
statistiques), listes Python injectées dans les thèmes, logique et ensembles, démonstrations
manquantes.

---

## 2. La démarche, pas à pas

### 2.1 Cadrer sur le programme

- Référence : **nouveau programme de 1re spécialité** (PDF fourni par David le 2026-09-25). Lire la
  section du thème : contenus, capacités attendues, algorithmes, approfondissements, et ce qui
  n'y est PAS (« hors programme » = terminale).
- Inventorier l'existant en base (MCP Supabase, lecture seule) : exercices du thème, leur auteur,
  leur présence dans des fiches, leur corrigé et leur traduction.

  ```sql
  select left(id::text,8), title, topic from exercises
  where '1_SPE' = any(grades) and variations::text ilike '%vecteur normal%';
  ```

### 2.2 Écrire les conventions du thème

Un fichier `CONVENTIONS.md` par thème, donné tel quel aux agents de rédaction. Il contient : le
programme (contenus, hors programme), les modèles à imiter (fiches déjà validées), les exercices
existants à ne pas dupliquer, la **notation vérifiée** (§ 4), les blocs spéciaux du thème (arbre,
tableau de loi…), les consignes d'anglais et les vérifications obligatoires. Partir de la dernière
version et l'adapter.

### 2.3 Faire rédiger (deux agents en parallèle)

Agents `pedagogy-expert`, modèle **Opus**, un par fiche. Le brief fixe **les mathématiques**
(exercice par exercice : données, questions, résultats attendus) — l'agent rédige, il ne choisit
pas le contenu. Disposition de sortie :

```
<dossier>/
  md/  sol/  en/  sol-en/        énoncés FR, corrigés FR, énoncés EN, corrigés EN
  titles.txt                      (technique)   un titre FR par ligne → md/01.md…
  plan.json                       (applications) sections {id,title,position,en}, exercices {key,section,title,en_title}
                                                 → md/<CLÉ>-guided.md (+ -autonomous.md)
  generic.txt                     « CLÉ: C,P » lettres déclarées comme fonctions (sinon vide)
  verif/assert_all.py             sympy / Fraction : UNE assertion par résultat des corrigés
```

L'agent doit rendre : `assert_all.py` qui passe, `pnpm check:ubumark <dossier>` à 0 problème, et
la liste de ses écarts au plan. **Relire ces écarts** : un agent a déjà corrigé une erreur du plan
(parabole y = x²/2 + 1/2, pas x²/4 + 1/2).

### 2.4 Vérifier le rendu

```bash
python3 -m venv scripts/fiches/.venv && scripts/fiches/.venv/bin/pip install pymupdf   # une fois
pnpm fiche:verifier <dossier> "Titre de la fiche"
```

Enchaîne : Typst par le vrai générateur (FR/EN, énoncé/corrigé) → compilation par le compilateur
**exact** de la production → débords de colonne (texte et tracés) → pages en PNG.

Puis **relire les pages**. Les détecteurs ne voient pas : une chaîne d'égalités fausse, un vecteur
minuscule, une ligne justifiée étirée par du code, un renvoi « question 3.a » alors que l'affichage
numérote a) 1), un identifiant Python passé en italique. Chacun de ces défauts a été trouvé à l'œil.

Un défaut du **générateur** (pas du contenu) se corrige dans le code — voir § 2.7.

### 2.5 Écrire en base

Copier le script du thème le plus proche (`scripts/create-*-1spe.ts`), adapter `TOPIC`, `DIR`,
titres FR/EN des fiches, et les exercices existants à inclure (`EXISTANTS_APRES` : après quel
exercice neuf ; `EXISTANTS_SECTION` : fin de section).

```bash
pnpm tsx scripts/create-<thème>-1spe.ts            # simulation : Zod, collisions de titres, existants
pnpm tsx scripts/create-<thème>-1spe.ts --publier  # écrit en prod
```

Garde-fous du modèle : base = prod vérifiée ; tout validé par Zod avant la moindre écriture ;
arrêt si un titre existe déjà dans le thème ou si une fiche de même titre existe ; existants
retrouvés par préfixe d'id **et** titre ; chaque écriture doit rendre sa ligne (`.select()`) ; en
cas d'échec, tout ce qui a été créé est supprimé.

### 2.6 Vérifier ce qui est en base

```bash
pnpm tsx scripts/fiches/regen-depuis-base.ts <sortie> <préfixe fiche 1> <préfixe fiche 2>
node scripts/fiches/compile-prod.mjs <sortie>/*.typ
scripts/fiches/.venv/bin/python scripts/fiches/debord.py <sortie>
```

Puis versionner le script de création (branche → PR), et mettre à jour ce document (§ 1).

### 2.7 Corriger le générateur PDF

1. Test d'abord (rouge), dans `src/lib/ubumark/generators/__tests__/` (`typst-authoring-defects`,
   `pdf-lisibilite`, …).
2. Correctif, suites `ubumark` + `typst` vertes, `check:incremental`.
3. **Empreinte** de tout le contenu en base, `main` puis branche :
   ```bash
   pnpm tsx scripts/fiches/empreinte-typst.ts avant.json     # depuis main
   pnpm tsx scripts/fiches/empreinte-typst.ts apres.json     # depuis la branche
   pnpm tsx scripts/fiches/empreinte-typst.ts --compare avant.json apres.json
   ```
   Chaque changement doit s'expliquer par le correctif, et seulement par lui. Si aucun texte en
   base ne contient le défaut, « 0 changement » ne prouve rien : c'est le test qui prouve.
4. Recompiler les fiches existantes les plus exposées (`regen-depuis-base.ts`).

---

## 3. Choix faits avec David

- **Fiches les plus complètes possible** : elles incluent les exercices existants du thème, sans
  les modifier (ils restent aussi dans leurs fiches d'origine). Ne jamais modifier une fiche ou un
  exercice publié de David sans son accord.
- **Brouillons** (`status: draft`) : David relit et publie.
- **Thème (topic)** : un par chapitre du programme (`Suites`, `Variables aléatoires`, `Géométrie
repérée`…). Les titres d'exercices sont uniques par thème (« Bilan technique » existe dans chacun).
- **Hors programme** (nouveau programme, 2026-09-25) : dans les brouillons, un exercice entièrement
  hors programme va dans une section « Pour aller plus loin (terminale) » ; une question hors
  programme dans un exercice au programme est réécrite (#440, #441).
- **Anglais** : britannique scolaire ; titres d'exercices non traduits ; la **langue du document**
  décide du séparateur décimal : point en anglais, virgule en français (#448).
- **Lisibilité PDF** (« variante E ») : fraction et vecteur en colonne de premier niveau d'une
  formule du texte en taille normale (#436, #451).
- Numérotation affichée : **a) 1) i)** (le markdown s'écrit `1.` puis `   a.`).

---

## 4. Notation : ce qui marche (vérifié à l'écran et dans le PDF)

- `~…~` (notation maison) pour les calculs ; `$…$` (LaTeX) pour le reste : vecteurs
  (`$\overrightarrow{AB}$`, `$\vec{n}\begin{pmatrix}a\\b\end{pmatrix}$`), points
  (`$A(2\,;-1)$`), ensembles, intervalles, primes sur une autre lettre que f, g, h.
- `~…~` refuse : grec **sans** antislash (`~alpha~` = a·l·p·h·a), grec majuscule (`\Delta`,
  `\Omega`), `\neq`, `\geq`, `\mapsto`, les primes hors f/g/h, `k<-3` (écrire `k< -3`).
- **Décimaux : toujours avec un point** (`~0.3~`, `$0.3$`), dans les deux langues. Jamais `0{,}3`
  (resterait une virgule en anglais).
- Jamais de crochet `[` `]` dans le texte brut (segment : `$[AB]$`, et pas dans un titre).
- Listes : `1.` seul sur sa ligne puis `   a. …` ; jamais « 1. a. texte ». Renvois : « question c) 1) ».
- Calcul sur plusieurs lignes : `$$\begin{align*} A &= B \\ C &= D \end{align*}$$` au-delà de
  ~35 caractères ou de 2 « = » ; jamais de `\quad`.
- Tableaux markdown : formules des cellules en `$…$` uniquement ; au plus 6 colonnes de valeurs.
- Arbre pondéré : bloc ` ```probtree ` (une branche par ligne, `étiquette:probabilité`, enfants
  indentés de 2 espaces) ; 3 épreuves au plus en arbre complet ; sous une sous-question, indenter
  le bloc de 6 espaces.
- Python : bloc ` ```python ` ; dans le texte, identifiants entre backticks (`` `moyenne(n)` ``).
- Pas d'image ni de figure : décrire la configuration, conseiller une figure à main levée.

---

## 5. Pièges techniques rencontrés (et corrigés)

**Le PDF est compilé dans le navigateur par typst.ts 0.6.1-rc5** : une seule erreur Typst fait
échouer tout le PDF de la fiche, sans message à l'enseignant. Le Typst CLI local (0.14) n'est pas
un témoin : il échoue sur cetz 0.3.0 et accepte ce que 0.6.1-rc5 refuse. D'où `compile-prod.mjs`.

| Symptôme dans le PDF                                        | Cause                                              | PR   |
| ----------------------------------------------------------- | -------------------------------------------------- | ---- |
| fiche entière en échec après un vecteur `AB` suivi d'un nom | nom lu comme fonction                              | #437 |
| fractions minuscules dans le texte                          | Typst réduit toute fraction en ligne               | #436 |
| décimaux d'un arbre en `0″,″3` ; issue sur l'étiquette      | guillemets repassés en primes                      | #443 |
| arbre de 3 épreuves débordant sur la colonne voisine        | largeur non ajustée                                | #444 |
| `0,0 484` au lieu de `0,048 4` (écran aussi)                | décimales après `{,}` groupées comme un entier     | #445 |
| issue `RR` affichée ℝ                                       | `RR`, `NN`, `ZZ`, `QQ`, `CC` = ensembles en Typst  | #446 |
| « 0,8 » dans les fiches anglaises                           | formatage français quelle que soit la langue       | #448 |
| `3p = 0,45` affiché « = 0,45 » dans un `align*`             | seule la 1re ligne gardait son membre de gauche    | #449 |
| fiche entière en échec avec `Ω(1 ; 2)`                      | `Omega(` lu comme appel de fonction, `;` = tableau | #451 |
| coordonnées de vecteur en colonne minuscules                | matrice en ligne composée en taille d'indice       | #451 |

Autres leçons :

- Un détecteur qui ne trouve rien doit prouver qu'il a regardé : l'ancien détecteur de débords
  attendait un dossier et, appelé sur des fichiers, affichait « 0 débord » sans rien analyser.
  `debord.py` refuse désormais de conclure sans PDF, et se valide sur un témoin fautif.
- Les tracés (arbres cetz) ne sont pas du texte : un détecteur de texte ne voit pas leurs débords.
- `jsonb` réordonne les clés : relire une ligne écrite en comparant `JSON.stringify` échoue dès
  qu'une clé est ajoutée — comparer avec des clés triées.
- `worksheet_sections` a une contrainte d'unicité sur la position : réordonner via une position
  temporaire.
- Un sous-agent qui dit avoir « tué » un test peut laisser un `vitest` orphelin à 100 % CPU :
  `ps -axo pid,ppid,etime,%cpu,command | grep "node .*ubumaths-wt-"`.
