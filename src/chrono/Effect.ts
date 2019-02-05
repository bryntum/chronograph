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
export class ConflictResolution extends Base {

    getDescription () : string {
        throw new Error('Abstract method')
    }

    resolve () {
        throw new Error('Abstract method')
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Conflict extends Effect {
    description         : string

    resolutions         : ConflictResolution[]
}
