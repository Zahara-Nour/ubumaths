# Guide FSRS : Système de Révision Espacée pour Flash Cards

## Table des matières

1. [Principes de la Révision Espacée](#principes)
2. [L'Algorithme FSRS](#algorithme-fsrs)
3. [Implémentation en JavaScript/Svelte](#implémentation)
4. [Configuration Recommandée](#configuration)

---

## 1. Principes de la Révision Espacée {#principes}

### Qu'est-ce que la révision espacée ?

La révision espacée (spaced repetition) est une technique d'apprentissage qui consiste à réviser une information juste avant de l'oublier. Plus on révise une information avec succès, plus l'intervalle avant la prochaine révision augmente.

### Les 4 Principes Fondamentaux

1. **Intervalles croissants** : 1 jour → 3 jours → 7 jours → 15 jours → 30 jours...
2. **Adaptation à la difficulté** : Les cartes difficiles sont revues plus souvent
3. **Révision au moment optimal** : Juste avant l'oubli pour maximiser la rétention
4. **Feedback immédiat** : L'élève évalue sa performance après chaque carte

### Pourquoi FSRS plutôt que SM-2 ?

- **30% moins de révisions** à rétention égale
- **Adaptatif** : Apprend les patterns de mémoire de l'utilisateur
- **Gestion intelligente des retards** : Si l'élève prend une pause, FSRS s'adapte mieux
- **Rétention cible ajustable** : Contrôle précis entre 70% et 97%

---

## 2. L'Algorithme FSRS {#algorithme-fsrs}

### Modèle DSR : Les 3 Variables

FSRS est basé sur le "Three Component Model of Memory" avec 3 variables :

#### D - Difficulty (Difficulté)

- Valeur : 1 à 10
- Représente la difficulté intrinsèque de la carte
- Plus D est élevé, plus la carte est difficile

#### S - Stability (Stabilité)

- Valeur : nombre de jours
- Temps avant que la récupérabilité atteigne 90%
- Plus S est élevé, plus la mémoire est stable

#### R - Retrievability (Récupérabilité)

- Valeur : 0% à 100%
- Probabilité de se souvenir de la carte à cet instant
- R diminue avec le temps écoulé depuis la dernière révision

### Formules Clés

#### 1. Récupérabilité (R)

```
R = (1 + elapsed_days / (9 × S))^(-0.5)
```

Où :

- `elapsed_days` = jours écoulés depuis la dernière révision
- `S` = stabilité actuelle
- `-0.5` = paramètre de déclin (decay)

#### 2. Intervalle optimal

```
I = 9 × S × (DR^(-2) - 1)
```

Où :

- `I` = intervalle en jours
- `DR` = rétention désirée (ex: 0.9 pour 90%)

#### 3. Nouvelle stabilité après succès

```
S' = S × (1 + SInc)

SInc = e^(w[8]) × (11 - D) × S^(-w[9]) × (e^((1-R) × w[10]) - 1)
```

#### 4. Nouvelle difficulté

```
D' = clamp(D - w[6] × (G - 3), 1, 10)
```

Où :

- `G` = grade (1=Again, 2=Hard, 3=Good, 4=Easy)
- `clamp` = limite entre 1 et 10

---

## 3. Implémentation en JavaScript/Svelte {#implémentation}

### Structure de Données

```javascript
// Structure d'une flashcard avec métadonnées FSRS
const flashcard = {
	id: 'card-123',
	question: 'Quelle est la capitale de la France ?',
	answer: 'Paris',

	// Métadonnées FSRS (modèle DSR)
	difficulty: 5, // D: Difficulté (1-10)
	stability: 3.5, // S: Stabilité en jours
	lastReview: new Date(), // Dernière révision
	nextReview: new Date(), // Prochaine révision planifiée
	state: 'review', // État: 'new', 'learning', 'review', 'relearning'

	// Optionnel : historique
	reviewHistory: [
		{
			date: new Date(),
			grade: 3, // 1=Again, 2=Hard, 3=Good, 4=Easy
			elapsedDays: 5,
			retrievability: 0.88
		}
	],

	// Métadonnées
	createdAt: new Date(),
	tags: ['géographie'],
	deck: 'Capitales européennes'
};
```

### Implémentation Complète FSRS

```javascript
/**
 * Classe FSRS pour gérer la révision espacée
 */
class FSRS {
	constructor(params = DEFAULT_FSRS_PARAMS, desiredRetention = 0.9) {
		this.w = params; // Les 21 paramètres FSRS-6
		this.desiredRetention = desiredRetention;
		this.decay = -0.5; // Paramètre de déclin
		this.maxInterval = 36500; // 100 ans en jours
	}

	/**
	 * Initialise une nouvelle carte
	 */
	initCard() {
		return {
			difficulty: 5,
			stability: 0,
			lastReview: null,
			nextReview: new Date(),
			state: 'new',
			reviewHistory: []
		};
	}

	/**
	 * Calcule la récupérabilité (R)
	 */
	calculateRetrievability(card) {
		if (!card.lastReview || card.stability === 0) return 1;

		const elapsedDays = (Date.now() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);

		const retrievability = Math.pow(1 + elapsedDays / (9 * card.stability), this.decay);

		return Math.max(0, Math.min(1, retrievability));
	}

	/**
	 * Calcule la stabilité initiale selon le grade
	 */
	calculateInitialStability(grade) {
		// grade: 1=Again, 2=Hard, 3=Good, 4=Easy
		return this.w[0] + this.w[1] * (grade - 1);
	}

	/**
	 * Calcule la nouvelle stabilité après succès
	 */
	calculateNewStability(card, grade) {
		const { difficulty, stability } = card;
		const retrievability = this.calculateRetrievability(card);

		// Si première révision
		if (stability === 0) {
			return this.calculateInitialStability(grade);
		}

		// Formule FSRS v4 simplifiée
		const difficultyFactor = Math.exp(this.w[8]) * (11 - difficulty);
		const stabilityFactor = Math.pow(stability, -this.w[9]);
		const retrievabilityFactor = Math.exp((1 - retrievability) * this.w[10]) - 1;

		const stabilityIncrease = 1 + difficultyFactor * stabilityFactor * retrievabilityFactor;

		return stability * Math.max(1, stabilityIncrease);
	}

	/**
	 * Calcule la nouvelle stabilité après échec
	 */
	calculatePostLapseStability(card) {
		const { difficulty, stability } = card;
		const retrievability = this.calculateRetrievability(card);

		return (
			this.w[11] *
			Math.pow(difficulty, -this.w[12]) *
			(Math.pow(stability + 1, this.w[13]) - 1) *
			Math.exp(this.w[14] * (1 - retrievability))
		);
	}

	/**
	 * Met à jour la difficulté
	 */
	updateDifficulty(card, grade) {
		const newDifficulty = card.difficulty - this.w[6] * (grade - 3);
		return Math.max(1, Math.min(10, newDifficulty));
	}

	/**
	 * Calcule le prochain intervalle
	 */
	calculateInterval(stability) {
		const interval = 9 * stability * (Math.pow(this.desiredRetention, 1 / this.decay) - 1);

		return Math.max(1, Math.min(this.maxInterval, Math.round(interval)));
	}

	/**
	 * Révise une carte - MÉTHODE PRINCIPALE
	 * @param {Object} card - La carte à réviser
	 * @param {number} grade - Note (1=Again, 2=Hard, 3=Good, 4=Easy)
	 * @returns {Object} Carte mise à jour
	 */
	reviewCard(card, grade) {
		const now = new Date();

		// Échec (Again)
		if (grade === 1) {
			card.stability = this.calculatePostLapseStability(card);
			card.state = 'relearning';
		}
		// Réussite (Hard, Good, Easy)
		else {
			card.stability = this.calculateNewStability(card, grade);
			card.state = 'review';
		}

		// Mise à jour de la difficulté
		card.difficulty = this.updateDifficulty(card, grade);

		// Calcul du prochain intervalle
		const interval = this.calculateInterval(card.stability);

		// Planification
		card.lastReview = now;
		card.nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

		// Historique
		card.reviewHistory.push({
			date: now,
			grade: grade,
			elapsedDays: card.lastReview ? (now - card.lastReview) / (1000 * 60 * 60 * 24) : 0,
			retrievability: this.calculateRetrievability(card)
		});

		return card;
	}

	/**
	 * Vérifie si une carte est due pour révision
	 */
	isDue(card) {
		if (!card.nextReview) return true;
		return new Date(card.nextReview) <= new Date();
	}
}
```

### Exemple d'Utilisation en Svelte 5

```svelte
<script>
	// Import de la classe FSRS
	import { FSRS, DEFAULT_FSRS_PARAMS } from './fsrs.js';

	// Props
	let { flashcards = $bindable([]) } = $props();

	// Initialisation FSRS
	const fsrs = new FSRS(DEFAULT_FSRS_PARAMS, 0.9);

	// État
	let currentCardIndex = $state(0);
	let showAnswer = $state(false);
	let stats = $state({ reviewed: 0, correct: 0, incorrect: 0 });

	// Cartes dues
	let dueCards = $derived(flashcards.filter((card) => fsrs.isDue(card)));
	let currentCard = $derived(dueCards[currentCardIndex]);

	// Gestion de la révision
	function handleGrade(grade) {
		if (!currentCard) return;

		// Réviser avec FSRS
		fsrs.reviewCard(currentCard, grade);

		// Stats
		stats.reviewed++;
		if (grade >= 3) stats.correct++;
		else stats.incorrect++;

		// Carte suivante
		showAnswer = false;
		currentCardIndex++;

		if (currentCardIndex >= dueCards.length) {
			currentCardIndex = 0;
		}
	}

	// Initialiser les nouvelles cartes
	$effect(() => {
		flashcards = flashcards.map((card) => {
			if (!card.difficulty) return fsrs.initCard();
			return card;
		});
	});
</script>

<div class="review-container">
	{#if currentCard}
		<div class="stats-bar">
			<span>📊 Révisées: {stats.reviewed}</span>
			<span>✅ Correctes: {stats.correct}</span>
			<span>❌ Incorrectes: {stats.incorrect}</span>
		</div>

		<div class="card">
			<div class="question">
				<h2>Question</h2>
				<p>{currentCard.question}</p>
			</div>

			{#if showAnswer}
				<div class="answer">
					<h2>Réponse</h2>
					<p>{currentCard.answer}</p>

					<div class="grade-buttons">
						<button onclick={() => handleGrade(1)} class="again"> ❌ Échec </button>
						<button onclick={() => handleGrade(2)} class="hard"> 😓 Difficile </button>
						<button onclick={() => handleGrade(3)} class="good"> 👍 Bien </button>
						<button onclick={() => handleGrade(4)} class="easy"> ✨ Facile </button>
					</div>
				</div>
			{:else}
				<button onclick={() => (showAnswer = true)} class="show-answer">
					Afficher la réponse
				</button>
			{/if}

			<!-- Métadonnées de la carte -->
			<div class="card-metadata">
				<p>
					Difficulté: {currentCard.difficulty?.toFixed(1)}/10 | Stabilité: {currentCard.stability?.toFixed(
						1
					)} jours | R: {(fsrs.calculateRetrievability(currentCard) * 100).toFixed(0)}%
				</p>
			</div>
		</div>
	{:else}
		<div class="completed">
			<h2>🎉 Toutes les révisions sont terminées !</h2>
			<p>Revenez demain pour continuer votre apprentissage.</p>
		</div>
	{/if}
</div>

<style>
	.review-container {
		max-width: 700px;
		margin: 0 auto;
		padding: 2rem;
	}

	.stats-bar {
		display: flex;
		justify-content: space-around;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 12px;
		margin-bottom: 2rem;
		font-weight: 600;
	}

	.card {
		background: white;
		border-radius: 16px;
		padding: 2.5rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	}

	.grade-buttons {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-top: 2rem;
	}

	button {
		padding: 1.2rem;
		border: none;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	button:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
	}

	.again {
		background: #e74c3c;
		color: white;
	}
	.hard {
		background: #e67e22;
		color: white;
	}
	.good {
		background: #27ae60;
		color: white;
	}
	.easy {
		background: #3498db;
		color: white;
	}
	.show-answer {
		background: #9b59b6;
		color: white;
		width: 100%;
		margin-top: 2rem;
	}

	.card-metadata {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 2px solid #ecf0f1;
		text-align: center;
		color: #7f8c8d;
		font-size: 0.9rem;
	}

	.completed {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 16px;
	}
</style>
```

---

## 4. Configuration Recommandée {#configuration}

### Paramètres par défaut FSRS-6 (21 paramètres)

Ces paramètres ont été calculés sur plusieurs centaines de millions de révisions de ~10 000 utilisateurs. **Ils sont excellents et suffisent pour 95% des cas d'usage.**

```javascript
const DEFAULT_FSRS_PARAMS = [
	0.212, // w[0]  - Facteur de stabilité initiale 1
	1.2931, // w[1]  - Facteur de stabilité initiale 2
	2.3065, // w[2]  - Facteur de stabilité initiale 3
	8.2956, // w[3]  - Facteur de stabilité initiale 4
	6.4133, // w[4]  - Facteur de difficulté initiale 1
	0.8334, // w[5]  - Facteur de difficulté initiale 2
	3.0194, // w[6]  - Taux de mise à jour de la difficulté
	0.001, // w[7]  - Stabilité minimale
	1.8722, // w[8]  - Taux d'augmentation de la stabilité
	0.1666, // w[9]  - Puissance de déclin de la stabilité
	0.796, // w[10] - Effet de la récupérabilité
	1.4835, // w[11] - Base de stabilité post-échec
	0.0614, // w[12] - Facteur de difficulté post-échec
	0.2629, // w[13] - Puissance de stabilité post-échec
	1.6483, // w[14] - Récupérabilité post-échec
	0.6014, // w[15] - Facteur d'intervalle pour "Hard"
	1.8729, // w[16] - Facteur d'intervalle pour "Easy"
	0.5425, // w[17] - Facteur de révision le même jour 1
	0.0912, // w[18] - Facteur de révision le même jour 2
	0.0658, // w[19] - Puissance de révision le même jour
	0.1542 // w[20] - Facteur additionnel
];
```

### Rétention Désirée

**La rétention désirée est le paramètre le plus important à configurer.**

| Profil                        | Rétention | Description                                   | Cas d'usage                          |
| ----------------------------- | --------- | --------------------------------------------- | ------------------------------------ |
| 😌 **Décontracté**            | 80%       | Moins de révisions, acceptable d'oublier plus | Loisir, découverte                   |
| ⚖️ **Équilibré** (recommandé) | **90%**   | Bon équilibre révisions/rétention             | Études générales, la plupart des cas |
| 🎯 **Performance**            | 95%       | Maximum de rétention, beaucoup de révisions   | Examens importants                   |
| 🏆 **Expert**                 | 97%       | Charge de travail très importante (max)       | Compétitions, ultra-spécialisé       |

**Recommandation : Commencez avec 90%**

### Configuration Complète pour un Contexte Éducatif

```javascript
// fichier: fsrs-config.js

/**
 * Configuration FSRS recommandée pour un contexte éducatif
 */
export const EDUCATIONAL_CONFIG = {
	// Paramètres FSRS-6 (ne pas modifier)
	parameters: [
		0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
		0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542
	],

	// Rétention désirée (ajustable selon le profil)
	desiredRetention: 0.9, // 90% par défaut

	// Paramètre de déclin de la courbe d'oubli
	decay: -0.5,

	// Intervalle maximum en jours (100 ans)
	maximumInterval: 36500,

	// Fuzzing : légère variation aléatoire des intervalles
	enableFuzzing: true,

	// Étapes d'apprentissage (courtes, comme recommandé par FSRS)
	learningSteps: [
		10 * 60 * 1000 // 10 minutes
	],

	// Étapes de ré-apprentissage (après un échec)
	relearningSteps: [
		10 * 60 * 1000 // 10 minutes
	]
};

/**
 * Profils de rétention prédéfinis
 */
export const RETENTION_PROFILES = {
	relaxed: 0.8, // Décontracté
	balanced: 0.9, // Équilibré (recommandé)
	high: 0.95, // Performance
	expert: 0.97 // Expert
};

/**
 * Grades de révision
 */
export const GRADE = {
	AGAIN: 1, // Échec total
	HARD: 2, // Réussi avec grande difficulté
	GOOD: 3, // Réussi après hésitation
	EASY: 4 // Réussi facilement
};

/**
 * États des cartes
 */
export const STATE = {
	NEW: 'new', // Nouvelle carte
	LEARNING: 'learning', // En apprentissage
	REVIEW: 'review', // En révision
	RELEARNING: 'relearning' // Ré-apprentissage après échec
};
```

### Utilisation de la Configuration

```javascript
// fichier: main.js
import { FSRS } from './fsrs.js';
import { EDUCATIONAL_CONFIG, RETENTION_PROFILES } from './fsrs-config.js';

// Initialiser FSRS avec la config éducative
const fsrs = new FSRS(EDUCATIONAL_CONFIG.parameters, EDUCATIONAL_CONFIG.desiredRetention);

// Ou avec un profil différent
const fsrsRelaxed = new FSRS(
	EDUCATIONAL_CONFIG.parameters,
	RETENTION_PROFILES.relaxed // 80%
);

// Créer une nouvelle carte
const card = fsrs.initCard();

// Réviser une carte
const updatedCard = fsrs.reviewCard(card, 3); // Grade "Good"

// Vérifier si une carte est due
if (fsrs.isDue(card)) {
	console.log('Cette carte doit être révisée !');
}
```

---

## Recommandations Finales

### ✅ À Faire

1. **Utiliser les paramètres par défaut** - Ils sont excellents
2. **Laisser les élèves choisir leur rétention** - Entre 80% et 95%
3. **Commencer avec 90%** - Bon équilibre pour la plupart
4. **Garder les étapes d'apprentissage courtes** - 10 minutes maximum
5. **Expliquer les 4 boutons aux élèves** - Again, Hard, Good, Easy

### ❌ À Éviter

1. **Ne PAS modifier manuellement les 21 paramètres** - Utilisez les valeurs par défaut
2. **Ne PAS proposer d'optimisation au début** - Inutile sans données
3. **Ne PAS utiliser des étapes > 1 jour** - FSRS les gère mal
4. **Ne PAS dépasser 97% de rétention** - Charge de travail explosive
5. **Ne PAS descendre sous 70% de rétention** - Démoralisant

### 📊 Métriques à Surveiller

- **Nombre de révisions par jour** - Ajuster la rétention si trop élevé
- **Taux de réussite global** - Devrait correspondre à la rétention cible
- **Cartes en retard** - Si trop nombreuses, baisser la rétention
- **Engagement des élèves** - Ajuster la difficulté si décrochage

---

## Ressources Supplémentaires

- **Documentation officielle** : https://github.com/open-spaced-repetition/fsrs4anki
- **Papiers de recherche** : Voir les publications de Jarrett Ye sur FSRS
- **Communauté** : Forums Anki et discussions GitHub

---

**Note importante** : Les paramètres par défaut FSRS-6 sont basés sur des millions de révisions et fonctionnent excellemment. L'optimisation personnalisée n'apporte qu'un gain marginal (5-10%) et nécessite au minimum 2000 révisions. Pour un contexte éducatif, les paramètres par défaut suffisent amplement.
