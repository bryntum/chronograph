import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { WalkableForwardNode, WalkForwardContext } from "../graph/Node.js"
import { Box } from "../primitives/Box.js"
import { Calculation, CalculationFunction } from "../primitives/Calculation.js"
import { Identifier } from "../primitives/Identifier.js"

//---------------------------------------------------------------------------------------------------------------------
export const LazyQuarkMarker    = Symbol('LazyQuarkMarker')
export type LazyQuarkMarker     = typeof LazyQuarkMarker

//---------------------------------------------------------------------------------------------------------------------
export const PendingQuarkMarker    = Symbol('PendingQuarkMarker')
export type PendingQuarkMarker     = typeof PendingQuarkMarker


//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<WalkableForwardNode & Calculation>>(base : T) =>

class Quark extends base {
    NodeT                   : Quark

    identifier              : Identifier

    outgoingByLabel         : WeakMap<this[ 'LabelT' ], Set<this[ 'NodeT' ]>>   = new WeakMap()


    get calculation () : CalculationFunction {
        return this.identifier.calculation
    }


    get calculationContext () : any {
        return this.identifier.calculationContext
    }


    hasEdgeTo (toNode : this[ 'NodeT' ]) : boolean {
        throw new Error("Not implemented")
    }


    getLabelTo (toNode : this[ 'NodeT' ]) : this[ 'LabelT' ] {
        throw new Error("Not implemented")
    }


    removeEdgeTo (toNode : this[ 'NodeT' ]) {
        throw new Error("Not implemented")
    }


    forEachOutgoing (context : WalkForwardContext, func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        throw new Error("Not implemented")
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


export class MinimalQuark extends Quark(Calculation(Box(WalkableForwardNode(Base)))) {
    NodeT               : Quark
}


//---------------------------------------------------------------------------------------------------------------------
export class TombstoneQuark extends MinimalQuark {
    NodeT               : TombstoneQuark


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null, calledFromPartner? : boolean) {
        throw new Error("Can not add edges from tombstone node")
    }


    addEdgeFrom (fromNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null, calledFromPartner? : boolean) {
        throw new Error("Can not add edges to tombstone node")
    }


    get value () {
        throw new Error("Can not read the value from the tombstone quark")
    }


    isCalculationStarted () : boolean {
        return true
    }


    isCalculationCompleted () : boolean {
        return true
    }


    hasValue () : boolean {
        return false
    }
}
