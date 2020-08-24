import { Base } from "../../class/Base.js"
import { Atom } from "../atom/Atom.js"

//---------------------------------------------------------------------------------------------------------------------
export class ComputationCycle extends Base {
    cycle           : Atom[]

    toString () : string {

        return this.cycle.map(atom => {
            return atom.name

            // //@ts-ignore
            // const sourcePoint : SourceLinePoint      = identifier.SOURCE_POINT
            //
            // if (!sourcePoint) return identifier.name
            //
            // const firstEntry       = sourcePoint.stackEntries[ 0 ]
            //
            // if (firstEntry) {
            //     return `${identifier}\n    yielded at ${firstEntry.sourceFile}:${firstEntry.sourceLine}:${firstEntry.sourceCharPos || ''}`
            // } else
            //     return identifier.name
        }).join('\n')
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class ComputationCycleError extends Error {
    cycle       : ComputationCycle
}
