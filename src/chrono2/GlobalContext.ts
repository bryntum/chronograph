import { Base } from "../class/Base.js"
import { LeveledQueue } from "../util/LeveledQueue2.js"
import { Atom } from "./atom/Atom.js"
import { Effect, ProposedOrPreviousSymbol } from "./Effect.js"

//---------------------------------------------------------------------------------------------------------------------
// TODO Global context should be just an anonymous instance of ChronoGraph
export class GlobalContext extends Base {

    activeAtom              : Atom                  = undefined

    // old comment:
    // move to Transaction? by definition, transaction ends when the stack is exhausted
    // (all strict effects observed)
    // instead moved to global context to have shared stack among graph/non-graph atoms
    // this might change in the future -
    // stack should be
    stack                   : LeveledQueue<Atom>    = new LeveledQueue()


    onEffectSync (effect : Effect) {
        if (effect instanceof Atom) return effect.read()

        if (effect instanceof Promise) {
            throw new Error("Can not yield a promise in the synchronous context")
        }

        return globalContext[ effect.handler ](effect)
    }


    onEffectAsync (effect : Effect) {
        if (effect instanceof Atom) return effect.readAsync()

        if (effect instanceof Promise) return effect

        return globalContext[ effect.handler ](effect)
    }


    [ProposedOrPreviousSymbol] (effect : Effect) : unknown {
        return globalContext.activeAtom.readProposedOrPrevious()
    }
}

export const globalContext = GlobalContext.new()
