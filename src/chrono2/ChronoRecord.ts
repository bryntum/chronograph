import { Base } from "../class/Base.js"
import { Hook } from "../event/Hook.js"

export type RecordDefinition = object

export class ChronoRecordQuark<V extends RecordDefinition> extends Base {
    previous            : this              = undefined

    value               : V                 = undefined

    frozen              : boolean           = false

    outerContext        : ChronoRecord<V>  = undefined

    refCount            : number            = 0


    get <FieldName extends keyof V> (fieldName : FieldName) : V[ FieldName ] {
        if (this.value !== undefined) {
            const ownValue  = this.value[ fieldName ]

            // if own value === undefined its the same case as the whole `value` is undefined
            // so we fall through
            if (ownValue !== undefined) return ownValue
        }

        if (this.previous !== undefined) return this.previous.get(fieldName)

        return null
    }


    set <FieldName extends keyof V> (fieldName : FieldName, value : V[ FieldName ]) {
        if (value === undefined) value = null

        if (this.frozen && this.value !== undefined) {
            const next = this.createNext()

            this.outerContext.setCurrent(next)

            next.set(fieldName, value)

        } else {
            if (this.value === undefined) this.value = {} as any

            this.value[ fieldName ]  = value
        }
    }


    clear () {
        if (this.frozen) throw new Error("Can not clear the frozen record")

        this.value = undefined
    }


    freeze () {
        this.frozen = true
    }


    createNext () : this {
        this.freeze()

        const cls : typeof ChronoRecordQuark   = this.constructor as any

        const next          = cls.new() as this

        next.previous       = this

        return next
    }
}

export const ChronoRecordQuarkC = <V extends RecordDefinition>(config : Partial<ChronoRecordQuark<V>>) : ChronoRecordQuark<V> =>
    ChronoRecordQuark.new(config) as ChronoRecordQuark<V>


// TODO: refine
type SyncEffectHandler = (...args : any[]) => any


export class ChronoRecord<V extends RecordDefinition> extends Base {
    // atom should have quark merged, so that creation of atom does not have to create quark separately
    // further writes should create regular quarks
    record         : ChronoRecordQuark<V>     = ChronoRecordQuarkC<V>({ outerContext : this })


    setCurrent (record : ChronoRecordQuark<V>) {
        if (record.previous !== this.record) throw new Error("Invalid state thread")

        this.record = record
    }

    //region Meta

    // TODO : move to own class - ChronoRecordMeta

    equality (v1 : V, v2 : V) : boolean {
        return v1 === v2
    }


    calculation (Y : SyncEffectHandler) {

    }

    //endregion


    //region messaging / read / write

    get <FieldName extends keyof V> (fieldName : FieldName) : V[ FieldName ] {
        return this.record.get(fieldName)
    }


    set <FieldName extends keyof V> (fieldName : FieldName, value : V[ FieldName ]) {
        return this.record.set(fieldName, value)
    }


    onNewValue : Hook<any>

    //endregion


    //region transaction

    commit () {
        this.record.freeze()
    }

    reject () {
        if (this.record.previous)
            this.undo()
        else
            this.record.clear()
    }

    //endregion

    //region threaded state (undo/redo) / garbage collection

    // with this parameter 0 should behave exactly as Mobx box
    historyLimit        : number    = 0


    undo () {
        if (this.record.previous)
            this.record = this.record.previous
        else
            this.record.clear()
    }

    redo () {

    }
    //endregion
}

export const ChronoRecordAtomC = <V extends RecordDefinition>(config : Partial<ChronoRecord<V>>) : ChronoRecord<V> =>
    ChronoRecord.new(config) as ChronoRecord<V>
