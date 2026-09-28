# Lot « Puissances » — rapport de relecture

21 questions TinyMath (#405–#425), 4e–3e : définition, puissances de 10, notation scientifique,
règles de calcul. Relecture le 2026-09-28 (Claude, deux relecteurs puis contrôle d'ensemble).

> ✅ **Feu vert de David le 2026-09-28 : les 21 questions sont importées en BROUILLON** (vérifié en
> base : reliées au suivi, statut draft, 21 emplacements distincts). David les publie lui-même.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 3      |
| Corrigée puis approuvée         | 18     |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/puissances`) : **21 analysés,
0 non importable**, 50 tirages par variation sans échec. Rendu (5 tirages par variation) : aucun
marqueur brut (`&1`, `[._…_]`, `{{`), aucun `*`. Affichage vérifié : « 0,008 735 », « 8,9 × 10³ ».

Aucune préparation du moteur : toutes les questions généraient déjà, grâce à #481 (lettre tirée
homonyme d'une variable : #414–#424 affichaient « 4² × 4⁴ » au lieu de « c² × c⁴ »).

## Corrections notables

- **Ce que voit l'élève** : le marqueur brut `&1` s'affichait devant la case (`&1^□`, #414, #416, #418,
  #420, #422) ; #424 affichait `10^□` sous `(6^9)^9` (erreur de la source : la base est tirée) ;
  #425 : la case était seule alors qu'on attend l'exposant (format de réponse perdu).
- **Énoncés** : le nombre à écrire en notation scientifique s'affichait en marqueur brut
  `[._a,c*10^{d}_]` (#411, #412) → calculé ; parties décimales finissant par 0 exclues (« 7,20 »).
- **Corrections** : elles n'affichaient que l'exposant (« = 16 ») ou la mantisse ; maintenant la
  puissance entière (`10^{16}`, `c^{8}`) ; tabulations retirées.
- **Forme exigée vérifiée par des specs** : la valeur calculée (`36`, `125`, `90 000`) est refusée quand
  une puissance est demandée ; `products` coupé sur #410 (`9 \times 10^4` sortait perfectible).
- Accents (« Écris », « Écrire »).

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Choix des relecteurs — validés par David (2026-09-28)

1. **#411** (notation scientifique) : une mantisse hors de [1 ; 10[ (`28,9 × 10³`) est **refusée**
   (fausse), pas perfectible, puisque la consigne demande la notation scientifique.
2. **Niveaux** : la source classe #418, #420, #424 en 3e, les autres en 4e — gardé.

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. `{{solution}}` d'une case « exposant » : la correction n'affiche que l'exposant.
2. `&1` non converti dans `answerFormats` ; `answerFormats` perdu quand la source a une expression par
   variation.
3. `[._…_]` (décimal composé de variables) laissé brut.
4. Tabulations recopiées dans `align` ; « Ecris » sans accent.
