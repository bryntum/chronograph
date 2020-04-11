import { Base } from "../class/Base.js"
import { ClassUnion, Mixin } from "../class/Mixin.js"
import { required, validateRequiredProperties } from "../class/RequiredProperty.js"
import { ChainedIterator, CI, concatIterable, map, uniqueOnly } from "../collection/Iterator.js"
import { DEBUG } from "../environment/Debug.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/WalkDepth.js"

//---------------------------------------------------------------------------------------------------------------------
/**
 * Type alias for formula ids. A synonym for `number`
 */
export type FormulaId   = number

let FORMULA_ID : FormulaId  = 0

//---------------------------------------------------------------------------------------------------------------------
/**
 * Type alias for cycle variables. Just a synonym for `symbol`
 */
export type Variable                            = symbol

/**
 * Type for cycle resolution value. It maps every variable to a formula.
 */
export type CycleResolutionValue                = Map<Variable, FormulaId>

export type CycleResolutionFormulas             = Set<Formula>


//---------------------------------------------------------------------------------------------------------------------
/**
 * Pre-defined constant formula id. If assigned to some variable, specifies, that this variable should keep the value proposed by user
 * (user input), or, if there's none, its previous value.
 */
export const CalculateProposed : FormulaId      = FORMULA_ID++
// export const CalculatePure : FormulaId          = FORMULA_ID++


//---------------------------------------------------------------------------------------------------------------------
/**
 * Class, describing a formula, which is part of the cyclic set. Formula just specifies its input variables and output variable,
 * it does not contain actual calculation.
 *
 * It is assumed that formula can only be "activated" if all of its inputs has value. It can be either a value from the previous iteration,
 * a value provided by user, or an output value of some other formula. See [[VariableInputState]] and [[CycleResolutionInput]].
 */
export class Formula extends Base {
    /**
     * The id of the formula. It is assigned automatically, should not be changed.
     */
    formulaId           : FormulaId         = FORMULA_ID++

    /**
     * A set of the input variables for this formula.
     */
    inputs              : Set<Variable>     = new Set()

    /**
     * An output variable for this formula.
     */
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
export class FormulasCache extends Mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

    class FormulasCache extends base {
        /**
         * A set of variables, which forms cyclic computation
         */
        variables           : Set<Variable>     = new Set()
        /**
         * A set of formulas, which forms cyclic computation
         */
        formulas            : Set<Formula>      = new Set()

        $formulasByInput    : Map<Variable, Set<Formula>>   = undefined
        $formulasByOutput   : Map<Variable, Set<Formula>>   = undefined

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
){}


//---------------------------------------------------------------------------------------------------------------------
export type GraphInputsHash    = string


//---------------------------------------------------------------------------------------------------------------------
/**
 * Abstract description of the cycle. Does not include the default formula resolution, only variables and formulas. See also [[CycleResolution]].
 */
export class CycleDescription extends FormulasCache {
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Class describing the cycle resolution process. Requires the abstract cycle [[description]] and a set of default formulas.
 *
 * The resolution is performed with [[CycleResolution.resolve]] method.
 *
 * Resolution are memoized, based on the input. You should generally have a single instance of this class for a single set of default formulas,
 * to accumulate the results and make resolution fast.
 */
export class CycleResolution extends Base {
    /**
     * Abstract cycle description for this resolution.
     */
    description                 : CycleDescription                          = undefined

    /**
     * A set of default formulas for this resolution. Default formulas specifies how the calculation should be performed, if there's no user input
     * for any variable (or there's input for all of them). Also, default formulas are preferred, if several formulas can be chosen to continue the resolution.
     */
    defaultResolutionFormulas   : CycleResolutionFormulas                   = new Set()

    resolutionsByInputHash      : Map<GraphInputsHash, CycleResolutionValue>     = new Map()


    // the caching space is 3^var_num might need to clear the memory at some time
    clear () {
        this.resolutionsByInputHash.clear()
    }


    /**
     * This method accepts an input object and returns a cycle resolution.
     * Resolution are memoized, based on the input.
     *
     * @param input
     */
    resolve (input : CycleResolutionInput) : CycleResolutionValue {
        const cached    = this.resolutionsByInputHash.get(input.hash)

        if (cached !== undefined) return cached

        const resolution        = this.buildResolution(input)

        this.resolutionsByInputHash.set(input.hash, resolution)

        return resolution
    }


    buildResolution (input : CycleResolutionInput) : CycleResolutionValue {
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

/**
 * Enumeration for various states of the input data for variables in the cycle. Individual members corresponds to binary bits and can be set simultaneously, like:
 *
 * ```ts
 * const input : VariableInputState = VariableInputState.HasPreviousValue | VariableInputState.HasProposedValue
 * ```
 */
export enum VariableInputState {
    NoInput                 = 0,
    /**
     * This bit indicates that variable has some previous value, when resolution starts. It can be any non-`undefined` value, including `null`.
     */
    HasPreviousValue        = 1,
    /**
     * This bit indicates that variable has user input, when resolution starts. It can be any non-`undefined` value, including `null`.
     */
    HasProposedValue        = 2,
    /**
     * This bit indicates, that user intention is to keep this variable unchanged, if that is possible (does not contradict to other user input).
     */
    KeepIfPossible          = 4,
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Class, describing the input data for a set of variables during cycle resolution.
 */
export class CycleResolutionInput extends Base {
    /**
     * A cycle resolution instance this input corresponds to.
     */
    @required
    context             : CycleResolution                       = undefined

    private input       : Map<Variable, VariableInputState>     = undefined

    private $hash       : GraphInputsHash                       = ''


    get hash () : GraphInputsHash {
        if (this.$hash !== '') return this.$hash

        return this.$hash = this.buildHash()
    }

    get description () : CycleDescription { return this.context.description }


    /**
     * Returns the same result as calling [[CycleResolution.resolve]] on this input instance
     */
    get resolution () : CycleResolutionValue {
        return this.context.resolve(this)
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
    /**
     * This method sets the [[HasProposedValue]] flag for the specified variable.
     *
     * @param variable
     */
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
    /**
     * This method sets the [[HasPreviousValue]] flag for the specified variable.
     *
     * @param variable
     */
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
    /**
     * This method sets the [[KeepIfPossible]] flag for the specified variable.
     *
     * @param variable
     */
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
    context                             : CycleResolution    = undefined
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


    get description () : CycleDescription { return this.context.description }


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

        const allInputVars          = CI([ proposedVars, keepIfPossibleVars ]).concat().uniqueOnlyBy(el => el.variable)

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
                        weight += 1e6
                    else
                        weight += 1e4
                } else {
                    if (isProposed)
                        weight += 1e7
                    else
                        weight += 1e5
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


    asResolution () : CycleResolutionValue {
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
