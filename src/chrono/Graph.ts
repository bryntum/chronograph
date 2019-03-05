import {AnyConstructor, AnyFunction, Base, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import { WalkableBackwardNode, WalkableForwardNode, Node} from "../graph/Node.js";
import { Walkable, WalkableBackward, WalkableForward, WalkForwardContext, WalkStep, OnCycleAction, cycleInfo} from "../graph/Walkable.js";
import {FieldAtom} from "../replica/Atom.js";
import {ChronoAtom, ChronoIterator, ChronoValue, MinimalChronoAtom} from "./Atom.js";
import {CancelPropagationEffect, Effect, EffectResolutionResult, EffectResolverFunction, RestartPropagationEffect} from "./Effect.js";
import {ChronoId} from "./Id.js";


//---------------------------------------------------------------------------------------------------------------------
export type ChronoRevision          = number

//---------------------------------------------------------------------------------------------------------------------
export type ChronoContinuation      = { iterator : ChronoIterator, atom? : ChronoAtom }
export type ChronoIterationResult   = { value? : ChronoValue, continuation? : ChronoContinuation, effect? : Effect }
export type PropagateSingleResult   = { success : true }


//---------------------------------------------------------------------------------------------------------------------
export enum PropagationResult {
    Canceled,
    Completed
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Graph>>(base : T) =>

class ChronoGraph extends base {
    // revision            : ChronoRevision

    // isObservingRead     : number        = 0
    // isObservingWrite    : number        = 0

    // readObservationState : ChronoAtom[]         = []

    nodeT                   : ChronoAtom

    nodesMap                : Map<ChronoId, ChronoAtom> = new Map()

    needRecalculationAtoms  : Set<ChronoAtom>       = new Set()
    stableAtoms             : Set<ChronoAtom>       = new Set()

    changedAtoms            : ChronoAtom[]          = []

    // temp workaround to mark changed initial atoms as "need recalculation"
    initialAtoms            : ChronoAtom[]          = []

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


    // processNext (atom : ChronoAtom) {
    //     this.processingQueue.push(atom)
    // }


    // used for debugging, when exception is thrown in the middle of the propagate and edges are not yet committed
    commitAllEdges () {
        this.nodes.forEach(atom => atom.commitEdges())
    }


    async commit () {
        this.changedAtoms.forEach(atom => atom.commitValue())
        this.changedAtoms   = []

        // the edges might have changed, even the atom value itself did not
        // because of that, we commit the edges for all recalculated atoms (stable atoms)
        this.stableAtoms.forEach(atom => atom.commitEdges())
        this.stableAtoms.clear()

        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()

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


    async reject () {
        await this.rejectPartialProgress()

        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()
    }


    async rejectPartialProgress () {
        // stable atoms includes changed ones
        this.stableAtoms.forEach(atom => atom.reject())
        this.stableAtoms.clear()

        this.changedAtoms   = []
    }


    getOrCreateAtom (id : ChronoId, cls : MixinConstructor<typeof ChronoAtom> = MinimalChronoAtom) : this[ 'nodeT' ] {
        const existing      = this.nodesMap.get(id)

        if (existing) return existing

        return this.addNode(cls.new({ id : id }))
    }


    createAtom () {
        return this.addNode(MinimalChronoAtom.new())
    }


    addNode (node : this[ 'nodeT' ]) : this[ 'nodeT' ] {
        const res   = super.addNode(node)

        this.nodesMap.set(node.id, node)

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


    startAtomCalculation (sourceAtom : ChronoAtom) : ChronoIterationResult {
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


    continueAtomCalculation (sourceAtom : ChronoAtom, continuation : ChronoContinuation, maybeDirtyAtoms : Set<ChronoAtom>) : ChronoIterationResult {
        const iterator      = continuation.iterator

        let incomingAtom    = continuation.atom

        do {
            let iteratorValue : IteratorResult<Effect | ChronoAtom | ChronoValue>

            if (incomingAtom) {
                sourceAtom.observedDuringCalculation.push(incomingAtom)

                // ideally should be removed (same as while condition)
                if (maybeDirtyAtoms.has(incomingAtom) && !this.isAtomStable(incomingAtom)) throw new Error("Cycle")

                iteratorValue   = iterator.next(
                    incomingAtom.hasNextStableValue() ? incomingAtom.getNextStableValue() : incomingAtom.getConsistentValue()
                )
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
        const maybeDirty        = new Set()
        const conts             = new Map<ChronoAtom, ChronoContinuation>()
        const visitedAt         = new Map<ChronoAtom, number>()

        const me                = this

        this.walkDepth(WalkForwardContext.new({
            forEachNext             : function (atom : ChronoAtom, func) {
                if (atom === <any>me) {
                    me.needRecalculationAtoms.forEach(func)
                } else {
                    WalkForwardContext.prototype.forEachNext.call(this, atom, func)
                }
            },

            onNode                  : (atom : ChronoAtom) => {
                // console.log(`Visiting ${node}`)
            },
            onCycle                 : () => { throw new Error("Cycle in graph") },

            onTopologicalNode       : (atom : ChronoAtom) => {
                if (<any>atom === <any>this) return

                maybeDirty.add(atom)

                toCalculate.push(atom)
            }
        }))


        let depth

        const changedAtoms      = this.changedAtoms

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

        return EffectResolutionResult.Resume
    }


    waitForPropagateCompleted () : Promise<PropagationResult | null> {
        if (!this.isPropagating) return Promise.resolve(null)

        return new Promise(resolve => {
            this.propagateCompletedListeners.push(resolve)
        })
    }


    async propagate (onEffect? : EffectResolverFunction) : Promise<PropagationResult> {
        if (this.isPropagating) throw new Error("Can not nest calls to `propagate`, use `waitForPropagateCompleted`")

        let needToRestart : boolean

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
                        await this.reject()

                        this.isPropagating  = false

                        this.onPropagationCompleted(PropagationResult.Canceled)

                        return PropagationResult.Canceled
                    }
                    else if (resolutionResult === EffectResolutionResult.Restart) {
                        await this.rejectPartialProgress()

                        needToRestart       = true

                        break
                    }
                }
            } while (!iteratorValue.done)

        } while (needToRestart)

        await this.commit()

        this.isPropagating          = false

        this.onPropagationCompleted(PropagationResult.Completed)

        return PropagationResult.Completed
    }


    onPropagationCompleted (result : PropagationResult) {
        this.propagateCompletedListeners.forEach(listener => listener(result))

        this.propagateCompletedListeners    = []
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

                            value = `Set(${collection && collection.size || 0})`;
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
                cycle   = cycleInfo(stack) as Node[]

                cycle = cycleInfo(stack).reduce(
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

export const MinimalChronoGraph = ChronoGraph(Graph(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(Base)))))))
export type MinimalChronoGraph  = InstanceType<typeof MinimalChronoGraph>
