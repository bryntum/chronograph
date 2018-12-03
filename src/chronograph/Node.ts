import {Calculable, Atom, ChronoValue, Readable, Writable} from "../chrono/Atom.js";
import {chronoId, ChronoId} from "../chrono/ChronoId.js";
import {Mutation, PureChronoCalculation} from "../chrono/Mutation.js";
import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Node, ObservedBy, Observer} from "../graph/Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const Box = <T extends Constructable<Node & Atom>>(base: T) => {

    abstract class Box extends base {
        id          : ChronoId = chronoId()
    }

    return Box
}
export type Box = Mixin<typeof Box>



//---------------------------------------------------------------------------------------------------------------------
export type VersionedNodeConstructor    = MixinConstructor<typeof VersionedNode>

export const VersionedNode = <T extends Constructable<Node & Atom>>(base: T) => {

    abstract class VersionedNode extends base {
        version         : ChronoId = chronoId()

        // can not add edge from `previous`
        previous        : Node & Atom


        bump(value: ChronoValue): this {
            const cls = <VersionedNodeConstructor>(this.constructor as any)

            return cls.new({value: value, previous: this}) as this
        }
    }

    return VersionedNode
}
export type VersionedNode = Mixin<typeof VersionedNode>




export const ChronoGraphNode = <T extends Constructable<Box & VersionedNode>>(base: T) => {

    abstract class ChronoGraphNode extends base {
        id          : ChronoId = chronoId()

        // this reference may introduce additional workload for garbage collector
        // figure out if it can be removed (in this case, the node has access to the graph only
        // inside the `joinGraph` and `unjoinGraph` methods, which should be enough
        graph       : ChronoGraphNode


        joinGraph(graph: this['graph']) {
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
    Node(VersionedNode(Box(Node(Observer(ObservedBy(Readable(Writable(Atom(Base)))))))))
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




export const ChronoMutationNode = <T extends Constructable<MinimalChronoGraphNode & Mutation & PureChronoCalculation>>(base: T) => {

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


export const GenericChronoMutationNode  = Mutation(Calculable(MinimalChronoGraphNode))
