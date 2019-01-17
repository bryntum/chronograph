import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {WalkableBackwardNode, WalkableForwardNode} from "../graph/Node.js";
import {Walkable, WalkableBackward, WalkableForward, WalkForwardContext} from "../graph/Walkable.js";
import {ChronoAtom, ChronoIterator, ChronoValue, MinimalChronoAtom} from "./Atom.js";
import {ChronoId} from "./Id.js";


//---------------------------------------------------------------------------------------------------------------------
export type ChronoRevision      = number

//---------------------------------------------------------------------------------------------------------------------
// this interface exists only to break the cyclic dependency between Atom / Graph
export interface IChronoGraph {
    // revision            : ChronoRevision

    isObservingRead     : number
    isObservingWrite    : number

    onReadObserved (atom : ChronoAtom)
    onWriteObserved (atom : ChronoAtom)

    startReadObservation ()
    stopReadObservation () : ChronoAtom[]

    // calculateAtom (atom : ChronoAtom, proposedValue : ChronoValue)

    markAsNeedRecalculation (atom : ChronoAtom)

    commit ()
    reject ()
    propagate ()
}


export type ChronoContinuation = { atom : ChronoAtom, iterator? : ChronoIterator }


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends Constructable<Graph>>(base : T) =>

class ChronoGraph extends base implements IChronoGraph {
    // revision            : ChronoRevision

    isObservingRead     : number        = 0
    isObservingWrite    : number        = 0

    readObservationState : ChronoAtom[]         = []

    nodeT               : ChronoAtom

    nodesMap            : Map<ChronoId, ChronoAtom> = new Map()

    needRecalculationAtoms : Set<ChronoAtom>       = new Set()

    stableAtoms         : Set<ChronoAtom>       = new Set()


    processingQueue     : ChronoAtom[]          = []


    startReadObservation () {
        this.isObservingRead++
    }


    stopReadObservation () : ChronoAtom[] {
        this.isObservingRead--

        const res       = this.readObservationState

        this.readObservationState   = []

        return res
    }


    // nextRevision () {
    //     return this.revision
    // }


    onReadObserved (atom : ChronoAtom) {
        this.readObservationState.push(atom)
    }


    onWriteObserved (atom : ChronoAtom) {
    }


    isAtomNeedRecalculation (atom : ChronoAtom) : boolean {
        return this.needRecalculationAtoms.has(atom)
    }


    markAsNeedRecalculation (atom : ChronoAtom) {
        this.needRecalculationAtoms.add(atom)
    }


    markProcessed (atom : ChronoAtom) {
        this.needRecalculationAtoms.delete(atom)
    }


    markStable (atom : ChronoAtom) {
        this.stableAtoms.add(atom)
    }


    isAtomStable (atom : ChronoAtom) : boolean {
        return this.stableAtoms.has(atom)
    }


    processNext (atom : ChronoAtom) {
        this.processingQueue.push(atom)
    }


    commit () {
        this.stableAtoms.forEach(atom => {
            if (atom.nextStableValue !== undefined) atom.commit()
        })

        this.needRecalculationAtoms.clear()

        this.stableAtoms.clear()
    }


    reject () {
        this.stableAtoms.forEach(atom => atom.reject())

        this.needRecalculationAtoms.clear()

        this.stableAtoms.clear()
    }


    getOrCreateAtom (id : ChronoId, cls : MixinConstructor<typeof ChronoAtom> = MinimalChronoAtom) : this[ 'nodeT' ] {
        const existing      = this.nodesMap.get(id)

        if (existing) return existing

        return this.addNode(cls.new({ id : id }))
    }


    createAtom () {
        return this.addNode(MinimalChronoAtom.new())
    }


    // needRecalculation (atom : ChronoAtom) : boolean {
    //     if (this.dirtyAtoms.has(atom)) return true
    //
    //     for (let inputAtom of atom.incoming as Set<ChronoAtom>) {
    //         if (inputAtom.isDirty()) return true
    //     }
    //
    //     return false
    // }
    //
    //
    // isPropagatingQueue          : number        = 0

    // // seems to be equivalent of regular `propagate`?
    // propagateQueue () {
    //     if (this.isPropagatingQueue > 0) return
    //
    //     this.isPropagatingQueue++
    //
    //     this.dirtyAtoms.forEach((atom : ChronoAtom) => {
    //         if (!this.isAtomStable(atom)) this.processNext(atom)
    //     })
    //
    //     while (this.processingQueue.length) {
    //         const atom      = this.processingQueue.pop()
    //
    //         if (this.isAtomStable(atom)) continue
    //
    //         // const topoOrder = this.getTopoOrderOfAtomDepents(atom)
    //         //
    //         // if (topoOrder.length) {
    //         //
    //         // } else {
    //         //
    //         // }
    //
    //         if (atom.isDirty()) {
    //             atom.setter(atom.nextValue)
    //         } else
    //             atom.recalculate()
    //
    //         // for stack not growing - should process in the topo-order (!)
    //         atom.outgoing.forEach((atom : ChronoAtom) => {
    //             this.processNext(atom)
    //         })
    //     }
    //
    //     this.commit()
    //
    //     this.isPropagatingQueue--
    // }


    // async propagateQueueAsync () {
    //     if (this.isPropagatingQueue > 0) return
    //
    //     this.isPropagatingQueue++
    //
    //     this.dirtyAtoms.forEach((atom : ChronoAtom) => {
    //         if (!this.isAtomStable(atom)) this.processNext(atom)
    //     })
    //
    //     while (this.processingQueue.length) {
    //         const atom      = this.processingQueue.pop()
    //
    //         if (this.isAtomStable(atom)) continue
    //
    //         // const topoOrder = this.getTopoOrderOfAtomDepents(atom)
    //         //
    //         // if (topoOrder.length) {
    //         //
    //         // } else {
    //         //
    //         // }
    //
    //         if (atom.isDirty()) {
    //             await atom.setterAsync(atom.nextValue)
    //         } else
    //             await atom.setterAsync()
    //
    //         // for stack not growing - should process in the topo-order (!)
    //         atom.outgoing.forEach((atom : ChronoAtom) => {
    //             this.processNext(atom)
    //         })
    //     }
    //
    //     this.commit()
    //
    //     this.isPropagatingQueue--
    // }


    getTopoOrderOfAtomDepents (atom : ChronoAtom) : ChronoAtom[] {
        const me                        = this
        const topoOrder : ChronoAtom[]  = []

        atom.walkDepth(WalkForwardContext.new({
            forEachNext             : function (atom : ChronoAtom, func) {
                atom.forEachOutgoing(this, (outgoing : ChronoAtom) => {
                    if (!me.isAtomStable(outgoing)) func(outgoing)
                })
            },

            onCycle                 : () => { throw new Error("Cycle in graph") },

            onTopologicalNode       : (atom : ChronoAtom) => topoOrder.push(atom)
        }))

        return topoOrder
    }


    // propagate () {
    //     const me        = this
    //
    //     const topoOrder : ChronoAtom[] = []
    //
    //     this.walkDepth(WalkForwardContext.new({
    //         forEachNext             : function (atom : ChronoAtom, func) {
    //             if (atom === <any>me) {
    //                 me.dirtyAtoms.forEach((atom : ChronoAtom) => {
    //                     if (!me.isAtomStable(atom)) func(atom)
    //                 })
    //             } else {
    //                 WalkForwardContext.prototype.forEachNext.call(this, atom, func)
    //             }
    //         },
    //
    //         onNode                  : (atom : ChronoAtom) => {
    //             // console.log(`Visiting ${node}`)
    //         },
    //         onCycle                 : () => { throw new Error("Cycle in graph") },
    //
    //         onTopologicalNode       : (atom : ChronoAtom) => {
    //             if (<any>atom === <any>this) return
    //
    //             topoOrder.push(atom)
    //         }
    //     }))
    //
    //     for (let i = topoOrder.length - 1; i >= 0; i--) {
    //         const atom          = topoOrder[ i ]
    //
    //         if (this.needRecalculation(atom)) {
    //             atom.set(atom.calculate(atom.nextValue))
    //         }
    //     }
    //
    //     this.commit()
    // }


    // async propagateAsync () : Promise<any> {
    //     const me        = this
    //
    //     const topoOrder : ChronoAtom[] = []
    //
    //     this.walkDepth(WalkForwardContext.new({
    //         forEachNext             : function (atom : ChronoAtom, func) {
    //             if (atom === <any>me) {
    //                 me.dirtyAtoms.forEach((atom : ChronoAtom) => {
    //                     if (!me.isAtomStable(atom)) func(atom)
    //                 })
    //             } else {
    //                 WalkForwardContext.prototype.forEachNext.call(this, atom, func)
    //             }
    //         },
    //
    //         onNode                  : (atom : ChronoAtom) => {
    //             // console.log(`Visiting ${node}`)
    //         },
    //         onCycle                 : () => { throw new Error("Cycle in graph") },
    //
    //         onTopologicalNode       : (atom : ChronoAtom) => {
    //             if (<any>atom === <any>this) return
    //
    //             topoOrder.push(atom)
    //         }
    //     }))
    //
    //     for (let i = topoOrder.length - 1; i >= 0; i--) {
    //         const atom          = topoOrder[ i ]
    //
    //         if (this.needRecalculation(atom)) {
    //             if (atom.isDirty())
    //                 await atom.setterAsync(atom.nextValue)
    //             else
    //                 await atom.setterAsync()
    //         }
    //     }
    //
    //     this.commit()
    // }


    addNode (node : this[ 'nodeT' ]) : this[ 'nodeT' ] {
        const res   = super.addNode(node)

        this.nodesMap.set(node.id, node)

        // if (/endDate/.test(node.id)) debugger
        // if (!node.hasValue())
        this.markAsNeedRecalculation(node)

        node.onEnterGraph(this)

        return res
    }


    removeNode (node : this[ 'nodeT' ]) {
        const res   = super.removeNode(node)

        this.nodesMap.delete(node.id)

        node.onLeaveGraph(this)

        return res
    }


    startAtomCalculation (sourceAtom : ChronoAtom) : { value? : ChronoValue, continuation? : ChronoContinuation }
    {
        const iterator      = sourceAtom.calculation.call(sourceAtom.calculationContext || sourceAtom, sourceAtom.proposedValue)

        let iterValue       = iterator.next()

        if (iterValue.done) {
            return { value : iterValue.value }
        } else {
            return { continuation : { atom : iterValue.value, iterator : iterator } }
        }
    }


    continueAtomCalculation (sourceAtom : ChronoAtom, continuation : ChronoContinuation) :
        { value? : ChronoValue, continuation? : ChronoContinuation }
    {
        const iterator      = continuation.iterator

        let incomingAtom    = continuation.atom

        do {
            sourceAtom.observedDuringCalculation.push(incomingAtom)

            // ideally should be removed (same as while condition)
            if (this.isAtomNeedRecalculation(incomingAtom) && !this.isAtomStable(incomingAtom)) throw "inconsistency"

            let iterValue   = iterator.next(incomingAtom.get())

            if (iterValue.done) {
                return { value : iterValue.value }
            }
            // TODO should ignore non-final non-atom values

            incomingAtom    = iterValue.value

        } while (!this.isAtomNeedRecalculation(incomingAtom) || this.isAtomStable(incomingAtom))

        return { continuation : { iterator, atom : incomingAtom } }
    }


    propagate () {
        const toCalculate       = Array.from(this.needRecalculationAtoms)
        const maybeDirty        = new Set()
        const conts             = new Map<ChronoAtom, ChronoContinuation>()
        const visitedAt         = new Map<ChronoAtom, number>()

        let depth

        while (depth = toCalculate.length) {
            const sourceAtom : ChronoAtom   = toCalculate[ depth - 1 ]

            if (this.isAtomStable(sourceAtom) || !this.isAtomNeedRecalculation(sourceAtom) && !maybeDirty.has(sourceAtom)) {
                toCalculate.pop()
                continue
            }

            const visitedAtDepth    = visitedAt.get(sourceAtom)

            let calcRes

            // node has been already visited
            if (visitedAtDepth != null) {
                const cont          = conts.get(sourceAtom)

                calcRes             = this.continueAtomCalculation(sourceAtom, cont)
            } else {
                visitedAt.set(sourceAtom, depth)

                calcRes             = this.startAtomCalculation(sourceAtom)
            }

            if (calcRes.continuation) {
                conts.set(sourceAtom, calcRes.continuation)

                toCalculate.push(calcRes.continuation.atom)
            } else {
                const consistentValue   = calcRes.value

                if (!sourceAtom.equality(consistentValue, sourceAtom.get())) {
                    sourceAtom.update(consistentValue)

                    toCalculate.unshift.apply(toCalculate, Array.from(sourceAtom.outgoing))
                    sourceAtom.outgoing.forEach(el => maybeDirty.add(el))
                }

                this.markStable(sourceAtom)

                if (sourceAtom.setterPropagation && !sourceAtom.proposedValue) {
                    sourceAtom.setterPropagation.call(sourceAtom.calculationContext || sourceAtom, consistentValue)
                }

                toCalculate.pop()
            }
        }

        this.commit()
    }


}

export type ChronoGraph = Mixin<typeof ChronoGraph>

export const MinimalChronoGraph = ChronoGraph(Graph(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(Base)))))))
export type MinimalChronoGraph  = InstanceType<typeof MinimalChronoGraph>
