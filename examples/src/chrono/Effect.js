var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Base } from "../class/BetterMixin.js";
import { prototypeValue } from "../util/Helpers.js";
//---------------------------------------------------------------------------------------------------------------------
export const BreakCurrentStackExecution = Symbol('BreakCurrentStackExecution');
//---------------------------------------------------------------------------------------------------------------------
/**
 * The base class for effect. Effect is some value, that can be send to the "outer" calculation context, using the
 * effect handler function. Effect handler then will process an effect and return some resulting value.
 *
 * ```ts
 * const identifier  = graph.identifier((Y : SyncEffectHandler) : number => {
 *     const proposedValue : number    = Y(ProposedOrPrevious)
 *
 *     const maxValue : number         = Y(max)
 *
 *     return proposedValue <= maxValue ? proposedValue : maxValue
 * })
 * ```
 */
export class Effect extends Base {
}
__decorate([
    prototypeValue(true)
], Effect.prototype, "sync", void 0);
__decorate([
    prototypeValue(true)
], Effect.prototype, "pure", void 0);
//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrPreviousSymbol = Symbol('ProposedOrPreviousSymbol');
/**
 * The constant that represents a request for either user input (proposed value) or previous value of the
 * identifier, currently being calculated.
 *
 * Important note, is that if an identifier yields a `ProposedOrPrevious` effect and its computed value does not match the value of this effect,
 * it will be re-calculated (computation function called) again on the next read. This is because the value of its `ProposedOrPrevious` input changes.
 *
 * ```ts
 * const graph4 = ChronoGraph.new()
 *
 * const max           = graph4.variable(100)
 *
 * const identifier15  = graph4.identifier((Y) : number => {
 *     const proposedValue : number    = Y(ProposedOrPrevious)
 *
 *     const maxValue : number         = Y(max)
 *
 *     return proposedValue <= maxValue ? proposedValue : maxValue
 * })
 *
 * graph4.write(identifier15, 18)
 *
 * const value15_1 = graph4.read(identifier15) // 18
 *
 * graph4.write(identifier15, 180)
 *
 * const value15_2 = graph4.read(identifier15) // 100
 *
 * graph4.write(max, 50)
 *
 * const value15_3 = graph4.read(identifier15) // 50
 * ```
 */
export const ProposedOrPrevious = Effect.new({ handler: ProposedOrPreviousSymbol });
//---------------------------------------------------------------------------------------------------------------------
export const RejectSymbol = Symbol('RejectSymbol');
/**
 * Class for [[Reject]] effect.
 */
export class RejectEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = RejectSymbol;
    }
}
__decorate([
    prototypeValue(false)
], RejectEffect.prototype, "pure", void 0);
/**
 * This is constructor for `RejectEffect` class. If this effect will be yielded during computation the current transaction
 * will be [[ChronoGraph.reject|rejected]].
 *
 * @param reason
 * @constructor
 */
export const Reject = (reason) => RejectEffect.new({ reason });
//---------------------------------------------------------------------------------------------------------------------
export const TransactionSymbol = Symbol('TransactionSymbol');
export const GetTransaction = Effect.new({ handler: TransactionSymbol });
//---------------------------------------------------------------------------------------------------------------------
export const OwnQuarkSymbol = Symbol('OwnQuarkSymbol');
export const OwnQuark = Effect.new({ handler: OwnQuarkSymbol });
//---------------------------------------------------------------------------------------------------------------------
export const OwnIdentifierSymbol = Symbol('OwnIdentifierSymbol');
export const OwnIdentifier = Effect.new({ handler: OwnIdentifierSymbol });
//---------------------------------------------------------------------------------------------------------------------
export const WriteSymbol = Symbol('WriteSymbol');
export class WriteEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = WriteSymbol;
    }
}
__decorate([
    prototypeValue(false)
], WriteEffect.prototype, "pure", void 0);
export const Write = (identifier, proposedValue, ...proposedArgs) => WriteEffect.new({ identifier, proposedArgs: [proposedValue, ...proposedArgs] });
export const WriteSeveralSymbol = Symbol('WriteSeveralSymbol');
export class WriteSeveralEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = WriteSeveralSymbol;
    }
}
__decorate([
    prototypeValue(false)
], WriteSeveralEffect.prototype, "pure", void 0);
export const WriteSeveral = (writes) => WriteSeveralEffect.new({ writes });
//---------------------------------------------------------------------------------------------------------------------
export const PreviousValueOfSymbol = Symbol('PreviousValueOfSymbol');
export class PreviousValueOfEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = PreviousValueOfSymbol;
    }
}
export const PreviousValueOf = (identifier) => PreviousValueOfEffect.new({ identifier });
//---------------------------------------------------------------------------------------------------------------------
export const ProposedValueOfSymbol = Symbol('ProposedValueOfSymbol');
export class ProposedValueOfEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = ProposedValueOfSymbol;
    }
}
export const ProposedValueOf = (identifier) => ProposedValueOfEffect.new({ identifier });
//---------------------------------------------------------------------------------------------------------------------
export const HasProposedValueSymbol = Symbol('HasProposedValueSymbol');
export class HasProposedValueEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = HasProposedValueSymbol;
    }
}
export const HasProposedValue = (identifier) => HasProposedValueEffect.new({ identifier });
//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrPreviousValueOfSymbol = Symbol('ProposedOrPreviousValueOfSymbol');
export class ProposedOrPreviousValueOfEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = ProposedOrPreviousValueOfSymbol;
    }
}
export const ProposedOrPreviousValueOf = (identifier) => ProposedOrPreviousValueOfEffect.new({ identifier });
//---------------------------------------------------------------------------------------------------------------------
export const ProposedArgumentsOfSymbol = Symbol('ProposedArgumentsOfSymbol');
export class ProposedArgumentsOfEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = ProposedArgumentsOfSymbol;
    }
}
export const ProposedArgumentsOf = (identifier) => ProposedArgumentsOfEffect.new({ identifier });
//---------------------------------------------------------------------------------------------------------------------
export const UnsafeProposedOrPreviousValueOfSymbol = Symbol('UnsafeProposedOrPreviousValueOfSymbol');
export class UnsafeProposedOrPreviousValueOfEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = UnsafeProposedOrPreviousValueOfSymbol;
    }
}
export const UnsafeProposedOrPreviousValueOf = (identifier) => UnsafeProposedOrPreviousValueOfEffect.new({ identifier });
//---------------------------------------------------------------------------------------------------------------------
export const UnsafePreviousValueOfSymbol = Symbol('UnsafePreviousValueOfSymbol');
export class UnsafePreviousValueOfEffect extends Effect {
    constructor() {
        super(...arguments);
        this.handler = UnsafePreviousValueOfSymbol;
    }
}
export const UnsafePreviousValueOf = (identifier) => UnsafePreviousValueOfEffect.new({ identifier });
