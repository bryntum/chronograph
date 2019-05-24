//---------------------------------------------------------------------------------------------------------------------
export type ChronoId        = string | number

let ID : number = 1

export const chronoId = () : ChronoId => `chrono${ID++}`
