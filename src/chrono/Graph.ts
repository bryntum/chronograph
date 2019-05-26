import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Graph, MinimalGraph } from "../graph/Graph.js"
import { CalculationFunction } from "../primitives/Calculation.js"
import { Identifier, MinimalQuark, Quark, Variable } from "./Quark.js"

//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Graph>>(base : T) =>

class ChronoGraph extends base {
    NodeT                   : Quark


    variablesData           : Map<Variable, any> = new Map()

    quarksByIdentifier      : Map<Identifier, Quark> = new Map()


    observe (calculation : CalculationFunction) : Identifier {
        const identifier    = Identifier.new()

        const quark     = MinimalQuark.new({
            identifier,
            calculation
        })

        this.quarksByIdentifier.set(identifier, quark)

        return identifier
    }


    write (variable : Variable, value : any) {
        this.variablesData.set(variable, value)
    }


    read (identifier : Identifier | Variable) : any {
        if (identifier instanceof Variable) {
            return this.variablesData.get(identifier)
        } else {
            const quark     = this.quarksByIdentifier.get(identifier)

            if (!quark) throw new Error("Unknown identifier")

            if (quark.hasValue()) return quark.value

            quark.runSync()

            return quark.value
        }
    }


    async readAsync (identifier : Identifier) : Promise<any> {

    }
}

export type ChronoGraph = Mixin<typeof ChronoGraph>
export interface ChronoGraphI extends Mixin<typeof ChronoGraph> {
    NodeT                   : Quark
}

export class MinimalChronoGraph extends ChronoGraph(MinimalGraph) {
    NodeT                   : Quark
}


