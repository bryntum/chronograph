import { Atom, Quark } from "../atom/Quark.js"

//---------------------------------------------------------------------------------------------------------------------
export type RecordDefinition = object

export class RecordImmutable<Def extends RecordDefinition> extends Quark {

    constructor (owner : Atom) {
        super()

        this.owner      = owner
    }

    value               : Def                 = undefined


    fieldHasValue <FieldName extends keyof Def> (fieldName : FieldName) : boolean {
        return this.get(fieldName) !== undefined
    }


    fieldHasOwnValue <FieldName extends keyof Def> (fieldName : FieldName) : boolean {
        return this.value !== undefined && this.value[ fieldName ] !== undefined
    }


    get <FieldName extends keyof Def> (fieldName : FieldName) : Def[ FieldName ] {
        let record : this = this

        while (record) {
            if (record.value !== undefined) {
                const ownValue  = record.value[ fieldName ]

                if (ownValue !== undefined) return ownValue
            }

            record     = record.previous
        }

        return null
    }


    set <FieldName extends keyof Def> (fieldName : FieldName, value : Def[ FieldName ]) {
        if (this.frozen) throw new Error("Can't write to frozen box")

        if (value === undefined) value = null

        if (this.value === undefined) this.value = {} as any

        this.value[ fieldName ]  = value
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Record<Def extends RecordDefinition> extends Atom {
    //region ChronoBox as Owner
    immutable       : RecordImmutable<Def>        = new RecordImmutable<Def>(this)


    //region ChronoRecordOwner as both ChronoRecordOwner & ChronoRecordImmutable interface

    get <FieldName extends keyof Def> (fieldName : FieldName) : Def[ FieldName ] {
        return this.immutable.get(fieldName)
    }


    set <FieldName extends keyof Def> (fieldName : FieldName, value : Def[ FieldName ]) {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable.set(fieldName, value)
    }
    //endregion
}
