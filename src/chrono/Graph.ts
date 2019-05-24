import { AnyConstructor, AnyFunction, Base, Mixin } from "../class/Mixin.js"
import { Graph, MinimalGraph } from "../graph/Graph.js"
import { MinimalNode } from "../graph/Node.js"
import { ChronoAtom, ChronoAtomI, MinimalChronoAtom } from "./Atom.js"
import { ChronoCalculationFunction } from "./Calculation.js"
import {
    CancelPropagationEffect,
    Effect,
    EffectResolutionResult,
    EffectResolverFunction,
    GraphCycleDetectedEffect,
    RestartPropagationEffect
} from "./Effect.js"
import { HasId } from "./HasId.js"
import { ChronoId } from "./Id.js"
import { MinimalTransaction, Transaction, TransactionI } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export type ChronoRevision          = number

//---------------------------------------------------------------------------------------------------------------------
export enum PropagationResult {
    Canceled,
    Completed
}


//---------------------------------------------------------------------------------------------------------------------
export class RevisionNode extends HasId(MinimalNode) {
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Graph>>(base : T) =>

class ChronoGraph extends base {
    NodeT                   : ChronoAtomI

    nodesMap                : Map<ChronoId, this[ 'NodeT' ]> = new Map()

    isPropagating           : boolean               = false

    propagateCompletedListeners : AnyFunction[]     = []

    currentRevision         : RevisionNode          = RevisionNode.new()

    activeTransaction       : TransactionI          = this.deriveTransaction()


    propagateSync () {
        this.activeTransaction.runSyncWithEffect(() => null)

        this.applyTransaction(this.activeTransaction)
    }


    async propagateAsync () {
        await this.activeTransaction.runAsyncWithEffect(async () => null)

        this.applyTransaction(this.activeTransaction)
    }


    // aka "commit"
    applyTransaction (transaction : TransactionI) {
        if (!transaction.isCalculationCompleted()) throw new Error("Transaction not completed yet")

        transaction.value.updatedQuarks.forEach((quark, atom) => atom.quarks.push(quark))

        this.currentRevision    = transaction.revision

        this.activeTransaction  = this.deriveTransaction()
    }


    deriveTransaction () : TransactionI {
        const newTransaction        = MinimalTransaction.new({ basedOn : this.currentRevision })

        newTransaction.revision.addEdgeFrom(this.currentRevision)

        return newTransaction
    }


    markAsNeedRecalculation (atom : this[ 'NodeT' ], args? : any[]) {
        this.activeTransaction.markAsNeedRecalculation(atom, args)
    }


    addNode (node : this[ 'NodeT' ]) : this[ 'NodeT' ] {
        const res   = super.addNode(node)

        this.nodesMap.set(node.id, node)

        this.markAsNeedRecalculation(node, node.putData)

        node.onEnterGraph(this)

        return res
    }


    removeNode (node : this[ 'NodeT' ]) {
        node.outgoing.forEach((toNode : ChronoAtom) => this.markAsNeedRecalculation(toNode))

        const res   = super.removeNode(node)

        this.nodesMap.delete(node.id)
        // this.activeTransaction.needRecalculationAtoms.delete(node)

        node.onLeaveGraph(this)

        return res
    }


//     async onEffect (effect : Effect) : Promise<EffectResolutionResult> {
//         if (effect instanceof CancelPropagationEffect) {
//             return EffectResolutionResult.Cancel
//         }
//
//         if (effect instanceof RestartPropagationEffect) {
//             return EffectResolutionResult.Restart
//         }
//
//         if (effect instanceof GraphCycleDetectedEffect) {
//             throw new Error('Graph cycle detected')
//         }
//
//         return EffectResolutionResult.Resume
//     }
//
//
//     waitForPropagateCompleted () : Promise<PropagationResult | null> {
//         if (!this.isPropagating) return Promise.resolve(null)
//
//         return new Promise(resolve => {
//             this.propagateCompletedListeners.push(resolve)
//         })
//     }
//
//
//     async propagate (onEffect? : EffectResolverFunction, dryRun : (boolean | Function) = false) : Promise<PropagationResult> {
//         return
//         // if (this.isPropagating) throw new Error("Can not nest calls to `propagate`, use `waitForPropagateCompleted`")
//         //
//         // let needToRestart : boolean,
//         //     result        : PropagationResult
//         //
//         // this.isPropagating          = true
//         //
//         // let value   : Effect | PropagationState
//         //
//         // do {
//         //     needToRestart           = false
//         //
//         //     const propagationIterator = this.propagateSingle()
//         //
//         //     let iteratorValue
//         //
//         //     do {
//         //         iteratorValue       = propagationIterator.next()
//         //
//         //         value               = iteratorValue.value
//         //
//         //         if (value instanceof Effect) {
//         //             let resolutionResult : EffectResolutionResult
//         //
//         //             if (onEffect) {
//         //                 resolutionResult    = await onEffect(value)
//         //             } else {
//         //                 resolutionResult    = await this.onEffect(value)
//         //             }
//         //
//         //             if (resolutionResult === EffectResolutionResult.Cancel) {
//         //                 // Escape hatch to get next consistent atom value before rejection
//         //                 if (typeof dryRun === 'function') {
//         //                     dryRun()
//         //                 }
//         //
//         //                 // POST-PROPAGATE sequence, TODO refactor
//         //                 this.reject(value.propagationState)
//         //                 this.isPropagating  = false
//         //                 await this.propagationCompletedHook()
//         //                 this.onPropagationCompleted(PropagationResult.Canceled)
//         //
//         //                 return PropagationResult.Canceled
//         //             }
//         //             else if (resolutionResult === EffectResolutionResult.Restart) {
//         //                 this.rejectPartialProgress(value.propagationState)
//         //
//         //                 needToRestart       = true
//         //
//         //                 break
//         //             }
//         //         }
//         //     } while (!iteratorValue.done)
//         //
//         // } while (needToRestart)
//         //
//         // if (dryRun) {
//         //     // Escape hatch to get next consistent atom value before rejection
//         //     if (typeof dryRun === 'function') {
//         //         dryRun()
//         //     }
//         //
//         //     // POST-PROPAGATE sequence, TODO refactor
//         //     this.reject(value as PropagationState)
//         //     this.isPropagating = false
//         //     await this.propagationCompletedHook()
//         //     this.onPropagationCompleted(PropagationResult.Completed)
//         //
//         //     result = PropagationResult.Completed
//         // }
//         // else {
//         //     // POST-PROPAGATE sequence, TODO refactor
//         //     this.commit(value as PropagationState)
//         //     this.isPropagating = false
//         //     await this.propagationCompletedHook()
//         //     this.onPropagationCompleted(PropagationResult.Completed)
//         //
//         //     result = PropagationResult.Completed
//         // }
//         //
//         // return result
//     }
//
//
//     async tryPropagateWithNodes (onEffect? : EffectResolverFunction, nodes? : this[ 'NodeT' ][], hatchFn? : Function) : Promise<PropagationResult> {
//
//         if (nodes && nodes.length) {
//             nodes = nodes.filter(n => n.graph !== this)
//             if (nodes.length) {
//                 this.addNodes(nodes)
//             }
//         }
//
//         const result = await this.propagate(onEffect, hatchFn || true)
//
//         if (nodes && nodes.length) {
//             nodes && this.removeNodes(nodes)
//         }
//
//         return result
//     }
//
//
//     async propagationCompletedHook () {
//     }
//
//
//     onPropagationCompleted (result : PropagationResult) {
//         this.propagateCompletedListeners.forEach(listener => listener(result))
//
//         this.propagateCompletedListeners    = []
//     }
//
//
//     observe (calculation : ChronoCalculationFunction) : ChronoAtomI {
//         const observerAtom  = MinimalChronoAtom.new({
//             // calculation
//         })
//
//         this.addNode(observerAtom)
//
//         return observerAtom
//     }
}

export type ChronoGraph = Mixin<typeof ChronoGraph>
export interface ChronoGraphI extends Mixin<typeof ChronoGraph> {
    NodeT                   : ChronoAtom
}

export class MinimalChronoGraph extends ChronoGraph(MinimalGraph) {
    NodeT                   : ChronoAtom
}


//---------------------------------------------------------------------------------------------------------------------
export class PropagationContext extends Base {
    onEffect        : (effect : Effect) => any
}


export class AsyncPropagationContext extends PropagationContext {
    onEffect        : (effect : Effect) => Promise<any>
}


