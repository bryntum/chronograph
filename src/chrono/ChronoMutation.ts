import {Base} from "../util/Mixin.js";
import {ChronoAtom} from "./ChronoAtom.js";

//
// export class ChronoAtomMutationSource extends ChronoAtom {
//     sourceFor           : ChronoMutation
// }




export class ChronoMutation extends Base {
    inputs          : { [s : string] : ChronoAtom }

    as              : ChronoAtom[]

    calculate       : () => any


    runCalculation () {

    }
}

