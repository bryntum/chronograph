import { CalculableBox } from "../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen } from "../src/chrono2/data/CalculableBoxGen.js"
import { Base } from "../src/class/Base.js"
import { AnyFunction } from "../src/class/Mixin.js"


export class GraphGen extends Base {
    sync            : boolean       = false

    calculableBox <V> (config : Partial<CalculableBox<V>>) : CalculableBox<V> {
        if (this.sync)
            return new CalculableBox<V>(config)
        else
            return new CalculableBoxGen<V>(config)
    }


    calc (func : AnyFunction) : string {
        const source : string       = func.toString()

        if (this.sync)
            return '(' + source
                .replace(/function\s*\*/, 'function')
                .replace(/\(yield\s*(.*?)\)/g, '$1.read()') + ')'
        else
            return '(' + source  + ')'
    }
}
