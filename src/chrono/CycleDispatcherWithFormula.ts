import { mixin } from "../class/InstanceOf.js"
import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { ChainedIterator, concatIterable, map, uniqueOnly } from "../collection/Iterator.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { HasProposedValue, PreviousValueOf } from "./Effect.js"
import { Identifier } from "./Identifier.js"
import { SyncEffectHandler } from "./Transaction.js"

//---------------------------------------------------------------------------------------------------------------------
export type FormulaId   = number

let FORMULA_ID : FormulaId  = 0

//---------------------------------------------------------------------------------------------------------------------
export type Variable                            = symbol

export type CycleResolution                     = Map<Variable, FormulaId>

export type CycleResolutionFormulas             = Set<Formula>


//---------------------------------------------------------------------------------------------------------------------
export const CalculateProposed : FormulaId      = FORMULA_ID++
export const CalculatePure : FormulaId          = FORMULA_ID++


//---------------------------------------------------------------------------------------------------------------------
export class Formula extends Base {
    formulaId           : FormulaId         = FORMULA_ID++

    inputs              : Set<Variable>     = new Set()
    output              : Variable
}


//---------------------------------------------------------------------------------------------------------------------
export class VariableWalkContext extends WalkContext<Variable | Formula> {
    cache          : FormulasCache

    collectNext (sourceNode : Variable | Formula, toVisit : WalkStep<Variable | Formula>[]) {
        if (sourceNode instanceof Formula) {
            toVisit.push({ node : sourceNode.output, from : sourceNode, label : undefined })
        } else {
            const formulas  = this.cache.formulasByInput.get(sourceNode)

            formulas && formulas.forEach(formula => toVisit.push({ node : formula, from : sourceNode, label : undefined }))
        }
    }
}

//---------------------------------------------------------------------------------------------------------------------
export const FormulasCache = mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) =>
    class FormulasCache extends base {
        variables           : Set<Variable>     = new Set()
        formulas            : Set<Formula>      = new Set()

        $formulasByInput    : Map<Variable, Set<Formula>>
        $formulasByOutput   : Map<Variable, Set<Formula>>

        get formulasByInput () : Map<Variable, Set<Formula>> {
            if (this.$formulasByInput !== undefined) return this.$formulasByInput

            this.fillCache()

            return this.$formulasByInput
        }

        get formulasByOutput () : Map<Variable, Set<Formula>> {
            if (this.$formulasByOutput !== undefined) return this.$formulasByOutput

            this.fillCache()

            return this.$formulasByOutput
        }


        add (formula : Formula) {
            this.$formulasByInput       = undefined
            this.$formulasByOutput      = undefined

            this.formulas.add(formula)
        }


        has (formula : Formula) : boolean {
            return this.formulas.has(formula)
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


        allInputVariables () : Iterable<Variable> {
            return uniqueOnly(concatIterable(map(this.formulas, formula => formula.inputs.values())))
        }


        isCyclic () : boolean {
            let isCyclic : boolean  = false

            const walkContext       = VariableWalkContext.new({ cache : this, onCycle : () => { isCyclic = true; return OnCycleAction.Cancel } })

            walkContext.startFrom(Array.from(this.allInputVariables()))

            return isCyclic
        }
    }
)
export type FormulasCache = Mixin<typeof FormulasCache>


//---------------------------------------------------------------------------------------------------------------------
export type GraphInputsHash    = string


//---------------------------------------------------------------------------------------------------------------------
export class GraphDescription extends FormulasCache(Base) {
    variables                   : Set<Variable>
    // NOTE - the order of formulas in the set is important - the earlier ones are preferred over the later
    formulas                    : Set<Formula>    = new Set()

    // exampleResolutionsByHash    : Map<GraphInputsHash, CycleResolution<Variable>>  = new Map()
}


//---------------------------------------------------------------------------------------------------------------------
export class CycleDispatcherWithFormula extends Base {
    description         : GraphDescription

    hasProposedValue    : Set<Variable>         = new Set()
    hasPreviousValue    : Set<Variable>         = new Set()
    keepIfPossible      : Set<Variable>         = new Set()

    $hash               : GraphInputsHash       = ''

    defaultResolutionFormulas   : CycleResolutionFormulas       = undefined

    defaultResolution           : CycleResolution               = undefined


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


    $resolution     : CycleResolution

    get resolution () : CycleResolution {
        if (this.$resolution !== undefined) return this.$resolution

        const cached    = false//this.description.exampleResolutionsByHash.get(this.hash)

        if (cached) {
            return this.$resolution = cached
        } else {
            const resolution        = this.buildResolution()

            // this.description.exampleResolutionsByHash.set(this.hash, resolution)

            return this.$resolution = resolution
        }
    }


    buildResolution () : CycleResolution {
        const walkContext           = WalkState.new({ dispatcher : this })

        // const allWalkStates         = Array.from(walkContext.next())
        // if (allWalkStates.length > 1) {
        //     const allResolutions    = allWalkStates.map(state => state.asResolution())
        //
        //     debugger
        // }

        for (const finalWalkState of walkContext.next()) {
            return finalWalkState.asResolution()
        }

        debugger // return default?
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkState<Variable = symbol> extends Base {
    dispatcher                          : CycleDispatcherWithFormula

    get description () : GraphDescription { return this.dispatcher.description }

    previous                            : WalkState             = null

    activatedFormula                    : Formula       = null

    $previouslyActivatedFormulas        : FormulasCache

    get previouslyActivatedFormulas () : FormulasCache {
        if (this.$previouslyActivatedFormulas !== undefined) return this.$previouslyActivatedFormulas

        const cache                 = FormulasCache.new({ variables : this.description.variables })

        let current : WalkState     = this

        while (current) {
            current.activatedFormula && cache.add(current.activatedFormula)

            current         = current.previous
        }

        return this.$previouslyActivatedFormulas = cache
    }


    unvisitedFormulas () : Formula[] {
        return Array.from(this.description.formulas).filter(formula => !this.previouslyActivatedFormulas.has(formula))
    }


    preferFormula (formula1 : Formula, formula2 : Formula) : -1 | 0 | 1 {
        const allInputsHasProposed1         = this.formulaAllInputsHasProposed(formula1)
        const allInputsHasProposed2         = this.formulaAllInputsHasProposed(formula2)

        if (allInputsHasProposed1 && !allInputsHasProposed2) return -1
        if (allInputsHasProposed2 && !allInputsHasProposed1) return 1

        const countInputsWithoutProposedOrKeep1     = this.formulaCountInputsWithoutProposedOrKeep(formula1)
        const countInputsWithoutProposedOrKeep2     = this.formulaCountInputsWithoutProposedOrKeep(formula2)

        const allInputsAreWithoutProposedOrKeep1    = countInputsWithoutProposedOrKeep1 === formula1.inputs.size
        const allInputsAreWithoutProposedOrKeep2    = countInputsWithoutProposedOrKeep2 === formula2.inputs.size

        if (allInputsAreWithoutProposedOrKeep1 && !allInputsAreWithoutProposedOrKeep2) return 1
        if (!allInputsAreWithoutProposedOrKeep1 && allInputsAreWithoutProposedOrKeep2) return -1

        if (!allInputsAreWithoutProposedOrKeep1 && !allInputsAreWithoutProposedOrKeep2) {
            if (countInputsWithoutProposedOrKeep1 < countInputsWithoutProposedOrKeep2) return -1
            if (countInputsWithoutProposedOrKeep1 > countInputsWithoutProposedOrKeep2) return 1
        }

        if (this.formulaIsDefault(formula1) && !this.formulaIsDefault(formula2)) return -1
        if (this.formulaIsDefault(formula2) && !this.formulaIsDefault(formula1)) return 1

        return 0
    }


    preferFormula2 (formula1 : Formula, formula2 : Formula) : -1 | 0 | 1 {
        const allInputsHasProposed1         = this.formulaAllInputsHasProposed(formula1)
        const allInputsHasProposed2         = this.formulaAllInputsHasProposed(formula2)

        if (allInputsHasProposed1 && !allInputsHasProposed2) return -1
        if (allInputsHasProposed2 && !allInputsHasProposed1) return 1

        const countInputsWithProposedOrKeep1        = this.formulaCountInputsWithProposedOrKeep(formula1)
        const countInputsWithProposedOrKeep2        = this.formulaCountInputsWithProposedOrKeep(formula2)

        if (countInputsWithProposedOrKeep1 > countInputsWithProposedOrKeep2) return -1
        if (countInputsWithProposedOrKeep1 < countInputsWithProposedOrKeep2) return 1

        // if (allInputsAreWithoutProposedOrKeep1 && !allInputsAreWithoutProposedOrKeep2) return 1
        // if (!allInputsAreWithoutProposedOrKeep1 && allInputsAreWithoutProposedOrKeep2) return -1
        //
        // if (!allInputsAreWithoutProposedOrKeep1 && !allInputsAreWithoutProposedOrKeep2) {
        //     if (countInputsWithoutProposedOrKeep1 < countInputsWithoutProposedOrKeep2) return -1
        //     if (countInputsWithoutProposedOrKeep1 > countInputsWithoutProposedOrKeep2) return 1
        // }

        if (this.formulaIsDefault(formula1) && !this.formulaIsDefault(formula2)) return -1
        if (this.formulaIsDefault(formula2) && !this.formulaIsDefault(formula1)) return 1

        return 0
    }


    // formulaWeight (formula : Formula) : number {
    //     const allInputsHasProposed                  = this.formulaAllInputsHasProposed(formula)
    //     const countInputsWithoutProposedOrKeep      = this.formulaCountInputsWithoutProposedOrKeep(formula)
    //     const isDefault                             = this.dispatcher.defaultResolutionFormulas.has(formula)
    //
    //     //-----------------------
    //     let weight                                  = 0
    //
    //     //-----------------------
    //     if (allInputsHasProposed) weight -= 1e6
    //
    //     //-----------------------
    //     weight += countInputsWithoutProposedOrKeep * 1e3
    //
    //     //-----------------------
    //     if (isDefault) weight -= 1e2
    //
    //     console.log("Formula weight: ", formula, weight)
    //
    //     return weight
    // }


    formulaIsDefault (formula : Formula) : boolean {
        return this.dispatcher.defaultResolutionFormulas.has(formula)
    }


    formulaCountInputsWithoutProposedOrKeep (formula : Formula) : number {
        let count : number      = formula.inputs.size

        Array.from(formula.inputs).forEach(variable => {
            if (this.dispatcher.hasProposedValue.has(variable) || this.dispatcher.keepIfPossible.has(variable)) count--
        })

        return count
    }


    formulaCountInputsWithProposedOrKeep (formula : Formula) : number {
        let count : number      = 0

        Array.from(formula.inputs).forEach(variable => {
            if (
                this.dispatcher.hasProposedValue.has(variable)
                || this.dispatcher.keepIfPossible.has(variable)
                // || this.previouslyActivatedFormulas.formulasByOutput.has(variable)
            ) count++
        })

        return count
    }


    formulaAllInputsHasProposedOrKeep (formula : Formula) : boolean {
        return Array.from(formula.inputs).every(variable => this.dispatcher.hasProposedValue.has(variable) || this.dispatcher.keepIfPossible.has(variable))
    }


    formulaAllInputsHasProposed (formula : Formula) : boolean {
        return Array.from(formula.inputs).every(variable => this.dispatcher.hasProposedValue.has(variable))
    }


    formulaIsApplicable (formula : Formula) : boolean {
        const hasUserInputOnFormulaOutput       = this.dispatcher.hasProposedValue.has(formula.output)

        const ignoreUserInputOnFormulaOutput    = this.formulaIsDefault(formula) && this.formulaAllInputsHasProposed(formula)

        //-----------------------
        const everyFormulaInputHasValue         = Array.from(formula.inputs).every(
            variable => this.dispatcher.hasProposedValue.has(variable) || this.dispatcher.hasPreviousValue.has(variable) || this.previouslyActivatedFormulas.formulasByOutput.has(variable)
        )

        //-----------------------
        const cache     = FormulasCache.new({ formulas : new Set(this.previouslyActivatedFormulas.formulas) })
        cache.add(formula)

        //-----------------------
        const outputVariableAlreadyCalculated   = this.previouslyActivatedFormulas.formulasByOutput.has(formula.output)

        return (!hasUserInputOnFormulaOutput || ignoreUserInputOnFormulaOutput) && !outputVariableAlreadyCalculated && everyFormulaInputHasValue && !cache.isCyclic()
    }


    formulaIsInsignificant (formula : Formula) : boolean {
        return (this.dispatcher.hasPreviousValue.has(formula.output) || this.previouslyActivatedFormulas.formulasByOutput.has(formula.output))
            && Array.from(formula.inputs).some(
                variable => !this.dispatcher.hasPreviousValue.has(variable) && !this.dispatcher.hasProposedValue.has(variable)
            )
    }


    *next () : Generator<WalkState> {
        const unvisitedFormulas     = this.unvisitedFormulas()

        unvisitedFormulas.sort(this.preferFormula2.bind(this))
        // unvisitedFormulas.sort((formula1 : Formula, formula2 : Formula) => this.formulaWeight(formula1) - this.formulaWeight(formula2))

        let isFinal : boolean   = true

        for (const formula of unvisitedFormulas) {
            if (!this.formulaIsApplicable(formula) || this.formulaIsInsignificant(formula)) continue

            const nextState         = WalkState.new({
                previous            : this,

                dispatcher          : this.dispatcher,

                activatedFormula    : formula
            })

            yield* nextState.next()

            isFinal             = false
        }

        if (isFinal) yield this
    }


    asResolution () : CycleResolution {
        return new Map(
            ChainedIterator(this.description.variables).map(variable => {
                const formulas   = this.previouslyActivatedFormulas.formulasByOutput.get(variable)

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


//---------------------------------------------------------------------------------------------------------------------
export class ChronoCycleDispatcherWithFormula extends CycleDispatcherWithFormula {

    collectInfo (YIELD : SyncEffectHandler, identifier : Identifier, symbol : symbol) {
        if (YIELD(PreviousValueOf(identifier)) != null) this.addPreviousValueFlag(symbol)

        if (YIELD(HasProposedValue(identifier))) this.addProposedValueFlag(symbol)
    }
}
