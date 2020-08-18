import { CalculationIterator } from "../../primitives/Calculation.js"
import { getUniqable } from "../../util/Uniqable.js"
import { AtomState } from "../atom/Quark.js"
import { calculateAtomsQueueLevelGen } from "../calculation/LeveledGen.js"
import { calculateAtomsQueueLevelSync } from "../calculation/LeveledSync.js"
import { CalculationModeGen } from "../CalculationMode.js"
import { EffectHandler, runGeneratorAsyncWithEffect } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"
import { CalculableBox } from "./CalculableBox.js"

//---------------------------------------------------------------------------------------------------------------------
const eff = (eff) => null

//---------------------------------------------------------------------------------------------------------------------
export class CalculableBoxGen<V> extends CalculableBox<V> {

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


    doCalculate () {
        const uniqable = getUniqable()

        calculateAtomsQueueLevelSync(eff, uniqable, globalContext.stack, [ this ], this.level, true)
    }


    async readAsync () : Promise<V> {
        const activeAtom    = globalContext.activeAtom
        const activeGraph   = activeAtom ? activeAtom.graph : undefined

        if (this.graph && activeGraph && activeGraph !== this.graph) {
            return activeGraph.checkout(this).readAsync()
        }

        if (activeAtom) this.immutableForWrite().addOutgoing(activeAtom.immutable)

        if (this.state === AtomState.UpToDate) return this.immutable.read()

        if (this.calculationPromise) return this.calculationPromise

        if (this.shouldCalculate()) {
            return this.calculationPromise = this.doCalculateAsync()
        } else {
            this.state = AtomState.UpToDate

            return this.immutable.read()
        }
    }


    async doCalculateAsync () : Promise<V> {
        const uniqable = getUniqable()

        await runGeneratorAsyncWithEffect(
            eff,
            calculateAtomsQueueLevelGen,
            [ eff, uniqable, globalContext.stack, [ this ], this.level, true ],
            null
        )

        return this.immutable.read()
    }

}