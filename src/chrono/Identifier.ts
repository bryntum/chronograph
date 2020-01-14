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
import { RevisionClock, RevisionI } from "./Revision.js"
import { Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export enum Levels {
    // must be sync
    UserInput                               = 0,
    DependsOnlyOnUserInput                  = 1,
    DependsOnlyOnDependsOnlyOnUserInput     = 2,
    // asynchronicity starts from here
    DependsOnSelfKind                       = 3
}

//---------------------------------------------------------------------------------------------------------------------
export class Meta<ValueT = any, ContextT extends Context = Context> extends Base {
    name                : any       = undefined

    ArgsT               : any[]
    YieldT              : YieldableValue
    ValueT              : ValueT

    @prototypeValue(Levels.DependsOnSelfKind)
    level               : number

    lazy                : boolean   = false

    @prototypeValue(true)
    sync                : boolean

    // no cancels
    total               : boolean   = true

    // no "nested" writes
    pure                : boolean   = true

    quarkClass          : QuarkConstructor

    proposedValueIsBuilt    : boolean   = false

    // no init value - only a type
    CalcContextT        : any


    calculation (this : this[ 'CalcContextT' ], YIELD : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ ContextT ] {
        throw new Error("Abstract method `calculation` called")
    }


    equality (v1 : ValueT, v2 : ValueT) : boolean {
        return v1 === v2
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Identifier<ValueT = any, ContextT extends Context = Context> extends Meta<ValueT, ContextT> {
    context             : this[ 'CalcContextT' ]       = undefined


    newQuark (createdAt : RevisionI) : InstanceType<this[ 'quarkClass' ]> {
        // micro-optimization - we don't pass a config object to the `new` constructor
        // but instead assign directly to instance
        const newQuark                      = this.quarkClass.new() as InstanceType<this[ 'quarkClass' ]>

        newQuark.createdAt                  = createdAt
        newQuark.identifier                 = this
        newQuark.needToBuildProposedValue   = this.proposedValueIsBuilt

        return newQuark
    }


    write (me : this, transaction : Transaction, quark : InstanceType<this[ 'quarkClass' ]>, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        quark.proposedValue         = proposedValue
        quark.proposedArguments     = args.length > 0 ? args : undefined
    }


    writeToTransaction (transaction : Transaction, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        transaction.write(this, proposedValue, ...args)
    }


    writeToGraph (graph : CheckoutI, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        graph.write(this, proposedValue, ...args)
    }


    readFromGraphAsync (graph : CheckoutI) : Promise<ValueT> {
        return graph.readAsync(this)
    }


    readFromGraph (graph : CheckoutI) : ValueT {
        return graph.read(this)
    }


    readFromTransaction (transaction : Transaction) : ValueT {
        return transaction.read(this)
    }


    readFromTransactionAsync (transaction : Transaction) : Promise<ValueT> {
        return transaction.readAsync(this)
    }


    // readFromGraphDirtySync (graph : CheckoutI) : ValueT {
    //     return graph.readDirty(this)
    // }


    buildProposedValue (me : this, quark : InstanceType<this[ 'quarkClass' ]>, transaction : Transaction) : ValueT {
        return undefined
    }


    enterGraph (graph : CheckoutI) {
    }


    leaveGraph (graph : CheckoutI) {
    }
}

export const IdentifierC = <ValueT, ContextT extends Context>(...args) : Identifier<ValueT, ContextT> =>
    Identifier.new(...args) as Identifier<ValueT, ContextT>


//---------------------------------------------------------------------------------------------------------------------
export class Variable<ValueT = any> extends Identifier<ValueT, typeof ContextSync> {
    YieldT              : never

    @prototypeValue(Levels.UserInput)
    level               : number

    @prototypeValue(buildClass(Map, CalculationSync, Quark))
    quarkClass          : QuarkConstructor


    calculation (this : this[ 'CalcContextT' ], YIELD : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ typeof ContextSync ] {
        throw new Error("The 'calculation' method of the variables will never be called. Instead the value will be set directly to quark")
    }


    write (me : this, transaction : Transaction, quark : Quark, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        quark                       = quark || transaction.getWriteTarget(me)

        quark.value                 = proposedValue
        quark.proposedArguments     = args.length > 0 ? args : undefined
    }
}

export function VariableC<ValueT> (...args) : Variable<ValueT> {
    return Variable.new(...args) as Variable<ValueT>
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueSync<ValueT = any> extends Identifier<ValueT, typeof ContextSync> {

    @prototypeValue(buildClass(Map, CalculationSync, Quark))
    quarkClass          : QuarkConstructor


    calculation (this : this[ 'CalcContextT' ], YIELD : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ typeof ContextSync ] {
        return YIELD(ProposedOrCurrent)
    }
}

export function CalculatedValueSyncConstructor<ValueT> (...args) : CalculatedValueSync<ValueT> {
    return CalculatedValueSync.new(...args) as CalculatedValueSync<ValueT>
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueGen<ValueT = any> extends Identifier<ValueT, typeof ContextGen> {

    @prototypeValue(buildClass(Map, CalculationGen, Quark))
    quarkClass          : QuarkConstructor


    * calculation (this : this[ 'CalcContextT' ], YIELD : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ typeof ContextGen ] {
        return yield ProposedOrCurrent
    }
}

export function CalculatedValueGenConstructor<ValueT> (...args) : CalculatedValueGen<ValueT> {
    return CalculatedValueGen.new(...args) as CalculatedValueGen<ValueT>
}


//---------------------------------------------------------------------------------------------------------------------
export const throwUnknownIdentifier = (identifier : Identifier) => { throw new Error(`Unknown identifier ${identifier}`) }
