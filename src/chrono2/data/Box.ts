import { Atom } from "../atom/Atom.js"
import { getNextRevision } from "../atom/Node.js"
import { AtomState, Quark } from "../atom/Quark.js"
import { globalContext } from "../GlobalContext.js"


//---------------------------------------------------------------------------------------------------------------------
// TODO add <V> generic arg
export class BoxImmutable extends Quark {
    value               : unknown               = undefined

    constructor (owner : Atom) {
        super()

        this.owner      = owner
    }


    write (value : unknown) {
        if (this.frozen) throw new Error("Can't write to frozen box")

        this.value = value
    }
}


export const ZeroBoxImmutable = new BoxImmutable(undefined)
ZeroBoxImmutable.freeze()


//---------------------------------------------------------------------------------------------------------------------
// TODO Box should extend both Atom & BoxImmutable as CombinedOwnerAndImmutable
export class Box<V> extends Atom {

    constructor (value? : V, name? : string) {
        super()

        if (value !== undefined) this.write(value)

        this.name   = name
    }


    // this property should be a "real" property, not an accessor, to be optimizable by v8
    immutable              : BoxImmutable


    buildDefaultImmutable () : BoxImmutable {
        const defaultBoxImmutable = new BoxImmutable(this)

        defaultBoxImmutable.previous    = ZeroBoxImmutable

        return defaultBoxImmutable
    }


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


    read () : V {
        if (this.graph && globalContext.activeGraph && globalContext.activeGraph !== this.graph) {
            return globalContext.activeGraph.checkout(this).read()
        }

        if (globalContext.activeQuark) this.immutableForWrite().addOutgoing(globalContext.activeQuark)

        return this.immutable.read() as any
    }


    write (value : V) {
        if (value === undefined) value = null

        if (this.equality(value, this.immutable.read())) return

        if (this.graph) {
            this.graph.frozen = false
            // start new iteration right away
            this.graph.currentTransaction.immutableForWrite()
        }

        this.propagateStaleDeep()

        this.immutableForWrite().write(value)

        this.immutable.revision = getNextRevision()

        this.state              = AtomState.UpToDate
    }
}

export const ZeroBox = new Box()

ZeroBox.name            = 'ZeroBox'
ZeroBox.immutable       = ZeroBoxImmutable
ZeroBoxImmutable.owner  = ZeroBox

