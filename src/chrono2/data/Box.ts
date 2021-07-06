import { serializable } from "typescript-serializable-mixin/index.js"
import { Atom, AtomState } from "../atom/Atom.js"
import { DefaultMetaBox, Meta } from "../atom/Meta.js"
import { getNextRevision } from "../atom/Node.js"
import { Quark } from "../atom/Quark.js"
import { ChronoGraph, globalGraph } from "../graph/Graph.js"


//---------------------------------------------------------------------------------------------------------------------
@serializable({ id : 'BoxImmutable' })
export class BoxImmutable<V> extends Quark<V> {

    constructor (owner : Atom<V>) {
        super()

        this.owner      = owner
    }


    write (value : V) {
        if (this.frozen) throw new Error("Can't write to frozen box")

        this.value = value
    }

    static zero : BoxImmutable<unknown>
}

BoxImmutable.zero = new BoxImmutable(undefined)
BoxImmutable.zero.freeze()


//---------------------------------------------------------------------------------------------------------------------
// TODO Box should extend both Atom & BoxImmutable as CombinedOwnerAndImmutable
export class BoxUnboundPre<V = unknown> extends Atom<V> {

    static meta : Meta     = DefaultMetaBox


    // this property should be a "real" property, not an accessor, to be optimizable by v8
    immutable              : BoxImmutable<V>


    buildDefaultImmutable () : BoxImmutable<V> {
        const defaultBoxImmutable       = new BoxImmutable<V>(this)

        defaultBoxImmutable.previous    = BoxImmutable.zero as any

        return defaultBoxImmutable
    }


    // do nothing for boxes - boxes are always synchronously up-to-date
    actualize () {
    }


    resetCalculation (keepProposed : boolean) {
    }


    readConsistentOrProposedOrPrevious () : V {
        return this.immutable.read()
    }


    read (graph? : ChronoGraph) : this[ 'V' ] {
        const effectiveGraph    = graph || this.graph
        const activeAtom        = effectiveGraph ? effectiveGraph.activeAtom : undefined
        const self              = this.checkoutSelf()

        if (activeAtom) self.immutableForWrite().addOutgoing(activeAtom.immutable, false)

        return self.immutable.read()
    }


    write (value : V, ...args : any[]) {
        const prevRaw       = this.immutable.readRaw()

        if (this.equality(value, prevRaw) && prevRaw !== undefined) return

        if (value === undefined) value = null

        this.writeConfirmedDifferentValue(value, ...args)
    }


    writeConfirmedDifferentValue (value : V, ...args : any[]) {
        if (this.graph) {
            this.graph.frozen = false
            // start new iteration right away
            this.graph.currentTransaction.immutableForWrite()
        }

        this.userInputRevision          = getNextRevision()

        this.propagateStaleDeep(true)

        this.immutableForWrite().write(value)

        this.immutable.revision         = this.userInputRevision
        this.immutable.valueRevision    = this.userInputRevision

        this.state                      = AtomState.UpToDate

        const graph                     = this.graph

        if (graph) {
            // after the `propagateStaleDeep` above, the new `userInputRevision` has been propagated
            // then we reset the `userInputRevision` of the atom that has triggered the write (activeAtom)
            // so that `propagateStaleShallow` won't cause extra recalculations
            // TODO this is a bit vague, even that all tests passes
            // we probably need some proper way of indicating that calculation of some atom is triggered by another
            // (batchId? - currently its `uniqable` inside the calculation cores)
            if (graph.activeAtom) graph.activeAtom.userInputRevision = this.userInputRevision

            graph.onDataWrite(this)
        }

        if (this.onCommitValueOptimistic) this.onCommitValueOptimistic(value)
    }

}


@serializable({ id : 'BoxUnbound' })
export class BoxUnbound<V = unknown> extends BoxUnboundPre<V> {

    static new<V> (this : typeof BoxUnbound, value? : V, name? : string) : BoxUnbound<V> {
        const instance      = new this() as BoxUnbound<V>

        instance.write(value)
        instance.name       = name

        instance.initialize()

        return instance
    }
}

@serializable({ id : 'Box' })
export class Box<V = unknown> extends BoxUnbound<V> {

    static new<T extends typeof Box, V> (this : T, value? : V, name? : string) : Box<V> {
        return super.new(value, name)
    }

    get boundGraph () : ChronoGraph {
        return globalGraph
    }
}

export const ZeroBox = new BoxUnbound()

ZeroBox.name            = 'ZeroBox'
ZeroBox.immutable       = BoxImmutable.zero
BoxImmutable.zero.owner = ZeroBox
