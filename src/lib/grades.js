const makeGrade = (name, father) => {
    return {
        name,
        father
    }
}

export const CP = 'cp'
export const CE1 = 'ce1'
export const CE2 = 'ce2'
export const CM1 = 'cm1'
export const CM2 = 'cm2'
export const SIXIEME = '6ème'
export const CINQUIEME = '5ème'
export const QUATRIEME = '4ème'
export const TROISIEME = '3ème'
export const SECONDE = '2nde'
export const PREMIERE_SPE_MATHS = '1ère spé Maths'
export const PREMIERE_STMG = '1ère STMG'
export const PREMIERE_GENERALE = '1ère générale'
export const TERMINALE_GENERALE = 'Tale générale'
export const TERMINALE_STMG = 'Tale STMG'
export const TERMINALE_SPE_MATHS = 'Tale spé Maths'
export const MATHS_COMPLEMENTAIRES = 'Maths Complémentaires'
export const MATHS_EXPERTES = 'Maths Expertes'

export const grades = [
    CP,
    CE1,
    CE2,
    CM1,
    CM2,
    SIXIEME,
    CINQUIEME,
    QUATRIEME,
    TROISIEME,
    SECONDE,
    PREMIERE_SPE_MATHS,
    PREMIERE_STMG,
    PREMIERE_GENERALE,
    TERMINALE_GENERALE,
    TERMINALE_SPE_MATHS,
    TERMINALE_STMG,
    MATHS_COMPLEMENTAIRES,
    MATHS_EXPERTES
]
const cp = makeGrade(CP, null)
const ce1 = makeGrade(CE1, cp)
const ce2 = makeGrade(CE2, ce1)
const cm1 = makeGrade(CM1, ce2)
const cm2 = makeGrade(CM2, cm1)
const sixieme = makeGrade(SIXIEME, cm2)
const cinquieme = makeGrade(CINQUIEME, sixieme)
const quatrieme = makeGrade(QUATRIEME, cinquieme)
const troisieme = makeGrade(TROISIEME, quatrieme)
const seconde = makeGrade(SECONDE, troisieme)
const premiereSpe = makeGrade(PREMIERE_SPE_MATHS, seconde)
const premiereSTMG = makeGrade(PREMIERE_STMG, seconde)
const premiereGenerale = makeGrade(PREMIERE_GENERALE, seconde)
const terminaleGenerale = makeGrade(TERMINALE_GENERALE, premiereGenerale)
const terminaleSTMG = makeGrade(TERMINALE_STMG, premiereSTMG)
const terminaleSpe = makeGrade(TERMINALE_SPE_MATHS, premiereSpe)
const mathsComplementaires = makeGrade(MATHS_COMPLEMENTAIRES, premiereSpe)
const mathsExpertes = makeGrade(MATHS_EXPERTES, terminaleSpe)




export function gradeMatchesClass(gradeQuestion, gradeClass) {

    const grades = {
        [CP]: cp,
        [CE1]: ce1,
        [CE2]: ce2,
        [CM1]: cm1,
        [CM2]: cm2,
        [SIXIEME]: sixieme,
        [CINQUIEME]: cinquieme,
        [QUATRIEME]: quatrieme,
        [TROISIEME]: troisieme,
        [SECONDE]: seconde,
        [PREMIERE_GENERALE]: premiereGenerale,
        [PREMIERE_SPE_MATHS]: premiereSpe,
        [PREMIERE_STMG]: premiereSTMG,
        [TERMINALE_GENERALE]: terminaleGenerale,
        [TERMINALE_SPE_MATHS]: terminaleSpe,
        [TERMINALE_STMG]: terminaleSTMG,
        [MATHS_COMPLEMENTAIRES]: mathsComplementaires,
        [MATHS_EXPERTES]: mathsExpertes,
    }
    let grade = grades[gradeClass]

    while (grade && grade.name !== gradeQuestion) {
        grade = grade.father
    }
    return !!grade
}

// export function testGrades() {
//     console.log(CP, ' matches ', CE1, gradeMatchesClass(CP, CE1))
//     console.log(CE1, ' matches ', CP, gradeMatchesClass(CE1, CP))
//     console.log(SECONDE, ' matches ', TERMINALE_SPE_MATHS, gradeMatchesClass(SECONDE, TERMINALE_SPE_MATHS))
//     console.log(PREMIERE_STMG, ' matches ', TERMINALE_SPE_MATHS, gradeMatchesClass(PREMIERE_STMG, TERMINALE_SPE_MATHS))
// }


