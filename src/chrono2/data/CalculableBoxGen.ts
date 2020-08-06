import { CalculationIterator } from "../../primitives/Calculation.js"
import { CalculationModeGen } from "../CalculationMode.js"
import { EffectHandler } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"
import { CalculableBox } from "./CalculableBox.js"


//---------------------------------------------------------------------------------------------------------------------
export class CalculableBoxGen<V> extends CalculableBox<V> {

    iterator            : CalculationIterator<V>    = undefined

    iterationResult     : IteratorResult<any>       = undefined


    isCalculationStarted () : boolean {
        return Boolean(this.iterator || this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    startCalculation (onEffect : EffectHandler<CalculationModeGen>) : IteratorResult<any> {
        this.beforeCalculation()

        const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.context, onEffect)

        return this.iterationResult = iterator.next()
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        return this.iterationResult = this.iterator.next(value)
    }


    resetCalculation () {
        this.iterationResult        = undefined
        this.iterator               = undefined
    }


    doCalculate () {
        // //----------------------
        // while (this.graph.stack.getLowestLevel() < this.level) {
        //     this.graph.calculateTransitionsStackSync(this.graph.stack.takeLowestLevel())
        // }

        globalContext.calculateAtoms([ this ])
    }
}
