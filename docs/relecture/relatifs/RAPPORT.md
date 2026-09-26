# Lot pilote « Relatifs » — rapport de relecture

36 questions TinyMath (#311–#346), 5e–4e. Relecture le 2026-09-26 (Claude). **Rien n'est encore en
base** : ce rapport attend le feu vert de David.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 14     |
| Corrigée puis approuvée         | 20     |
| À arbitrer par David            | 2      |
| Rejetée                         | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/relatifs`) : **34 importables,
0 non importable** ; chaque question a au moins une spec « bonne réponse » par variation (285 specs
au total), toutes vertes, et 50 tirages par variation sans échec.

## Corrections notables

- **Réponse de QCM jamais juste** (#336, #338, #339, #343, #344, #315) : le bon choix, calculé en
  TinyMath par `X ?? 0 :: 1`, était recopié brut → aucun choix n'était correct. Remplacé par un
  calcul d'indice.
- **Bonne réponse refusée** (#327) : « −9 » recevait 0 point (forme jugée incorrecte). Corrigé.
- **Contrainte de forme ignorée** (#312) : « Écris le résultat sous la forme 0 − a » acceptait « −15 »
  et « 0 + (−15) ». La contrainte est posée sur la case ; seule 0 − 15 est acceptée.
- **Tirage faussé** (#342) : « (−a)² » tirait a entre −1 et 9 au lieu de −9 et −1 (le carré d'un
  négatif disparaissait). Corrigé.
- **Correction fausse** (#325) : l'explication affirmait a > b sans que ce soit toujours vrai, et
  contenait un trou. Réécrite.
- Parenthèses nécessaires pénalisées après « × » et « : » (#341, #346) ; énoncé secondaire perdu
  (#344) ; typographie (« Écris », « À l'aide », « addition »).

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Questions à arbitrer

1. **#330 « Réécris cette soustraction en une addition équivalente »** — la réponse attendue
   2 + (−9) contient un double signe, donc la contrainte « signes » est désactivée (comme dans
   TinyMath). Conséquence : recopier la soustraction (« 2 − 9 ») est accepté comme juste.
   → Faut-il (a) créer une contrainte « addition exigée », (b) accepter ce comportement, ou
   (c) retirer la question ?
2. **#335 « Sommes algébriques »** — les termes signés TinyMath (`+9`, `−7`) ne peuvent pas encore
   s'écrire dans le nouveau format : l'énoncé afficherait « 994−6 » au lieu de « 9 + 9 + 4 − 6 ».
   → (a) j'ajoute au convertisseur un rendu « terme signé » (correctif de code), ou (b) on réécrit
   la question autrement ?

## Défauts de conversion à corriger dans le code (relevés par ce lot)

Ils touchent sûrement d'autres thèmes ; je les corrige à la source avant les lots suivants.

1. QCM : bon choix calculé par un ternaire TinyMath recopié brut.
2. `shared.requiredForm` ignoré pour les questions à cases (contrainte de forme sans effet).
3. Terme signé `[+_x_]` → perd le signe.
4. Tirage négatif `-$e[m;n]` → plage fausse ; `$er{n}` → ±1 seulement.
5. `&expression` dans une correction → trou à l'affichage.
6. Précision décimale ajoutée d'office à un résultat exact.
7. Validateur : l'option `allowBracketsInFirstNegativeTerm` refuse « −9 » comme « (−9 ) ».
8. Affichage : parenthèses nécessaires retirées autour d'un diviseur négatif (« 49 : −65 »).

## Suite, après feu vert

```
pnpm relecture:verdicts --lot docs/relecture/relatifs            # simulation
pnpm relecture:verdicts --lot docs/relecture/relatifs --publier  # verdicts en base
pnpm relecture:import   --lot docs/relecture/relatifs --publier  # 34 brouillons
```
