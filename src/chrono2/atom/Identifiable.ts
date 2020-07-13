//---------------------------------------------------------------------------------------------------------------------
export type ChronoReference = string | number

let CHRONO_REFERENCE : number = 0

export const chronoReference = () => CHRONO_REFERENCE++


//---------------------------------------------------------------------------------------------------------------------
export interface Identifiable {
    id          : ChronoReference
}
