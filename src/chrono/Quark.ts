import { AnyConstructor, MixinAny } from "../class/Mixin.js"
import { NOT_VISITED } from "../graph/WalkDepth.js"
import { CalculationContext, Context, GenericCalculation } from "../primitives/Calculation.js"
import { MAX_SMI, MIN_SMI } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { Revision, Scope } from "./Revision.js"
import { Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
/**
 * The type of the dependency edge between quarks. Normal edges represent standard computation dependencies.
 * Past edges represent dependencies on the previous value of an identifier (created by effects like `HasProposedValue`).
 * Past edges are excluded from cycle detection since they reference a prior revision.
 */
export enum EdgeType {
    /** Standard computation dependency edge */
    Normal      = 1,
    /** Dependency on a previous revision's value, does not form cycles */
    Past        = 2
}

// TODO: combine all boolean flags into single SMI bitmap (field & 8 etc)

export type OriginId    = number

let ORIGIN_ID : OriginId    = 0

//---------------------------------------------------------------------------------------------------------------------
/**
 * A Quark represents the specific computation state for an [[Identifier]] at a particular [[Revision]].
 *
 * While an [[Identifier]] is a template describing *what* to compute, a Quark is an instance holding the *actual*
 * computed value and computation metadata at a specific point in the graph's history. There can be many quarks
 * per identifier across different revisions.
 *
 * Quark extends `Map` to store outgoing dependency edges (mapping dependent [[Identifier]]s to their [[Quark]]s).
 * A quark tracks its proposed value (user input), computed value, origin (for shadow/copy semantics), and
 * visit state used during graph traversal.
 */
export class Quark extends MixinAny(
    [ Map ],
    (base : AnyConstructor<Map<any, any> & GenericCalculation<Context, any, any, [ CalculationContext<YieldableValue>, ...any[] ]>>) =>

class Quark extends base {

    static new<T extends typeof Quark> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        props && Object.assign(instance, props)

        return instance as InstanceType<T>
    }

    /** The identifier this quark belongs to */
    identifier      : Identifier        = undefined

    // quark state
    /** The computed value of this quark, set after calculation completes */
    value                   : any       = undefined
    /** The proposed (user-written) value, before calculation */
    proposedValue           : any       = undefined
    /** Whether the proposed value is actually the previous computed value */
    proposedIsPrevious      : boolean   = false
    /** Additional arguments passed alongside the proposed value via [[Write]] */
    proposedArguments       : any[]     = undefined
    /** Whether a `ProposedOrPrevious` effect was used during this quark's calculation */
    usedProposedOrPrevious  : boolean   = false
    /** The raw value written via the [[Write]] effect, before calculation */
    writtenValue            : any       = undefined
    // eof quark state

    /** Link to the previous quark for the same identifier in an earlier revision */
    previous        : Quark             = undefined
    /** The origin quark this is derived from. If `origin === this`, this is a fresh (non-shadow) quark */
    origin          : Quark             = undefined
    /** Unique id of the origin, used for fast identity checks without traversing the origin chain */
    originId        : OriginId          = MIN_SMI

    /** Whether the proposed value needs to be rebuilt via `buildProposedValue` before use */
    needToBuildProposedValue    : boolean = false

    /** Counter tracking the number of incoming dependency edges. Used to determine if recalculation is needed. A value of `MAX_SMI` forces recalculation */
    edgesFlow       : number = 0
    /** The visit order during graph traversal, used by the topological sort algorithm */
    visitedAt       : number = NOT_VISITED
    /** The current traversal epoch. When the graph starts a new traversal pass, quarks with stale epochs are reset */
    visitEpoch      : number = 0

    /** A promise for the quark's async computation, if the identifier is async */
    promise         : Promise<any>      = undefined


    /** The calculation level of the associated identifier, defining computation order */
    get level () : number {
        return this.identifier.level
    }


    /** The calculation function from the associated identifier */
    get calculation () : this[ 'identifier' ][ 'calculation' ] {
        return this.identifier.calculation
    }


    /** The `this` context for the calculation function */
    get context () : any {
        return this.identifier.context || this.identifier
    }


    /**
     * Forces this quark to be recalculated on the next transaction pass by setting `edgesFlow` to `MAX_SMI`.
     */
    forceCalculation () {
        this.edgesFlow = MAX_SMI
    }


    /**
     * Cleans up transient calculation state (iterator, stack frame, etc.) after computation completes.
     */
    cleanup () {
        this.cleanupCalculation()
    }


    /**
     * Returns `true` if this quark is a shadow — a lightweight copy that delegates to an origin quark
     * from a previous revision rather than holding its own computed value.
     */
    isShadow () : boolean {
        return Boolean(this.origin && this.origin !== this)
    }


    /**
     * Resets this quark's state for a new traversal epoch. Clears visit state, outgoing edges, and computation
     * artifacts. For origin quarks, the current value is moved to `proposedValue` so the next calculation
     * can use it as the "previous" value.
     */
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


    /** Copies value and proposed state from another quark */
    copyFrom (origin : Quark) {
        this.value                  = origin.value
        this.proposedValue          = origin.proposedValue
        this.proposedArguments      = origin.proposedArguments
        this.usedProposedOrPrevious = origin.usedProposedOrPrevious
    }


    /** Clears all value-related properties to help garbage collection */
    clearProperties () {
        this.value                  = undefined
        this.proposedValue          = undefined
        this.proposedArguments      = undefined
        this.writtenValue           = undefined
    }


    /**
     * Merges the origin quark's state and outgoing edges into this quark, then promotes this quark
     * to be its own origin. Used to flatten the shadow chain and allow the previous origin to be GC'd.
     */
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


    /** Sets this quark's origin and copies the origin's id */
    setOrigin (origin : Quark) {
        this.origin     = origin
        this.originId   = origin.originId
    }


    /** Returns the origin quark, lazily initializing it via [[startOrigin]] if needed */
    getOrigin () : Quark {
        if (this.origin) return this.origin

        return this.startOrigin()
    }


    /** Initializes this quark as its own origin with a fresh unique id */
    startOrigin () : Quark {
        this.originId   = ORIGIN_ID++

        return this.origin = this
    }


    /** Returns the map of normal (non-past) outgoing dependency edges. The quark itself serves as this map since it extends `Map` */
    getOutgoing () : Map<Identifier, Quark> {
        return this as Map<Identifier, Quark>
    }


    /** Lazily-created map of past outgoing edges (dependencies on previous revision values) */
    $outgoingPast       : Map<Identifier, Quark>        = undefined

    /** Returns the map of past outgoing edges, creating it lazily if needed */
    getOutgoingPast () : Map<Identifier, Quark> {
        if (this.$outgoingPast !== undefined) return this.$outgoingPast

        return this.$outgoingPast = new Map()
    }


    /** Adds an outgoing edge to the given quark, routed to either the normal or past edge map based on the edge type */
    addOutgoingTo (toQuark : Quark, type : EdgeType) {
        const outgoing      = type === EdgeType.Normal ? this as Map<Identifier, Quark> : this.getOutgoingPast()

        outgoing.set(toQuark.identifier, toQuark)
    }


    /** Clears both normal and past outgoing edge maps */
    clearOutgoing () {
        this.clear()

        if (this.$outgoingPast !== undefined) this.$outgoingPast.clear()
    }


    /**
     * Returns the computed value of this quark. For shadow quarks, delegates to the origin quark.
     */
    getValue () : any {
        const origin = this.origin

        return origin === this
            ? this.value
            : origin
                ? origin.getValue()
                : undefined
    }


    /**
     * Sets the computed value of this quark. Throws if called on a shadow quark (must set on the origin).
     */
    setValue (value : any) {
        if (this.origin && this.origin !== this) throw new Error('Can not set value to the shadow entry')

        this.getOrigin().value = value

        // // @ts-ignore
        // if (value !== TombStone) this.identifier.DATA = value
    }


    /** Returns `true` if this quark has a computed value */
    hasValue () : boolean {
        return this.getValue() !== undefined
    }


    /** Returns `true` if this quark has a proposed value and is not a shadow */
    hasProposedValue () : boolean {
        if (this.isShadow()) return false

        return this.hasProposedValueInner()
    }


    /** Internal check for proposed value presence, without the shadow guard */
    hasProposedValueInner () : boolean {
        return this.proposedValue !== undefined
    }


    /**
     * Returns the proposed value, lazily building it via `buildProposedValue` if [[needToBuildProposedValue]] is set.
     */
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


    /** Iterates over normal outgoing edges that are still current in the given revision */
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


    /** Iterates over both normal and past outgoing edges that are still current in the given revision */
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


    /** Like [[outgoingInTheFutureAndPastCb]] but resolves latest entries against a [[Transaction]] instead of a [[Revision]] */
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



    /** Iterates over normal (non-past) outgoing edges that are current in the given transaction. Past edges are excluded because they cannot form cycles */
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
/**
 * A sentinel value used to mark an identifier as removed from the graph. When a quark's value is `TombStone`,
 * the identifier is considered no longer present in the revision.
 */
export const TombStone = Symbol('Tombstone')
