# 0033 — Le QCM est une case : la case choix remplace le type `multiple_choice`

- **Statut** : acceptée — mise en œuvre en cours (chantier figure-et-choix ; journal :
  `docs/archive/wip/figure-et-choix-progress.md`)
- **Date** : 2026-10-26 · **Décidée par** : David (décision 3 et questions Q1-Q3, Q6 du chantier)

## Contexte

Une question était QCM **ou** à cases (`getQuestionType` : présence de `choices`). L'essai de CP-058
(« Points alignés ? ») l'a montré : pour répondre oui / non à côté d'une figure, il fallait une case
texte tapée, parce qu'un choix ne pouvait pas vivre à côté d'une autre case. Relevé du 2026-10-26 :
178 QCM en prod (80 publiés), aucun ne mêle choix et cases, aucune réponse de QCM enregistrée dans
`test_answers`.

## Décision

1. **Le choix est une case** : la **case choix**, écrite dans l'énoncé par un bloc ` ```choix ` (liste
   `- …`), positionnelle comme toute case ; elle peut côtoyer d'autres cases.
2. **La bonne réponse est portée par la case** (`expectedAnswer` : indice(s) d'origine, dynamique
   possible), comme pour toute case ; l'éditeur la fait cocher.
3. **Réglages de la case** : `plusieurs: oui` (½ pour « que des bons choix, mais pas tous », un mauvais
   choix coché → faux) ; mélange par défaut, `melanger: non` pour l'empêcher.
4. **Tous les QCM sont réécrits en case choix** (« le plus propre possible, même si c'est plus de
   travail ») et le type `multiple_choice` disparaît du code et de la contrainte
   `question_templates_type_check`. Une question réduite à une case choix est notée exactement comme
   l'ancien QCM.

## Écarté

- **Garder les QCM et ajouter la case choix à côté** (option A) : deux façons d'écrire la même question.
- **Un marqueur `[choix]` dans l'énoncé et les choix dans un champ à part** (Q1) : énoncé et choix
  séparés, et liaison marqueur ↔ liste fragile dès deux cases choix.
- **Marquer la bonne réponse dans la liste (`- [x] Oui`)** (Q1) : impossible quand la bonne réponse
  dépend du tirage, et deux façons de dire la même chose.
- **Tout ou rien à plusieurs réponses** (Q2) : plus dur que le barème que vivent les élèves.

## Conséquences

- Livraison en temps séparés : code qui lit la case choix → `deploy:prod` → migration des 178 modèles
  (mêmes `id`) → code sans `multiple_choice` → `deploy:prod` → retrait de la valeur de la contrainte.
- La réponse à une case choix est une chaîne dans `values[]` (`"1"`, `"0;2"`) : fin de l'ambiguïté
  `number[]` / `string[]` des réponses stockées.
- L'ordre de mélange des QCM migrés change pour une même graine (sans effet : aucune réponse stockée,
  les instances enregistrées gardent leur ordre).
- Le QCM des énigmes (`riddles/`) n'est pas concerné. L'import TinyMath (`src/lib/migration/`), terminé,
  est retiré.
