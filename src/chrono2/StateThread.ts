import { AnyConstructor } from "../class/Mixin.js"
import { Immutable, Owner } from "./data/Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class ChronoBox<V> implements Immutable, Owner<ChronoBox<V>> {
    //region ChronoBox as Immutable
    // this property is a storage for both `previous` and `immutable`
    $reference          : this              = undefined

    get previous () : this {
        if (this.$reference === undefined) return undefined

        return this.$reference.previous
    }

    set previous (value : this) {
        this.$reference = value
    }

    frozen              : boolean           = false

    owner               : Owner<this> & ChronoBox<V> = undefined


    freeze () {
        this.frozen = true
    }


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof ChronoBox>
        const next      = new self()

        next.previous   = this
        next.owner      = this.owner

        return next
    }
    //endregion

    //region ChronoBox as Owner
    get immutable () : ChronoBox<V> {
        return this.$reference === undefined ? this : this.$reference
    }

    set immutable (value : ChronoBox<V>) {
        if (value === this)
            this.$reference = undefined
        else
            // @ts-ignore
            this.$reference = value
    }


    setCurrent (immutable : ChronoBox<V>) {
        if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }
    //endregion


    //region ChronoBox's own interface
    value               : V                 = undefined


    read () : V {
        if (this.value !== undefined) {
            return this.value
        }

        if (this.previous !== undefined) return this.previous.read()

        return null
    }


    write (value : V) {
        if (value === undefined) value = null

        if (this.frozen) {
            const next = this.createNext()

            this.owner.setCurrent(next)

            next.write(value)
        } else {
            this.value  = value
        }
    }


    hasValue () : boolean {
        return this.value !== undefined
    }


    clear () {
        if (this.frozen) throw new Error("Can not clear the frozen box")

        this.value = undefined
    }
}
//
// export const ChronoBoxQuarkC = <V>(config : Partial<ChronoBox<V>>) : ChronoBox<V> =>
//     ChronoBox.new(config) as ChronoBox<V>
//
//
// // TODO: refine
// type SyncEffectHandler = (...args : any[]) => any
//
//
// export class ChronoBox<V> extends Base {
//     //region Meta
//
//     // TODO : move to own class - ChronoBoxMeta
//
//     equality (v1 : V, v2 : V) : boolean {
//         return v1 === v2
//     }
//
//
//     calculation (Y : SyncEffectHandler) {
//
//     }
//
//     //endregion
//
//
//     //region messaging / read / write
//
//     read () : V {
//         return this.box.read()
//     }
//
//
//     write (value : V) {
//         return this.box.write(value)
//     }
//
//
//     onNewValue : Hook<any>
//
//     //endregion
//
//
//     //region transaction
//
//     commit () {
//         this.box.freeze()
//     }
//
//     reject () {
//         if (this.box.previous)
//             this.undo()
//         else
//             this.box.clear()
//     }
//
//     //endregion
//
//     //region threaded state (undo/redo) / garbage collection
//
//     // with this parameter 0 should behave exactly as Mobx box
//     historyLimit        : number    = 0
//
//
//     undo () {
//         if (this.box.previous)
//             this.box = this.box.previous
//         else
//             this.box.clear()
//     }
//
//     redo () {
//
//     }
//     //endregion
// }
//
// export const ChronoBoxAtomC = <V>(config : Partial<ChronoBox<V>>) : ChronoBox<V> =>
//     ChronoBox.new(config) as ChronoBox<V>
