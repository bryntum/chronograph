import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Identifier } from "../primitives/Identifier.js"
import { LazyQuarkMarker } from "./CalculationCore.js"


//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<object>>(base : T) =>

class Quark extends base {
    NodeT                   : Quark
    LabelT                  : any

    // we may not need this property in the quark itself, since its always presence in the context of the quark
    // (like the key of the map)
    identifier              : Identifier

    outgoingByLabel         : WeakMap<this[ 'LabelT' ], Set<this[ 'NodeT' ]>>   = new WeakMap()

    value                   : any


    hasValue () : boolean {
        return this.value !== undefined
    }


    forEachOutgoingInDimension (latest : Map<Identifier, Quark | LazyQuarkMarker>, dimensions : this[ 'LabelT' ][], func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        for (let i = 0; i < dimensions.length; i++) {
            const dimension             = dimensions[ i ]

            const outgoingOfDimension   = this.outgoingByLabel.get(dimension)

            if (outgoingOfDimension)
                for (const outgoingNode of outgoingOfDimension)
                    if (outgoingNode === latest.get(outgoingNode.identifier)) func(undefined, outgoingNode)
        }
    }


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
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


export class MinimalQuark extends Quark(Base) {
    NodeT               : Quark
}


//---------------------------------------------------------------------------------------------------------------------
export class ImpureQuark extends MinimalQuark {
    proposedArgs        : any[]

    usedProposed        : boolean   = false
}


//---------------------------------------------------------------------------------------------------------------------
export class TombstoneQuark extends MinimalQuark {
    NodeT               : TombstoneQuark


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null, calledFromPartner? : boolean) {
        throw new Error("Can not add edges from tombstone node")
    }


    get value () {
        throw new Error("Can not read the value from the tombstone quark")
    }


    hasValue () : boolean {
        return true
    }
}
