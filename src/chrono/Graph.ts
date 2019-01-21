import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {WalkableBackwardNode, WalkableForwardNode} from "../graph/Node.js";
import {Walkable, WalkableBackward, WalkableForward} from "../graph/Walkable.js";
import {FieldAtom} from "../replica/Atom.js";
import {ChronoAtom, ChronoIterator, ChronoValue, MinimalChronoAtom} from "./Atom.js";
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

    commit (changedAtoms : ChronoAtom[])
    reject ()
    propagate ()
}


export type ChronoContinuation = { atom : ChronoAtom, iterator? : ChronoIterator }


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends Constructable<Graph>>(base : T) =>

class ChronoGraph extends base implements IChronoGraph {
    // revision            : ChronoRevision

    // isObservingRead     : number        = 0
    // isObservingWrite    : number        = 0

    // readObservationState : ChronoAtom[]         = []

    nodeT               : ChronoAtom

    nodesMap            : Map<ChronoId, ChronoAtom> = new Map()

    needRecalculationAtoms : Set<ChronoAtom>       = new Set()

    stableAtoms         : Set<ChronoAtom>       = new Set()


    processingQueue     : ChronoAtom[]          = []


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


    processNext (atom : ChronoAtom) {
        this.processingQueue.push(atom)
    }


    commit (changedAtoms : ChronoAtom[]) {
        changedAtoms.forEach(atom => atom.commitValue())

        this.stableAtoms.forEach(atom => atom.commitEdges())

        this.needRecalculationAtoms.forEach(atom => atom.proposedValue = undefined)

        this.needRecalculationAtoms.clear()

        this.stableAtoms.clear()
    }


    reject () {
        throw "notyet"

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


    startAtomCalculation (sourceAtom : ChronoAtom) : { value? : ChronoValue, continuation? : ChronoContinuation }
    {
        const iterator      = sourceAtom.calculation.call(
            sourceAtom.calculationContext || sourceAtom,
            sourceAtom.proposedValue
        )

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

        } while (/*!this.isAtomNeedRecalculation(incomingAtom) || */this.isAtomStable(incomingAtom))

        return { continuation : { iterator, atom : incomingAtom } }
    }


    propagate () {
        const toCalculate       = Array.from(this.needRecalculationAtoms)
        // const maybeDirty        = new Set()
        const conts             = new Map<ChronoAtom, ChronoContinuation>()
        const visitedAt         = new Map<ChronoAtom, number>()

        let depth

        const changedAtoms      = []

        while (depth = toCalculate.length) {
            const sourceAtom : ChronoAtom   = toCalculate[ depth - 1 ]

            if (this.isAtomStable(sourceAtom) /*|| !this.isAtomNeedRecalculation(sourceAtom) && !maybeDirty.has(sourceAtom)*/) {
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
                    changedAtoms.push(sourceAtom)

                    sourceAtom.update(consistentValue)

                    toCalculate.unshift.apply(toCalculate, Array.from(sourceAtom.outgoing))
                    // sourceAtom.outgoing.forEach(el => maybeDirty.add(el))
                }

                this.markStable(sourceAtom)

                if (sourceAtom.setterPropagation && !sourceAtom.proposedValue) {
                    sourceAtom.setterPropagation.call(sourceAtom.calculationContext || sourceAtom, consistentValue)
                }

                toCalculate.pop()
            }
        }

        this.commit(changedAtoms)
    }


    toDot() {
        let dot = [
            'digraph ChronoGraph {',
            'splines=splines'
        ]

        const arrAtoms : [ChronoId, ChronoAtom][] = Array.from(this.nodesMap.entries())

        // Group atoms into subgraphs by label

        const namedAtomsByGroup : Map<string, Set<[string, ChronoAtom]>> = arrAtoms.reduce(
            (map, [id, atom]) => {
                let [group, label] = String(id).split('/')

                if ((atom as any).field) {
                    group = (atom as FieldAtom).field.entity.name || (atom as FieldAtom).field.entity.constructor.name
                    label = (atom as FieldAtom).field.name
                }

                if (!map.has(group)) {
                    map.set(group, new Set([[label || '?', atom]]))
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
                            value = `Set(${atom.get().size})`;
                        }
                        else {
                            value = atom.get()
                        }

                        if (value instanceof Date) {
                            value = [value.getFullYear(), '.', value.getMonth() + 1, '.', value.getDate(), ' ', value.getHours() + ':' + value.getMinutes()].join('')
                        }

                        let color = this.isAtomStable(atom) ? 'darkgreen' : 'red'

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

                        let color = this.isAtomStable(fromAtom) ? 'darkgreen' : 'red'

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
