//---------------------------------------------------------------------------------------------------------------------
export type ChronoId        = string | number

let ATOM_ID : number = 1

export const chronoId = () : ChronoId => `chrono${ATOM_ID++}`
