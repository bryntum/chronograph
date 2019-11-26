import { mixin } from "../class/InstanceOf.js"
import { AnyConstructor, Base, BaseConstructor, Mixin, MixinConstructor } from "../class/Mixin.js"
import { ChainedIterator } from "../collection/Iterator.js"

//---------------------------------------------------------------------------------------------------------------------
export type FormulaId   = number

let FORMULA_ID : FormulaId  = 0

//---------------------------------------------------------------------------------------------------------------------
export const DefaultResolution          = Symbol('DefaultResolution')

export type CycleResolution<Variable>   = typeof DefaultResolution | Map<Variable, FormulaId>


//---------------------------------------------------------------------------------------------------------------------
export const CalculateProposed : FormulaId      = FORMULA_ID++
export const CalculatePure : FormulaId          = FORMULA_ID++


//---------------------------------------------------------------------------------------------------------------------
export class Formula<Variable> extends Base {
    id                  : FormulaId         = FORMULA_ID++

    inputs              : Set<Variable>     = new Set()
    output              : Variable
}


//---------------------------------------------------------------------------------------------------------------------
export const FormulasCache = mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) =>
    class FormulasCache extends base {
        Variable            : any

        formulas            : Set<Formula<this[ 'Variable' ]>>      = new Set()

        $formulasByInput    : Map<this[ 'Variable' ], Set<Formula<this[ 'Variable' ]>>>
        $formulasByOutput   : Map<this[ 'Variable' ], Set<Formula<this[ 'Variable' ]>>>

        get formulasByInput () {
            if (this.$formulasByInput !== undefined) return this.$formulasByInput

            this.fillCache()

            return this.$formulasByInput
        }

        get formulasByOutput () {
            if (this.$formulasByOutput !== undefined) return this.$formulasByOutput

            this.fillCache()

            return this.$formulasByOutput
        }


        fillCache () {
            this.$formulasByInput       = new Map()
            this.$formulasByOutput      = new Map()

            this.formulas.forEach(formula => {
                let formulasByOutput    = this.$formulasByOutput.get(formula.output)

                if (!formulasByOutput) {
                    formulasByOutput    = new Set()
                    this.$formulasByOutput.set(formula.output, formulasByOutput)
                }

                formulasByOutput.add(formula)

                formula.inputs.forEach(input => {
                    let formulasByInput    = this.$formulasByInput.get(input)

                    if (!formulasByInput) {
                        formulasByInput    = new Set()
                        this.$formulasByInput.set(input, formulasByInput)
                    }

                    formulasByInput.add(formula)
                })
            })
        }


        isAmbiguous () : boolean {
            // some output variable can be calculated in more than one way
            return ChainedIterator(this.formulasByOutput.values()).some(value => value.size > 1)
        }


        isCyclic () : boolean {
        }

    }
)
export type FormulasCache = Mixin<typeof FormulasCache>


//---------------------------------------------------------------------------------------------------------------------
export type GraphExampleHash    = string


//---------------------------------------------------------------------------------------------------------------------
export class GraphDescription<Variable> extends Base {
    variables                   : Set<Variable>

    formulas                    : Set<Formula<Variable>>    = new Set()

    exampleResolutionsByHash    : Map<GraphExampleHash, CycleResolution<Variable>>  = new Map()
}


//---------------------------------------------------------------------------------------------------------------------
export class GraphExample<Variable> extends Base {
    description         : GraphDescription<Variable>

    hasProposedValue    : Set<Variable>    = new Set()
    hasPreviousValue    : Set<Variable>    = new Set()
    keepIfPossible      : Set<Variable>    = new Set()

    $hash               : GraphExampleHash

    get hash () : GraphExampleHash {
        if (this.$hash !== undefined) return this.$hash

        return this.$hash = this.buildHash()
    }


    buildHash () : GraphExampleHash {
        return
    }


    addProposedValueFlag (variable : Variable) {
        // debug only
        // if (!this.description.variables.has(variable)) throw new Error('Unknown variable')
        // if (this.$hash !== undefined) throw new Error('Already hashed')

        this.hasProposedValue.add(variable)
    }


    addPreviousValueFlag (variable : Variable) {
        // debug only
        // if (!this.description.variables.has(variable)) throw new Error('Unknown variable')
        // if (this.$hash !== undefined) throw new Error('Already hashed')

        this.hasPreviousValue.add(variable)
    }


    addKeepIfPossibleFlag (variable : Variable) {
        // debug only
        // if (!this.description.variables.has(variable)) throw new Error('Unknown variable')
        // if (this.$hash !== undefined) throw new Error('Already hashed')

        this.keepIfPossible.add(variable)
    }


    $resolution     : CycleResolution<Variable>

    get resolution () : CycleResolution<Variable> {
        if (this.$resolution !== undefined) return this.$resolution

        const cached    = this.description.exampleResolutionsByHash.get(this.hash)

        if (cached) {
            return this.$resolution = cached
        } else {
            const resolution        = this.buildResolution()

            this.description.exampleResolutionsByHash.set(this.hash, resolution)

            return this.$resolution = resolution
        }
    }


    buildResolution () : CycleResolution<Variable> {
        const description       = this.description

        if (
            // no user input, all variables have values
            this.hasProposedValue.size === 0 && this.hasPreviousValue.size === description.variables.size
            ||
            // initial data load - all variables have input, no previous values
            this.hasProposedValue.size === description.variables.size && this.hasPreviousValue.size === 0
        ) {
            return DefaultResolution
        }

        //------------------
        const result : CycleResolution<Variable>   = new Map()

        const formulas              = description.formulas
        const cache                 = FormulasCache.new({ formulas })

        const nextCache             = FormulasCache.new()

        for (const variable of description.variables) {
            if (this.hasProposedValue.has(variable)) {
                cache.formulasByInput.get(variable).forEach(formula => nextCache.formulas.add(formula))
            }
        }

        if (nextCache.isCyclic()) {
            throw new Error("Can't find resolution - formulas set cyclic")
        }



        //------------------
        for (const variable of description.variables) {
            if (this.hasProposedValue.has(variable)) {
                // remove the formulas, where the user-proposed variable is an output
                initialCache.formulasByOutput.get(variable).forEach(formula => appropriateFormulas.delete(formula))
            }
            else {
                if (!this.hasPreviousValue.has(variable)) {
                    // remove the formulas, where the input has no either user-proposed or previous value
                    initialCache.formulasByInput.get(variable).forEach(formula => appropriateFormulas.delete(formula))
                }
            }
        }

        const moreValidCache        = FormulasCache.new({ formulas : appropriateFormulas })

        if (moreValidCache.isAmbiguous()) {
            throw new Error("Can't find resolution - formulas set ambiguous")
        }

        if (moreValidCache.isCyclic()) {
            throw new Error("Can't find resolution - formulas set cyclic")
        }


        return new Map()
    }
}


// // export class ChronoCycleDispatcher extends CycleDispatcher<Identifier> {
// //
// //     collectInfo (YIELD : SyncEffectHandler, identifier : Identifier) {
// //         if (YIELD(PreviousValueOf(identifier)) != null) this.addPreviousValueFlag(identifier)
// //
// //         if (YIELD(HasProposedValue(identifier))) this.addProposedValueFlag(identifier)
// //     }
// // }
