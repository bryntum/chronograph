import { Atom, AtomState } from "../atom/Atom.js"
import { getNextRevision } from "../atom/Node.js"
import { Quark } from "../atom/Quark.js"
import { globalContext } from "../GlobalContext.js"


//---------------------------------------------------------------------------------------------------------------------
export class BoxImmutable<V> extends Quark {
    value               : V                 = undefined

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
export class Box<V = unknown> extends Atom<V> {

    constructor (value? : V, name? : string) {
        super()

        if (value !== undefined) this.write(value)

        this.name   = name
    }


    // this property should be a "real" property, not an accessor, to be optimizable by v8
    immutable              : BoxImmutable<V>


    buildDefaultImmutable () : BoxImmutable<V> {
        const defaultBoxImmutable = new BoxImmutable<V>(this)

        defaultBoxImmutable.previous    = BoxImmutable.zero as any

        return defaultBoxImmutable
    }


    read () : V {
        const activeAtom    = globalContext.activeAtom
        const activeGraph   = activeAtom ? activeAtom.graph : undefined

        // TODO what if active graph is some other graph - not a branch of the current one?
        // probably need `identity` for graphs and check that
        // needs a test case
        if (this.graph && activeGraph && activeGraph !== this.graph) {
            return activeGraph.checkout(this).read()
        }

        if (activeAtom) this.immutableForWrite().addOutgoing(activeAtom.immutable)

        return this.immutable.read()
    }


    write (value : V) {
        if (value === undefined) value = null

        if (this.equality(value, this.immutable.read())) return

        if (this.graph) {
            this.graph.frozen = false
            // start new iteration right away
            this.graph.currentTransaction.immutableForWrite()
        }

        this.stalenessRevision  = getNextRevision()

        this.propagateStaleDeep()

        this.immutableForWrite().write(value)

        this.immutable.revision         = this.stalenessRevision
        this.immutable.valueRevision    = this.stalenessRevision

        this.state              = AtomState.UpToDate

        // after the `propagateStaleDeep` above, the new `stalenessRevision` has been propagated
        // then we reset the `stalenessRevision` of the atom that has triggered the write (activeAtom)
        // so that `propagateStaleShallow` won't cause extra recalculations
        // TODO this is a bit vague, even that all tests passes
        // we probably need some proper way of indicating that calculation of some atom is triggered by another
        // (batchId? - currently its `uniqable` inside the calculation cores)
        if (globalContext.activeAtom) globalContext.activeAtom.stalenessRevision = this.stalenessRevision

        if (this.graph) {
            this.graph.onDataWrite(this, value)
        }
    }
}

export const ZeroBox = new Box()

ZeroBox.name            = 'ZeroBox'
ZeroBox.immutable       = BoxImmutable.zero
BoxImmutable.zero.owner = ZeroBox

