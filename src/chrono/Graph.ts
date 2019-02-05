import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {WalkableBackwardNode, WalkableForwardNode} from "../graph/Node.js";
import {Walkable, WalkableBackward, WalkableForward, WalkForwardContext} from "../graph/Walkable.js";
import {FieldAtom} from "../replica/Atom.js";
import {ChronoAtom, ChronoIterator, ChronoValue, MinimalChronoAtom} from "./Atom.js";
import {Conflict, ConflictResolutionResult} from "./Conflict.js";
import {ChronoId} from "./Id.js";


//---------------------------------------------------------------------------------------------------------------------
export type ChronoRevision      = number

//---------------------------------------------------------------------------------------------------------------------
// this interface exists only to break the cyclic dependency between Atom / Graph
export interface IChronoGraph {
    // revision            : ChronoRevision

    // isObservingRead     : number
    // isObservingWrite    : number
    //
    // onReadObserved (atom : ChronoAtom)
    // onWriteObserved (atom : ChronoAtom)
    //
    // startReadObservation ()
    // stopReadObservation () : ChronoAtom[]

    // calculateAtom (atom : ChronoAtom, proposedValue : ChronoValue)

    markAsNeedRecalculation (atom : ChronoAtom)

    // commit ()
    // reject ()
    // propagate () : Promise<any>
}


export type ChronoContinuation      = { atom : ChronoAtom, iterator : ChronoIterator }
export type ChronoIterationResult   = { value? : ChronoValue, continuation? : ChronoContinuation, conflict? : Conflict }
export type PropagateSingleResult   = { success? : true, conflict? : Conflict }


//---------------------------------------------------------------------------------------------------------------------
export enum PropagateResult {
    Cancel,
    Success
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends Constructable<Graph>>(base : T) =>

class ChronoGraph extends base implements IChronoGraph {
    // revision            : ChronoRevision

    // isObservingRead     : number        = 0
    // isObservingWrite    : number        = 0

    // readObservationState : ChronoAtom[]         = []

    nodeT               : ChronoAtom

    nodesMap            : Map<ChronoId, ChronoAtom> = new Map()

    needRecalculationAtoms  : Set<ChronoAtom>       = new Set()
    stableAtoms             : Set<ChronoAtom>       = new Set()

    changedAtoms            : ChronoAtom[]          = []


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
        // atom.intermediateAtoms.forEach(a => this.markAsNeedRecalculation(a))
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


    commit () {
        this.changedAtoms.forEach(atom => atom.commitValue())
        this.changedAtoms   = []

        // the edges might have changed, even the atom value itself did not
        // because of that, we commit the edges for all recalculated atoms (stable atoms)
        this.stableAtoms.forEach(atom => atom.commitEdges())
        this.stableAtoms.clear()

        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()
    }


    reject () {
        this.rejectPartialProgress()

        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput())
        this.needRecalculationAtoms.clear()
    }


    rejectPartialProgress () {
        // stable atoms will include
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
        // console.log(`START ${sourceAtom}`)

        const iterator : ChronoIterator<ChronoValue> = sourceAtom.calculate(sourceAtom.proposedValue)

        let iterValue       = iterator.next()

        const value         = iterValue.value

        if (value instanceof Conflict) {
            return { conflict : value }
        }
        else if (iterValue.done) {
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
            // this.LOG.push( [ sourceAtom, incomingAtom ] )
            //
            // console.log(`CONTINUE ${sourceAtom}, DEP ${incomingAtom}`)

            // const field     = (incomingAtom as MinimalFieldAtom).field
            // console.log(`Observed: ${incomingAtom.calculationContext && incomingAtom.calculationContext.id}, field: ${field && field.name}`)

            sourceAtom.observedDuringCalculation.push(incomingAtom)

            // ideally should be removed (same as while condition)
            if (maybeDirtyAtoms.has(incomingAtom) && !this.isAtomStable(incomingAtom)) throw new Error("Cycle")

            let iterValue   = iterator.next(incomingAtom.hasNextStableValue() ? incomingAtom.getNextStableValue() : incomingAtom.getConsistentValue())

            const value     = iterValue.value

            if (value instanceof Conflict) {
                return { conflict : value }
            }

            if (iterValue.done) {
                return { value }
            }

            // TODO should ignore non-final non-atom values
            incomingAtom    = value

        } while (!maybeDirtyAtoms.has(incomingAtom) || this.isAtomStable(incomingAtom))

        return { continuation : { iterator, atom : incomingAtom } }
    }


    propagateSingle () : PropagateSingleResult {
        const toCalculate       = []
        const maybeDirty        = new Set()
        const conts             = new Map<ChronoAtom, ChronoContinuation>()
        const visitedAt         = new Map<ChronoAtom, number>()

        // this.LOG                = []

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

            if (calcRes.conflict) {
                return { conflict : calcRes.conflict }
            }
            else if (calcRes.continuation) {
                conts.set(sourceAtom, calcRes.continuation)

                // console.log(`REQUEST from ${sourceAtom}, FOR ${calcRes.continuation.atom}`)

                // this line is necessary for cycles visualization to work correctly, strictly it is not needed,
                // because in non-cycle scenario "observedDuringCalculation" is filled in the `continueAtomCalculation`
                sourceAtom.observedDuringCalculation.push(calcRes.continuation.atom)

                toCalculate.push(calcRes.continuation.atom)
            } else {
                const consistentValue   = calcRes.value

                // console.log(`DONE ${sourceAtom}`)
                if (!sourceAtom.equality(consistentValue, sourceAtom.getConsistentValue())) {
                    changedAtoms.push(sourceAtom)

                    sourceAtom.nextStableValue = consistentValue

                    // toCalculate.unshift.apply(toCalculate, Array.from(sourceAtom.outgoing))
                    // sourceAtom.outgoing.forEach(el => maybeDirty.add(el))
                }

                this.markStable(sourceAtom)

                // if (sourceAtom.setterPropagation && !sourceAtom.proposedValue) {
                //     sourceAtom.setterPropagation.call(sourceAtom.calculationContext || sourceAtom, consistentValue)
                // }

                toCalculate.pop()
            }
        }

        this.commit()

        return { success : true }
    }


    async onConflict (conflict : Conflict) : Promise<ConflictResolutionResult> {
        return ConflictResolutionResult.Cancel
    }


    async propagate (onConflict? : (conflict : Conflict) => Promise<ConflictResolutionResult>) : Promise<PropagateResult> {
        let propagationResult : PropagateSingleResult

        do {
            propagationResult   = this.propagateSingle()

            const conflict      = propagationResult.conflict

            if (conflict) {
                let resolutionResult : ConflictResolutionResult

                if (onConflict) {
                    resolutionResult    = await onConflict(conflict)
                } else {
                    resolutionResult    = await this.onConflict(conflict)
                }

                if (resolutionResult === ConflictResolutionResult.Cancel) {
                    this.reject()

                    return PropagateResult.Cancel
                }
                else if (resolutionResult === ConflictResolutionResult.Restart) {
                    this.rejectPartialProgress()
                }
            }

        } while (!propagationResult.success)

        return PropagateResult.Success
    }


    toDot() {
        let dot = [
            'digraph ChronoGraph {',
            'splines=splines'
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

        // Generate edges
        dot = arrAtoms.reduce(
            (dot, [fromId, fromAtom] : [ChronoId, ChronoAtom]) => {

                const outgoingEdges = fromAtom.outgoing

                Array.from(outgoingEdges).reduce(
                    (dot, toAtom : ChronoAtom) => {

                        //let edgeLabel = this.getEdgeLabel(fromId, atom.id)
                        const edgeLabel = ''

                        let color = (!this.isAtomNeedRecalculation(fromAtom) || this.isAtomStable(fromAtom)) ? 'darkgreen' : 'red'

                        dot.push(`"${fromId}" -> "${toAtom.id}" [label="${edgeLabel}", color="${color}"]`)

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

export const MinimalChronoGraph = ChronoGraph(Graph(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(Base)))))))
export type MinimalChronoGraph  = InstanceType<typeof MinimalChronoGraph>
