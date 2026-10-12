/**
 * Périmètre de la garde « code modifié ⇒ doc modifiée » (scripts/check-doc-a-jour.ts).
 *
 * - `scope` : le code dont la doc doit suivre les changements.
 * - `excluded` : jamais soumis (tests, généré, non-code).
 * - `trous` : zones de code connues SANS doc système. Chaque entrée est une dette
 *   nommée : la retirer quand la doc est écrite (et lui ajouter le `couvre:`).
 */

import type { CoverageConfig } from './check-doc-a-jour';

export const COVERAGE_CONFIG: CoverageConfig = {
	scope: [
		'src/lib/**',
		'src/routes/**',
		'src/hooks*.ts',
		'src/app.*',
		'supabase/migrations/**',
		// Environnement de dev (2026-10-11) : la carte docs/pratiques/environnement-de-dev.md
		// doit suivre la CI, les hooks, Vercel et les scripts d'outillage, sinon elle
		// ment au premier changement. Liste EXPLICITE, pas `scripts/**` : la plupart
		// des scripts sont des outils ponctuels sans rapport avec l'environnement.
		// Ni package.json ni pnpm-lock.yaml : Dependabot les touche à chaque montée de
		// version, la doc deviendrait un frein sans rien dire de neuf.
		'.github/workflows/**',
		'.github/dependabot.yml',
		'.husky/*',
		'.lintstagedrc.js',
		'vercel.json',
		'svelte.config.js',
		'vite.config.ts',
		'.nvmrc',
		'.claude/settings.json',
		'.claude/hooks/**',
		'scripts/gros-process.sh',
		'scripts/check-incremental.sh',
		'scripts/cliquet-types-tests.ts',
		'scripts/deploy-prod.sh',
		'scripts/release.ts',
		'scripts/lint-fast.sh',
		'scripts/with-db-lock.sh',
		'scripts/ci-version-seule.sh',
		'scripts/vercel-ignore-build.sh',
		'scripts/releve-web-vitals.ts',
		'scripts/check-production-health.ts'
	],
	excluded: [
		'**/__tests__/**',
		'**/*.test.*',
		'**/*.spec.*',
		'src/lib/types/database.ts',
		'**/*.md',
		'**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,otf,mp3,wav,ogg}'
	],
	// Zones de code sans doc, une `note` par zone (affichée par la règle « doc d'abord »).
	// Retirer une zone quand sa doc est écrite (et lui donner son `couvre:`) : `--couverture`
	// échoue sur un trou périmé. Ordre : un fichier appartient au PREMIER trou qui le
	// désigne, un glob précis passe donc avant le glob large qui le contient.
	trous: [
		{
			glob: 'src/lib/components/templates/{FiltersHelp,TagsInput,VariableAutocomplete}.svelte',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/routes/(protected)/dashboard/teacher/contenu/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/server/validation/latex.ts',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/api/latex/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/resources/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/components/{QuestionTemplateCard,QuestionPreview*,QuestionCategoryFields,QuestionTemplateHelpDialogs,CategorySelector,TagBadgeSelector,GradeBadgeSelector,CartFloatingButton,CartQuestionCard,DisplayOptionsEditor,ValidationOptionsEditor,PrecisionEditor,VariableEditor,AnswerEditor,CourseQuestionToggle}.svelte',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/stores/{questionCart,questionCategories,questionTemplates,exerciseFont}.svelte.ts',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/api/teacher/categories/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/templates/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/(protected)/messages/**',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/routes/api/{messages,moderation,notifications,warnings}/**',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/routes/api/{student,classes,students}/*/warnings/**',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/routes/api/student/warnings/**',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/lib/components/{moderation,notifications,student-inbox}/**',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/lib/components/{AddFriend,FriendRequests,FriendsList,OnlineStatus}.svelte',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/lib/stores/{privateMessages,notifications,messageTemplates,mentions,hashtags}.svelte.ts',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/lib/server/{notifications,auto-notifications,warnings,student-inbox,profanity-filter}.ts',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/lib/server/validation/{messages,moderation,notifications,warnings,message-templates}.ts',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/lib/types/{notification,warnings,messageTemplates,student-inbox}.ts',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/lib/utils/{notification-formatters,sanitize-notification}.ts',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/routes/(protected)/dashboard/{teacher,admin}/{moderation,notifications,message-templates,friendships}/**',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{
			glob: 'src/routes/(protected)/dashboard/notifications/**',
			note: 'messagerie, modération, notifications, avertissements, amitiés'
		},
		{ glob: 'src/routes/api/admin/**', note: 'classes, élèves, écoles, comptes (admin et prof)' },
		{
			glob: 'src/routes/api/{classes,students}/**',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/routes/api/teacher/{classes,send-welcome-email}/**',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/routes/api/student/{profile,age-declaration}/**',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/routes/(protected)/dashboard/admin/{classes,schools,users,import-students,settings,backup}/**',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/routes/(protected)/dashboard/teacher/{classes,students,welcome-email,settings}/**',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/routes/(protected)/dashboard/profile/**',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/lib/server/{students,staff-directory}.ts',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/lib/server/validation/{classes,schools,school-config,admin,backup}.ts',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/lib/components/admin/**',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{ glob: 'src/lib/server/admin/**', note: 'classes, élèves, écoles, comptes (admin et prof)' },
		{
			glob: 'src/lib/email-templates/welcome.ts',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/lib/utils/{age-declaration,timezones}.ts',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/lib/components/AgeQuestionDialog.svelte',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/lib/components/MyPasswordInput.svelte',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/lib/utils/passwordStrength.ts',
			note: 'classes, élèves, écoles, comptes (admin et prof)'
		},
		{
			glob: 'src/routes/api/{errors,bug-reports,health,search,openapi.json}/**',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/routes/(protected)/dashboard/admin/{errors,bug-reports,docs,debug}/**',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/routes/(protected)/dashboard/bug-reports/**',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/lib/components/bug-reports/**',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/lib/utils/{errorMonitoring,freezeDetection,errors,version}.ts',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/lib/stores/bugReportsConfig.svelte.ts',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/lib/types/bug-reports.ts',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/lib/server/{errorMonitoring,healthStats,bug-report-export,bug-report-screenshots,docs-scanner,markdown-parser,search}.ts',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/lib/server/validation/{errors,bug-reports,health,search}.ts',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/lib/server/openapi/**',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{
			glob: 'src/routes/(public)/api-docs/**',
			note: 'surveillance d’erreurs, bug reports, santé, docs admin'
		},
		{ glob: 'src/lib/migration/*.ts', note: 'migration des anciennes questions (TinyMath)' },
		{ glob: 'src/lib/server/migration/**', note: 'migration des anciennes questions (TinyMath)' },
		{
			glob: 'src/lib/components/migration/**',
			note: 'migration des anciennes questions (TinyMath)'
		},
		{ glob: 'src/routes/api/migration/**', note: 'migration des anciennes questions (TinyMath)' },
		{
			glob: 'src/routes/(protected)/dashboard/admin/migration/**',
			note: 'migration des anciennes questions (TinyMath)'
		},
		{
			glob: 'src/lib/server/validation/migration*.ts',
			note: 'migration des anciennes questions (TinyMath)'
		},
		{ glob: 'src/lib/types/migration.ts', note: 'migration des anciennes questions (TinyMath)' },
		{ glob: 'src/lib/transpilers/**', note: 'migration des anciennes questions (TinyMath)' },
		{ glob: 'src/lib/shared/blockly/**', note: 'Blockly, calculatrice, REPL /cas' },
		{ glob: 'src/lib/components/blockly/**', note: 'Blockly, calculatrice, REPL /cas' },
		{
			glob: 'src/lib/stores/{blocklyPlayground,calculator,repl}.svelte.ts',
			note: 'Blockly, calculatrice, REPL /cas'
		},
		{ glob: 'src/routes/(public)/blockly/**', note: 'Blockly, calculatrice, REPL /cas' },
		{ glob: 'src/lib/workers/js-sandbox.worker.ts', note: 'Blockly, calculatrice, REPL /cas' },
		{ glob: 'src/lib/components/{calculator,cas}/**', note: 'Blockly, calculatrice, REPL /cas' },
		{ glob: 'src/routes/(protected)/calculatrice/**', note: 'Blockly, calculatrice, REPL /cas' },
		{
			glob: 'src/routes/(protected)/organisation/**',
			note: 'organisation (pomodoro), documents prof'
		},
		{ glob: 'src/lib/stores/pomodoro/**', note: 'organisation (pomodoro), documents prof' },
		{ glob: 'src/routes/api/documents/**', note: 'organisation (pomodoro), documents prof' },
		{ glob: 'src/lib/components/documents/**', note: 'organisation (pomodoro), documents prof' },
		{ glob: 'src/lib/server/documents/**', note: 'organisation (pomodoro), documents prof' },
		{
			glob: 'src/lib/server/validation/documents.ts',
			note: 'organisation (pomodoro), documents prof'
		}
	]
};
