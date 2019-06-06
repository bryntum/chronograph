import { WalkContext } from "../graph/Walkable.js"
import { isAtomicValue } from "./Helper.js"

//---------------------------------------------------------------------------------------------------------------------
export class WalkJsonContext extends WalkContext<any, string | symbol> {

    forEachNext (node : any, func : (label : string | symbol, node : any) => any) {

        if (isAtomicValue(node)) {

        } else {

        }
    }
}
