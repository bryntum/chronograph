import {Calculable, Atom, ChronoValue, Readable, Writable} from "../chrono/Atom.js";
import {chronoId, ChronoId} from "../chrono/ChronoId.js";
import {MutationData, PureCalculation} from "../chrono/Mutation.js";
import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Node, ObservedBy, Observer} from "../graph/Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const CanBeReferenced = <T extends Constructable<Atom>>(base: T) => {

    abstract class CanBeReferenced extends base {
        id          : ChronoId = chronoId()
    }

    return CanBeReferenced
}
export type CanBeReferenced = Mixin<typeof CanBeReferenced>



//---------------------------------------------------------------------------------------------------------------------
export const Reference = <T extends Constructable<Atom>>(base: T) => {

    abstract class Reference extends base {
        value       : Atom
    }

    return Reference
}
export type Reference = Mixin<typeof Reference>


//---------------------------------------------------------------------------------------------------------------------
export type VersionedNodeConstructor    = MixinConstructor<typeof VersionedNode>

export const VersionedNode = <T extends Constructable<Node & Writable & CanBeReferenced>>(base: T) => {

    abstract class VersionedNode extends base {
        version         : ChronoId = chronoId()

        // can not add edge from `previous`
        previous        : Node & Atom


        set (value : ChronoValue) : this {
            if (this.hasValue()) {
                return this.bump(value)
            } else {
                return super.set(value)
            }
        }


        abstract getNextVersion () : ChronoId


        bump (value: ChronoValue) : this {
            const cls       = <VersionedNodeConstructor>(this.constructor as any)

            return cls.new({ id : this.id, version : this.getNextVersion(), previous : this, value : value }) as this
        }
    }

    return VersionedNode
}
export type VersionedNode = Mixin<typeof VersionedNode>




export const ChronoGraphNode = <T extends Constructable<CanBeReferenced & VersionedNode>>(base: T) => {

    abstract class ChronoGraphNode extends base {

        graph       : ChronoGraphNode


        getNextVersion () : ChronoId {
            return this.graph.version
        }


        joinGraph(graph : this['graph']) {
            if (this.graph) {
                this.unjoinGraph()
            }

            this.graph = graph
        }


        unjoinGraph() {
            delete this.graph
        }
    }

    return ChronoGraphNode
}

export type ChronoGraphNode = Mixin<typeof ChronoGraphNode>


// ChronoGraphNode with minimal dependencies, for type-checking purposes only
export class MinimalChronoGraphNode extends ChronoGraphNode(
    Node(VersionedNode(CanBeReferenced(Node(Observer(ObservedBy(Readable(Writable(Atom(Base)))))))))
) {
    // runCalculation () {}
}




//---------------------------------------------------------------------------------------------------------------------
export type ComparatorFn<T> = (a : T, b : T) => number


//---------------------------------------------------------------------------------------------------------------------
export const Observable = <T extends Constructable<Atom & Readable & Writable & ObservedBy>>(base : T) => {

    abstract class Observable extends base {

        valuesComparator        : ComparatorFn<ChronoValue>


        set (value : ChronoValue) {

            if (this.valuesComparator(this.value, value) !== 0) {
                super.set(value)

                // push changes to observers

                // return this.runCalculation()
            }

            return this
        }
    }

    return Observable
}

export type Observable = Mixin<typeof Observable>


export const MinimalObservable = Observable(ObservedBy(Writable(Readable(Atom(Base)))))

export const UserInput = new MinimalObservable()


// //---------------------------------------------------------------------------------------------------------------------
// export const TraceableRead = <T extends Constructable<ChronoAtom & Readable>>(base : T) => {
//
//     abstract class TraceableRead extends base {
//         get ()              : ChronoValue {
//             this.traceRead()
//
//             return super.get()
//         }
//
//         abstract traceRead ()
//     }
//
//     return TraceableRead
// }
//
// export type TraceableRead = Mixin<typeof TraceableRead>




export const ChronoMutationNode = <T extends Constructable<MinimalChronoGraphNode & MutationData & PureCalculation>>(base: T) => {

    abstract class ChronoMutationNode extends base {

        getFromEdges(): Set<this> {
            const res = []

            this.mapInput(x => res.push(x))

            return new Set<this>([...res])
        }

        getToEdges(): Set<this> {
            return new Set<this>([...<any>(this.as)])
        }
    }

    return ChronoMutationNode
}
export type ChronoMutationNode = Mixin<typeof ChronoMutationNode>


export const GenericChronoMutationNode  = MutationData(Calculable(MinimalChronoGraphNode))




//---------------------------------------------------------------------------------------------------------------------
export const GraphNode2 = <T extends Constructable<Base>>(base: T) => {

    class GraphNode2 extends base {


        values          : Atom[]
    }

    return GraphNode2
}
export type GraphNode2 = Mixin<typeof GraphNode2>
