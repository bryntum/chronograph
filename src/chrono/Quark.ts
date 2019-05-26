import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { MinimalNode, Node } from "../graph/Node.js"
import { Box } from "../primitives/Box.js"
import { Calculation } from "../primitives/Calculation.js"

//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
}


//---------------------------------------------------------------------------------------------------------------------
export class Variable extends Identifier {

    write (...args : any[]) : Quark {
        return MinimalQuark.new({
            // identifier          : this,
            //
            // iterator            : true,
            // iterationResult     : { value : args, done : true }
        })
    }
}

//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<Node & Calculation>>(base : T) =>

class Quark extends base {
    identifier          : Identifier

    NodeT               : Quark
}

export type Quark = Mixin<typeof Quark>

export interface QuarkI extends Mixin<typeof Quark> {
    NodeT               : Quark
}

export class MinimalQuark extends Quark(Calculation(Box(MinimalNode))) {
    NodeT               : Quark
}


// //---------------------------------------------------------------------------------------------------------------------
// export const Snapshot = <T extends AnyConstructor<object>>(base : T) =>
//
// class Snapshot extends base {
//     CurrentT            : Node
//
//     graph               : ReplaceTypeOfProperty<Graph, 'NodeT', this[ 'CurrentT' ]>
//
//     current             : this[ 'CurrentT' ]
// }
//
// export type Snapshot = Mixin<typeof Snapshot>
//
//
//
//
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Quark = <T extends AnyConstructor<Node & ChronoCalculation>>(base : T) =>
//
// class Quark extends base {
//     NodeT               : Quark
//
//     revision            : ChronoRevision
//
//     observe () {
//
//     }
// }
//
// export type Quark = Mixin<typeof Quark>
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const ChronoAtom = <T extends AnyConstructor<Box & Snapshot>>(base : T) =>
//
// class ChronoAtom extends base {
//     CurrentT            : Quark
//
//     equality            : (v1, v2) => boolean       //= strictEqualityWithDates
//
//     calculationContext  : any
//
//
//     get value () : this[ 'ValueT' ] {
//         const quark     = this.current
//
//         return quark && quark.isCalculationCompleted() ? quark.value : undefined
//     }
//
//
//     * calculation () : CalculationIterator<this[ 'ValueT' ]> {
//         throw new Error("Abstract method `calculation` called")
//     }
//
//
//     getCalculationQuark () : Quark {
//         return MinimalQuark.new({
//             graph               : this,
//
//             calculation         : this.calculation,
//             calculationContext  : this.calculationContext || this
//         })
//     }
//
//
//     onEnterGraph (graph : ChronoGraphI) {
//         this.graph      = graph
//
//         delete this.putData
//     }
//
//
//     propagateSync (context : PropagationContext) : PropagationResult {
//         this.activeTransaction.runSyncWithEffect(context.onEffect)
//
//         this.applyTransaction(this.activeTransaction)
//
//         return PropagationResult.Completed
//     }
//
//
//     async propagateAsync (context : AsyncPropagationContext) : Promise<PropagationResult> {
//         await this.activeTransaction.runAsyncWithEffect(context.onEffect)
//
//         this.applyTransaction(this.activeTransaction)
//
//         return PropagationResult.Completed
//     }
// }
//
// export type ChronoAtom = Mixin<typeof ChronoAtom>
// export interface ChronoAtomI extends Mixin<typeof ChronoAtom> {
//     NodeT       : Quark
// }
//
//
// export const isChronoAtom = (value : any) : value is ChronoAtom => Boolean(value && value[ isChronoAtomSymbol ])
//
// //---------------------------------------------------------------------------------------------------------------------
// export class MinimalChronoAtom extends ChronoAtom(HasId(Box(MinimalNode))) {
//     NodeT           : Quark
//     LabelT          : any
// }
