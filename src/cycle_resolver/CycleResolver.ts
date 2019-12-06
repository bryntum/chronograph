import { mixin, required, validateRequiredProperties } from "../class/InstanceOf.js"
import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { ChainedIterator, CI, concatIterable, map, uniqueOnly } from "../collection/Iterator.js"
import { DEBUG } from "../environment/Debug.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/WalkDepth.js"

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
    variables                   : Set<Variable>     = new Set()
    // NOTE - the order of formulas in the set is important - the earlier ones are preferred over the later
    formulas                    : Set<Formula>      = new Set()
}


//---------------------------------------------------------------------------------------------------------------------
export class CycleResolutionContext extends Base {
    description                 : GraphDescription                          = undefined

    defaultResolutionFormulas   : CycleResolutionFormulas                   = new Set()

    resolutionsByInputHash      : Map<GraphInputsHash, CycleResolution>     = new Map()


    // the caching space is 3^var_num might need to clear the memory at some time
    clear () {
        this.resolutionsByInputHash.clear()
    }


    resolve (input : CycleResolutionInput) : CycleResolution {
        const cached    = this.resolutionsByInputHash.get(input.hash)

        if (cached !== undefined) return cached

        const resolution        = this.buildResolution(input)

        this.resolutionsByInputHash.set(input.hash, resolution)

        return resolution
    }


    buildResolution (input : CycleResolutionInput) : CycleResolution {
        const walkContext           = WalkState.new({ context : this, input })

        const allResolutions        = Array.from(walkContext.next()).map(state => {
            return {
                resolution              : state.asResolution(),
                nbrOfDefaultFormulas    : Array.from(state.activatedFormulas.formulas).reduce(
                    (count : number, formula : Formula) => state.formulaIsDefault(formula) ? count + 1 : count,
                    0
                ),
                unCoveredInputWeight    : state.unCoveredInputWeight()
            }
        })

        allResolutions.sort((res1, res2) => {
            if (res1.unCoveredInputWeight < res2.unCoveredInputWeight) return -1
            if (res1.unCoveredInputWeight > res2.unCoveredInputWeight) return 1

            return res2.nbrOfDefaultFormulas - res1.nbrOfDefaultFormulas
        })

        if (allResolutions.length > 0)
            return allResolutions[ 0 ].resolution
        else
            debugger // return default? or all-proposed?
    }
}

export enum VariableInputState {
    NoInput                 = 0,
    HasProposedValue        = 1,
    HasPreviousValue        = 2,
    KeepIfPossible          = 4,
}


//---------------------------------------------------------------------------------------------------------------------
export class CycleResolutionInput extends Base {
    @required
    description         : GraphDescription                      = undefined

    private input       : Map<Variable, VariableInputState>     = undefined

    private $hash       : GraphInputsHash                       = ''


    get hash () : GraphInputsHash {
        if (this.$hash !== '') return this.$hash

        return this.$hash = this.buildHash()
    }


    initialize (...args) {
        super.initialize(...args)

        validateRequiredProperties(this)

        this.input = new Map(
            CI(this.description.variables).map(variable => [ variable, VariableInputState.NoInput ])
        )
    }


    buildHash () : GraphInputsHash {
        return String.fromCharCode(...CI(this.description.variables).inBatchesBySize(5).map(batch => this.batchToCharCode(batch)))
    }


    batchToCharCode (batch : Variable[]) : number {
        return batch.reduceRight(
            (charCode, variable, index) => charCode | (this.input.get(variable) << index * 3),
            0
        )
    }


    //---------------------
    addProposedValueFlag (variable : Variable) {
        if (DEBUG) {
            if (!this.description.variables.has(variable)) throw new Error('Unknown variable')
            if (this.$hash !== '') throw new Error('Already hashed')
        }

        const input     = this.input.get(variable)

        this.input.set(variable, input | VariableInputState.HasProposedValue)
    }

    hasProposedValue (variable : Variable) : boolean {
        return Boolean(this.input.get(variable) & VariableInputState.HasProposedValue)
    }

    hasProposedValueVars () : ChainedIterator<Variable> {
        return CI(this.description.variables).filter(variable => this.hasProposedValue(variable))
    }


    //---------------------
    addPreviousValueFlag (variable : Variable) {
        if (DEBUG) {
            if (!this.description.variables.has(variable)) throw new Error('Unknown variable')
            if (this.$hash !== '') throw new Error('Already hashed')
        }

        const input     = this.input.get(variable)

        this.input.set(variable, input | VariableInputState.HasPreviousValue)
    }

    hasPreviousValue (variable : Variable) : boolean {
        return Boolean(this.input.get(variable) & VariableInputState.HasPreviousValue)
    }

    hasPreviousValueVars () : ChainedIterator<Variable> {
        return CI(this.description.variables).filter(variable => this.hasPreviousValue(variable))
    }


    //---------------------
    addKeepIfPossibleFlag (variable : Variable) {
        if (DEBUG) {
            if (!this.description.variables.has(variable)) throw new Error('Unknown variable')
            if (this.$hash !== '') throw new Error('Already hashed')
        }

        const input     = this.input.get(variable)

        this.input.set(variable, input | VariableInputState.KeepIfPossible)
    }

    keepIfPossible (variable : Variable) : boolean {
        return Boolean(this.input.get(variable) & VariableInputState.KeepIfPossible)
    }

    keepIfPossibleVars () : ChainedIterator<Variable> {
        return CI(this.description.variables).filter(variable => this.keepIfPossible(variable))
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkState extends Base {
    context                             : CycleResolutionContext    = undefined
    input                               : CycleResolutionInput      = undefined

    previous                            : WalkState                 = undefined

    activatedFormula                    : Formula                   = undefined


    private $activatedFormulas          : FormulasCache             = undefined

    get activatedFormulas () : FormulasCache {
        if (this.$activatedFormulas !== undefined) return this.$activatedFormulas

        const cache                 = FormulasCache.new({
            variables   : this.description.variables,
            formulas    : CI(this.thisAndPreviousStates()).map(state => state.activatedFormula).toSet()
        })

        return this.$activatedFormulas = cache
    }


    get description () : GraphDescription { return this.context.description }


    * thisAndPreviousStates () : Iterable<WalkState> {
        let current : WalkState     = this

        while (current && current.activatedFormula) {
            yield current

            current                 = current.previous
        }
    }


    formulaHasProposedValueInInput (formula : Formula) : boolean {
        return Array.from(formula.inputs).some(variable => this.input.hasProposedValue(variable))
    }


    // this method counts
    unCoveredInputWeight () : number {
        const proposedVars          = map(this.input.hasProposedValueVars(), variable => { return { variable, isProposed : true }})
        const keepIfPossibleVars    = map(this.input.keepIfPossibleVars(), variable => { return { variable, isProposed : false }})

        const allInputVars          = CI(concatIterable([ proposedVars, keepIfPossibleVars ])).uniqueOnlyBy(el => el.variable)

        return allInputVars.reduce((totalWeight : number, { variable, isProposed }) => {
            let weight      = 0

            //-----------------
            const isOverwrittenByFormulas   = this.activatedFormulas.formulasByOutput.get(variable)

            if (isOverwrittenByFormulas) {
                const formula   = isOverwrittenByFormulas.size === 1 ? Array.from(isOverwrittenByFormulas)[ 0 ] : null

                // the case, when some user input is overwritten with the default formula should be weighted less than
                // its overwritten with regular formula
                if (formula && this.formulaIsDefault(formula) && this.formulaHasProposedValueInInput(formula)) {
                    if (isProposed)
                        weight += 1e5
                    else
                        weight += 1e4
                } else {
                    if (isProposed)
                        weight += 1e7
                    else
                        weight += 1e6
                }
            }

            //-----------------
            const usedInFormulas            = this.activatedFormulas.formulasByInput.get(variable)

            if (!(usedInFormulas && usedInFormulas.size > 0)) {
                if (isProposed)
                    weight += 1e3
                else
                    weight += 1e2
            }

            return totalWeight + weight
        }, 0)
    }


    preferFormula (formula1 : Formula, formula2 : Formula) : -1 | 0 | 1 {
        const allInputsHasProposed1         = this.formulaAllInputsHasProposed(formula1)
        const allInputsHasProposed2         = this.formulaAllInputsHasProposed(formula2)

        if (allInputsHasProposed1 && !allInputsHasProposed2) return -1
        if (allInputsHasProposed2 && !allInputsHasProposed1) return 1

        const countInputsWithProposedOrKeep1        = this.formulaCountInputsWithProposedOrKeep(formula1)
        const countInputsWithProposedOrKeep2        = this.formulaCountInputsWithProposedOrKeep(formula2)

        if (countInputsWithProposedOrKeep1 > countInputsWithProposedOrKeep2) return -1
        if (countInputsWithProposedOrKeep1 < countInputsWithProposedOrKeep2) return 1

        if (this.formulaIsDefault(formula1) && !this.formulaIsDefault(formula2)) return -1
        if (this.formulaIsDefault(formula2) && !this.formulaIsDefault(formula1)) return 1

        return 0
    }


    formulaIsDefault (formula : Formula) : boolean {
        return this.context.defaultResolutionFormulas.has(formula)
    }


    formulaCountInputsWithProposedOrKeep (formula : Formula) : number {
        let count : number      = 0

        Array.from(formula.inputs).forEach(variable => {
            if (this.input.hasProposedValue(variable) || this.input.keepIfPossible(variable)) count++
        })

        return count
    }


    formulaAllInputsHasProposedOrKeep (formula : Formula) : boolean {
        return Array.from(formula.inputs).every(variable => this.input.hasProposedValue(variable) || this.input.keepIfPossible(variable))
    }


    formulaAllInputsHasProposed (formula : Formula) : boolean {
        return Array.from(formula.inputs).every(variable => this.input.hasProposedValue(variable))
    }


    formulaIsApplicable (formula : Formula) : boolean {
        const everyFormulaInputHasValue         = Array.from(formula.inputs).every(
            variable => this.input.hasProposedValue(variable)
                || this.input.hasPreviousValue(variable)
                || this.activatedFormulas.formulasByOutput.has(variable)
        )

        const cache     = FormulasCache.new({ formulas : new Set(this.activatedFormulas.formulas) })
        cache.add(formula)

        return everyFormulaInputHasValue && !cache.isCyclic()
    }


    formulaIsInsignificant (formula : Formula) : boolean {
        const outputVariableAlreadyCalculated   = this.activatedFormulas.formulasByOutput.has(formula.output)
        const outputVariableHasPreviousValue    = this.input.hasPreviousValue(formula.output)

        return outputVariableAlreadyCalculated
            || outputVariableHasPreviousValue && Array.from(formula.inputs).some(
                variable => !this.input.hasPreviousValue(variable) && !this.input.hasProposedValue(variable)
            )
    }


    unvisitedFormulas () : Formula[] {
        return Array.from(this.description.formulas).filter(formula => !this.activatedFormulas.has(formula))
    }


    *next () : Iterable<WalkState> {
        const unvisitedFormulas     = this.unvisitedFormulas()

        unvisitedFormulas.sort(this.preferFormula.bind(this))

        let isFinal : boolean   = true

        for (const formula of unvisitedFormulas) {
            if (!this.formulaIsApplicable(formula) || this.formulaIsInsignificant(formula)) continue

            const nextState         = WalkState.new({
                previous            : this,
                context             : this.context,
                input               : this.input,
                activatedFormula    : formula
            })

            yield* nextState.next()

            isFinal             = false
        }

        if (isFinal) yield this
    }


    asResolution () : CycleResolution {
        return new Map(
            CI(this.description.variables).map(variable => {
                const formulas   = this.activatedFormulas.formulasByOutput.get(variable)

                if (formulas) {
                    for (const firstFormula of formulas) {
                        return [ variable, firstFormula.formulaId ]
                    }
                }

                return [ variable, CalculateProposed ]
            })
        )
    }
}
