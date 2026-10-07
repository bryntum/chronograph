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

    identifier      : Identifier        = undefined

    // quark state
    value                   : any       = undefined
    proposedValue           : any       = undefined
    proposedIsPrevious      : boolean   = false
    proposedArguments       : any[]     = undefined
    proposeCount            : number    = 0
    usedProposedOrPrevious  : boolean   = false
    writtenValue            : any       = undefined
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
        this.writtenValue           = undefined
        this.proposeCount           = 0
    }


    /**
     * Keep the newer quark's identity: later revisions and an already-created transaction may refer
     * to it. Transfer the old edge maps instead of copying every existing dependent into this quark.
     */
    mergePreviousOrigin (latestScope : Scope) {
        const origin = this.origin

        if (origin !== this.previous) throw new Error("Invalid state")

        this.copyFrom(origin)

        const outgoing = origin.getOutgoing()
        const ownOutgoing = this.getOutgoing()

        this.mergeOutgoing(outgoing, ownOutgoing, latestScope)
        ownOutgoing.clear()
        this.$outgoing = outgoing

        if (origin.$outgoingPast !== undefined) {
            if (this.$outgoingPast !== undefined) {
                this.mergeOutgoing(origin.$outgoingPast, this.$outgoingPast, latestScope)
                this.$outgoingPast.clear()
            }
            else {
                this.mergeOutgoing(origin.$outgoingPast, undefined, latestScope)
            }

            this.$outgoingPast = origin.$outgoingPast
            origin.$outgoingPast = undefined
        }

        this.origin = this

        // The original quark can itself be the transferred Map. Do not clear that storage. On later
        // transfers the origin has a separate backing map, and its own (small) Map can be discarded.
        origin.$outgoing = undefined
        if (outgoing !== origin) Map.prototype.clear.call(origin)
        origin.clearProperties()
    }


    mergeOutgoing (outgoing : Map<Identifier, Quark>, ownOutgoing : Map<Identifier, Quark>, latestScope : Scope) {
        // Preserve the old merge's filtering, but probe changed identifiers when the fan-out is
        // larger than the transaction. A newly recorded edge always takes precedence.
        if (latestScope.size < outgoing.size) {
            for (const [ identifier, latest ] of latestScope) {
                const previous = outgoing.get(identifier)

                if (previous && !ownOutgoing?.has(identifier)) {
                    if (latest.originId === previous.originId) outgoing.set(identifier, latest)
                    else outgoing.delete(identifier)
                }
            }
        }
        else {
            for (const [ identifier, previous ] of outgoing) {
                if (!ownOutgoing?.has(identifier)) {
                    const latest = latestScope.get(identifier)

                    if (latest) {
                        if (latest.originId === previous.originId) outgoing.set(identifier, latest)
                        else outgoing.delete(identifier)
                    }
                }
            }
        }

        if (ownOutgoing) {
            for (const [ identifier, quark ] of ownOutgoing) outgoing.set(identifier, quark)
        }
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


    // A promoted quark owns the preceding origin's Map. Keep the Map interface working too: graph
    // walkers and callers use size/values directly, in addition to the getOutgoing accessor.
    $outgoing : Map<Identifier, Quark> = undefined

    getOutgoing () : Map<Identifier, Quark> {
        return this.$outgoing || this as Map<Identifier, Quark>
    }

    get size () : number {
        return this.$outgoing ? this.$outgoing.size : super.size
    }

    get (identifier : Identifier) : Quark {
        return this.$outgoing ? this.$outgoing.get(identifier) : super.get(identifier)
    }

    has (identifier : Identifier) : boolean {
        return this.$outgoing ? this.$outgoing.has(identifier) : super.has(identifier)
    }

    set (identifier : Identifier, quark : Quark) : this {
        if (this.$outgoing) this.$outgoing.set(identifier, quark)
        else super.set(identifier, quark)

        return this
    }

    delete (identifier : Identifier) : boolean {
        return this.$outgoing ? this.$outgoing.delete(identifier) : super.delete(identifier)
    }

    clear () {
        if (this.$outgoing) this.$outgoing.clear()
        else super.clear()
    }

    keys () : IterableIterator<Identifier> {
        return this.$outgoing ? this.$outgoing.keys() : super.keys()
    }

    values () : IterableIterator<Quark> {
        return this.$outgoing ? this.$outgoing.values() : super.values()
    }

    entries () : IterableIterator<[ Identifier, Quark ]> {
        return this.$outgoing ? this.$outgoing.entries() : super.entries()
    }

    [Symbol.iterator] () : IterableIterator<[ Identifier, Quark ]> {
        return this.entries()
    }

    forEach (callback : (value : Quark, key : Identifier, map : Map<Identifier, Quark>) => void, thisArg? : any) {
        if (typeof callback !== 'function') throw new TypeError('Callback must be a function')

        Map.prototype.forEach.call(this.getOutgoing(), (quark : Quark, identifier : Identifier) => {
            Reflect.apply(callback, thisArg, [ quark, identifier, this ])
        })
    }


    $outgoingPast       : Map<Identifier, Quark>        = undefined

    getOutgoingPast () : Map<Identifier, Quark> {
        if (this.$outgoingPast !== undefined) return this.$outgoingPast

        return this.$outgoingPast = new Map()
    }


    addOutgoingTo (toQuark : Quark, type : EdgeType) {
        const outgoing      = type === EdgeType.Normal ? this.getOutgoing() : this.getOutgoingPast()

        outgoing.set(toQuark.identifier, toQuark)
    }


    clearOutgoing () {
        this.clear()
        this.$outgoing = undefined

        if (this.$outgoingPast !== undefined) this.$outgoingPast.clear()
    }


    getValue () : any {
        const origin = this.origin

        return origin === this
            ? this.value
            : origin
                ? origin.getValue()
                : undefined
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


    getProposedValue (transaction : Transaction) : any {
        if (this.needToBuildProposedValue) {
            this.proposedValue              = this.identifier.buildProposedValue.call(this.identifier.context || this.identifier, this.identifier, this, transaction)
            // setting this flag _after_ attempt to build the proposed value, because it might actually throw
            // (if there's a cycle during sync computation, like during `effectiveDirection`)
            // in such case, we need to re-enter this block
            this.needToBuildProposedValue   = false
        }

        return this.proposedValue
    }


    // Perf: shared helper for outgoing edge iteration with shadow chain traversal.
    // Consolidates the 4 callback methods to reduce code duplication and make
    // optimizations apply once. The `lookup` function resolves an identifier to
    // its latest quark; `includePast` controls whether past edges are iterated.
    outgoingInTheFutureHelper (
        lookup : (identifier : Identifier) => Quark,
        forEach : (quark : Quark) => any,
        includePast : boolean
    ) {
        let current : Quark = this

        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                const latestEntry = lookup(outgoing.identifier)

                if (latestEntry && outgoing.originId === latestEntry.originId) forEach(outgoing)
            }

            if (includePast && current.$outgoingPast !== undefined) {
                for (const outgoing of current.$outgoingPast.values()) {
                    const latestEntry = lookup(outgoing.identifier)

                    if (latestEntry && outgoing.originId === latestEntry.originId) forEach(outgoing)
                }
            }

            if (current.isShadow())
                current     = current.previous
            else
                current     = null
        }
    }


    outgoingInTheFutureCb (revision : Revision, forEach : (quark : Quark) => any) {
        this.outgoingInTheFutureHelper(
            id => revision.getLatestEntryFor(id),
            forEach,
            false
        )
    }


    outgoingInTheFutureAndPastCb (revision : Revision, forEach : (quark : Quark) => any) {
        this.outgoingInTheFutureHelper(
            id => revision.getLatestEntryFor(id),
            forEach,
            true
        )
    }


    outgoingInTheFutureAndPastTransactionCb (transaction : Transaction, forEach : (quark : Quark) => any) {
        this.outgoingInTheFutureHelper(
            id => transaction.getLatestStableEntryFor(id),
            forEach,
            true
        )
    }


    // ignores the "past" edges by design, as they do not form cycles
    outgoingInTheFutureTransactionCb (transaction : Transaction, forEach : (quark : Quark) => any) {
        this.outgoingInTheFutureHelper(
            id => transaction.getLatestEntryFor(id),
            forEach,
            false
        )
    }

}){}

export type QuarkConstructor    = typeof Quark

//---------------------------------------------------------------------------------------------------------------------
export const TombStone = Symbol('Tombstone')
