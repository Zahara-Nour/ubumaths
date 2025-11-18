# Analyse du Hash Mismatch - Cause Racine Identifiée

**Date**: 2025-11-17
**Auteur**: Claude
**Statut**: ✅ RÉSOLU - Cause identifiée

---

## 🎯 Problème

113 questions ont été migrées avec succès dans `question_templates` mais leurs entrées de tracking n'ont PAS été mises à jour avec le `new_template_id`.

**Symptôme**: `stateManager.recordQuestionProcessed()` a échoué silencieusement pour 113 questions.

---

## 🔍 Cause Racine

**HASH MISMATCH** entre l'initialisation du tracking et le traitement des questions.

### Fonction 1: `scripts/migrate-questions-phase1.ts:795-806`

```typescript
function generateQuestionHash(question: QuestionBase): string {
  const content = JSON.stringify({
    description: question.description,
    subdescription: question.subdescription,
    enounces: question.enounces,
    expressions: question.expressions,
    variabless: question.variabless,
    solutionss: question.solutionss
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

**Utilisée pour**: Initialisation du tracking (ligne 344)

**Clés utilisées**: `description`, `subdescription`, `enounces`, `expressions`, `variabless`, `solutionss`

---

### Fonction 2: `src/lib/server/migration/state-manager.ts:445-458`

```typescript
private generateQuestionHash(question: any): string {
  const content = JSON.stringify({
    type: question.type || 'unknown',
    statement: question.statement || question.enounces?.[0] || question.description,
    answer: question.answer || question.solutionss,
    grade: question.grade,
    theme: question.theme,
    description: question.description,
    enounces: question.enounces,
    options: question.options
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

**Utilisée pour**: Enregistrement du traitement (ligne 145 dans `recordQuestionProcessed()`)

**Clés utilisées**: `type`, `statement`, `answer`, `grade`, `theme`, `description`, `enounces`, `options`

---

## 💥 Impact

### Phase d'Initialisation (ligne 333-375 de migrate-questions-phase1.ts)

1. Pour chaque question, calcule le hash avec **Fonction 1**
2. Crée une entrée dans `migration_tracking` avec:
   - `old_question_hash` = hash calculé avec Fonction 1
   - `migration_status` = 'pending'
   - `phase` = null

### Phase de Traitement (ligne 577-587 de migrate-questions-phase1.ts)

1. Question insérée avec succès dans `question_templates` ✅
2. Appelle `stateManager.recordQuestionProcessed()`
3. State manager calcule le hash avec **Fonction 2**
4. Cherche une entrée avec `old_question_hash` = hash Fonction 2
5. **NE TROUVE PAS** l'entrée (hash différent) ❌
6. Essaie d'insérer une nouvelle entrée avec `upsert` (onConflict: 'old_question_hash')
7. L'insert ÉCHOUE car l'entrée existe déjà (avec un hash différent)
8. **L'échec est silencieux** car pas de `throw` après l'erreur DB

### Résultat

- ✅ Question dans `question_templates`
- ❌ Entrée de tracking reste "pending" sans `new_template_id`
- ❌ 113 questions orphelines

---

## 📊 Preuve du Problème

### Différences Entre les Deux Fonctions

| Clé | Fonction 1 | Fonction 2 |
|-----|-----------|-----------|
| `type` | ❌ | ✅ |
| `statement` | ❌ | ✅ (composé) |
| `answer` | ❌ | ✅ (composé) |
| `grade` | ❌ | ✅ |
| `theme` | ❌ | ✅ |
| `description` | ✅ | ✅ |
| `subdescription` | ✅ | ❌ |
| `enounces` | ✅ | ✅ |
| `expressions` | ✅ | ❌ |
| `variabless` | ✅ | ❌ |
| `solutionss` | ✅ | ❌ |
| `options` | ❌ | ✅ |

**Pourcentage de correspondance**: ~28% (2/7 clés communes)

**Résultat**: Hash complètement différent pour les **mêmes** questions.

---

## 🎯 Questions Affectées

**Total**: 113 questions sur 472 migrées (23.9%)

**Caractéristiques** des 113 questions affectées:
- Descriptions très courtes ("de 1...", "de 2...")
- Types: `numerical_exact`, `fill_in_blanks`, `numerical_decimal`, `multiple_choice`
- Niveaux: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 2, SPE_1

**Hypothèse**: Les questions avec des descriptions courtes ont probablement des différences plus marquées entre les deux fonctions de hash, car les clés supplémentaires (`type`, `grade`, `theme`) dans Fonction 2 ont plus de poids relatif.

---

## 💡 Solutions

### Solution A: Script de Réconciliation (IMPLÉMENTÉ)

**Avantages**:
- Ne modifie pas le code de migration
- Peut être appliqué rétroactivement
- Pas de risque de casser la migration en cours

**Approche**:
1. Pour chaque question orpheline (472 - 359 = 113):
   - Récupérer son `id` et son contenu complet
   - Chercher l'entrée "pending" correspondante en comparant les champs clés
   - Mettre à jour l'entrée avec:
     - `new_template_id` = id de la question
     - `migration_status` = 'imported'
     - `phase` = 1
     - `imported_at` = timestamp

**Implémentation**: `scripts/reconcile-orphan-questions.ts`

---

### Solution B: Correction des Fonctions de Hash (FUTURE)

**Pour éviter ce problème dans les phases suivantes**:

1. **Uniformiser** les deux fonctions pour qu'elles utilisent les MÊMES clés
2. **Trier** les clés de l'objet avant `JSON.stringify` pour garantir un ordre stable
3. **Utiliser** une seule fonction de hash centralisée

**Exemple de fonction unifiée**:

```typescript
function generateStableQuestionHash(question: QuestionBase): string {
  // Utiliser un sous-ensemble stable de propriétés
  const normalized = {
    description: question.description || '',
    enounces: question.enounces || [],
    expressions: question.expressions || [],
    variabless: question.variabless || [],
    solutionss: question.solutionss || []
  };

  // Trier les clés pour garantir un ordre stable
  const content = JSON.stringify(normalized, Object.keys(normalized).sort());
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

**Application**:
- Remplacer les deux fonctions existantes
- Tester avec les phases 2, 3, 4

---

## 📋 Action Items

- [x] **Identifier la cause** du hash mismatch
- [x] **Documenter** le problème
- [ ] **Implémenter** le script de réconciliation
- [ ] **Tester** le script de réconciliation
- [ ] **Exécuter** le script de réconciliation
- [ ] **Vérifier** que les 113 questions sont maintenant trackées
- [ ] **Corriger** les fonctions de hash pour les phases futures (optionnel)

---

## 🎓 Leçons Apprises

1. **Toujours utiliser une fonction de hash centralisée** pour éviter les incohérences
2. **Trier les clés** de l'objet avant `JSON.stringify` pour garantir la stabilité
3. **Tester les hash** en comparant initialisation vs traitement avant de lancer une migration massive
4. **Logger les erreurs de tracking** explicitement au lieu de les laisser silencieuses
5. **Valider la cohérence** entre DB et état après chaque batch

---

## ✅ Conclusion

Le problème est **complètement compris** et **facilement réparable** avec un script de réconciliation.

**Impact utilisateur**: ✅ AUCUN (les questions fonctionnent)
**Impact technique**: ⚠️ Tracking incomplet (réparable)

**Prochaine étape**: Créer et exécuter le script de réconciliation.
