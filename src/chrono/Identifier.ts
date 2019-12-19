import { buildClass } from "../class/InstanceOf.js"
import { Base } from "../class/Mixin.js"
import {
    CalculationContext,
    CalculationGen,
    CalculationIterator,
    CalculationSync,
    Context,
    ContextGen,
    Contexts,
    ContextSync
} from "../primitives/Calculation.js"
import { prototypeValue } from "../util/Helpers.js"
import { CheckoutI } from "./Checkout.js"
import { ProposedOrCurrent } from "./Effect.js"
import { Quark, QuarkConstructor } from "./Quark.js"
import { RevisionClock } from "./Revision.js"
import { Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export enum Levels {
    Constant                = 0,
    DependsOnlyOnConstant   = 1,
    DependsOnSelfKind       = 10
}

//---------------------------------------------------------------------------------------------------------------------
export class Meta<ValueT = any, ContextT extends Context = Context> extends Base {
    name                : any       = undefined

    ArgsT               : any[]
    YieldT              : YieldableValue
    ValueT              : ValueT

    level               : number    = Levels.DependsOnSelfKind

    lazy                : boolean   = false

    quarkClass          : QuarkConstructor

    proposedValueIsBuilt    : boolean   = false
}


//---------------------------------------------------------------------------------------------------------------------
export class Identifier<ValueT = any, ContextT extends Context = Context> extends Meta<ValueT, ContextT> {
    context             : any       = undefined


    newQuark (createdAt : RevisionClock) : InstanceType<this[ 'quarkClass' ]> {
        // micro-optimization - we don't pass a config object to the `new` constructor
        // but instead assign directly to instance
        const newQuark                      = this.quarkClass.new() as InstanceType<this[ 'quarkClass' ]>

        newQuark.createdAt                  = createdAt
        newQuark.identifier                 = this
        newQuark.needToBuildProposedValue   = this.proposedValueIsBuilt

        return newQuark
    }


    equality (v1 : ValueT, v2 : ValueT) : boolean {
        return v1 === v2
    }


    calculation (context : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ ContextT ] {
        throw new Error("Abstract method `calculation` called")
    }


    write (me : this, transaction : Transaction, quark : Quark, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        quark                       = quark || transaction.acquireQuark(me)

        quark.proposedValue         = proposedValue
        quark.proposedArguments     = args.length > 0 ? args : undefined
    }


    buildProposedValue (me : this, quark : InstanceType<this[ 'quarkClass' ]>, transaction : Transaction) : ValueT {
        return undefined
    }


    enterGraph (graph : CheckoutI) {
    }


    leaveGraph (graph : CheckoutI) {
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Variable<ValueT = any> extends Identifier<ValueT, typeof ContextSync> {
    YieldT              : never

    @prototypeValue(buildClass(Map, CalculationSync, Quark))
    quarkClass          : QuarkConstructor


    calculation (context : CalculationContext<this[ 'YieldT' ]>) : ValueT {
        throw new Error("The 'calculation' method of the variables will never be called. Instead the value will be set directly to quark")
    }


    write (me : this, transaction : Transaction, quark : Quark, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        quark                       = quark || transaction.acquireQuark(me)

        quark.value                 = proposedValue
        quark.proposedArguments     = args.length > 0 ? args : undefined
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class VariableGen<ValueT = any> extends Identifier<ValueT, typeof ContextGen> {
    YieldT              : never

    @prototypeValue(buildClass(Map, CalculationGen, Quark))
    quarkClass          : QuarkConstructor


    * calculation (context : CalculationContext<this[ 'YieldT' ]>) : CalculationIterator<ValueT, this[ 'YieldT' ]> {
        throw new Error("The 'calculation' method of the variables will never be called. Instead the value will be set directly to quark")
    }


    write (me : this, transaction : Transaction, quark : Quark, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        quark                       = quark || transaction.acquireQuark(me)

        quark.value                 = proposedValue
        quark.proposedArguments     = args.length > 0 ? args : undefined
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueSync<ValueT = any> extends Identifier<ValueT, typeof ContextSync> {

    @prototypeValue(buildClass(Map, CalculationSync, Quark))
    quarkClass          : QuarkConstructor


    calculation (YIELD : CalculationContext<this[ 'YieldT' ]>) : ValueT {
        return YIELD(ProposedOrCurrent)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueGen<ValueT = any> extends Identifier<ValueT, typeof ContextGen> {

    @prototypeValue(buildClass(Map, CalculationGen, Quark))
    quarkClass          : QuarkConstructor


    * calculation (context : CalculationContext<this[ 'YieldT' ]>) : CalculationIterator<ValueT, this[ 'YieldT' ]> {
        return yield ProposedOrCurrent
    }
}


// //---------------------------------------------------------------------------------------------------------------------
// export class DispatchedIdentifierGen<ValueT = any> extends Identifier<typeof ContextGen, ValueT> {
//
//     @prototypeValue(buildClass(Map, CalculationGen, Quark))
//     quarkClass          : QuarkConstructor
//
//
//     @prototypeValue(buildClass(Map, CalculationGen, Quark))
//     dispatcherClass          : QuarkConstructor
//
//
//     * calculation (context : CalculationContext<this[ 'YieldT' ]>) : CalculationIterator<ValueT, this[ 'YieldT' ]> {
//         // const dispatcher    = yield Dispatcher
//         //
//         // return yield* dispatcher.runFormulaFor(yield Self, context)
//
//         return
//     }
// }


//---------------------------------------------------------------------------------------------------------------------
export const throwUnknownIdentifier = (identifier : Identifier) => { throw new Error(`Unknown identifier ${identifier}`) }
