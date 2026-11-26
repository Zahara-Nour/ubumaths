# Relevé « proportionnalité » de 3e (2026-11-26)

Chantier [`idees-3e-proportionnalite`](idees-3e-proportionnalite-progress.md). Les 3 exercices de la
rubrique « proportionnalité » de 3e de l'autre plateforme (`3P10`, `3P10-1`, `3P10-2`), lus dans leur
code source (copie locale), comparés à nos modèles de pourcentages et d'évolutions de tous les niveaux
en prod (MCP en lecture seule, 2026-11-26).

## Points de 3e

| Point | Énoncé                                                                   | Modèles en prod                                                    |
| ----- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 3-036 | Traduire une augmentation en pourcentage                                 | ccb51039 « Augmentation et coefficient multiplicateur » (3, 4e+3e) |
| 3-063 | Traduire une diminution en pourcentage                                   | 76f5f143 « Diminution et coefficient multiplicateur » (3, 4e+3e)   |
| 3-068 | Appliquer une augmentation, cas simples, sans coefficient (120 € + 20 %) | 290dcf6f « Augmentation » (4 : prix ×10, t = 10, 20, 50, 100)      |
| 3-069 | Appliquer une diminution, cas simples, sans coefficient (120 € − 20 %)   | 24f7a007 « Diminution » (4 : prix ×10, t = 10, 20, 30, 50)         |

Bornes ([cycle4.md](../systeme/programmes/bornes/cycle4.md)) : 3-036 et 3-063, coefficient multiplicateur
(1 + t/100) ou (1 − t/100) ; 3-068 et 3-069, cas simples sans coefficient. Ni évolutions successives ni
évolution réciproque en 3e : elles sont de Seconde (2-377 à 2-379, 2-478).

Les variations de ccb51039 et 76f5f143 : v1 taux → coefficient (t ∈ 5, 7, 10, 15, 20, 25, 40, 50, 100 ;
diminution jusqu'à 75), v2 prix × coefficient (prix 20 à 300 €, t multiple de 5 jusqu'à 30), v3
coefficient → taux (103 à 160 ; 97 à 40). Ces modèles portent aussi le niveau 4e (4-057, 4-080).

Nos modèles voisins : 4e d727be44 « Le coefficient multiplicateur » (prix de a à b : par quel nombre ?),
4f599434 « Calculer avec des pourcentages » ; Seconde e12e58cb / d98aa53a (taux → coefficient, 2-366),
2562438e / e05bb79b (coefficient → taux, 2-367), c4372fd8 « Appliquer une évolution » et 1c443c35
« Retrouver la valeur initiale » (2-377, prix seulement), 36abc642 « Composer deux évolutions » et
8b59ca4b « Coefficient multiplicateur d'une évolution répétée » (2-378), bbd511cb, 7a763528
(réciproque) ; 1re : b6753dff, 27d77564 (suites).

## Exercices

| Id     | Ce qu'on demande                                                                                                                                                                                                                                                                                                                                       | Forme de réponse                    | Nos modèles                                                                                                                            | Verdict                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 3P10   | Quatre contextes (prix soldé ou augmenté, t = ±10 à 60 ; effectif d'un collège, 350 à 1 200 élèves, t de 1 à 11 choisi pour un résultat entier ; facture 700 à 1 400 €, t de 1 à 12 ; population 11 000 à 990 000, t de 5 à 35) × trois questions : **valeur finale** ; **exprimer la variation en %** à partir des deux valeurs ; **valeur initiale** | un nombre (€, élèves, habitants, %) | finale : ccb51039 v2 / 76f5f143 v2 (prix seulement, t ⩽ 30) ; en % : coefficient → taux seulement (v3) ; initiale : 1c443c35 (Seconde) | 🟡 finale : contextes et taux non ronds ; ❌ « en % à partir des deux valeurs » en 3e ; ✅ initiale (Seconde, hors bornes de 3e) |
| 3P10-1 | Compléter « augmenter de t % revient à multiplier par … » (t de 1 à 190, non multiples de 10 compris : 3 %, 17 %, 23 %) et « multiplier par k revient à faire … » (réponse signée « +23 % » ou « −23 % »)                                                                                                                                              | décimal ; pourcentage signé         | ccb51039 v1 / v3, 76f5f143 v1 / v3                                                                                                     | 🟡 taux à un chiffre (1,03 et non 1,3) et taux > 100 % absents ; la forme signée n'apporte rien                                  |
| 3P10-2 | Évolution répétée n fois (salaire +2 à 10 % tous les deux ans sur 6 à 12 ans ; capital +1 à 4 % par an ; espèce protégée −4 à 16 % par an ; population mondiale +0,8 à 1,4 %) : valeur au bout de n ans, arrondie ; en deux questions (coefficient annuel, valeur) ou trois (1 an, 2 ans, n ans)                                                       | un à trois nombres arrondis         | 8b59ca4b (Seconde : coefficient global seulement), 1re b6753dff                                                                        | 🟡 hors 3e (évolutions successives = Seconde 2-378) → variation de 8b59ca4b                                                      |

Note : dans 3P10-2, le salaire augmente « tous les deux ans » mais la question a) demande le coefficient
« chaque année » ; l'idée est reprise sans cette incohérence.

## Ce que leur format fait et pas le nôtre

Rien. Leurs questions en deux ou trois étapes (a, b, c) se font chez nous avec plusieurs cases ; leur
pourcentage signé (« +23 % ») est une saisie que nos règles savent juger, mais elle n'ajoute rien à
« l'augmenter de ? % ». Rien à ajouter à `outils-manquants.md`.
