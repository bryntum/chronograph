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

export type PropagationState        = {
    changedAtoms            : ChronoAtom[],
    calculationStartedAtoms : ChronoAtom[],
    atomsPropagationInfo    : Map<ChronoAtom, AtomPropagationInfo>
}

//---------------------------------------------------------------------------------------------------------------------
export enum PropagationResult {
    Canceled,
    Completed
}


//---------------------------------------------------------------------------------------------------------------------
type AtomPropagationInfo = {
    visited             : boolean,
    continuation        : ChronoContinuation,
    stable              : boolean,
    newValue            : ChronoValue,
    changed             : boolean
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Graph>>(base : T) =>

class ChronoGraph extends base {
    nodeT                   : ChronoAtomI

    nodesMap                : Map<ChronoId, ChronoAtomI> = new Map()

    needRecalculationAtoms  : Set<ChronoAtomI>       = new Set()

    isPropagating           : boolean               = false

    propagateCompletedListeners : AnyFunction[]     = []


    isAtomNeedRecalculation (atom : ChronoAtomI) : boolean {
        return this.needRecalculationAtoms.has(atom)
    }


    markAsNeedRecalculation (atom : ChronoAtomI) {
        this.needRecalculationAtoms.add(atom)
    }


    commit (propagationState : PropagationState) {
        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()

        propagationState.changedAtoms.forEach(atom => atom.commitValue())

        // the edges might have changed, even the atom value itself did not
        // because of that, we commit the edges for all atoms, which we started to compute (at completed, because this is commit)
        propagationState.calculationStartedAtoms.forEach(atom => atom.commitEdges())
    }


    reject (propagationState : PropagationState) {
        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()

        this.rejectPartialProgress(propagationState)
    }


    rejectPartialProgress (propagationState : PropagationState) {
        propagationState.calculationStartedAtoms.forEach(atom => atom.reject())
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

        node.onLeaveGraph(this)

        return res
    }


    startAtomCalculation (sourceAtom : ChronoAtomI) : ChronoIterationResult {
        const proposedValue     = sourceAtom.proposedValue
        const iterator : ChronoIterator<ChronoValue> =
            sourceAtom.calculation
            ?
            sourceAtom.calculation.call(sourceAtom.calculationContext || sourceAtom, proposedValue)
            :
            sourceAtom.calculate(proposedValue)

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


    continueAtomCalculation (sourceAtom : ChronoAtomI, continuation : ChronoContinuation, atomsPropagationInfo : Map<ChronoAtomI, AtomPropagationInfo>) : ChronoIterationResult {
        const me            = this
        const iterator      = continuation.iterator

        let incomingAtom    = continuation.atom

        let propagationInfo = atomsPropagationInfo.get(incomingAtom)

        do {
            let iteratorValue : IteratorResult<Effect | ChronoAtom | ChronoValue>

            if (incomingAtom) {
                sourceAtom.observedDuringCalculation.push(incomingAtom)

                // Cycle condition
                // ideally should be removed (same as while condition)
                if (propagationInfo && !propagationInfo.stable) {
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

            propagationInfo = atomsPropagationInfo.get(incomingAtom)

        } while (!propagationInfo || propagationInfo.stable)

        return { continuation : { iterator, atom : incomingAtom } }
    }


    * propagateSingle () : IterableIterator<Effect | PropagationState> {
        const calculationStack  = []

        const atomsPropagationInfo : Map<ChronoAtom, AtomPropagationInfo> = new Map()

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

                // create filled object in assumption that will
                // prevent memory allocation - since this map may have huge amount
                // of entries
                atomsPropagationInfo.set(atom, {
                    changed         : false,
                    continuation    : null,
                    newValue        : undefined,
                    stable          : false,
                    visited         : false
                })

                calculationStack.push(atom)
            }
        }))

        if (cycle) {
            return GraphCycleDetectedEffect.new({ cycle })
        }

        const changedAtoms              = []
        const calculationStartedAtoms   = []

        while (calculationStack.length) {
            const sourceAtom : ChronoAtom   = calculationStack[ calculationStack.length - 1 ]

            const propagationInfo   = atomsPropagationInfo.get(sourceAtom)

            if (!propagationInfo || propagationInfo.stable) {
                calculationStack.pop()
                continue
            }

            let calcRes : ChronoIterationResult

            // node has been already visited
            if (propagationInfo.visited) {
                calcRes                 = this.continueAtomCalculation(sourceAtom, propagationInfo.continuation, atomsPropagationInfo)
            } else {
                propagationInfo.visited = true

                calculationStartedAtoms.push(sourceAtom)

                calcRes                 = this.startAtomCalculation(sourceAtom)
            }

            if (calcRes.effect) {
                calcRes.effect.propagationState = { changedAtoms, atomsPropagationInfo, calculationStartedAtoms }

                yield calcRes.effect
            }

            if (calcRes.continuation) {
                propagationInfo.continuation    = calcRes.continuation

                const atom  = calcRes.continuation.atom

                if (atom) {
                    // this line is necessary for cycles visualization to work correctly, strictly it is not needed,
                    // because in non-cycle scenario "observedDuringCalculation" is filled in the `continueAtomCalculation`
                    sourceAtom.observedDuringCalculation.push(atom)

                    calculationStack.push(atom)
                }
            } else {
                const consistentValue   = propagationInfo.newValue = calcRes.value

                if (!sourceAtom.equality(consistentValue, sourceAtom.getConsistentValue())) {
                    changedAtoms.push(sourceAtom)
                    propagationInfo.changed     = true

                    sourceAtom.nextStableValue  = consistentValue
                }

                propagationInfo.stable          = true

                calculationStack.pop()
            }
        }

        return { changedAtoms, atomsPropagationInfo, calculationStartedAtoms } as PropagationState
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

        let value   : Effect | PropagationState

        do {
            needToRestart           = false

            const propagationIterator = this.propagateSingle()

            let iteratorValue

            do {
                iteratorValue       = propagationIterator.next()

                value               = iteratorValue.value

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
                        this.reject(value.propagationState)
                        this.isPropagating  = false
                        await this.propagationCompletedHook()
                        this.onPropagationCompleted(PropagationResult.Canceled)

                        return PropagationResult.Canceled
                    }
                    else if (resolutionResult === EffectResolutionResult.Restart) {
                        this.rejectPartialProgress(value.propagationState)

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
            this.reject(value as PropagationState)
            this.isPropagating = false
            await this.propagationCompletedHook()
            this.onPropagationCompleted(PropagationResult.Completed)

            result = PropagationResult.Completed
        }
        else {
            // POST-PROPAGATE sequence, TODO refactor
            this.commit(value as PropagationState)
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

                        let color = (!this.isAtomNeedRecalculation(atom) /*|| this.isAtomStable(atom)*/) ? 'darkgreen' : 'red'

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

                        let color = (!this.isAtomNeedRecalculation(fromAtom) /*|| this.isAtomStable(fromAtom)*/) ? 'darkgreen' : 'red'
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
