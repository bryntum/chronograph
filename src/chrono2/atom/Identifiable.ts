//---------------------------------------------------------------------------------------------------------------------
export type ChronoReference = number

let CHRONO_ID : number = 0

export const chronoId = () => CHRONO_ID++


//---------------------------------------------------------------------------------------------------------------------
export interface Identifiable {
    id          : ChronoReference
}