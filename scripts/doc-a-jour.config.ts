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
	scope: ['src/lib/**', 'src/routes/**', 'src/hooks*.ts', 'src/app.*', 'supabase/migrations/**'],
	excluded: [
		'**/__tests__/**',
		'**/*.test.*',
		'**/*.spec.*',
		'src/lib/types/database.ts',
		'**/*.md',
		'**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,otf,mp3,wav,ogg}'
	],
	// Relevé du 2026-10-10 : 763 fichiers sans doc, en 11 zones + divers.
	// Retirer une zone quand sa doc est écrite (et lui donner son `couvre:`).
	trous: [
		{
			glob: 'src/lib/server/{chapter*,chapters*,class-sessions,curriculum*,journal*}.ts',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/lib/server/validation/{chapter*,chapters,curriculum,journal,academic}.ts',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/lib/components/{cours,journal,templates,progression}/**',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/lib/types/{chapter*,chapters,journal,academic_periods_types}.ts',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/lib/utils/{academic-period,class-sessions,schedule,timetable,week-config,timeMatching}.ts',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/routes/api/teacher/{chapters,chapter-templates,curriculum,periods}/**',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/routes/api/student/{chapters,checklist}/**',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/routes/(protected)/dashboard/{teacher,student}/{cours,cahier-texte,avancement,programme,journal,progression}/**',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/routes/(public)/cahier/**',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/lib/server/progression/**',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/lib/components/{ClassScheduleGrid,ScheduleEntryModal}.svelte',
			note: 'chapitres, cours, cahier de texte, programme prof'
		},
		{
			glob: 'src/routes/(protected)/dashboard/{teacher,student}/{assessments,evaluation-tasks,presques-evaluations,competences,work,reports}/**',
			note: 'évaluations, séries notées, tests'
		},
		{
			glob: 'src/routes/api/{evaluations,tests,test-mode,series}/**',
			note: 'évaluations, séries notées, tests'
		},
		{ glob: 'src/routes/api/student/reports/**', note: 'évaluations, séries notées, tests' },
		{
			glob: 'src/lib/components/{test,assessments,series}/**',
			note: 'évaluations, séries notées, tests'
		},
		{
			glob: 'src/lib/server/validation/{evaluations,tests,parody-evaluations,grades}.ts',
			note: 'évaluations, séries notées, tests'
		},
		{
			glob: 'src/lib/types/{evaluation*,test,grades,skills}.ts',
			note: 'évaluations, séries notées, tests'
		},
		{
			glob: 'src/lib/utils/{test-launch,test-score,grades}.ts',
			note: 'évaluations, séries notées, tests'
		},
		{ glob: 'src/lib/stores/test-mode.svelte.ts', note: 'évaluations, séries notées, tests' },
		{
			glob: 'src/routes/(public)/presques-evaluations/**',
			note: 'évaluations, séries notées, tests'
		},
		{
			glob: 'src/lib/components/teacher/TestModeToggle.svelte',
			note: 'évaluations, séries notées, tests'
		},
		{
			glob: 'src/routes/api/exercises/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/api/student/exercise-mastery/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/api/teacher/exercises/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/api/admin/exercises/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/(protected)/dashboard/teacher/contenu/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/(protected)/dashboard/student/exercises/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/(public)/exercice/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/components/exercises/**',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/server/validation/{exercises,exercise-mastery,image-upload,tags,latex}.ts',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/lib/types/exercise-*.ts',
			note: 'exercices (table exercises : éditeur, partage, maîtrise)'
		},
		{
			glob: 'src/routes/api/{tags,latex}/**',
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
		{ glob: 'src/lib/server/{tutor,rag}/**', note: 'tuteur IA (Groq, RAG)' },
		{ glob: 'src/lib/config/tutor-*.ts', note: 'tuteur IA (Groq, RAG)' },
		{ glob: 'src/lib/components/tutor/**', note: 'tuteur IA (Groq, RAG)' },
		{ glob: 'src/routes/api/tutor/**', note: 'tuteur IA (Groq, RAG)' },
		{ glob: 'src/routes/(protected)/tuteur/**', note: 'tuteur IA (Groq, RAG)' },
		{ glob: 'src/routes/(protected)/dashboard/tutor-stats/**', note: 'tuteur IA (Groq, RAG)' },
		{ glob: 'src/lib/components/ChatBot.svelte', note: 'tuteur IA (Groq, RAG)' },
		{
			glob: 'src/routes/+layout.svelte',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/routes/(protected)/+layout.svelte',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/routes/(protected)/dashboard/*',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/routes/(protected)/dashboard/{admin,student,teacher}/*',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/lib/components/{Header,Sidebar,InfoPanel,LoadingDashboard,LoadingTable,ExerciseSkeleton,FlipCard,FontSelector,Wheel}.svelte',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/lib/components/{navigation,skeleton,modals}/**',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/lib/config/dashboard-nav.ts',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/lib/stores/{studentDashboardCache,teacherDashboardCache,selectedClass,selectedPeriod,activity,activityStore,mobile,modalStack,input-capability,auth}.svelte.ts',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/lib/types/{student-cache,teacher-cache,cache-context}.ts',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/lib/utils/cache-sync.ts',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/routes/(protected)/dashboard/teacher/{wheel,recherche,documents}/**',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
		},
		{
			glob: 'src/routes/(public)/+page.svelte',
			note: 'tableaux de bord, coquille de l’app, navigation, caches'
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
		},
		{
			glob: 'src/lib/components/ClassStatsCard.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/CodeViewer.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/DynamicMathField.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/JsonViewer.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/LaTeXEditor.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/LoggerDemo.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/MathField.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/ToastDemo.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/ImageGalleryModal.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/MarkdownCodeEditor.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/RestrictedRichText.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/config.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/editor-config.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/markdown-detection.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/markdown-paste-extension.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/rich-text/types.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/components/teacher/StudentQuickActionsTable.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/config/curriculum-levels.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/constants/deadlines.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/index.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/seo/JsonLd.svelte', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/seo/SeoHead.svelte', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/seo/site.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/seo/sitemap-pages.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/stores/listNumbering.svelte.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/styles/list-numbering.css',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/supabase-test.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/supabaseClient.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/transitions/slide-transition.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/types/list-numbering.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/utils.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/utils/auth.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/utils/avatar.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/utils/dates.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/utils/file-upload.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/utils/filename.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/utils/footer.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/utils/format.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/utils/fractional-indexing.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/utils/french-math.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/utils/html-escape.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/lib/utils/latex-syntax-adapter.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/utils/markdown.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/utils/mathlive-fonts.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/utils/reorder.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/utils/sanitize-configs.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/utils/sanitize.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/utils/search.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/utils/skeleton-detector.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{ glob: 'src/lib/utils/storage.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{ glob: 'src/lib/utils/string.ts', note: 'divers (utilitaires, démos, SEO, éditeur riche)' },
		{
			glob: 'src/lib/utils/worksheet-constants.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(protected)/test-exercises/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/a-propos/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/demo/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/demo/+page.ts',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/demo/question-display-demo/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/demo/rich-text-editor-demo/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/demo/theme-test/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/demo/trig-circle-demo/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/pere-ubu/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/test-font/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		},
		{
			glob: 'src/routes/(public)/upsilon/+page.svelte',
			note: 'divers (utilitaires, démos, SEO, éditeur riche)'
		}
	]
};
