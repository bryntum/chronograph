import { AnyConstructor, Mixin, MixinConstructor } from "../class/Mixin.js"
import { NOT_VISITED } from "../graph/WalkDepth.js"
import { CalculationContext, Context, GenericCalculation } from "../primitives/Calculation.js"
import { MAX_SMI } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { Quark } from "./Quark.js"


export const QuarkEntry = <T extends AnyConstructor<Set<QuarkEntryI> & GenericCalculation<Context, any, any, [ CalculationContext<any>, ...any[] ]>>>(base : T) =>

class QuarkEntry extends base {

    static new<T extends typeof QuarkEntry> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }

    identifier      : Identifier        = null

    // quark state
    value                   : any       = undefined
    proposedValue           : any       = undefined
    usedProposedOrCurrent   : boolean   = false
    // eof quark state

    previous        : QuarkEntryI       = null
    origin          : QuarkEntryI       = null

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


    cleanup (includingQuark : boolean) {
        this.previous           = null

        if (includingQuark) this.origin = null

        this.cleanupCalculation()
    }


    isTransitioning () : boolean {
        return Boolean(this.iterationResult)
    }


    isShadow () : boolean {
        return Boolean(this.origin && this.origin !== this)
    }


    getQuark () : QuarkEntry {
        if (this.origin) return this.origin

        return this.origin = this
    }


    get outgoing () : Set<QuarkEntryI> {
        return this
    }


    getOutgoing () : Set<QuarkEntryI> {
        return this
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
