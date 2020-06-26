import { globalContext } from "../GlobalContext.js"
import { getRevision } from "../atom/Node.js"
import { Atom, AtomState, Quark } from "../atom/Quark.js"


//---------------------------------------------------------------------------------------------------------------------
// TODO add <V> generic arg
export class BoxImmutable extends Quark {
    value               : unknown               = undefined

    constructor (owner : Atom) {
        super()

        this.owner      = owner
    }


    hasValue () : boolean {
        return this.read() !== undefined
    }


    hasOwnValue () : boolean {
        return this.value !== undefined
    }


    read () : any {
        let box : this = this

        while (box) {
            if (box.value !== undefined) return box.value

            box     = box.previous
        }

        return null
    }


    // TODO
    readRaw () : any {
        let box : this = this

        while (box) {
            if (box.value !== undefined) return box.value

            box     = box.previous
        }

        return undefined
    }


    write (value : unknown) {
        if (this.frozen) throw new Error("Can't write to frozen box")

        this.value = value
    }
}


const ZeroBoxImmutable = new BoxImmutable(undefined)
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
    immutable              : BoxImmutable     = this.buildDefaultImmutable()


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

        if (value === this.immutable.read()) return

        this.propagatePossiblyStale()
        this.propagateStale()

        this.immutableForWrite().write(value)
        this.immutable.revision = getRevision()
        this.state  = AtomState.UpToDate
    }
}

const ZeroBox = new Box()

ZeroBoxImmutable.owner = ZeroBox

