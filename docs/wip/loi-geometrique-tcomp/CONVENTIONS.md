# Conventions — fiches « Loi géométrique », Terminale maths complémentaires (T_COMP), 2026-10-16

Guide de référence (à lire, § 2.3, § 3, § 4, § 5) : `docs/pratiques/fiches-exercices.md` du worktree
`/Users/david/Coding/js/ubumaths-wt-geometrique` (toutes les commandes `pnpm` se lancent depuis ce worktree).

## Public

Terminale **mathématiques complémentaires** : élèves qui ont suivi la spécialité en 1re puis l'ont
abandonnée. Niveau plus modeste que la Terminale spécialité : phrases courtes, questions très
découpées dans les versions guidées, calculs détaillés au corrigé. La calculatrice sert aux
puissances et aux logarithmes ; le corrigé ne nomme ni marque ni touche.

## Programme (référentiel en base, rubrique « Probabilités et statistique > Lois discrètes »)

Au programme et dans ce thème :

- TCOMP-293 Loi géométrique : définition (rang du premier succès dans la répétition indépendante d'une
  même épreuve de Bernoulli), expression $P(X=k)=(1-p)^{k-1}p$ pour $k\geqslant 1$, espérance
  $E(X)=\dfrac{1}{p}$ (**admise**), représentation graphique (diagramme en barres).
- TCOMP-294 / 307 Propriété caractéristique : absence de mémoire,
  $P_{X>m}(X>m+n)=P(X>n)$ ; démonstration à partir de $P(X>k)=(1-p)^k$.
- TCOMP-295 Identifier une loi de Bernoulli, binomiale ou géométrique.
- TCOMP-298 Calculer **explicitement** $P(X=k)$ et $P(X\leqslant k)$ ; $P(X>k)=(1-p)^k$ se justifie
  par « les $k$ premières épreuves sont des échecs », puis $P(X\leqslant k)=1-(1-p)^k$.
- TCOMP-300 Utiliser l'espérance en résolution de problème.
- TCOMP-301 Utiliser l'absence de mémoire en situation.
- TCOMP-303 Probabilités dans des répétitions d'expériences.
- TCOMP-239 (analyse) Seuil avec $\ln q^n=n\ln q$ — attention au changement de sens quand on divise
  par $\ln q<0$.
- TCOMP-207 (suites) Somme des termes d'une suite géométrique de raison dans $]0;1[$ : lien
  $\sum_{k=1}^{n}P(X=k)=1-(1-p)^n\to 1$, en question d'approfondissement seulement.
- Déjà vu (thème « Loi binomiale », même niveau) : épreuve et schéma de Bernoulli, $\mathcal{B}(n\,;p)$.
  Rappels de 1re : variable aléatoire, loi, espérance, linéarité $E(aX+b)=aE(X)+b$, probabilités
  conditionnelles $P_A(B)=\dfrac{P(A\cap B)}{P(A)}$, arbres, indépendance.

**Hors programme T_COMP** : variance et écart type de la loi géométrique (ne jamais les demander ni les
donner), démonstration de $E(X)=1/p$ (admise : on peut la « constater » sur un exemple, pas la prouver),
séries infinies écrites $\sum_{k=1}^{+\infty}$ (on reste sur des sommes finies et une limite), loi
géométrique sur $\mathbb{N}$ (nombre d'échecs avant le succès) : on peut la rencontrer comme contre-exemple
(« $Y=X-1$ ne suit pas une loi géométrique au sens du cours : elle prend la valeur 0 »), sans l'étudier.

## Notation (décidée)

- Loi : $\mathcal{G}(p)$ — écrire `$\mathcal{G}(0.2)$` (décimal avec POINT). La phrase de cours :
  « $X$ suit la loi géométrique de paramètre $p$ » avant d'écrire $X\sim\mathcal{G}(p)$ — on n'écrit
  pas `\sim` dans les énoncés, on dit « $X$ suit la loi $\mathcal{G}(0.2)$ ».
- Valeurs prises : $X$ prend les valeurs $1, 2, 3, \dots$ (entiers $\geqslant 1$) ; écrire
  `$\mathbb{N}^*$` seulement au corrigé de cours, pas dans les énoncés.
- Événements : `$\{X = 3\}$`, `$\{X > 4\}$` dans le texte ; dans les probabilités, `$P(X=3)$`,
  `$P(X\leqslant 5)$`, `$P(X>4)$`. `\leqslant`, `\geqslant`. Jamais [X = a].
- Conditionnelle : `$P_{X>3}(X>5)$` (indice sans accolades), comme dans les manuels ; le corrigé
  l'écrit d'abord en toutes lettres : « la probabilité que $X>5$ sachant que $X>3$ ».
- Succès / échec : $S$ et $\overline{S}$ dans les arbres (bloc ` ```probtree `, étiquettes `S` et `S̄`
  comme dans les fiches binomiales : regarder le modèle).
- Variable aléatoire : X générique ; lettre parlante en contexte (R rang, N nombre de lancers,
  T nombre de tickets, J jour de la panne, C coût, G gain…), jamais P, E, V, ni une lettre d'événement.
- Décimaux : toujours avec un POINT dans le source, dans les deux langues (`$0.35$`). Jamais `0{,}35`.
- Arrondis : probabilités arrondies à $10^{-4}$ (« arrondir à $10^{-4}$ » dans l'énoncé), symbole
  `\approx`. Valeur exacte quand elle est simple ($0.7^2\times 0.3=0.147$, $\dfrac{61}{125}$).
  Fractions irréductibles ; `\dfrac` dans le texte. Espérances : valeur exacte ($\dfrac{10}{3}$) puis
  arrondi au centième si utile.
- Seuils : résoudre l'inéquation avec ln jusqu'au bout, donner la valeur décimale du quotient au
  centième, conclure par l'entier ; le corrigé VÉRIFIE l'entier trouvé et le précédent par le calcul
  direct (deux puissances arrondies).

## Forme

- Thème (topic) en base : « Loi géométrique ». Titres d'exercices **uniques** dans ce thème (les deux
  fiches ensemble), en texte brut (pas de `[`, pas de LaTeX), et distincts des titres du thème
  « Loi binomiale » (ex. ne pas réutiliser « Probabilités avec la formule » tel quel : écrire
  « Calculer P(X = k) »).
- Fiche technique : variation unique `guided` par exercice. Fiche d'applications : `guided`, plus
  `autonomous` là où le plan le demande (mêmes données, 2-3 questions ouvertes, corrigé complet mais direct).
- Chaque corrigé commence par une phrase qui rappelle la méthode ou la propriété du cours utilisée.
- Listes : `1.` seul sur sa ligne puis `   a. …` ; affichage 1) a) i) (depuis le 2026-10-18) ; renvois « question 2) b) »
  cohérents avec l'affichage — RELIRE chaque renvoi.
- JAMAIS de `$$…$$` dans une sous-liste si le modèle ne le fait pas ; `align*` au-delà de ~35
  caractères ou 2 « = » ; jamais `\quad`.
- Tableaux markdown : formules en `$…$`, au plus 6 colonnes de valeurs.
- Diagramme d'une loi : bloc ` ```barres ` (voir l'exemple du modèle binomial, T09 et
  `applications/md/PLACEMENTS-guided.md` du modèle 1re).
- Arbre : ` ```probtree ` (3 épreuves au plus ; pour la loi géométrique, l'arbre « en peigne » : on ne
  prolonge que la branche $\overline{S}$).
- Illustrations (fiche d'applications seulement, 3 au plus) : SVG dessiné à la main → PNG
  1 200 px (Chromium headless de Playwright, voir `gen-svg.mjs` du modèle), fond blanc, version
  `-en.png` s'il y a du texte, fichiers `geom-<sujet>.png` dans `images/`. Dans le texte :
  `![alt](https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/exercise-images/97c1d5e4-5fa0-44ce-be83-ed5467f3a424/geom-<sujet>.png){size=large align=center}`
  sur sa propre ligne, entourée de lignes vides ; alt anglais dans la version anglaise. Une image
  d'énoncé ne donne aucune réponse. (Le script d'écriture en base enverra les PNG.)
- Anglais britannique scolaire, décimales à point, « geometric distribution $\mathcal{G}(p)$ »,
  « Bernoulli trial », « first success », « memoryless property », « at least », « at most ».

## Modèles validés à imiter

1. **Même niveau, même chapitre (le plus proche)** : fiches « Loi binomiale » T_COMP, publiées le
   2026-10-16 —
   `/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/22d784b7-1a80-45b7-82ae-2ea268351835/scratchpad/binom/`
   (`technique/`, `applications/` : md, sol, en, sol-en, `plan.json`, `verif/assert_all.py`, `images/`,
   `gen-svg.mjs` s'il y est). Lire 3 ou 4 exercices de chaque avant d'écrire : ton, longueur, phrase
   d'introduction du corrigé, mise en forme, arbres, barres.
2. 1re spé, variables aléatoires :
   `/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/f2116999-53aa-43b1-b92b-02d696355328/scratchpad/va/`.

Ne rien écrire dans ces dossiers.

## Disposition de sortie

```
<dossier>/
  plan.json                 sections {id,title,position,en}, exercices {key,section,title,en_title}
                            (même forme que le plan.json du modèle binomial)
  md/<CLÉ>-guided.md (+ -autonomous.md)   énoncés FR
  sol/  en/  sol-en/        mêmes noms
  generic.txt               vide (aucune lettre-fonction)
  verif/assert_all.py       UNE assertion par résultat chiffré des corrigés (Fraction / sympy / math),
                            FR et EN identiques en valeurs ; les arrondis vérifiés contre la valeur exacte
  images/ (applications)    SVG + PNG
```

Python : `python3 -I verif/assert_all.py` (sympy dispo dans
`/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/42af618c-23e6-4765-a2f0-9404109c0d64/scratchpad/venv-sympy/bin/python`).

## Vérifications obligatoires (à rendre)

1. `verif/assert_all.py` passe.
2. `pnpm check:ubumark <dossier>` → 0 problème.
3. `pnpm fiche:verifier <dossier> "<titre de la fiche>"` → vert ; RELIRE les PNG des pages (renvois,
   tableaux, arbres, barres, débords, align*, virgules en anglais).
4. Rendre la liste de tes écarts au plan, et pourquoi.

Ne JAMAIS écrire en base. Ne pas lancer `pnpm check`, `build`, `lint`, ni de serveur. Pas de commit.
