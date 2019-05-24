import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Node, WalkForwardNodeContext } from "../graph/Node.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/Walkable.js"
import { ChronoAtom, ChronoAtomI, isChronoAtom, Quark, QuarkI } from "./Atom.js"
import { Box } from "./Box.js"
import { ChronoCalculation, ChronoIterator, ChronoValue } from "./Calculation.js"
import { GraphCycleDetectedEffect, InputMarker, NotChanged } from "./Effect.js"
import { RevisionNode } from "./Graph.js"


//---------------------------------------------------------------------------------------------------------------------
export class TransactionPropagation extends Base {
    updatedQuarks           : Map<ChronoAtom, Quark>            = new Map()

    // proposedDataUsed        : Map<ChronoAtom, ChronoValue[]>    = new Map()
}


class TransactionWalkDepthContext extends WalkContext<Transaction | Quark> {}

//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<ChronoCalculation>>(base : T) =>

class Transaction extends base {
    YieldT                  : GraphCycleDetectedEffect
    ValueT                  : TransactionPropagation

    revision                : RevisionNode  = RevisionNode.new()
    basedOn                 : RevisionNode

    protected isOpened      : boolean       = true

    // `Map` preserves the order of addition, so this data is also ordered
    proposedData            : Map<ChronoAtomI, ChronoValue[]>    = new Map()


    markAsNeedRecalculation (atom : ChronoAtomI, args : any[]) {
        if (!this.isOpened) throw new Error("Transaction already closed")

        this.proposedData.set(atom, args)
    }


    close () {
        this.isOpened   = false
    }


    determinePotentiallyChangedAtoms () : { array : ChronoAtomI[], map : Map<ChronoAtomI, Quark> } {
        const array             = []
        const map : Map<ChronoAtom, Quark> = new Map()

        const me                = this

        TransactionWalkDepthContext.new({
            toVisit         : [ { node : this, from : this } ],

            forEachNext             : function (walkable : Transaction | Quark, func : (node : Transaction | Quark) => void) {
                if (walkable === me) {
                    // FIXME, revision, should be something like: `atom.getQuark(me.basedOn)`
                    me.proposedData.forEach((proposedData, atom) => {
                        const quark     = atom.getCurrentQuark()

                        if (quark)
                            func(quark)
                        else {
                            const quark = atom.getCalculationQuark()

                            map.set(atom, quark)
                            func(quark)
                        }
                    })
                } else {
                    const node  = walkable as Quark

                    node.forEachOutgoing(this, func as (node : Quark) => void)
                }
            },

            // ignore cycles when determining potentially changed atoms
            onCycle                 : (node : Transaction | Quark, stack : WalkStep<Quark>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (walkable : Transaction | Quark) => {
                if (walkable === this) return

                const atom  = (walkable as Quark).atom

                atom.getCurrentQuark() && map.set(atom, atom.getCalculationQuark())
                array.push(atom)
            }
        }).walkDepth()

        return { array, map }
    }


    * calculation (...args : any[]) : ChronoIterator<GraphCycleDetectedEffect | TransactionPropagation> {
        this.close()

        const { array : calculationStack, map : calculationQuarks } = this.determinePotentiallyChangedAtoms()

        const transactionPropagation        = TransactionPropagation.new({
            updatedQuarks       : calculationQuarks
        })

        while (calculationStack.length) {
            const sourceAtom : ChronoAtom   = calculationStack[ calculationStack.length - 1 ]

            const calculationQuark  = calculationQuarks.get(sourceAtom)

            if (!calculationQuark || calculationQuark.isCalculationCompleted()) {
                calculationStack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = calculationQuark.isCalculationStarted() ? calculationQuark.iterationResult : calculationQuark.startCalculation()

            do {
                const value                     = iterationResult.value

                if (iterationResult.done) {

                    // FIXME, revision
                    if (value === NotChanged || sourceAtom.equality(value, sourceAtom.value)) {
                        // TODO calculated the same value
                        // remove the quark and its descendants from the `calculationQuarks` map to indicate it did not change
                    }

                    calculationStack.pop()

                    break
                }
                else if (isChronoAtom(value)) {
                    const requestedAtom     = value
                    const requestedQuark    = calculationQuarks.get(value)

                    // FIXME, revision, should be something like: `atom.getQuark(me.basedOn)`
                    calculationQuark.addEdgeFrom(requestedQuark || requestedAtom.getCurrentQuark())

                    if (!requestedQuark) {
                        // atom is not affected by this transaction
                        // FIXME, revision
                        iterationResult     = calculationQuark.supplyYieldValue(requestedAtom.value)
                    }
                    else if (!requestedQuark.isCalculationStarted()) {
                        calculationStack.push(requestedAtom)

                        break
                    }
                    else if (requestedQuark.isCalculationCompleted()) {
                        iterationResult     = calculationQuark.supplyYieldValue(requestedQuark.value)
                    }
                    else {
                        // cycle - the requested quark has started calculation (means it was encountered in this loop before)
                        // but the calculation did not complete yet (even that requested quark is calculated before the current)
                        yield GraphCycleDetectedEffect.new()
                    }
                }
                else if (value instanceof InputMarker) {
                    // TODO mark atom as impure

                    iterationResult         = calculationQuark.supplyYieldValue(this.proposedData.get(sourceAtom))
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult         = calculationQuark.supplyYieldValue(yield value)
                }

            } while (true)
        }

        return transactionPropagation
    }
}

export type Transaction = Mixin<typeof Transaction>
export interface TransactionI extends Mixin<typeof Transaction> {
    YieldT                  : GraphCycleDetectedEffect
    ValueT                  : TransactionPropagation
}

export class MinimalTransaction extends Transaction(ChronoCalculation(Box(Base))) {
    YieldT                  : GraphCycleDetectedEffect
    ValueT                  : TransactionPropagation
}
