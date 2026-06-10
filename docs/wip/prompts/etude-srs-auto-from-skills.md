# Étude — SRS auto-alimenté depuis `skill_attempts`

> **Mode** : étude/audit uniquement. **Pas d'implémentation, pas de migration, pas de commit.**
> Livrable attendu : un document d'analyse markdown dans `docs/wip/srs-auto-from-skills-study.md`.

---

## Contexte

Le MVP du système de compétences vient d'être livré (8 commits, push fait le 2026-06-09).

### Ce qui existe maintenant

- **Famille A (knowledge)** — 18 objectifs 6ᵉ × 4 capacités ordonnées (binaires). Tracking dans `skill_attempts` + état consolidé dans la VIEW `student_skill_state_a_v` + flag `needs_remediation` (décroissance 30 jours).
- **Famille B (competence)** — 6 compétences math du socle, évaluées par le prof sur tâches d'observation.
- Junction `question_template_skills` permet de tagger un template avec les `skill_id` qu'il évalue (3 templates 6ᵉ taggés actuellement).
- Hook FlashCard `trackSkillAttempt` (fire-and-forget) qui écrit dans `skill_attempts` quand un élève répond à une question.
- UI élève `/dashboard/student/objectifs` + `/dashboard/student/competences`.

### Le chantier à étudier (#2 du backlog V2)

**Objectif** : quand un élève rate une capacité famille A en flashcard, l'injecter automatiquement dans son deck SRS (Spaced Repetition System) pour révision espacée.

**Intuition** : `skill_attempts` (la donnée) → `srs_queue` ou équivalent (le moteur de révision).
Trigger PG envisagé : `AFTER INSERT ON skill_attempts WHERE code='-'` → si capacité a `needs_remediation=true` ou 2 échecs consécutifs → enqueue.

---

## Questions à investiguer

### A. État de l'art SRS dans le repo

1. **Existe-t-il déjà un système SRS opérationnel ?**

   - Chercher dans `src/lib/srs/`, `src/lib/flashcards/`, routes `/dashboard/student/srs*`, tables `srs_*`
   - Algo utilisé (SM-2, FSRS, Leitner, autre) ?
   - Modèle de données : tables, colonnes, statut des cartes (new/learning/review/relearning) ?
   - Comment les cartes entrent-elles dans le deck aujourd'hui (manuel ? auto ? import ?)

2. **Si SRS existe, où est l'UI élève ?** Comment est-il consommé ?

3. **Si SRS n'existe pas (ou squelette uniquement)**, le chantier #2 devient "concevoir un SRS minimal + l'auto-alim". Bien le flagger.

### B. Compatibilité avec la donnée famille A

4. **`question_template_skills` couvre quoi ?**

   - Combien de templates 6ᵉ existent dans `question_templates` (level=6) ?
   - Combien sont taggés (3 d'après le récap MVP) ?
   - Quelles capacités sont couvertes vs orphelines ?
   - Pour un `skill_id` donné, quel(s) template(s) ré-injecter en SRS ? (1-1 ? 1-N ? choix aléatoire ?)

5. **Granularité de la révision SRS**
   - On révise une **capacité** (`skill_id`) ou un **template** (`template_id`) ?
   - Si capacité : comment générer la prochaine flashcard (variation aléatoire d'un template tagué) ?
   - Si template : risque de re-tomber sur la même question, mauvais signal pédagogique. Discuter.

### C. Trigger PG et boucles

6. **Schéma du trigger**

   - Esquisser le SQL : `CREATE FUNCTION enqueue_srs_from_failed_attempt() RETURNS TRIGGER AS ...`
   - Conditions : `NEW.code = '-'` ET `NEW.source != 'srs'` (pour éviter boucle infinie : un échec SRS ne réenqueue pas), ET (2 échecs consécutifs OU `needs_remediation=true` sur la skill).
   - Vérifier que `skill_attempts.source` existe et accepte `'srs'` (cf. type `SkillSource` dans `src/lib/types/skills.ts`).

7. **Critère d'enqueue**

   - "2 échecs consécutifs" sur la skill : implique de relire l'historique. Coût acceptable dans un trigger ?
   - Alternative : enqueue sur **chaque** échec, laisser le SRS dédupliquer (1 carte/skill, simple `ON CONFLICT DO NOTHING`).
   - Recommander une approche.

8. **Désactivation utilisateur**
   - Préférence `srs_auto_from_skills` : où la stocker (`profiles.preferences` JSONB ? Nouvelle colonne ?) ?
   - Vérifier dans le trigger.

### D. UX élève

9. **Affichage des cartes auto-alim dans `/dashboard/student/srs`**

   - Badge "à réviser suite à un échec famille A" → wireframe textuel.
   - Lien retour vers l'objectif concerné (`/dashboard/student/objectifs/[id]`).
   - Comment l'élève sait-il qu'une nouvelle carte est arrivée ? (Compteur dashboard ? Notification ?)

10. **Boucle pédagogique fermée**
    - Si élève réussit la carte SRS, la `skill_attempts(code='+', source='srs')` arrive → cela contribue-t-il à `is_acquired` ? Décision : ✅ oui (signal valide) ou ❌ non (biais : facile en SRS car répétée) ?
    - Documenter le choix.

### E. Risques et points d'attention

11. **Boucle infinie SRS ↔ skill_attempts**

    - Filtre `source != 'srs'` côté trigger : vérifier que c'est suffisant.

12. **Performance**

    - Trigger sur chaque INSERT dans `skill_attempts`. Volume estimé ? Risque de ralentir l'écriture de la flashcard ?
    - Alternative : job batch nocturne au lieu de trigger temps-réel.

13. **Famille B (competence)**

    - `skill_attempts` famille B sont saisis par le prof, pas l'élève. Doit-on enqueue SRS sur famille B ? Si oui, mêmes règles ? Probablement **non** (la révision SRS n'a pas de sens pour "argumenter à l'oral"). Confirmer.

14. **Désynchro avec `student_skill_state_a_v`**
    - La VIEW recalcule à chaque lecture. Le trigger SRS doit-il lire la VIEW (coûteux) ou avoir sa propre logique de "2 échecs consécutifs" ?

---

## Livrable

Document `docs/wip/srs-auto-from-skills-study.md` structuré comme suit :

```markdown
# Étude — SRS auto-alimenté depuis skill_attempts

## 1. État de l'art SRS dans le repo

(Réponses A1-A3, avec fichiers cités `file:line`)

## 2. Compatibilité avec la donnée famille A

(Réponses B4-B5)

## 3. Schéma du trigger proposé

(SQL esquissé pour C6, choix C7-C8 argumentés)

## 4. UX élève

(D9-D10 avec wireframe ASCII si pertinent)

## 5. Risques identifiés

(E11-E14)

## 6. Recommandation finale

- **Faisabilité** : Verte / Orange / Rouge
- **Effort estimé** : X jours, avec breakdown
- **Pré-requis** : ce qui doit exister avant (ex: SRS lui-même, pool templates étendu)
- **Décisions ouvertes pour le PO** : liste de questions oui/non que l'utilisateur devra trancher
```

---

## Contraintes de la session d'étude

- **Étude uniquement** : pas d'`Edit`, pas de `Write` sauf le document livrable, pas de migration, pas de commit.
- **Pas de `pnpm check` / `pnpm build` / `pnpm lint`** sur tout le projet (problèmes de mémoire — cf. `CLAUDE.md`).
- **Pas de `pnpm test:triggers`** (ne marche pas localement).
- Utiliser `Explore` (agent) pour les questions A1, A2, B4 si plus de 3 requêtes nécessaires.
- Citer systématiquement les fichiers/lignes consultés (`file:line`).
- Si une question reste sans réponse claire après audit, la **flagger** dans le doc plutôt que d'inventer.

---

## Fichiers / répertoires à consulter en priorité

- `src/lib/types/skills.ts` — types Famille A/B
- `src/lib/types/database-helpers.ts` — types dérivés
- `supabase/migrations/20260609120000_competence_referentiel_schema.sql` — schéma de référence
- `supabase/migrations/20260609120001_competence_referentiel_functions.sql` — fonctions PL/pgSQL existantes
- `supabase/migrations/20260609130000_seed_question_template_skills.sql` — exemple de tagging
- `src/lib/components/questions/FlashCard.svelte` — hook `trackSkillAttempt`
- `src/routes/api/skill-attempts/+server.ts` — endpoint d'écriture
- `docs/wip/skills-referentiel-design.md` — spec architecturale complète
- `docs/architecture/database-schema.md` — section "Compétences"
- `src/lib/srs/` ou équivalent — **à découvrir**
- `src/routes/(protected)/dashboard/student/srs*` — UI SRS existante éventuelle

---

## Démarrage suggéré

1. `find src/lib -type d -iname "*srs*" -o -iname "*flashcard*" -o -iname "*spaced*"`
2. `grep -r "srs" supabase/migrations/ src/lib/types/database.ts`
3. Lire `src/lib/types/skills.ts` en entier (~5 min)
4. Lire la section "Compétences" de `docs/architecture/database-schema.md`
5. Démarrer l'audit méthodique question par question.

Temps estimé : 60-90 minutes d'étude pour produire un livrable solide.
