import { AnyConstructor, AnyFunction, Mixin, MixinConstructor } from "../class/Mixin.js"
import { Graph, MinimalGraph } from "../graph/Graph.js"
import { Node } from "../graph/Node.js"
import { cycleInfo, OnCycleAction, WalkForwardContext, WalkStep } from "../graph/Walkable.js"
import { FieldAtom } from "../replica/Atom.js"
import { ChronoAtom, ChronoAtomI, ChronoIterator, ChronoValue, MinimalChronoAtom } from "./Atom.js"
import {
    CancelPropagationEffect,
    Effect,
    EffectResolutionResult,
    EffectResolverFunction,
    GraphCycleDetectedEffect,
    RestartPropagationEffect
} from "./Effect.js"
import { ChronoId } from "./Id.js"


//---------------------------------------------------------------------------------------------------------------------
export type ChronoRevision          = number

//---------------------------------------------------------------------------------------------------------------------
export type ChronoContinuation      = { iterator : ChronoIterator, atom? : ChronoAtom }
export type ChronoIterationResult   = { value? : ChronoValue, continuation? : ChronoContinuation, effect? : Effect }
export type PropagateSingleResult   = { success : true }
export type FinalizerFn             = () => Promise<PropagationResult>

//---------------------------------------------------------------------------------------------------------------------
export enum PropagationResult {
    Canceled,
    Completed,
    Passed
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Graph>>(base : T) =>

class ChronoGraph extends base {
    // revision            : ChronoRevision

    // isObservingRead     : number        = 0
    // isObservingWrite    : number        = 0

    // readObservationState : ChronoAtom[]         = []

    nodeT                   : ChronoAtomI

    nodesMap                : Map<ChronoId, ChronoAtomI> = new Map()

    needRecalculationAtoms  : Set<ChronoAtomI>       = new Set()
    stableAtoms             : Set<ChronoAtomI>       = new Set()

    changedAtoms            : ChronoAtomI[]
    touchedAtoms            : Map<ChronoAtomI, ChronoContinuation>

    // temp workaround to mark changed initial atoms as "need recalculation"
    initialAtoms            : ChronoAtomI[]          = []

    isPropagating           : boolean               = false

    propagateCompletedListeners : AnyFunction[]     = []


    // processingQueue         : ChronoAtom[]          = []


    // startReadObservation () {
    //     this.isObservingRead++
    // }
    //
    //
    // stopReadObservation () : ChronoAtom[] {
    //     this.isObservingRead--
    //
    //     const res       = this.readObservationState
    //
    //     this.readObservationState   = []
    //
    //     return res
    // }


    // nextRevision () {
    //     return this.revision
    // }


    // onReadObserved (atom : ChronoAtom) {
    //     this.readObservationState.push(atom)
    // }
    //
    //
    // onWriteObserved (atom : ChronoAtom) {
    // }


    isAtomNeedRecalculation (atom : ChronoAtomI) : boolean {
        return this.needRecalculationAtoms.has(atom)
    }


    markAsNeedRecalculation (atom : ChronoAtomI) {
        this.needRecalculationAtoms.add(atom)
    }


    markProcessed (atom : ChronoAtomI) {
        this.needRecalculationAtoms.delete(atom)
    }


    markStable (atom : ChronoAtomI) {
        this.stableAtoms.add(atom)
    }


    isAtomStable (atom : ChronoAtomI) : boolean {
        return this.stableAtoms.has(atom)
    }


    // processNext (atom : ChronoAtom) {
    //     this.processingQueue.push(atom)
    // }


    commit () {
        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()

        this.changedAtoms.forEach(atom => atom.commitValue())

        // the edges might have changed, even the atom value itself did not
        // because of that, we commit the edges for all recalculated atoms (stable atoms)
        this.stableAtoms.forEach(atom => atom.commitEdges())
        this.stableAtoms.clear()

        // temp workaround
        this.initialAtoms.forEach((initialAtom : FieldAtom) => {
            initialAtom.outgoing.forEach((atom : FieldAtom) => {
                // same entity
                if (initialAtom.self === atom.self) {
                    const field         = atom.field

                    if (field && field.continuationOf && field.continuationOf === initialAtom.field) {
                        // do nothing for the "final" atom
                        return
                    }
                }

                this.markAsNeedRecalculation(atom)
            })
        })
        this.initialAtoms   = []
    }


    reject () {
        this.rejectPartialProgress()

        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()
    }


    rejectPartialProgress () {
        this.touchedAtoms.forEach((_, atom) => atom.reject())

        this.stableAtoms.clear()
    }


    getOrCreateAtom (id : ChronoId, cls : MixinConstructor<typeof ChronoAtom> = MinimalChronoAtom) : this[ 'nodeT' ] {
        const existing      = this.nodesMap.get(id)

        if (existing) return existing

        return this.addNode(cls.new({ id : id }))
    }


    addNode (node : this[ 'nodeT' ]) : this[ 'nodeT' ] {
        const res   = super.addNode(node)

        this.nodesMap.set(node.id, node)

        this.markAsNeedRecalculation(node)

        node.onEnterGraph(this)

        return res
    }


    removeNode (node : this[ 'nodeT' ]) {
        node.outgoing.forEach((toNode : ChronoAtom) => this.markAsNeedRecalculation(toNode))

        const res   = super.removeNode(node)

        this.nodesMap.delete(node.id)
        this.needRecalculationAtoms.delete(node)
        // we probably don't need this line, since `stableAtoms` are internal state of the propagation process
        this.stableAtoms.delete(node)

        node.onLeaveGraph(this)

        return res
    }


    startAtomCalculation (sourceAtom : ChronoAtomI) : ChronoIterationResult {
        const iterator : ChronoIterator<ChronoValue> = sourceAtom.calculate(sourceAtom.proposedValue)

        let iteratorValue   = iterator.next()

        const value         = iteratorValue.value

        if (value instanceof Effect) {
            return { effect : value, continuation : { iterator : iterator } }
        }
        else if (iteratorValue.done) {
            return { value }
        }
        else {
            return { continuation : { atom : value, iterator : iterator } }
        }
    }


    continueAtomCalculation (sourceAtom : ChronoAtomI, continuation : ChronoContinuation, maybeDirtyAtoms : Set<ChronoAtomI>) : ChronoIterationResult {
        const me            = this,
              iterator      = continuation.iterator

        let incomingAtom    = continuation.atom

        do {
            let iteratorValue : IteratorResult<Effect | ChronoAtom | ChronoValue>

            if (incomingAtom) {
                sourceAtom.observedDuringCalculation.push(incomingAtom)

                // Cycle condition
                // ideally should be removed (same as while condition)
                if (maybeDirtyAtoms.has(incomingAtom) && !this.isAtomStable(incomingAtom)) {
                    let cycle : Node[]

                    me.walkDepth(WalkForwardContext.new({
                        forEachNext             : function (atom : ChronoAtom, func) {
                            if (atom === <any> me) {
                                me.needRecalculationAtoms.forEach(func)
                            }
                            else {
                                atom.observedDuringCalculation.forEach(func)
                            }
                        },

                        onCycle                 : (node : Node, stack : WalkStep[]) => {
                            // NOTE: After onCycle call walkDepth instantly returns
                            cycle = cycleInfo(stack) as Node[]

                            return OnCycleAction.Cancel
                        }
                    }))

                    iteratorValue = { value: GraphCycleDetectedEffect.new({ cycle }), done : true }
                }
                else {
                    iteratorValue   = iterator.next(
                        incomingAtom.hasNextStableValue() ? incomingAtom.getNextStableValue() : incomingAtom.getConsistentValue()
                    )
                }

            } else {
                iteratorValue   = iterator.next()
            }

            const value         = iteratorValue.value

            if (value instanceof Effect) {
                return { effect : value, continuation : { iterator : iterator } }
            }

            if (iteratorValue.done) {
                return { value }
            }

            // TODO should ignore non-final non-atom values
            incomingAtom    = value

        } while (!maybeDirtyAtoms.has(incomingAtom) || this.isAtomStable(incomingAtom))

        return { continuation : { iterator, atom : incomingAtom } }
    }


    * propagateSingle () : IterableIterator<Effect | PropagateSingleResult> {
        const toCalculate       = []
        const maybeDirty        = new Set<ChronoAtom>()
        const me                = this

        let cycle : Node[]      = null

        this.walkDepth(WalkForwardContext.new({
            forEachNext             : function (atom : ChronoAtom, func) {
                if (atom === <any> me) {
                    me.needRecalculationAtoms.forEach(func)
                } else {
                    WalkForwardContext.prototype.forEachNext.call(this, atom, func)
                }
            },

            onNode                  : (atom : ChronoAtom) => {
                // console.log(`Visiting ${node}`)
            },
            onCycle                 : (node : Node, stack : WalkStep[]) => {
                // NOTE: After onCycle call walkDepth instantly returns
                cycle = cycleInfo(stack) as Node[]

                return OnCycleAction.Cancel
            },

            onTopologicalNode       : (atom : ChronoAtom) => {
                if (<any> atom === <any> this) return

                maybeDirty.add(atom)

                toCalculate.push(atom)
            }
        }))

        if (cycle) {
            return GraphCycleDetectedEffect.new({ cycle })
        }

        let depth

        const conts             = this.touchedAtoms = new Map<ChronoAtom, ChronoContinuation>()
        const visitedAt         = new Map<ChronoAtom, number>()
        const changedAtoms      = this.changedAtoms = []

        while (depth = toCalculate.length) {
            const sourceAtom : ChronoAtom   = toCalculate[ depth - 1 ]

            if (this.isAtomStable(sourceAtom) || !maybeDirty.has(sourceAtom)) {
                toCalculate.pop()
                continue
            }

            const visitedAtDepth    = visitedAt.get(sourceAtom)

            let calcRes : ChronoIterationResult

            // node has been already visited
            if (visitedAtDepth != null) {
                const cont          = conts.get(sourceAtom)

                calcRes             = this.continueAtomCalculation(sourceAtom, cont, maybeDirty)
            } else {
                visitedAt.set(sourceAtom, depth)

                calcRes             = this.startAtomCalculation(sourceAtom)
            }

            if (calcRes.effect) {
                yield calcRes.effect
            }

            if (calcRes.continuation) {
                conts.set(sourceAtom, calcRes.continuation)

                const atom  = calcRes.continuation.atom

                if (atom) {
                    // this line is necessary for cycles visualization to work correctly, strictly it is not needed,
                    // because in non-cycle scenario "observedDuringCalculation" is filled in the `continueAtomCalculation`
                    sourceAtom.observedDuringCalculation.push(atom)

                    toCalculate.push(atom)
                }
            } else {
                // this makes sure that _all_ atoms, for which the calculation has started
                // are "collected" in the `conts` Map
                // then, during reject, we'll iterate over this map
                conts.set(sourceAtom, null)

                const consistentValue   = calcRes.value

                if (!sourceAtom.equality(consistentValue, sourceAtom.getConsistentValue())) {
                    changedAtoms.push(sourceAtom)

                    sourceAtom.nextStableValue = consistentValue
                }

                this.markStable(sourceAtom)

                toCalculate.pop()
            }
        }

        return { success : true }
    }


    async onEffect (effect : Effect) : Promise<EffectResolutionResult> {
        if (effect instanceof CancelPropagationEffect) {
            return EffectResolutionResult.Cancel
        }

        if (effect instanceof RestartPropagationEffect) {
            return EffectResolutionResult.Restart
        }

        if (effect instanceof GraphCycleDetectedEffect) {
            throw new Error('Graph cycle detected')
        }

        return EffectResolutionResult.Resume
    }


    waitForPropagateCompleted () : Promise<PropagationResult | null> {
        if (!this.isPropagating) return Promise.resolve(null)

        return new Promise(resolve => {
            this.propagateCompletedListeners.push(resolve)
        })
    }


    async propagate (onEffect? : EffectResolverFunction, dryRun : (boolean | Function) = false) : Promise<PropagationResult> {
        if (this.isPropagating) throw new Error("Can not nest calls to `propagate`, use `waitForPropagateCompleted`")

        let needToRestart : boolean,
            result        : PropagationResult

        this.isPropagating          = true

        do {
            needToRestart           = false

            const propagationIterator = this.propagateSingle()

            let iteratorValue

            do {
                iteratorValue       = propagationIterator.next()

                const value         = iteratorValue.value

                if (value instanceof Effect) {
                    let resolutionResult : EffectResolutionResult

                    if (onEffect) {
                        resolutionResult    = await onEffect(value)
                    } else {
                        resolutionResult    = await this.onEffect(value)
                    }

                    if (resolutionResult === EffectResolutionResult.Cancel) {
                        // Escape hatch to get next consistent atom value before rejection
                        if (typeof dryRun === 'function') {
                            dryRun()
                        }

                        // POST-PROPAGATE sequence, TODO refactor
                        this.reject()
                        this.isPropagating  = false
                        await this.propagationCompletedHook()
                        this.onPropagationCompleted(PropagationResult.Canceled)

                        return PropagationResult.Canceled
                    }
                    else if (resolutionResult === EffectResolutionResult.Restart) {
                        this.rejectPartialProgress()

                        needToRestart       = true

                        break
                    }
                }
            } while (!iteratorValue.done)

        } while (needToRestart)

        if (dryRun) {
            // Escape hatch to get next consistent atom value before rejection
            if (typeof dryRun === 'function') {
                dryRun()
            }

            // POST-PROPAGATE sequence, TODO refactor
            this.reject()
            this.isPropagating = false
            await this.propagationCompletedHook()
            this.onPropagationCompleted(PropagationResult.Completed) // Shouldn't it be PropagationResult.Passed?

            result = PropagationResult.Passed
        }
        else {
            // POST-PROPAGATE sequence, TODO refactor
            this.commit()
            this.isPropagating = false
            await this.propagationCompletedHook()
            this.onPropagationCompleted(PropagationResult.Completed)

            result = PropagationResult.Completed
        }

        return result
    }


    async tryPropagateWithNodes (onEffect? : EffectResolverFunction, nodes? : this[ 'nodeT' ][], hatchFn? : Function) : Promise<PropagationResult> {

        if (nodes && nodes.length) {
            nodes = nodes.filter(n => n.graph !== this)
            if (nodes.length) {
                this.addNodes(nodes)
            }
        }

        const result = await this.propagate(onEffect, hatchFn || true)

        if (nodes && nodes.length) {
            nodes && this.removeNodes(nodes)
        }

        return result
    }


    async propagationCompletedHook () {
    }


    onPropagationCompleted (result : PropagationResult) {
        this.propagateCompletedListeners.forEach(listener => listener(result))

        this.propagateCompletedListeners    = []
    }


    // used for debugging, when exception is thrown in the middle of the propagate and edges are not yet committed
    commitAllEdges () {
        this.nodes.forEach(atom => atom.commitEdges())
    }


    toDotOnCycleException () {
        this.commitAllEdges()

        return this.toDot()
    }


    toDot () : string {
        let dot = [
            'digraph ChronoGraph {',
            'splines=spline'
        ]

        const arrAtoms : [ChronoId, ChronoAtom][] = Array.from(this.nodesMap.entries())

        // Group atoms into subgraphs by label
        //
        // atom.self.id    - entity
        // atom.field.name -

        const namedAtomsByGroup : Map<string, Set<[string, ChronoAtom]>> = arrAtoms.reduce(
            (map, [atomId, atom]) => {
                let [group, label] = String(atomId).split('/')

                // @ts-ignore
                const { id, name } = (atom as FieldAtom).self || {},
                      { field } = (atom as FieldAtom)

                group = name || id || group
                label = field && field.name || label

                if (!map.has(group)) {
                    map.set(group, new Set([[label || '', atom]]))
                }
                else {
                    map.get(group).add([label, atom])
                }

                return map
            },
            new Map()
        )

        // Generate subgraphs
        dot = Array.from(namedAtomsByGroup.entries()).reduce(
            (dot, [group, namedAtoms], index) => {
                dot.push(`subgraph cluster_${index} {`)

                dot.push(`label="${group}"`)

                dot = Array.from(namedAtoms.values()).reduce(
                    (dot, [name, atom]) => {
                        let value : any

                        if ((atom as any).newRefs && (atom as any).oldRefs) {
                            const collection    = atom.get()

                            value = `Set(${collection && collection.size || 0})`
                        }
                        else {
                            value = atom.get()
                        }

                        if (value instanceof Date) {
                            value = [value.getFullYear(), '.', value.getMonth() + 1, '.', value.getDate(), ' ', value.getHours() + ':' + value.getMinutes()].join('')
                        }
                        else if (Array.isArray(value)) {
                            value = `Array(${value.length})`
                        }

                        let color = (!this.isAtomNeedRecalculation(atom) || this.isAtomStable(atom)) ? 'darkgreen' : 'red'

                        dot.push(`"${atom.id}" [label="${name}=${value}\", fontcolor="${color}"]`)

                        return dot
                    },
                    dot
                )

                dot.push('}')

                return dot
            },
            dot
        )

        let cycle : object = {}

        // Cycle detection
        this.walkDepth(WalkForwardContext.new({
            onCycle : (_node : Node, stack : WalkStep[]) : OnCycleAction => {
                const ci : Node[]   = cycleInfo(stack) as Node[]

                cycle = ci.reduce(
                    ([cycle, prevNode], curNode) => {
                        if (prevNode) {
                            cycle[(prevNode as ChronoAtom).id] = (curNode as ChronoAtom).id
                        }
                        return [cycle, curNode]
                    },
                    [cycle, null]
                )[0]

                return OnCycleAction.Cancel
            }
        }))


        // Generate edges
        dot = arrAtoms.reduce(
            (dot, [fromId, fromAtom] : [ChronoId, ChronoAtom]) => {

                const outgoingEdges = fromAtom.outgoing

                Array.from(outgoingEdges).reduce(
                    (dot, toAtom : ChronoAtom) => {

                        //let edgeLabel = this.getEdgeLabel(fromId, atom.id)
                        const edgeLabel = ''

                        let color = (!this.isAtomNeedRecalculation(fromAtom) || this.isAtomStable(fromAtom)) ? 'darkgreen' : 'red'
                        let penwidth = (cycle[fromId] == toAtom.id) ? 5 : 1

                        dot.push(`"${fromId}" -> "${toAtom.id}" [label="${edgeLabel}", color="${color}", penwidth=${penwidth}]`)

                        return dot
                    },
                    dot
                )

                return dot
            },
            dot
        )

        dot.push('}')

        return dot.join('\n')
    }
}

export type ChronoGraph = Mixin<typeof ChronoGraph>
export interface ChronoGraphI extends Mixin<typeof ChronoGraph> {}

export class MinimalChronoGraph extends ChronoGraph(MinimalGraph) {
    nodeT                   : ChronoAtomI
}
