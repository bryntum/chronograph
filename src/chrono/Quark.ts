import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { prototypeValue } from "../util/Helpers.js"
import { Identifier, ImpureCalculatedValueGen } from "./Identifier.js"
import { LazyQuarkMarker } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<object>>(base : T) =>

class Quark extends base {
    LabelT                  : any

    // we may not need this property in the quark itself, since it always presence in the context of the quark
    // (like the key of the map)
    identifier              : Identifier

    outgoingByLabel         : WeakMap<this[ 'LabelT' ], Set<Quark>>   = new WeakMap()

    value                   : any


    hasValue () : boolean {
        return this.value !== undefined
    }


    forEachOutgoingInDimension (latest : Map<Identifier, Quark | LazyQuarkMarker>, dimensions : this[ 'LabelT' ][], func : (label : this[ 'LabelT' ], node : Quark) => any) {
        for (let i = 0; i < dimensions.length; i++) {
            const dimension             = dimensions[ i ]

            const outgoingOfDimension   = this.outgoingByLabel.get(dimension)

            if (outgoingOfDimension)
                for (const outgoingNode of outgoingOfDimension)
                    if (outgoingNode === latest.get(outgoingNode.identifier)) func(undefined, outgoingNode)
        }
    }


    addEdgeTo (toNode : Quark, label : this[ 'LabelT' ] = null) {
        let dimension           = this.outgoingByLabel.get(label)

        if (!dimension) {
            dimension           = new Set()
            this.outgoingByLabel.set(label, dimension)
        }

        dimension.add(toNode)
    }
}

export type Quark = Mixin<typeof Quark>

export interface QuarkI extends Quark {}


export class MinimalQuark extends Quark(Base) {}


//---------------------------------------------------------------------------------------------------------------------
let GEN = 0

export class UserInputQuark extends MinimalQuark {
    value               : any[]

    generation          : number    = GEN++
}


//---------------------------------------------------------------------------------------------------------------------
export class ImpureCalculatedQuark extends MinimalQuark {
    identifier          : ImpureCalculatedValueGen

    // TODO move to transition
    @prototypeValue(false)
    usedProposed        : boolean
}


//---------------------------------------------------------------------------------------------------------------------
export class TombstoneQuark extends MinimalQuark {

    addEdgeTo (toNode : Quark, label : this[ 'LabelT' ] = null) {
        throw new Error("Can not add edges from tombstone node")
    }


    get value () {
        throw new Error("Can not read the value from the tombstone quark")
    }


    hasValue () : boolean {
        return true
    }
}
