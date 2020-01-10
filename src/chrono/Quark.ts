import { AnyConstructor, Mixin, MixinConstructor } from "../class/Mixin.js"
import { NOT_VISITED } from "../graph/WalkDepth.js"
import { CalculationContext, Context, GenericCalculation } from "../primitives/Calculation.js"
import { MAX_SMI, MIN_SMI } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { RevisionClock, RevisionI, Scope } from "./Revision.js"
import { YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export enum EdgeType {
    Normal      = 1,
    Past        = 2
}

// TODO: combine all boolean flags into single SMI bitmap (field & 8 etc)

export type OriginId    = number

let ORIGIN_ID : OriginId    = 0

//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<Map<any, any> & GenericCalculation<Context, any, any, [ CalculationContext<YieldableValue>, ...any[] ]>>>(base : T) =>

class Quark extends base {

    static new<T extends typeof Quark> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        props && Object.assign(instance, props)

        return instance as InstanceType<T>
    }

    // required
    createdAt       : RevisionClock     = MAX_SMI

    identifier      : Identifier        = undefined

    // quark state
    value                   : any       = undefined
    proposedValue           : any       = undefined
    proposedArguments       : any[]     = undefined
    usedProposedOrCurrent   : boolean   = false
    // eof quark state

    previous        : Quark             = undefined
    origin          : Quark             = undefined
    originId        : OriginId          = MIN_SMI

    needToBuildProposedValue    : boolean = false

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
        this.cleanupCalculation()
    }


    isShadow () : boolean {
        return Boolean(this.origin && this.origin !== this)
    }


    resetToEpoch (epoch : number) {
        this.visitEpoch     = epoch

        this.visitedAt      = NOT_VISITED
        // we were clearing the edgeFlow on epoch change, however see `030_propagation_2.t.ts` for a counter-example
        // TODO needs some proper solution for edgesFlow + walk epoch combination
        if (this.edgesFlow < 0) this.edgesFlow = 0

        this.usedProposedOrCurrent          = false

        this.cleanupCalculation()
        this.clearOutgoing()

        if (this.origin && this.origin === this) {
            this.proposedArguments          = undefined

            this.proposedValue              = this.value

            this.value                      = undefined
        }
        else {
            this.origin                     = undefined

            this.value                      = undefined
        }

        if (this.identifier.proposedValueIsBuilt) {
            this.needToBuildProposedValue   = true
        }
    }


    copyFrom (origin : Quark) {
        this.value                  = origin.value
        this.proposedValue          = origin.proposedValue
        this.proposedArguments      = origin.proposedArguments
        this.usedProposedOrCurrent  = origin.usedProposedOrCurrent
    }


    clearProperties () {
        this.value                  = undefined
        this.proposedValue          = undefined
        this.proposedArguments      = undefined
    }


    mergePreviousOrigin (latestScope : Scope) {
        const origin                = this.origin

        if (origin !== this.previous) throw new Error("Invalid state")

        this.copyFrom(origin)

        const outgoing              = this.getOutgoing()

        for (const [ identifier, quark ] of origin.getOutgoing()) {
            const ownOutgoing       = outgoing.get(identifier)

            if (!ownOutgoing) {
                const latest        = latestScope.get(identifier)

                if (!latest || latest.originId === quark.originId) outgoing.set(identifier, latest || quark)
            }
        }

        // changing `origin`, but keeping `originId`
        this.origin                 = this

        // some help for garbage collector
        origin.clearProperties()
        origin.clear()
    }


    setOrigin (origin : Quark) {
        this.origin     = origin
        this.originId   = origin.originId
    }


    getOrigin () : Quark {
        if (this.origin) return this.origin

        return this.startOrigin()
    }


    startOrigin () : Quark {
        this.originId   = ORIGIN_ID++

        return this.origin = this
    }


    getOutgoing () : Map<Identifier, Quark> {
        return this as Map<Identifier, Quark>
    }


    // TODO: handle `type`
    addOutgoingTo (toQuark : Quark, type : EdgeType) {
        const self      = this as Map<Identifier, Quark>

        // const existing  = self.get(toQuark.identifier)
        // self.set(toQuark, existing ? existing | type : type)

        self.set(toQuark.identifier, toQuark)
    }


    clearOutgoing () {
        this.clear()
    }


    getValue () : any {
        return this.origin ? this.origin.value : undefined
    }


    setValue (value : any) {
        if (this.origin && this.origin !== this) throw new Error('Can not set value to the shadow entry')

        this.getOrigin().value = value
    }


    hasValue () : boolean {
        return this.getValue() !== undefined
    }


    hasProposedValue () : boolean {
        if (this.isShadow()) return false

        return this.hasProposedValueInner()
    }


    hasProposedValueInner () : boolean {
        return this.proposedValue !== undefined
    }


    // setProposedValue (value : any) {
    //     if (this.origin && this.origin !== this) throw new Error('Can not set proposed value to the shadow entry')
    //
    //     this.proposedValue = value
    // }


    getProposedValue (transaction /*: TransactionI*/) : any {
        if (this.needToBuildProposedValue) {
            this.needToBuildProposedValue   = false

            this.proposedValue = this.identifier.buildProposedValue.call(this.identifier.context || this.identifier, this.identifier, this, transaction)
        }

        return this.proposedValue
    }


    // * outgoingInTheFutureGen (revision : RevisionI) : Generator<Quark, void> {
    //     let current : Quark    = this
    //
    //     while (true) {
    //         for (const outgoing of current.outgoing.keys()) {
    //             if (outgoing === revision.getLatestEntryFor(outgoing.identifier)) yield outgoing
    //         }
    //
    //         if (current.isShadow())
    //             current   = current.previous
    //         else
    //             break
    //     }
    //
    // }


    outgoingInTheFutureCb (revision : RevisionI, forEach : (quark : Quark) => any) {
        let current : Quark = this

        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                if (outgoing.originId === revision.getLatestEntryFor(outgoing.identifier).originId) forEach(outgoing)
            }

            if (current.isShadow())
                current     = current.previous
            else
                current     = null
        }
    }


    outgoingInTheFutureTransactionCb (transaction /*: TransactionI*/, forEach : (quark : Quark) => any) {
        let current : Quark = this

        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                if (outgoing.originId === transaction.getLatestEntryFor(outgoing.identifier).originId) forEach(outgoing)
            }

            if (current.isShadow())
                current     = current.previous
            else
                current     = null
        }
    }

}

export type Quark = Mixin<typeof Quark>

export type QuarkConstructor = MixinConstructor<typeof Quark>

export interface QuarkI extends Mixin<typeof Quark> {}

//---------------------------------------------------------------------------------------------------------------------
export const TombStone = Symbol('Tombstone')
