import { Base } from "../../class/Base.js"
import { Atom } from "../atom/Atom.js"

//---------------------------------------------------------------------------------------------------------------------
// TODO figure out a mechanism to include the source line location into cycle
// something like:
// Cyclic read detected:
// - box1 on line 97 char 11 SourceFile2.js
// - box2 on line 78 char 12 SourceFile1.js
// - box1 on line 11 char 8 SourceFile2.js

export class ComputationCycle extends Base {
    cycle           : Atom[]

    toString () : string {

        return this.cycle.map(atom => {
            return atom.name
        }).join('\n')
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class ComputationCycleError extends Error {
    cycle       : ComputationCycle
}
