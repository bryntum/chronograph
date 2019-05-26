import { Base } from "../class/Mixin.js"
// import { ChronoAtom } from "./Atom.js"


export type EffectResolverFunction  = (effect : Effect) => Promise<EffectResolutionResult>


//---------------------------------------------------------------------------------------------------------------------
export enum EffectResolutionResult {
    Cancel,
    Restart,
    Resume
}


//---------------------------------------------------------------------------------------------------------------------
export class Effect extends Base {
}


//---------------------------------------------------------------------------------------------------------------------
export class CancelPropagationEffect extends Effect {
    description         : string
}


//---------------------------------------------------------------------------------------------------------------------
export class RestartPropagationEffect extends Effect {
    description         : string
}

//---------------------------------------------------------------------------------------------------------------------
export class GraphCycleDetectedEffect extends Effect {
    // cycle               : ChronoAtom[]
}

export const isEffect = (value : any) : value is Effect => value instanceof Effect


//---------------------------------------------------------------------------------------------------------------------
export const NotChanged     = Symbol('NotChanged')

export type NotChanged      = typeof NotChanged


//---------------------------------------------------------------------------------------------------------------------
export class InputMarker extends Base {
    // atom            : ChronoAtom
}
