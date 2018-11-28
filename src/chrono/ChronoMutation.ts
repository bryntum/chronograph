import {Base, Constructable, Mixin} from "../util/Mixin.js";
import {ChronoAtom, Readable, Writable} from "./ChronoAtom.js";


export type NamedInput      =  { [s : string] : ChronoAtom & Readable}
export type ArrayInput      =  [ ChronoAtom & Readable ]


export const ChronoMutation = <T extends Constructable<Base>>(base : T) => {

    abstract class ChronoMutation extends base {
        input           : NamedInput | ArrayInput

        as              : (ChronoAtom & Writable)[]

        mapInput (func : (atom : ChronoAtom & Readable) => any) {
            const input     = this.input

            if (input instanceof Array) {
                return input.map(func)
            } else {
                // TODO Object.map
            }
        }
    }

    return ChronoMutation
}

export type ChronoMutation = Mixin<typeof ChronoMutation>



export const Calculable = <T extends Constructable<ChronoMutation>>(base : T) => {

    abstract class Calculable extends base {
        calculation         : (...input) => unknown

        abstract runCalculation ()
    }

    return Calculable
}

export type Calculable = Mixin<typeof Calculable>



export const PureCalculation = <T extends Constructable<ChronoMutation & Calculable>>(base : T) => {

    abstract class PureCalculation extends base {

        runCalculation () {
            const values    = this.mapInput(atom => atom.get())

            const result    = this.calculation(values)

            this.as.forEach(atom => atom.set(result))
        }
    }

    return PureCalculation
}

export type PureCalculation = Mixin<typeof PureCalculation>





