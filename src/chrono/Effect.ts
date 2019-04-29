import { Base } from "../class/Mixin.js"
import { Node } from "../graph/Node.js"


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
    cycle               : Node[]
}
