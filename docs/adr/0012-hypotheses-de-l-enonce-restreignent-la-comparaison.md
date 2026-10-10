# 0012 — Les hypothèses de l'énoncé restreignent le domaine de comparaison

- **Statut** : acceptée
- **Date** : 2026-09-29 · **Décidée par** : David

## Contexte

La convention d'équivalence (`docs/systeme/mathast/convention-equivalence.md`, décision du 2026-09-20) compare
deux expressions **sur l'intersection de leurs domaines** : `(x²−y²)/(x−y) ≡ x+y` et `x/x ≡ 1` sont
justes. Le décideur ne calcule pas cette intersection : c'est le sens de la règle, que chaque
réduction doit respecter.

Il ignore en revanche ce que dit l'**énoncé**. Mesuré le 2026-09-29, après #521 :

- « Soit x > 0. Simplifie `x^a·x^b`. » — `x^{a+b}` est compté **faux** : en x = −1, a = 2, b = ½,
  les deux membres existent et diffèrent.
- « u_n = (−2)^{2n}, n entier » — `4^n` est compté **faux** : en n = ½, −2 contre 2.

Un système d'hypothèses sur les variables existe déjà (`numtype` : `VariableAssumption`,
`TypeContext.assumptions`, prédicats `isPositiveType`, `isIntegerType`…), consommé par quelques règles
de `simplify` (`pattern/rule-sets/abs.ts`) mais branché ni sur `equivalenceForm` ni sur
`areEquivalent`, et alimenté par aucun code de l'application.

## Décision

Une question peut déclarer des **hypothèses** sur les variables libres de la réponse (« x > 0 »,
« n entier »). Le décideur compare alors sur **l'intersection des domaines ∩ le domaine déclaré** :
deux expressions sont équivalentes si elles prennent la même valeur en tout point **du domaine
déclaré** où elles sont toutes deux définies.

Sans hypothèse déclarée, rien ne change : c'est la convention du 2026-09-20.

Modalités (même jour) :

- **Déclarées sur le modèle de question entier**, pas case par case : « Soit x > 0 » est une phrase
  de l'énoncé, valable pour toutes ses cases.
- **Explicites seulement** : aucune hypothèse d'office (ex. « n ∈ ℕ » pour le thème Suites).
  L'éditeur peut en **proposer** une, l'auteur la coche.
- **Vocabulaire de départ** : strictement positif, positif ou nul, non nul, entier, entier naturel.
- **Nom** : « hypothèse de l'énoncé » ; champ `answerAssumptions` du modèle, traduit en
  `TypeContext.assumptions` (`numtype`).

## Écarté

- **Hypothèses implicites** (déduites du thème ou du niveau) : une règle cachée qui change les
  verdicts sans que l'auteur le voie.
- **Déclaration case par case** : complique l'éditeur pour un cas rare (deux cases aux hypothèses
  différentes dans une même question).
- **Parité et bornes dès le départ** : présentes dans `VariableAssumption`, mais aucun besoin concret
  mesuré ; à ajouter quand un exercice le demande.
- **Le domaine comme motif de refus** (exiger des domaines identiques, refuser `x/x ≡ 1`) : contraire
  à la décision du 2026-09-20. Si un exercice porte sur le domaine lui-même (« donne le domaine de
  définition »), c'est une vérification à part, comme `requiredForm`, pas un changement du décideur.

## Conséquences

- `areEquivalent` et `equivalenceForm` reçoivent un contexte d'hypothèses ; les règles conditionnelles
  l'interrogent par les prédicats de `numtype`. Premier candidat : `normal/rules/general-power.ts`,
  dont la condition « base numérique strictement positive » devient `isPositiveType(base, ctx)`.
- Le contexte entre dans la clé du cache de mathAST : deux questions aux hypothèses différentes ne
  partagent pas un verdict.
- Chaque règle conditionnelle prouve que sa condition est **exactement** celle de l'identité (leçon de
  `√a·√a`, `convention-equivalence.md`). La contre-vérification numérique ne tire ses points que dans
  le domaine déclaré.
- Une hypothèse fausse déclarée par l'auteur élargit ce qui est compté juste : elle doit rester
  visible dans l'éditeur et l'aperçu.
- Sans hypothèse, `x^a·x^b ≢ x^{a+b}` reste faux (comportement prudent actuel) : la question « base
  variable » posée le 2026-09-29 se résout par déclaration, question par question.
- Nouveau champ dans le schéma des modèles (`template-schema.ts`, Zod serveur, type) et dans l'éditeur.
