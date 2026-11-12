# Conventions — fiches « Fonctions affines », Seconde (grade `2`), 2026-11-12

Guide de référence (lire § 2.3, § 3, § 4, § 5) : `docs/pratiques/fiches-exercices.md`.
Toutes les commandes `pnpm` se lancent depuis le worktree `/Users/david/Coding/js/ubumaths-wt-fiches-affines-2nde`.

## Décisions de David (2026-11-12)

- Thème (topic) en base : **« Fonctions affines »** (nouveau ; les généralités restent sous « Fonctions »).
- **Côté fonctions seulement** : pas d'« équation de droite », ni de parallélisme, ni de vecteur directeur,
  ni d'intersection présentée comme « deux droites » (ce sera la fiche « Droites du plan », Géométrie).
  On parle de « la droite qui représente f », de f(x) = g(x), du point commun des deux représentations.
- Tableaux de signes : **mx + p seulement**. Pas de produit, pas de quotient.
- Plan ci-dessous validé tel quel.

## Public

Seconde générale, tronc commun. Phrases courtes, questions découpées, calculs détaillés au corrigé.
Pas de calculatrice nécessaire (nombres choisis pour ça).

## Programme (`src/lib/server/programmes/transcriptions/2.md`)

Au programme et dans ce thème :

- Reconnaître l'expression d'une fonction linéaire, d'une fonction affine ; leur représentation est une droite.
- f(x) = mx + p : **m taux d'accroissement** (coefficient directeur), **p ordonnée à l'origine**.
- Variations selon le signe de m (**démonstration au programme**).
- Signe d'une fonction affine ; relier sens de variation, signe et droite représentative.
- Résoudre f(x) = k, f(x) < k, ax + b > 0, ax + b ⩾ cx + d (graphiquement ou algébriquement).
- Résoudre graphiquement f(x) = g(x), f(x) < g(x) ; modéliser des situations.
- Inégalités : produit par un réel négatif, « en liaison avec le sens de variation d'une fonction affine ».

Hors de ce thème : équations de droites (cartésienne, réduite), vecteur directeur, droites parallèles
(Géométrie) ; produits et quotients en tableau de signes ; fonctions de référence autres qu'affines.

## Notation (décidée)

- Fonction : `~f(x)=2x-3~` (notation maison) ; « la fonction ~f~ définie sur $\mathbb{R}$ par … ».
- Forme générale : `~f(x)=mx+p~`, lettres **m** et **p** (programme) ; vocabulaire : « coefficient
  directeur ~m~ », « ordonnée à l'origine ~p~ », « taux d'accroissement » pour
  $\dfrac{f(b)-f(a)}{b-a}$. Pas de « pente » (vocabulaire des droites).
- Représentation : $\mathcal{D}_f$ (`$\mathcal{D}_f$`), « la droite $\mathcal{D}_f$ qui représente ~f~ ».
- Points : `$A(2\,;-1)$`. Intervalles : `$]4\,;+\infty[$`, `$[-2\,;3]$`. `\leqslant`, `\geqslant`.
- Ensemble de solutions : « $S=\,]4\,;+\infty[$ » ; une équation : « $S=\{5\}$ ».
- Fractions irréductibles ; `\dfrac` dans le texte ; décimaux avec un POINT dans le source (`$1.5$`).
- Tableau de variations / de signes : bloc ` ```variation ` (voir `docs/systeme/ubumark.md` § Tableau de
  variations / de signes, et `modeles/41737393/sol/04-guided.md`, `05-guided.md`). Valeurs fractionnaires
  `3/2` (pas de virgule).
- Graphiques : bloc ` ```courbe ` (modèle : `modeles/41737393/md/02-guided.md`) ; **tout ce qu'on fait
  LIRE tombe sur un nœud de la grille** ; couleurs de la palette (bleu, orange, vert, violet), 4 au plus ;
  `description:` obligatoire. Une courbe d'énoncé ne donne jamais une réponse demandée par le calcul.
- Prix : `$22$ €` ; températures `$37\,°\text{C}$` → écrire « 37 °C » en texte hors formule.

## Forme

- Titres d'exercices **uniques** dans le thème « Fonctions affines » (les deux fiches ensemble), en texte
  brut (pas de `[`, pas de LaTeX), différents de « Antécédents par une fonction affine » (existant).
- Fiche technique : catégorie `automatisme`, variation unique `guided`. Fiche d'applications :
  catégorie `application`, `guided` partout, plus `autonomous` pour A01, A04, A05 (mêmes données,
  2-3 questions ouvertes, corrigé complet mais direct).
- Chaque corrigé commence par une phrase qui rappelle la méthode ou la propriété utilisée.
- Listes : `1.` seul sur sa ligne puis `   a. …` ; affichage 1) a) i) ; renvois « question 2) b) » — RELIRE.
- `align*` au-delà de ~35 caractères ou de 2 « = » ; jamais `\quad`.
- Tableaux markdown : formules en `$…$`, au plus 6 colonnes de valeurs.
- Illustrations (applications seulement, 3 au plus : A01 taxi, A02 thermomètre, A03 réservoir) : SVG à la
  main → PNG 1 200 px (Chromium headless de Playwright), fond blanc, `-en.png` s'il y a du texte, fichiers
  `affine-<sujet>.png` dans `applications/images/`. Dans le texte :
  `![alt](https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/exercise-images/97c1d5e4-5fa0-44ce-be83-ed5467f3a424/affine-<sujet>.png){size=large align=center}`
  sur sa ligne, entourée de lignes vides ; alt anglais en anglais. Aucune réponse dans une image d'énoncé.
- Anglais britannique scolaire : « linear function » (mx), « affine function » (mx + p) — le britannique
  scolaire dit souvent « linear function » pour mx + p : écrire « affine function $f(x)=mx+p$ » et, une fois,
  « (also called a linear function in some books) » dans T01 seulement ; « gradient » pour m, « y-intercept »
  pour p, « rate of change », « increasing / decreasing », « sign table ». Point décimal.

## Modèles à imiter (exportés de la base, lecture seule)

`/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/6aca72c4-2c16-4b28-a623-e592309d04a0/scratchpad/modeles/` :

1. `41737393/` — « Fonctions : généralités », Seconde (même niveau, le plus proche) : ton, longueur,
   courbes, tableaux de variations. L'exercice existant de ce thème est `md/14-guided.md`.
2. `0ef45afb/` (technique) et `d720d039/` (applications) — « Variables aléatoires » 1re spé : sections,
   variantes `autonomous`, illustrations.

Ne rien écrire dans ces dossiers.

## Disposition de sortie

```
docs/wip/fiches-affines-2nde/<technique|applications>/
  plan.json                 sections {id,title,position,en}, exercices {key,section,title,en_title,category}
  md/<CLÉ>-guided.md (+ -autonomous.md)   énoncés FR
  sol/  en/  sol-en/        mêmes noms
  generic.txt               vide (f, g, h suffisent ; ne pas nommer une fonction autrement)
  verif/assert_all.py       UNE assertion par résultat des corrigés (sympy / Fraction)
  images/ (applications)    SVG + PNG + gen-svg.mjs
```

Python : `scripts/fiches/.venv/bin/python -I verif/assert_all.py` (sympy et pymupdf installés).

## Vérifications obligatoires (à rendre)

1. `verif/assert_all.py` passe.
2. `pnpm check:ubumark <dossier>` → 0 problème.
3. `pnpm fiche:verifier <dossier> "<titre de la fiche>"` → vert ; RELIRE les PNG des pages (renvois,
   tableaux, courbes, débords, align*, décimaux en anglais).
4. La liste de tes écarts au plan, et pourquoi.

Ne JAMAIS écrire en base. Pas de `pnpm check`, `build`, `lint`, ni de serveur. Pas de commit.

---

# Plan des fiches (validé le 2026-11-12) — les mathématiques sont FIXÉES

## Fiche 1 — « Fonctions affines : entraînement technique » (EN « Affine functions: skills practice »)

Section 1 « Reconnaître une fonction affine » (EN « Recognising an affine function »)

- **T01 Linéaire, affine ou ni l'un ni l'autre** : f₁ = 3x − 5 (affine, m = 3, p = −5) ; f₂ = −2x
  (linéaire, m = −2) ; f₃ = x² + 1 (non) ; f₄ = 7 (affine constante, m = 0, p = 7) ; f₅ = (x − 4)/3
  (affine, m = 1/3, p = −4/3) ; f₆ = 1/x + 2 (non) ; f₇ = 5 − x (m = −1, p = 5) ; f₈ = √2·x (linéaire).
  Question finale : une fonction linéaire est-elle affine ? (oui, p = 0).
- **T02 Affine après calcul** : développer et réduire, puis conclure : (x+1)² − x² = 2x + 1 (affine) ;
  3(x−2) − (4−x) = 4x − 10 ; x(x+3) − x² = 3x (linéaire) ; (2x−1)(x+1) = 2x² + x − 1 (non) ;
  (x+3)² − (x−3)² = 12x (linéaire).

Section 2 « Images et antécédents » (EN « Images and preimages »)

- **T03 Images par une fonction affine** : f(x) = −3x + 4 : f(0) = 4, f(2) = −2, f(−1) = 7, f(1/3) = 3,
  f(−2/3) = 6 ; g(x) = x/2 − 1 : g(4) = 1, g(−6) = −4, g(1) = −1/2.
- **T04 Compléter un tableau de valeurs** : f(x) = 2x − 3 ; tableau x : −2, −1, 0, 1/2, 3, ?, ? avec
  f(x) : −7, −5, −3, −2, 3, 7, 0 → les deux dernières colonnes demandent l'antécédent (5 et 3/2).
- _(existant `b5390946` « Antécédents par une fonction affine », fin de section, non modifié)_

Section 3 « Déterminer l'expression d'une fonction affine » (EN « Finding the expression »)

- **T05 Avec deux images** : m = taux d'accroissement (f(b) − f(a))/(b − a), puis p :
  a) f(1) = 5, f(3) = 9 → 2x + 3 ; b) f(−2) = 7, f(4) = −5 → −2x + 3 ; c) f(0) = −1, f(6) = 3 → (2/3)x − 1 ;
  d) f(2) = 4, f(5) = 4 → f(x) = 4 (constante).
- **T06 Avec le coefficient directeur et une image** : m = 3, f(2) = 1 → p = −5 ; m = −1/2, f(4) = 0 →
  p = 2 ; m = 4 et $\mathcal{D}_f$ passe par A(−1 ; 2) → p = 6 ; g linéaire avec g(5) = −15 → g(x) = −3x.
- **T07 Lire m et p sur un graphique** : bloc courbe, quatre droites : y = 2x − 1, y = −x + 3,
  y = x/2 + 1, y = −2 (graduations de 1 ; pour x/2 + 1, lire sur 2 carreaux). Donner l'expression de
  chaque fonction en expliquant la lecture (p sur l'axe des ordonnées, m = déplacement vertical pour
  +1 horizontal).

Section 4 « Représentation graphique » (EN « Graphs of affine functions »)

- **T08 Tracer la droite représentative** : f(x) = 2x − 3 ; g(x) = −x/3 + 2 (points (0 ; 2), (3 ; 1)) ;
  h(x) = −1 ; k(x) = −(3/2)x (points (0 ; 0), (2 ; −3)). Énoncé : repère vierge à tracer sur la copie ;
  corrigé : bloc courbe avec les quatre droites et deux points calculés par fonction.
- **T09 Le point est-il sur la droite ?** : f(x) = −2x + 5 ; A(1 ; 3) oui ; B(−2 ; 1) non (f(−2) = 9) ;
  C(3/2 ; 2) oui ; D(10 ; −14) non (f(10) = −15) ; E(−4 ; y) → y = 13 ; F(x ; 0) → x = 5/2.

Section 5 « Sens de variation » (EN « Increasing or decreasing »)

- **T10 Sens de variation et tableau** : f₁ = −4x + 1 décroissante ; f₂ = x/5 − 7 croissante ; f₃ = 3
  constante ; f₄ = (1 − 3x)/2 (m = −3/2) décroissante. Puis tableau de variations de f₁ sur [−2 ; 3] :
  f₁(−2) = 9, f₁(3) = −11.
- **T11 Comparer des images sans les calculer** : f(x) = −3x + 2 : comparer f(√2) et f(1.4) (√2 > 1.4,
  f décroissante → f(√2) < f(1.4)) ; f(−π) et f(−3) (−π < −3 → f(−π) > f(−3)) ; g(x) = x/4 + 1 :
  g(0.001) < g(0.01). Puis : h affine avec h(2) = 5 et h(7) = 1 : sens de variation ? (m = −4/5, décroissante).

Section 6 « Signe d'une fonction affine » (EN « Sign of an affine function »)

- **T12 Tableau de signes** : 2x − 6 (s'annule en 3, − puis +) ; −3x + 1 (1/3, + puis −) ; x/2 + 4
  (−8, − puis +) ; 5 − 2x (5/2, + puis −). Corrigé : bloc variation sans ligne `variation:`, phrase
  « m > 0 : négatif puis positif ».
- **T13 Inéquations du premier degré** : 3x − 12 > 0 → ]4 ; +∞[ ; −2x + 7 ⩾ 0 → ]−∞ ; 7/2] ;
  5x + 1 < 2x − 8 → ]−∞ ; −3[ ; 4 − x ⩽ 3x + 6 → [−1/2 ; +∞[. Corrigé : diviser par un négatif change le
  sens, en lien avec « x ↦ −2x est décroissante ».

Section 7 « Équations et inéquations » (EN « Equations and inequalities »)

- **T14 Résoudre f(x) = k et f(x) < k** : f(x) = −2x + 3 : f(x) = −7 → S = {5} ; f(x) < 1 → ]1 ; +∞[ ;
  f(x) ⩾ 5 → ]−∞ ; −1].
- **T15 Comparer deux fonctions affines** : f(x) = 3x − 1, g(x) = −x + 7 ; bloc courbe des deux droites
  (x de −2 à 5, y de −4 à 10) ; a) lire le point commun (2 ; 5) ; b) le retrouver par le calcul f(x) = g(x)
  → x = 2 ; c) résoudre f(x) > g(x) graphiquement puis par le calcul → ]2 ; +∞[.

## Fiche 2 — « Fonctions affines : applications » (EN « Affine functions: applications »)

Section 1 « Modéliser par une fonction affine » (EN « Modelling with affine functions »)

- **A01 Le prix d'une course en taxi** (guided + autonomous, illustration taxi/compteur sans prix final) :
  prise en charge 4 €, 1.50 € par km. f(x) = 1.5x + 4 ; interpréter m (prix d'un km) et p (prise en
  charge) ; 12 km → 22 € ; 31 € → 18 km ; budget 40 € → au plus 24 km (inéquation).
- **A02 Degrés Celsius et Fahrenheit** (illustration thermomètre double graduation sans les valeurs
  demandées) : F = 1.8C + 32. 0 °C → 32 °F ; 100 °C → 212 °F ; 98.6 °F → 37 °C ; même valeur dans les
  deux échelles : C = 1.8C + 32 → −40.
- **A03 Le réservoir d'une voiture** (illustration jauge) : 60 L au départ, 6 L aux 100 km :
  v(d) = 60 − 0.06d sur [0 ; 1000] ; décroissante, interpréter m = −0.06 ; panne sèche à 1000 km ;
  voyant de réserve à 15 L → d = 750 km.

Section 2 « Comparer deux offres » (EN « Comparing two offers »)

- **A04 Deux tarifs de cinéma** (guided + autonomous) : A : 9 € la place ; B : carte 36 € par an puis
  5 € la place. a(x) = 9x (linéaire), b(x) = 5x + 36 ; égalité pour 9 places (81 €) ; B plus
  avantageux au-delà de 9 places (inéquation 5x + 36 < 9x ⇔ x > 9).
- **A05 Louer une voiture** (guided + autonomous) : A : 50 € + 0.20 €/km ; B : 30 € + 0.30 €/km.
  Bloc courbe des deux droites sur [0 ; 400] (graduations : 50 km, 10 €). Égalité à 200 km (90 €) ;
  150 km : A 80 €, B 75 € → B ; 350 km : A 120 €, B 135 € → A. Lecture graphique puis confirmation
  par le calcul.

Section 3 « Pourcentages et fonctions linéaires » (EN « Percentages and linear functions »)

- **A06 Augmentations et réductions** : +20 % : f(x) = 1.2x ; −30 % : g(x) = 0.7x ; +20 % puis −30 % :
  0.84x, soit une baisse de 16 % ; prix après +20 % égal à 54 € → prix initial 45 €.
- **A07 Proportionnel, affine, ou ni l'un ni l'autre ?** : périmètre d'un carré en fonction du côté
  (linéaire) ; aire d'un carré (non) ; 5 € de port + 2 € par article (affine, non linéaire) ; tableau
  x : 1, 2, 4, 7 / y : 5, 8, 14, 23 (taux constant 3 → y = 3x + 2) ; tableau x : 0, 1, 2, 3 /
  y : 1, 2, 4, 8 (taux 1, 2, 4 non constant → non affine).

Section 4 « Démontrer et relier » (EN « Proving and connecting »)

- **A08 Démontrer le sens de variation** (démonstration du programme, très guidée) : f(x) = mx + p,
  a < b ; montrer f(b) − f(a) = m(b − a) ; conclure selon le signe de m (cas m > 0, m < 0, m = 0).
  Application : f affine avec f(3) < f(5) ; montrer que m > 0 (m(5 − 3) > 0). Puis : le taux
  d'accroissement (f(b) − f(a))/(b − a) vaut m quels que soient a ≠ b.
- **A09 Droite, variations et signe** : f affine avec f(−1) = 6 et f(2) = −3 : m = −3, f(x) = −3x + 3 ;
  sens de variation ; s'annule en 1 ; tableau de signes ; tracer $\mathcal{D}_f$ ; expliquer sur la
  droite (sous l'axe des abscisses pour x > 1). Corrigé avec bloc courbe.
