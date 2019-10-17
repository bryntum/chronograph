import { Base } from "../class/Mixin.js"
import { HasProposedValue, PreviousValueOf } from "./Effect.js"
import { Identifier } from "./Identifier.js"
import { SyncEffectHandler } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export enum CalculationMode {
    CalculateProposed   = 'CalculateProposed',
    CalculatePure       = 'CalculatePure'
}



//---------------------------------------------------------------------------------------------------------------------
export type CycleResolution<Variable>  = Map<Variable, CalculationMode>


export class CycleDispatcher<Variable = object> extends Base {
    numberOfEquations   : number

    defaultResolution   : CycleResolution<Variable>
    cycleResolution     : CycleResolution<Variable>

    variables           : Set<Variable>

    hasProposedValue    : Set<Variable>    = new Set()
    hasPreviousValue    : Set<Variable>    = new Set()
    keepIfPossible      : Set<Variable>    = new Set()


    addProposedValueFlag (variable : Variable) {
        // debug only
        // if (!this.variables.has(variable)) throw new Error('Unknown variable')

        this.hasProposedValue.add(variable)
    }


    addPreviousValueFlag (variable : Variable) {
        // debug only
        // if (!this.variables.has(variable)) throw new Error('Unknown variable')

        this.hasPreviousValue.add(variable)
    }


    addKeepIfPossibleFlag (variable : Variable) {
        // debug only
        // if (!this.variables.has(variable)) throw new Error('Unknown variable')

        this.keepIfPossible.add(variable)
    }


    getCycleResolution () : CycleResolution<Variable> {
        if (this.cycleResolution) return this.cycleResolution

        return this.cycleResolution = this.buildCycleResolution()
    }


    buildCycleResolution () : CycleResolution<Variable> {
        const result : CycleResolution<Variable>   = new Map()

        //------------------
        for (const variable of this.variables) {
            if (this.hasProposedValue.has(variable))
                result.set(variable, CalculationMode.CalculateProposed)
        }

        //------------------
        if (
            // no user input, all variables have values
            this.hasProposedValue.size === 0 && this.hasPreviousValue.size === this.variables.size
            ||
            // initial data load - all variables have input, no previous values
            this.hasProposedValue.size === this.variables.size && this.hasPreviousValue.size === 0
        ) {
            return this.defaultResolution
        }

        //------------------
        let fixedVars       = Array.from(result.values()).filter(mode => mode === CalculationMode.CalculateProposed).length

        const needFixedVars = this.variables.size - this.numberOfEquations

        //------------------
        // if we are given enough fixed vars to solve the equations system - set the remaining to Pure
        if (fixedVars === needFixedVars) {
            this.markRemainingAsPure(result)

            return result
        }
        else if (fixedVars > needFixedVars) {
            throw new Error('Too many fixed variables (user input), need to perform intermediate propagate')
        }

        //------------------
        // still not enough fixed variables at this point - starting to use `keepIfPossible` flags
        // such flags are only valid if there's a previous value for the variable - we don't "keep" null values
        for (const variable of this.keepIfPossible) {
            if (this.hasPreviousValue.has(variable)) {
                result.set(variable, CalculationMode.CalculateProposed)

                fixedVars++

                if (fixedVars === needFixedVars) {
                    this.markRemainingAsPure(result)

                    return result
                }
            }
        }

        const remainingFreeVariablesWithPreviousValue   = Array.from(this.variables).filter(variable => {
            return result.get(variable) !== CalculationMode.CalculateProposed && this.hasPreviousValue.has(variable)
        })

        this.promoteSomeVariablesWithPreviousValueToFixed(result, new Set(remainingFreeVariablesWithPreviousValue), needFixedVars - fixedVars)

        const fixedVars2      = Array.from(result.values()).filter(mode => mode === CalculationMode.CalculateProposed).length

        if (fixedVars2 === needFixedVars) {
            this.markRemainingAsPure(result)
        }
        else if (fixedVars2 > needFixedVars) {
            throw new Error('Promoted too many variables')
        }
        else {
            // give up, not enough fixed variables, set everything to `Proposed`
            for (const variable of this.variables) {
                result.set(variable, CalculationMode.CalculateProposed)
            }
        }

        return result
    }


    promoteSomeVariablesWithPreviousValueToFixed (result : CycleResolution<Variable>, vars : Set<Variable>, needToPromoteNumber : number) {
    }


    markRemainingAsPure (result : CycleResolution<Variable>) {
        for (const variable of this.variables) {
            if (!result.get(variable)) result.set(variable, CalculationMode.CalculatePure)
        }
    }
}


export class ChronoCycleDispatcher extends CycleDispatcher<Identifier> {

    collectInfo (YIELD : SyncEffectHandler, identifier : Identifier) {
        if (YIELD(PreviousValueOf(identifier)) != null) this.addPreviousValueFlag(identifier)

        if (YIELD(HasProposedValue(identifier))) this.addProposedValueFlag(identifier)
    }
}
