//---------------------------------------------------------------------------------------------------------------------
export type ChronoId = string | number

let CHRONO_ID : number = 0

export const chronoId = () => CHRONO_ID++
