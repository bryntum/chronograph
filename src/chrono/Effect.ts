import { Base } from "../class/Mixin.js"
import { Node } from "../graph/Node.js"
import { PropagationState } from "./Graph.js"


export type EffectResolverFunction  = (effect : Effect) => Promise<EffectResolutionResult>


//---------------------------------------------------------------------------------------------------------------------
export enum EffectResolutionResult {
    Cancel,
    Restart,
    Resume
}


//---------------------------------------------------------------------------------------------------------------------
export class Effect extends Base {
    propagationState?   : PropagationState
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
    cycle               : Node[]
}

export const isEffect = (value : any) : value is Effect => value instanceof Effect
