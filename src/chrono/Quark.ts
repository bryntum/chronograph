import { AnyConstructor, Mixin, MixinConstructor } from "../class/Mixin.js"
import { NOT_VISITED } from "../graph/WalkDepth.js"
import { CalculationContext, Context, GenericCalculation } from "../primitives/Calculation.js"
import { MAX_SMI } from "../util/Helpers.js"
import { Identifier, NoProposedValue } from "./Identifier.js"
import { YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export enum EdgeType {
    Normal      = 0,
    Past        = 1
}


//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<Map<any, EdgeType> & GenericCalculation<Context, any, any, [ CalculationContext<YieldableValue>, ...any[] ]>>>(base : T) =>

class Quark extends base {

    static new<T extends typeof Quark> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }

    identifier      : Identifier        = undefined

    // quark state
    value                   : any       = undefined
    proposedValue           : any       = undefined
    proposedArguments       : any[]     = undefined
    usedProposedOrCurrent   : boolean   = false
    // eof quark state

    previous        : Quark        = undefined
    origin          : Quark        = undefined

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


    getQuark () : Quark {
        if (this.origin) return this.origin

        return this.origin = this
    }


    acquireQuark () : Quark {
        return this.origin = this
    }


    get outgoing () : Map<Quark, EdgeType> {
        return this as Map<Quark, EdgeType>
    }


    getOutgoing () : Map<Quark, EdgeType> {
        return this as Map<Quark, EdgeType>
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


    hasProposedValue () : boolean {
        if (this.isShadow()) return false

        return this.hasProposedValueInner()
    }


    hasProposedValueInner () : boolean {
        return this.proposedValue !== undefined && this.proposedValue !== NoProposedValue
    }


    setProposedValue (value : any) {
        if (this.origin && this.origin !== this) throw new Error('Can not set proposed value to the shadow entry')

        this.proposedValue = value
    }


    getProposedValue (transaction /*: TransactionI*/) : any {
        if (this.proposedValue !== undefined) return this.proposedValue

        return this.proposedValue = this.identifier.buildProposedValue.call(this.identifier.context || this.identifier, this.identifier, transaction)
    }
}

export type Quark = Mixin<typeof Quark>

export type QuarkConstructor = MixinConstructor<typeof Quark>

export interface QuarkI extends Quark {}

//---------------------------------------------------------------------------------------------------------------------
export const TombStone = Symbol('Tombstone')
