import { AnyConstructor, Mixin, MixinConstructor } from "../class/Mixin.js"
import { NOT_VISITED } from "../graph/WalkDepth.js"
import { CalculationContext, Context, GenericCalculation } from "../primitives/Calculation.js"
import { MAX_SMI } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export const QuarkEntry = <T extends AnyConstructor<Set<any> & GenericCalculation<Context, any, any, [ CalculationContext<YieldableValue>, ...any[] ]>>>(base : T) =>

class QuarkEntry extends base {

    static new<T extends typeof QuarkEntry> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }

    identifier      : Identifier        = undefined

    // quark state
    value                   : any       = undefined
    proposedValue           : any       = undefined
    usedProposedOrCurrent   : boolean   = false
    // eof quark state

    previous        : QuarkEntry        = undefined
    origin          : QuarkEntry        = undefined

    // used by the listeners facility which is under question
    // sameAsPrevious          : boolean = false

    edgesFlow       : number = 0
    visitedAt       : number = NOT_VISITED
    visitEpoch      : number = 0


    get level () : number {
        return this.identifier.level
    }


    get calculation () : this[ 'identifier' ][ 'calculation' ] {
        return this.identifier.calculation
    }


    get context () : any {
        return this.identifier.context || this.identifier
    }


    forceCalculation () {
        this.edgesFlow = MAX_SMI
    }


    cleanup () {
        this.previous           = null

        this.cleanupCalculation()
    }


    isShadow () : boolean {
        return Boolean(this.origin && this.origin !== this)
    }


    getQuark () : QuarkEntry {
        if (this.origin) return this.origin

        return this.origin = this
    }


    acquireQuark () : QuarkEntry {
        return this.origin = this
    }


    get outgoing () : Set<QuarkEntry> {
        return this as Set<QuarkEntry>
    }


    getOutgoing () : Set<QuarkEntry> {
        return this as Set<QuarkEntry>
    }


    getValue () : any {
        return this.origin ? this.origin.value : undefined
    }


    setValue (value : any) {
        if (this.origin && this.origin !== this) throw new Error('Can not set value to the shadow entry')

        this.getQuark().value = value
    }


    hasValue () : boolean {
        return this.getValue() !== undefined
    }
}

export type QuarkEntry = Mixin<typeof QuarkEntry>

export type QuarkEntryConstructor = MixinConstructor<typeof QuarkEntry>

export interface QuarkEntryI extends QuarkEntry {}

//---------------------------------------------------------------------------------------------------------------------
export const TombStone = Symbol('Tombstone')
