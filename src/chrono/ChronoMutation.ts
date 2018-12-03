import {Observable} from "../chronograph/ChronoAtom.js";
import {AnyFunction, Base, Constructable, Mixin} from "../class/Mixin.js";
import {Calculable, ChronoAtom, Readable} from "./ChronoAtom.js";
import {MinimalChronoGraphNode} from "../chronograph/ChronoGraph.js";


export type NamedInput      =  { [s : string] : ChronoAtom & Readable }
export type ArrayInput      =  [ ChronoAtom & Readable ]

/*

All we need from Input type is basically `map` function, so it can be a functor over any type

This should allow arbitrary JSON graph as input

*/


export const ChronoMutation = <T extends Constructable<Base>>(base : T) =>

class ChronoMutation extends base {
    input           : NamedInput | ArrayInput

    as              : (ChronoAtom & Observable)[]

    mapInput (func : (atom : ChronoAtom & Readable) => any) {
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

export type ChronoMutation = Mixin<typeof ChronoMutation>



export const PureChronoCalculation = <T extends Constructable<Calculable & ChronoMutation>>(base : T) => {

    abstract class PureChronoCalculation extends base {

        calculation         : AnyFunction

        runCalculation () {
            const values    = this.mapInput(atom => atom.get())

            const result    = this.calculation(values)

            this.as.forEach(atom => atom.set(result))
        }
    }

    return PureChronoCalculation
}

export type PureChronoCalculation = Mixin<typeof PureChronoCalculation>



export const ChronoMutationNode = <T extends Constructable<MinimalChronoGraphNode & ChronoMutation & PureChronoCalculation>>(base : T) => {

    abstract class ChronoMutationNode extends base {

        getFromEdges () : Set<this> {
            const res       = []

            this.mapInput(x => res.push(x))

            return new Set<this>([ ...res ])
        }

        getToEdges () : Set<this> {
            return new Set<this>([ ...<any>(this.as) ])
        }
    }

    return ChronoMutationNode
}

export type ChronoMutationNode = Mixin<typeof ChronoMutationNode>


export const GenericChronoMutationNode  = ChronoMutation(Calculable(MinimalChronoGraphNode))


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
