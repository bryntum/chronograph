import { Base } from "../class/Base.js"
import { LeveledQueue } from "../util/LeveledQueue.js"
import { Atom } from "./atom/Atom.js"

//---------------------------------------------------------------------------------------------------------------------
export class GlobalContext extends Base {

    activeAtom              : Atom                  = undefined

    // old comment:
    // move to Transaction? by definition, transaction ends when the stack is exhausted
    // (all strict effects observed)
    // instead moved to global context to have shared stack among graph/non-graph atoms
    // this might change in the future -
    // stack should be
    stack                   : LeveledQueue<Atom>    = new LeveledQueue()
}

export const globalContext = GlobalContext.new()
