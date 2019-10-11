import { Base } from "../class/Mixin.js"


export enum CalculationMode {
    CalculateProposed   = 'CalculateProposed',
    CalculatePure       = 'CalculatePure'
}


export type Variable = symbol


export type CycleResoluion  = Map<Variable, CalculationMode>


export class CycleDispatcher<Variables = any> extends Base {
    numberOfEquations   : number

    defaultResolution   : CycleResoluion

    variablesPreference : Variables[]

    variables           : Set<Variables>

    hasProposedValue    : Set<Variables>    = new Set()
    hasPreviousValue    : Set<Variables>    = new Set()
    keepIfPossible      : Set<Variables>    = new Set()


    addProposedValueFlag (variable : Variables) {
        this.hasProposedValue.add(variable)
    }


    addPreviousValueFlag (variable : Variables) {
        this.hasPreviousValue.add(variable)
    }


    addKeepIfPossibleFlag (variable : Variables) {
        this.keepIfPossible.add(variable)
    }


    _cycleResolution : CycleResoluion

    getCycleResolutionCached () : CycleResoluion {
        if (this._cycleResolution) return this._cycleResolution

        return this._cycleResolution = this.getCycleResolution()
    }

    getCycleResolution () : CycleResoluion {
        if (window.DEBUG) debugger

        const result : CycleResoluion   = new Map()

        for (const variable of this.variables) {
            if (this.hasProposedValue.has(variable))
                result.set(variable, CalculationMode.CalculateProposed)
            else
                if (!this.hasPreviousValue.has(variable)) result.set(variable, CalculationMode.CalculatePure)
        }

        if (
            this.hasProposedValue.size === 0 && this.hasPreviousValue.size === this.variables.size
            ||
            this.hasProposedValue.size === this.variables.size
        ) {
            return this.defaultResolution
        }

        const definedVars   = Array.from(result.values())
        let fixedVars       = definedVars.filter(mode => mode === CalculationMode.CalculateProposed).length

        // if we are given enough fixed vars to solve the equations system
        if (fixedVars + this.numberOfEquations === this.variables.size) {
            for (const variable of this.variables) {
                if (!result.get(variable)) result.set(variable, CalculationMode.CalculatePure)
            }

            return result
        }

        if (this.keepIfPossible.size > 0) {
            for (const variable of this.keepIfPossible) {
                if (this.hasPreviousValue.has(variable)) {
                    result.set(variable, CalculationMode.CalculateProposed)

                    fixedVars++
                }
            }
        }

        if (fixedVars + this.numberOfEquations === this.variables.size) {
            for (const variable of this.variables) {
                if (!result.get(variable)) result.set(variable, CalculationMode.CalculatePure)
            }
        }
        else if (fixedVars + this.numberOfEquations > this.variables.size) {
            this.ignoreSomeFixedVariables()
        }
        else if (fixedVars + this.numberOfEquations < this.variables.size) {

            ////

            for (const variable of this.variables) {
                result.set(variable, CalculationMode.CalculateProposed)
            }
        }

        return result
    }


    demoteSomeFixedVariables () {

        project.queue(() => {
            project.setStartDate(11)

            project.endDate = 12
        })
    }


    promoteSomeVariablesWithPreviousValueToFixed () {
    }

}



