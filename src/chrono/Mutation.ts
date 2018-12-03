import {AnyFunction, Base, Constructable, Mixin} from "../class/Mixin.js";
import {Calculable, Atom, Readable, Writable} from "./Atom.js";


export type NamedInput      =  { [s : string] : Atom & Readable }
export type ArrayInput      =  (Atom & Readable)[]

export type ArrayOutput     =  (Atom & Writable)[]

/*

All we need from Input type is basically `map` function, so it can be a functor over any type

This should allow arbitrary JSON graph as input

*/


export const Mutation = <T extends Constructable<Base>>(base : T) =>

class Mutation extends base {
    input           : NamedInput | ArrayInput

    as              : (Atom & Writable)[]

    mapInput (func : (atom : Atom & Readable) => any) {
        const input     = this.input

        if (input instanceof Array) {
            return input.map(func)
        } else {
            // no Object.map() ? are JS designers serious?
            let res     = {}

            for (let key in input) {
                res[ key ] = func(input[ key ])
            }

            return res
        }
    }
}

export type Mutation = Mixin<typeof Mutation>



export const PureChronoCalculation = <T extends Constructable<Calculable & Mutation>>(base : T) => {

    abstract class PureChronoCalculation extends base {

        calculation         : AnyFunction

        runCalculation () {
            const values    = this.mapInput(atom => atom.get())

            const result    = Array.isArray(values) ? this.calculation.apply(this, values) : this.calculation(values)

            this.as.forEach(atom => atom.set(result))
        }
    }

    return PureChronoCalculation
}

export type PureChronoCalculation = Mixin<typeof PureChronoCalculation>



export const MinimalMutation = PureChronoCalculation(Calculable(Mutation(Base)))

//
//
// export type SynchronousRunCore = (snapshot : ChronoGraphSnapshot) => ChronoGraphSnapshot
// export type AsynchronousRunCore = (snapshot : ChronoGraphSnapshot) => Promise<ChronoGraphSnapshot>
//
// export type AsynchronousRunCore = (snapshot : ChronoGraphSnapshot) => Promise<ChronoGraphSnapshot>
//
//
//
//
//
//
//
