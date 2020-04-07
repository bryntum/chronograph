var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Base } from "../class/BetterMixin.js";
import { CalculationGen, CalculationSync } from "../primitives/Calculation.js";
import { prototypeValue } from "../util/Helpers.js";
import { ProposedOrPrevious } from "./Effect.js";
import { Quark } from "./Quark.js";
//---------------------------------------------------------------------------------------------------------------------
/**

Levels of the [[Identifier|identifiers]] as simple integers. Defines the order of calculation, enforced by the following rule -
all lower level identifiers should be already calculated before the calculation of the identifier with the higher level starts.

Because of this, the lower level identifiers can not depend on higher level identifiers.

This rule means that effects from all identifiers of the lower levels will be already processed, when calculating
an identifier of the higher level.

Normally you don't need to specify a level for your identifiers.

*/
export var Levels;
(function (Levels) {
    // must be sync
    Levels[Levels["UserInput"] = 0] = "UserInput";
    Levels[Levels["DependsOnlyOnUserInput"] = 1] = "DependsOnlyOnUserInput";
    Levels[Levels["DependsOnlyOnDependsOnlyOnUserInput"] = 2] = "DependsOnlyOnDependsOnlyOnUserInput";
    // asynchronicity starts from here
    Levels[Levels["DependsOnSelfKind"] = 3] = "DependsOnSelfKind";
})(Levels || (Levels = {}));
//---------------------------------------------------------------------------------------------------------------------
/**
 * The base class for [[Identifier|identifiers]]. It contains only "meta" properties that describes "abstract" identifier.
 * The [[Field]] class inherit from this class.
 *
 * To understand the difference between the "abstract" identifier and the "specific" identifier,
 * imagine a set of instances of the same entity class. Lets say that class has a field "name".
 * All of those instances each will have different "specific" identifiers for the field "name".
 *
 * In the same time, some properties are common for all "specific" identifiers, like [[Meta.equality|equality]], [[Meta.lazy|lazy]] etc.
 * Such properties, that does not change between every "specific" identifier we will call "meta" properties.
 *
 * This class has 2 generic arguments - `ValueT` and `ContextT`. The 1st one defines the type of the identifier's value.
 * The 2nd - the identifier's computation context (synchronous of generator).
 */
export class Meta extends Base {
    constructor() {
        super(...arguments);
        /**
         * The name of the identifiers. Not an id, does not imply uniqueness.
         */
        this.name = undefined;
        /**
         * Whether this identifier is lazy (`true`) or strict (`false`).
         *
         * Lazy identifiers are calculated on-demand (when read from graph or used by another identifiers).
         *
         * Strict identifiers will be calculated on read or during the [[ChronoGraph.commit|commit]] call.
         */
        this.lazy = false;
        // no cancels
        this.total = true;
        // no "nested" writes
        this.pure = true;
        this.proposedValueIsBuilt = false;
    }
    /**
     * The calculation function of the identifier. Its returning value has a generic type, that is converted to a specific type,
     * based on the generic attribute `ContextT`.
     *
     * This function will receive a single argument - current calculation context (effects handler).
     *
     * When using generators, there's no need to use this handler - one can "yield" the value directly, using the `yield` construct.
     *
     * Compare:
     *
     *     class Author extends Entity.mix(Base) {
     *         @field()
     *         firstName       : string
     *         @field()
     *         lastName        : string
     *         @field()
     *         fullName        : string
     *
     *         @calculate('fullName')
     *         * calculateFullName () : ChronoIterator<string> {
     *             return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
     *         }
     *
     *         @calculate('fullName')
     *         calculateFullName (Y) : string {
     *             return Y(this.$.firstName) + ' ' + Y(this.$.lastName)
     *         }
     *     }
     *
     * @param Y
     */
    calculation(Y) {
        throw new Error("Abstract method `calculation` called");
    }
    /**
     * The equality check of the identifier. By default is performed with `===`.
     *
     * @param v1 First value
     * @param v2 Second value
     */
    equality(v1, v2) {
        return v1 === v2;
    }
}
__decorate([
    prototypeValue(Levels.DependsOnSelfKind)
], Meta.prototype, "level", void 0);
__decorate([
    prototypeValue(true)
], Meta.prototype, "sync", void 0);
//---------------------------------------------------------------------------------------------------------------------
/**
 * The generic "specific" identifier class (see [[Meta]] for "abstract" properties). This class is generic in the sense that it does not
 * specify the type of the calculation function - it can be either synchronous or generator-based.
 *
 * It is also low-level and generally not supposed to be used directly in the application. Instead, one should
 * declare identifiers as fields (decorated class properties) in the [[Replica|replica]].
 */
export class Identifier extends Meta {
    constructor() {
        super(...arguments);
        /**
         * The scope (`this` value) for the calculation function.
         */
        this.context = undefined;
    }
    newQuark(createdAt) {
        // micro-optimization - we don't pass a config object to the `new` constructor
        // but instead assign directly to instance
        const newQuark = this.quarkClass.new();
        newQuark.createdAt = createdAt;
        newQuark.identifier = this;
        newQuark.needToBuildProposedValue = this.proposedValueIsBuilt;
        return newQuark;
    }
    write(me, transaction, quark, proposedValue, ...args) {
        quark = quark || transaction.getWriteTarget(me);
        quark.proposedValue = proposedValue;
        quark.proposedArguments = args.length > 0 ? args : undefined;
    }
    writeToTransaction(transaction, proposedValue, ...args) {
        transaction.write(this, proposedValue, ...args);
    }
    /**
     * Write a value to this identifier, in the context of `graph`.
     *
     * @param graph
     * @param proposedValue
     * @param args
     */
    writeToGraph(graph, proposedValue, ...args) {
        graph.write(this, proposedValue, ...args);
    }
    /**
     * Read the value of this identifier, in the context of `graph`, asynchronously
     * @param graph
     */
    readFromGraphAsync(graph) {
        return graph.readAsync(this);
    }
    /**
     * Read the value of this identifier, in the context of `graph`, synchronously
     * @param graph
     */
    readFromGraph(graph) {
        return graph.read(this);
    }
    readFromTransaction(transaction) {
        return transaction.read(this);
    }
    readFromTransactionAsync(transaction) {
        return transaction.readAsync(this);
    }
    // readFromGraphDirtySync (graph : CheckoutI) : ValueT {
    //     return graph.readDirty(this)
    // }
    buildProposedValue(me, quark, transaction) {
        return undefined;
    }
    /**
     * Template method, which is called, when this identifier first "enters" the graph.
     *
     * @param graph
     */
    enterGraph(graph) {
    }
    /**
     * Template method, which is called, when this identifier "leaves" the graph.
     *
     * @param graph
     */
    leaveGraph(graph) {
    }
}
/**
 * Constructor for the [[Identifier]] class. Used only for typization purposes, to be able to specify the generics arguments.
 */
export const IdentifierC = (config) => Identifier.new(config);
//@ts-ignore
export const QuarkSync = Quark.mix(CalculationSync.mix(Map));
//@ts-ignore
export const QuarkGen = Quark.mix(CalculationGen.mix(Map));
//---------------------------------------------------------------------------------------------------------------------
/**
 * Variable is a subclass of [[Identifier]], that does not perform any calculation and instead is always equal to a user-provided value.
 * It is a bit more light-weight
 */
export class Variable extends Identifier {
    calculation(YIELD) {
        throw new Error("The 'calculation' method of the variables will never be called. Instead the value will be set directly to quark");
    }
    write(me, transaction, quark, proposedValue, ...args) {
        quark = quark || transaction.getWriteTarget(me);
        quark.value = proposedValue;
        quark.proposedArguments = args.length > 0 ? args : undefined;
    }
}
__decorate([
    prototypeValue(Levels.UserInput)
], Variable.prototype, "level", void 0);
__decorate([
    prototypeValue(QuarkSync)
], Variable.prototype, "quarkClass", void 0);
/**
 * Constructor for the [[Variable]] class. Used only for typization purposes.
 */
export function VariableC(...args) {
    return Variable.new(...args);
}
//---------------------------------------------------------------------------------------------------------------------
/**
 * Subclass of the [[Identifier]], representing synchronous computation.
 */
export class CalculatedValueSync extends Identifier {
    calculation(YIELD) {
        return YIELD(ProposedOrPrevious);
    }
}
__decorate([
    prototypeValue(QuarkSync)
], CalculatedValueSync.prototype, "quarkClass", void 0);
/**
 * Constructor for the [[CalculatedValueSync]] class. Used only for typization purposes.
 */
export function CalculatedValueSyncC(...args) {
    return CalculatedValueSync.new(...args);
}
//---------------------------------------------------------------------------------------------------------------------
/**
 * Subclass of the [[Identifier]], representing generator-based computation.
 */
export class CalculatedValueGen extends Identifier {
    *calculation(YIELD) {
        return yield ProposedOrPrevious;
    }
}
__decorate([
    prototypeValue(QuarkGen)
], CalculatedValueGen.prototype, "quarkClass", void 0);
/**
 * Constructor for the [[CalculatedValueGen]] class. Used only for typization purposes.
 */
export function CalculatedValueGenC(...args) {
    return CalculatedValueGen.new(...args);
}
//---------------------------------------------------------------------------------------------------------------------
export const throwUnknownIdentifier = (identifier) => { throw new Error(`Unknown identifier ${identifier}`); };
