# Les 41 questions relues par David — rapport de reprise

Questions TinyMath #0–#20, #25–#33, #96–#106 (Entiers), relues par David entre février et avril 2026.
Reprise le 2026-09-26 (Claude). **Son verdict et son contenu font foi** : rien n'est rejugé.

> ✅ **Feu vert de David le 2026-09-26 : les 41 questions sont importées en BROUILLON.** David les publie lui-même.

## Bilan

|                                                                      | Nombre |
| -------------------------------------------------------------------- | ------ |
| Approuvées par David, prêtes à importer                              | **40** |
| Modifiée par David sans verdict (#20) — relue, **décision attendue** | 1      |

Vérification (`pnpm question:specs --lot docs/relecture/david`) : **40 importables, 0 échec** — au moins une
spec « bonne réponse » par variation, toutes vertes, 50 tirages par variation.

## Ce qui a été ajouté (sans toucher au contenu)

- **117 specs** : pour les 15 questions qui n'en avaient pas (#0–#12, #96) et les 4 variations non
  couvertes de #104. Les specs de David sont conservées.
- **Niveau +1** (décision du 2026-09-26), recalculé depuis le niveau TinyMath : les paires au même niveau
  (#0/#1, #9/#10, #25/#26, #96/#97) disparaissent ; #20 passe de 0 à 1.
- Statut forcé en brouillon (#28 portait `published`).

## Deux défauts de code révélés par les specs de David — corrigés (PR en cours)

- **#15, #19 « Décompose ce nombre »** : les bonnes réponses tapées au clavier étaient refusées. La réponse
  attendue écrit `2*100`, le clavier envoie `2 × 100`, et le contrôle de forme comparait aussi le **symbole**
  de multiplication. Touche toute question dont la réponse contient une multiplication. Défaut antérieur à
  aujourd'hui.
- **Espaces des milliers** : « 34 56 » ou « 3 4 5 6 » étaient acceptés comme justes pour 3456 (seule la
  présence d'une espace était vérifiée). Désormais : groupes de 3, sinon forme perfectible.

## Décisions de David (2026-09-26) — appliquées

> 1 oui (réponses + CE1) · 2 oui · 3 oui · 4 corriger. Vérification : **41 importables, 0 échec**.

### Points soumis

1. **#20 « Quel est ce nombre ? » (droites graduées)** — **19 des 20 variations attendent une mauvaise
   réponse** : toutes attendent 560 alors que chaque image montre une droite différente (défaut hérité de
   TinyMath : une seule solution pour 20 images). Réponses lues sur les images (2 vérifiées à la main) :
   v0–v4 : 560, 250, 520, 210, 180 · v5–v9 : 330, 360, 200, 460, 380 · v10–v14 : 230, 450, 260, 390, 400 ·
   v15–v19 : 420, 250, 450, 450, 200.
   → (a) je corrige les 19 réponses ; et le niveau : **CP → CE1** (nombres jusqu'à 560) ?
2. **#9** : la forme exigée `a:multipleOf(10) + b:inN*` accepte « 60 + 14 » comme décomposition de 74.
   → restreindre b à un chiffre ?
3. **#11** : quand un chiffre vaut 0, la réponse attendue contient un terme nul (406 → « 400 + 0 + 6 ») ;
   l'élève qui écrit « 400 + 6 » est bien compté juste, mais la correction affiche la forme avec le 0.
   → retirer les termes nuls de la réponse affichée ? _(Appliqué par trois variations — aucun zéro /
   zéro aux dizaines / zéro aux unités — car l'option d'affichage ne s'applique pas à la réponse.)_
4. Détails (sans effet sur la correction) : espace manquante après la virgule (#1 v2, #3 v1 : « $d$,le ») ;
   #6 : variations 3–5 identiques aux variations 0–2 ; #10 : la condition laisse passer des énoncés
   triviaux (« 2 » seul) ; #9 et #12 : un tirage peut reproduire l'exemple de l'énoncé.
   → à corriger, ou tels quels ?

## Suite, après feu vert (et fusion de la PR de code)

```
pnpm relecture:verdicts --lot docs/relecture/david --remplacer            # simulation
pnpm relecture:verdicts --lot docs/relecture/david --remplacer --publier  # verdicts + versions complétées
pnpm relecture:import   --lot docs/relecture/david --publier              # 40 brouillons
```

(`--remplacer` : les versions de David sont complétées — niveau, specs, brouillon.)
