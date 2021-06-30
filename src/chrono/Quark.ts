import { AnyConstructor, MixinAny } from "../class/Mixin.js"
import { NOT_VISITED } from "../graph/WalkDepth.js"
import { CalculationContext, Context, GenericCalculation } from "../primitives/Calculation.js"
import { MAX_SMI, MIN_SMI } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { Revision, Scope } from "./Revision.js"
import { Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export enum EdgeType {
    Normal      = 1,
    Past        = 2
}

// TODO: combine all boolean flags into single SMI bitmap (field & 8 etc)

export type OriginId    = number

let ORIGIN_ID : OriginId    = 0

//---------------------------------------------------------------------------------------------------------------------
export class Quark extends MixinAny(
    [ Map ],
    (base : AnyConstructor<Map<any, any> & GenericCalculation<Context, any, any, [ CalculationContext<YieldableValue>, ...any[] ]>>) =>

class Quark extends base {

    static new<T extends typeof Quark> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        props && Object.assign(instance, props)

        return instance as InstanceType<T>
    }

    // required
    createdAt       : Revision          = undefined

    identifier      : Identifier        = undefined

    // quark state
    value                   : any       = undefined
    proposedValue           : any       = undefined
    proposedArguments       : any[]     = undefined
    usedProposedOrPrevious   : boolean   = false
    // eof quark state

    previous        : Quark             = undefined
    origin          : Quark             = undefined
    originId        : OriginId          = MIN_SMI

    needToBuildProposedValue    : boolean = false

    edgesFlow       : number = 0
    visitedAt       : number = NOT_VISITED
    visitEpoch      : number = 0

    promise         : Promise<any>      = undefined


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

        this.usedProposedOrPrevious          = false

        this.cleanupCalculation()
        // if there's no value, then generally should be no outgoing edges
        // (which indicates that the value has been used somewhere else)
        // but there might be outgoing "past" edges, created if `HasProposedValue`
        // or similar effect has been used on the identifier
        // if (this.value !== undefined) this.clearOutgoing()

        // the `this.value !== undefined` condition above smells very "monkey-patching"
        // it was probably solving some specific problem in Gantt/SchedulerPro
        // (engine tests seems to pass w/o it)
        // in general, should always clear the outgoing edges on new epoch
        this.clearOutgoing()

        this.promise                        = undefined

        if (this.origin && this.origin === this) {
            this.proposedArguments          = undefined

            // only overwrite the proposed value if the actual value has been already calculated
            // otherwise, keep the proposed value as is
            if (this.value !== undefined) {
                this.proposedValue          = this.value
            }

            this.value                      = undefined
        }
        else {
            this.origin                     = undefined

            this.value                      = undefined
        }

        if (this.identifier.proposedValueIsBuilt && this.proposedValue !== TombStone) {
            this.needToBuildProposedValue   = true
            this.proposedValue              = undefined
        }
    }


    copyFrom (origin : Quark) {
        this.value                  = origin.value
        this.proposedValue          = origin.proposedValue
        this.proposedArguments      = origin.proposedArguments
        this.usedProposedOrPrevious = origin.usedProposedOrPrevious
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

        if (origin.$outgoingPast !== undefined) {
            const outgoingPast      = this.getOutgoingPast()

            for (const [ identifier, quark ] of origin.getOutgoingPast()) {
                const ownOutgoing       = outgoingPast.get(identifier)

                if (!ownOutgoing) {
                    const latest        = latestScope.get(identifier)

                    if (!latest || latest.originId === quark.originId) outgoingPast.set(identifier, latest || quark)
                }
            }
        }

        // changing `origin`, but keeping `originId`
        this.origin                 = this

        // some help for garbage collector
        origin.clearProperties()
        origin.clear()
    }


    // mergePreviousIntoItself () {
    //     const origin                = this.origin
    //
    //     if (origin === this.previous) {
    //         this.mergePreviousOrigin(this)
    //     } else {
    //
    //     }
    //
    //     // this.copyFrom(origin)
    //     //
    //     // const outgoing              = this.getOutgoing()
    //     //
    //     // for (const [ identifier, quark ] of origin.getOutgoing()) {
    //     //     const ownOutgoing       = outgoing.get(identifier)
    //     //
    //     //     if (!ownOutgoing) {
    //     //         const latest        = latestScope.get(identifier)
    //     //
    //     //         if (!latest || latest.originId === quark.originId) outgoing.set(identifier, latest || quark)
    //     //     }
    //     // }
    //     //
    //     // // changing `origin`, but keeping `originId`
    //     // this.origin                 = this
    //     //
    //     // // some help for garbage collector
    //     // origin.clearProperties()
    //     // origin.clear()
    // }


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


    $outgoingPast       : Map<Identifier, Quark>        = undefined

    getOutgoingPast () : Map<Identifier, Quark> {
        if (this.$outgoingPast !== undefined) return this.$outgoingPast

        return this.$outgoingPast = new Map()
    }


    addOutgoingTo (toQuark : Quark, type : EdgeType) {
        const outgoing      = type === EdgeType.Normal ? this as Map<Identifier, Quark> : this.getOutgoingPast()

        outgoing.set(toQuark.identifier, toQuark)
    }


    clearOutgoing () {
        this.clear()

        if (this.$outgoingPast !== undefined) this.$outgoingPast.clear()
    }


    getValue () : any {
        return this.origin ? this.origin.value : undefined
    }


    setValue (value : any) {
        if (this.origin && this.origin !== this) throw new Error('Can not set value to the shadow entry')

        this.getOrigin().value = value

        // // @ts-ignore
        // if (value !== TombStone) this.identifier.DATA = value
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


    getProposedValue (transaction : Transaction) : any {
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


    outgoingInTheFutureCb (revision : Revision, forEach : (quark : Quark) => any) {
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


    outgoingInTheFutureAndPastCb (revision : Revision, forEach : (quark : Quark) => any) {
        let current : Quark = this

        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                const latestEntry = revision.getLatestEntryFor(outgoing.identifier)

                if (latestEntry && outgoing.originId === latestEntry.originId) forEach(outgoing)
            }

            if (current.$outgoingPast !== undefined) {
                for (const outgoing of current.$outgoingPast.values()) {
                    const latestEntry = revision.getLatestEntryFor(outgoing.identifier)

                    if (latestEntry && outgoing.originId === latestEntry.originId) forEach(outgoing)
                }
            }

            if (current.isShadow())
                current     = current.previous
            else
                current     = null
        }
    }


    outgoingInTheFutureAndPastTransactionCb (transaction : Transaction, forEach : (quark : Quark) => any) {
        let current : Quark = this

        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                const latestEntry = transaction.getLatestStableEntryFor(outgoing.identifier)

                if (latestEntry && outgoing.originId === latestEntry.originId) forEach(outgoing)
            }

            if (current.$outgoingPast !== undefined) {
                for (const outgoing of current.$outgoingPast.values()) {
                    const latestEntry = transaction.getLatestStableEntryFor(outgoing.identifier)

                    if (latestEntry && outgoing.originId === latestEntry.originId) forEach(outgoing)
                }
            }

            if (current.isShadow())
                current     = current.previous
            else
                current     = null
        }
    }



    // ignores the "past" edges by design, as they do not form cycles
    outgoingInTheFutureTransactionCb (transaction : Transaction, forEach : (quark : Quark) => any) {
        let current : Quark = this

        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                const latestEntry = transaction.getLatestEntryFor(outgoing.identifier)

                if (latestEntry && outgoing.originId === latestEntry.originId) forEach(outgoing)
            }

            if (current.isShadow())
                current     = current.previous
            else
                current     = null
        }
    }

}){}

export type QuarkConstructor    = typeof Quark

//---------------------------------------------------------------------------------------------------------------------
export const TombStone = Symbol('Tombstone')
