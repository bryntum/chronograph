import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { prototypeValue } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { QuarkTransition } from "./QuarkTransition.js"


export const Quark = <T extends AnyConstructor<Base>>(base : T) => {

    class Quark extends base {
        generation          : number

        identifier          : Identifier

        value               : any
        proposedValue       : any

        outgoing            : Set<Quark>
        transition          : QuarkTransition

        @prototypeValue(false)
        usedProposedOrCurrent : boolean

        // these 2 are not used for QuarkEntry and are here only to simplify the typings for WalkContext
        // TODO fix WalkContext typings and remove
        visitedAt : number
        visitedTopologically : boolean


        getTransition () : QuarkTransition {
            if (this.transition) return this.transition

            return this.transition = this.identifier.transitionClass.new({
                quark           : this,
                previous        : null,

                edgesFlow       : 0,

                visitedAt               : -1,
                visitedTopologically    : false
            })
        }


        getOutgoing () : Set<Quark> {
            if (this.outgoing) return this.outgoing

            return this.outgoing = new Set()
        }


        hasValue () : boolean {
            return this.value !== undefined
        }
    }

    return Quark
}

export type Quark = Mixin<typeof Quark>

export interface QuarkI extends Quark {}


export type QuarkConstructor = MixinConstructor<typeof Quark>


export class MinimalQuark extends Quark(Base) {}


//---------------------------------------------------------------------------------------------------------------------
export const Tombstone      = Symbol('Tombstone')
