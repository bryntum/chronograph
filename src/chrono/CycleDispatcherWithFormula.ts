import { mixin } from "../class/InstanceOf.js"
import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { ChainedIterator } from "../collection/Iterator.js"
import { WalkableForward, WalkForwardContext } from "../graph/Node.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/WalkDepth.js"

//---------------------------------------------------------------------------------------------------------------------
export type FormulaId   = number

let FORMULA_ID : FormulaId  = 0

//---------------------------------------------------------------------------------------------------------------------
export const DefaultResolution          = Symbol('DefaultResolution')

export type CycleResolution<Variable>   = typeof DefaultResolution | Map<Variable, FormulaId>

export type CycleResolutionFormulas<Variable>   = Set<Formula<Variable>>


//---------------------------------------------------------------------------------------------------------------------
export const CalculateProposed : FormulaId      = FORMULA_ID++
export const CalculatePure : FormulaId          = FORMULA_ID++


//---------------------------------------------------------------------------------------------------------------------
export class Formula<Variable = symbol> extends Base {
    formulaId           : FormulaId         = FORMULA_ID++

    inputs              : Set<Variable>     = new Set()
    output              : Variable
}


// //---------------------------------------------------------------------------------------------------------------------
// export enum Constant {
//     InitialValue                = 'InitialValue',
//     ProposedValue               = 'ProposedValue',
//     PreviousValue               = 'PreviousValue',
//     PreviousValueIfPossible     = 'PreviousValueIfPossible'
// }

export class VariableWalkContext<Variable> extends WalkContext<Variable> {
    cache       : FormulasCache

    collectNext (sourceNode : Variable, toVisit : WalkStep<Variable>[]) {
        const inputs    = this.cache.formulasByInput.get(sourceNode)

        inputs && inputs.forEach(formula => toVisit.push({ node : formula.output, from : sourceNode, label : undefined }))
    }
}

//---------------------------------------------------------------------------------------------------------------------
export const FormulasCache = mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) =>
    class FormulasCache extends base {
        Variable            : any

        variables           : Set<this[ 'Variable' ]>               = new Set()
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


        isCyclic () : boolean {
            let isCyclic : boolean  = false

            const walkContext       = VariableWalkContext.new({ cache : this, onCycle : () => { isCyclic = true; return OnCycleAction.Cancel } })

            walkContext.startFrom(Array.from(this.variables))

            return isCyclic
        }
    }
)
export type FormulasCache = Mixin<typeof FormulasCache>


//---------------------------------------------------------------------------------------------------------------------
export type GraphInputsHash    = string


//---------------------------------------------------------------------------------------------------------------------
export class GraphDescription<Variable = symbol> extends Base {
    variables                   : Set<Variable>
    formulas                    : Set<Formula<Variable>>    = new Set()

    exampleResolutionsByHash    : Map<GraphInputsHash, CycleResolution<Variable>>  = new Map()
}


//---------------------------------------------------------------------------------------------------------------------
export class CycleDispatcher<Variable = symbol> extends Base {
    description         : GraphDescription<Variable>

    hasProposedValue    : Set<Variable>         = new Set()
    hasPreviousValue    : Set<Variable>         = new Set()
    keepIfPossible      : Set<Variable>         = new Set()

    $hash               : GraphInputsHash

    defaultResolutionFormulas   : CycleResolutionFormulas<Variable>


    get hash () : GraphInputsHash {
        if (this.$hash !== undefined) return this.$hash

        return this.$hash = this.buildHash()
    }


    buildHash () : GraphInputsHash {
        return 'hash'
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

        const cached    = false//this.description.exampleResolutionsByHash.get(this.hash)

        if (cached) {
            return this.$resolution = cached
        } else {
            const resolution        = this.buildResolution()

            this.description.exampleResolutionsByHash.set(this.hash, resolution)

            return this.$resolution = resolution
        }
    }


    includeFormulaIfApplicable (cache : FormulasCache, formula : Formula<Variable>) {
        if (this.isFormulaApplicable(cache, formula)) cache.formulas.add(formula)
    }


    isFormulaApplicable (cache : FormulasCache, formula : Formula<Variable>) : boolean {
        return ChainedIterator(formula.inputs).every(
            variable => this.hasProposedValue.has(variable) || this.hasPreviousValue.has(variable)
        )
    }


    isFormulaInsignificant (cache : FormulasCache, formula : Formula<Variable>) : boolean {
        return this.hasPreviousValue.has(formula.output) && ChainedIterator(formula.inputs).some(
            variable => !this.hasPreviousValue.has(variable)
        )
    }


    buildResolution () : CycleResolution<Variable> {
        const description           = this.description
        const formulas              = description.formulas
        const variables             = description.variables
        const cache                 = FormulasCache.new({ formulas, variables })

        const nextCache             = FormulasCache.new({ variables })

        for (const variable of description.variables) {
            if (
                this.hasProposedValue.has(variable)
                || this.keepIfPossible.has(variable) && this.hasPreviousValue.has(variable)
            ) {
                cache.formulasByInput.get(variable).forEach(formula => nextCache.formulas.add(formula))
            }
        }

        for (const variable of description.variables) {
            if (
                this.hasProposedValue.has(variable)
                || this.keepIfPossible.has(variable) && this.hasPreviousValue.has(variable)
            ) {
                cache.formulasByOutput.get(variable).forEach(formula => nextCache.formulas.delete(formula))
            }
        }

        for (const variable of description.variables) {
            if (
                !this.hasProposedValue.has(variable) && !this.hasPreviousValue.has(variable)
            ) {
                cache.formulasByOutput.get(variable).forEach(formula => this.includeFormulaIfApplicable(nextCache, formula))
            }
        }

        for (const formula of nextCache.formulas) {
            if (this.isFormulaInsignificant(nextCache, formula)) nextCache.formulas.delete(formula)
        }

        // no appropriate formulas, using default ones if possible
        if (nextCache.formulas.size === 0) {
            this.defaultResolutionFormulas.forEach(formula => this.includeFormulaIfApplicable(nextCache, formula))
        }

        // still nothing appropriate or cycle - fallback to all-proposed
        if (nextCache.formulas.size === 0 || nextCache.isCyclic()) {
            return new Map(
                ChainedIterator(this.description.variables).map(variable => [ variable, CalculateProposed ])
            )
        }

        // if (nextCache.isCyclic()) {
        //     throw new Error("Can't find resolution - formulas set cyclic")
        // }

        return new Map(
            ChainedIterator(this.description.variables).map(variable => {
                const formulas   = nextCache.formulasByOutput.get(variable)

                if (formulas && formulas.size > 0) {
                    if (formulas.size > 1) debugger

                    for (const firstFormula of formulas) {
                        return [ variable, firstFormula.formulaId ]
                    }
                } else {
                    return [ variable, CalculateProposed ]
                }
            })
        )
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
