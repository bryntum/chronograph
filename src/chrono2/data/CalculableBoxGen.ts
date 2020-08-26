import { CalculationIterator } from "../../primitives/Calculation.js"
import { getUniqable } from "../../util/Uniqable.js"
import { AtomState } from "../atom/Atom.js"
import { calculateAtomsQueueLevelGen } from "../calculation/LeveledGen.js"
import { calculateAtomsQueueLevelSync } from "../calculation/LeveledSync.js"
import { CalculationModeGen } from "../CalculationMode.js"
import { EffectHandler, runGeneratorAsyncWithEffect } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"
import { CalculableBox } from "./CalculableBox.js"

//---------------------------------------------------------------------------------------------------------------------
export class CalculableBoxGen<V = unknown> extends CalculableBox<V> {

    iterator            : CalculationIterator<V>    = undefined

    iterationResult     : IteratorResult<any>       = undefined

    // possibly this needs to be a global (per atom) revision number
    iterationNumber     : number                    = -1

    calculationPromise  : Promise<V>                = undefined


    isCalculationStarted () : boolean {
        return Boolean(this.iterator || this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    startCalculation (onEffect : EffectHandler<CalculationModeGen>) : IteratorResult<any> {
        this.beforeCalculation()

        this.iterationNumber        = 0

        const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.context, onEffect)

        return this.iterationResult = iterator.next()
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        this.iterationNumber++

        return this.iterationResult = this.iterator.next(value)
    }


    resetCalculation () {
        this.iterationResult        = undefined
        this.iterator               = undefined
        this.iterationNumber        = -1
        this.calculationPromise     = undefined
    }


    shouldCalculate () : boolean {
        return true
    }


    doCalculate () {
        const uniqable = getUniqable()

        const effectHandler = this.graph ? this.graph.onEffectAsync : globalContext.onEffectAsync

        calculateAtomsQueueLevelSync(effectHandler, uniqable, globalContext.stack, [ this ], this.level, true)
    }


    async readAsync () : Promise<V> {
        const activeAtom    = globalContext.activeAtom
        const self          = this.checkoutSelf()

        if (activeAtom) self.immutableForWrite().addOutgoing(activeAtom.immutable)

        if (self.state === AtomState.UpToDate) return self.immutable.read()

        if (self.calculationPromise) return self.calculationPromise

        return self.calculationPromise = self.doCalculateAsync()
    }


    async doCalculateAsync () : Promise<V> {
        const uniqable = getUniqable()

        const effectHandler = this.graph ? this.graph.onEffectAsync : globalContext.onEffectAsync

        await runGeneratorAsyncWithEffect(
            effectHandler,
            calculateAtomsQueueLevelGen,
            [ effectHandler, uniqable, globalContext.stack, [ this ], this.level, true ],
            null
        )

        return this.immutable.read()
    }

}
