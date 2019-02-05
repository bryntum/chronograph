import {Base} from "../class/Mixin.js";


//---------------------------------------------------------------------------------------------------------------------
export enum ConflictResolutionResult {
    Cancel,
    Restart,
    Resume
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
export class Conflict extends Base {
    description         : string

    resolutions         : ConflictResolution[]
}
