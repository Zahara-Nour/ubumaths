# Dictionnaire en base, page d'admin — spécification (à valider)

Décisions de David (2026-10-10, « je valide ») : [ADR 0022](../adr/0022-dictionnaire-en-base-admin.md).
Rien n'est codé avant la validation des comportements ci-dessous.

## Modèle de données (proposé)

- `dictionary_entries` : une ligne par entrée — `term`, `sense`, `grade`, `tags`, `definitions`
  (niveaux et textes, `sharedWith` compris), `exemples`, `history`, `synonyms`, `forms`,
  `auto_link`, `derived_from`, `see_also`, `shared_with`, `hidden`, `updated_at`, `updated_by`.
- `dictionary_entry_versions` : la version précédente d'une entrée à chaque enregistrement
  (`entry_id`, contenu complet, date, auteur).
- Les règles de cohérence sont **une seule fonction TypeScript**, appelée par le serveur à
  l'enregistrement et par la CI sur le jeu de référence.

## Comportements

### Lecture (tout le monde)

1. Après la reprise, le glossaire, Mathémo et les mots cliquables affichent exactement le même
   contenu qu'aujourd'hui (les 671 entrées comparées une à une, avant et après).
2. Un visiteur lit le dictionnaire ; ni lui, ni un élève, ni le compte prof sans élévation ne peut
   rien modifier (refus du serveur et de la base).
3. Une modification apparaît sur le site **au plus tard 5 minutes après** (cache), tout de suite
   pour l'admin qui l'a faite.
4. Une entrée masquée disparaît du glossaire, de Mathémo et des mots cliquables.

### Page d'admin (`/dashboard/admin/dictionnaire`, après élévation)

5. Chercher un mot (accents et majuscules ignorés), ouvrir sa fiche.
6. Modifier une définition, avec l'aperçu de ses formules ; ajouter ou retirer une définition à un
   niveau.
7. Modifier synonymes, formes, étiquette de sens, « jamais souligné », filières partagées, renvoi.
8. Ajouter une entrée ; masquer ou réafficher une entrée.
9. Chaque enregistrement garde la version précédente (date, auteur).

### Refus à l'enregistrement (message en français, rien n'est écrit)

10. Première définition pas au niveau du mot, ou niveaux non croissants.
11. Renvoi vers un mot absent, masqué, ou caché à un niveau qui voit le renvoi.
12. Deux entrées du même nom dont une sans étiquette de sens.
13. Partage avec une filière qui n'est pas parallèle (même année, l'une ne voyant pas l'autre).
14. Forme conjuguée déjà prise par un autre mot, ou égale au nom d'un mot.
15. Même nom et même sens qu'une autre entrée (accents et majuscules ignorés).
16. Masquer une entrée visée par un renvoi encore visible.

### Reprise et fin du fichier

17. La reprise lit le fichier actuel ; la CI vérifie que la base reprise et le fichier coïncident.
18. Les tests du dictionnaire (règles et copies figées des lots) tournent sur le jeu de référence.
19. Le fichier `math-dictionary-fr.ts` est supprimé après la mise en prod du code qui lit la base.
