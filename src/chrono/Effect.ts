import {Base} from "../class/Mixin.js";


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
