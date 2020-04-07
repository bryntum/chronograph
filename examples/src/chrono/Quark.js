import { MixinAny } from "../class/BetterMixin.js";
import { NOT_VISITED } from "../graph/WalkDepth.js";
import { MAX_SMI, MIN_SMI } from "../util/Helpers.js";
//---------------------------------------------------------------------------------------------------------------------
export var EdgeType;
(function (EdgeType) {
    EdgeType[EdgeType["Normal"] = 1] = "Normal";
    EdgeType[EdgeType["Past"] = 2] = "Past";
})(EdgeType || (EdgeType = {}));
let ORIGIN_ID = 0;
//---------------------------------------------------------------------------------------------------------------------
export class Quark extends MixinAny([Map], (base) => class Quark extends base {
    constructor() {
        super(...arguments);
        // required
        this.createdAt = undefined;
        this.identifier = undefined;
        // quark state
        this.value = undefined;
        this.proposedValue = undefined;
        this.proposedArguments = undefined;
        this.usedProposedOrPrevious = false;
        // eof quark state
        this.previous = undefined;
        this.origin = undefined;
        this.originId = MIN_SMI;
        this.needToBuildProposedValue = false;
        this.edgesFlow = 0;
        this.visitedAt = NOT_VISITED;
        this.visitEpoch = 0;
        this.promise = undefined;
        this.$outgoingPast = undefined;
    }
    static new(props) {
        const instance = new this();
        props && Object.assign(instance, props);
        return instance;
    }
    get level() {
        return this.identifier.level;
    }
    get calculation() {
        return this.identifier.calculation;
    }
    get context() {
        return this.identifier.context || this.identifier;
    }
    forceCalculation() {
        this.edgesFlow = MAX_SMI;
    }
    cleanup() {
        this.cleanupCalculation();
    }
    isShadow() {
        return Boolean(this.origin && this.origin !== this);
    }
    resetToEpoch(epoch) {
        this.visitEpoch = epoch;
        this.visitedAt = NOT_VISITED;
        // we were clearing the edgeFlow on epoch change, however see `030_propagation_2.t.ts` for a counter-example
        // TODO needs some proper solution for edgesFlow + walk epoch combination
        if (this.edgesFlow < 0)
            this.edgesFlow = 0;
        this.usedProposedOrPrevious = false;
        this.cleanupCalculation();
        // if there's no value, then generally should be no outgoing edges
        // (which indicates that the value has been used somewhere else)
        // but there might be outgoing "past" edges, created if `HasProposedValue`
        // or similar effect has been used on the identifier
        if (this.value !== undefined)
            this.clearOutgoing();
        this.promise = undefined;
        if (this.origin && this.origin === this) {
            this.proposedArguments = undefined;
            // only overwrite the proposed value if the actual value has been already calculated
            // otherwise, keep the proposed value as is
            if (this.value !== undefined) {
                this.proposedValue = this.value;
            }
            this.value = undefined;
        }
        else {
            this.origin = undefined;
            this.value = undefined;
        }
        if (this.identifier.proposedValueIsBuilt && this.proposedValue !== TombStone) {
            this.needToBuildProposedValue = true;
            this.proposedValue = undefined;
        }
    }
    copyFrom(origin) {
        this.value = origin.value;
        this.proposedValue = origin.proposedValue;
        this.proposedArguments = origin.proposedArguments;
        this.usedProposedOrPrevious = origin.usedProposedOrPrevious;
    }
    clearProperties() {
        this.value = undefined;
        this.proposedValue = undefined;
        this.proposedArguments = undefined;
    }
    mergePreviousOrigin(latestScope) {
        const origin = this.origin;
        if (origin !== this.previous)
            throw new Error("Invalid state");
        this.copyFrom(origin);
        const outgoing = this.getOutgoing();
        for (const [identifier, quark] of origin.getOutgoing()) {
            const ownOutgoing = outgoing.get(identifier);
            if (!ownOutgoing) {
                const latest = latestScope.get(identifier);
                if (!latest || latest.originId === quark.originId)
                    outgoing.set(identifier, latest || quark);
            }
        }
        if (origin.$outgoingPast !== undefined) {
            const outgoingPast = this.getOutgoingPast();
            for (const [identifier, quark] of origin.getOutgoingPast()) {
                const ownOutgoing = outgoingPast.get(identifier);
                if (!ownOutgoing) {
                    const latest = latestScope.get(identifier);
                    if (!latest || latest.originId === quark.originId)
                        outgoingPast.set(identifier, latest || quark);
                }
            }
        }
        // changing `origin`, but keeping `originId`
        this.origin = this;
        // some help for garbage collector
        origin.clearProperties();
        origin.clear();
    }
    mergePreviousIntoItself() {
        const origin = this.origin;
        if (origin === this.previous) {
            this.mergePreviousOrigin(this);
        }
        else {
        }
        // this.copyFrom(origin)
        //
        // const outgoing              = this.getOutgoing()
        //
        // for (const [ identifier, quark ] of origin.getOutgoing()) {
        //     const ownOutgoing       = outgoing.get(identifier)
        //
        //     if (!ownOutgoing) {
        //         const latest        = latestScope.get(identifier)
        //
        //         if (!latest || latest.originId === quark.originId) outgoing.set(identifier, latest || quark)
        //     }
        // }
        //
        // // changing `origin`, but keeping `originId`
        // this.origin                 = this
        //
        // // some help for garbage collector
        // origin.clearProperties()
        // origin.clear()
    }
    setOrigin(origin) {
        this.origin = origin;
        this.originId = origin.originId;
    }
    getOrigin() {
        if (this.origin)
            return this.origin;
        return this.startOrigin();
    }
    startOrigin() {
        this.originId = ORIGIN_ID++;
        return this.origin = this;
    }
    getOutgoing() {
        return this;
    }
    getOutgoingPast() {
        if (this.$outgoingPast !== undefined)
            return this.$outgoingPast;
        return this.$outgoingPast = new Map();
    }
    addOutgoingTo(toQuark, type) {
        const outgoing = type === EdgeType.Normal ? this : this.getOutgoingPast();
        outgoing.set(toQuark.identifier, toQuark);
    }
    clearOutgoing() {
        this.clear();
        if (this.$outgoingPast !== undefined)
            this.$outgoingPast.clear();
    }
    getValue() {
        return this.origin ? this.origin.value : undefined;
    }
    setValue(value) {
        if (this.origin && this.origin !== this)
            throw new Error('Can not set value to the shadow entry');
        this.getOrigin().value = value;
    }
    hasValue() {
        return this.getValue() !== undefined;
    }
    hasProposedValue() {
        if (this.isShadow())
            return false;
        return this.hasProposedValueInner();
    }
    hasProposedValueInner() {
        return this.proposedValue !== undefined;
    }
    // setProposedValue (value : any) {
    //     if (this.origin && this.origin !== this) throw new Error('Can not set proposed value to the shadow entry')
    //
    //     this.proposedValue = value
    // }
    getProposedValue(transaction) {
        if (this.needToBuildProposedValue) {
            this.needToBuildProposedValue = false;
            this.proposedValue = this.identifier.buildProposedValue.call(this.identifier.context || this.identifier, this.identifier, this, transaction);
        }
        return this.proposedValue;
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
    outgoingInTheFutureCb(revision, forEach) {
        let current = this;
        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                if (outgoing.originId === revision.getLatestEntryFor(outgoing.identifier).originId)
                    forEach(outgoing);
            }
            if (current.isShadow())
                current = current.previous;
            else
                current = null;
        }
    }
    outgoingInTheFutureAndPastCb(revision, forEach) {
        let current = this;
        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                if (outgoing.originId === revision.getLatestEntryFor(outgoing.identifier).originId)
                    forEach(outgoing);
            }
            if (current.$outgoingPast !== undefined) {
                for (const outgoing of current.$outgoingPast.values()) {
                    if (outgoing.originId === revision.getLatestEntryFor(outgoing.identifier).originId)
                        forEach(outgoing);
                }
            }
            if (current.isShadow())
                current = current.previous;
            else
                current = null;
        }
    }
    outgoingInTheFutureTransactionCb(transaction, forEach) {
        let current = this;
        while (current) {
            for (const outgoing of current.getOutgoing().values()) {
                if (outgoing.originId === transaction.getLatestEntryFor(outgoing.identifier).originId)
                    forEach(outgoing);
            }
            if (current.isShadow())
                current = current.previous;
            else
                current = null;
        }
    }
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export const TombStone = Symbol('Tombstone');
