import { BenchmarkC } from "../../src/benchmark/Benchmark.js"
import { AnyConstructor, Mixin } from "../../src/class/Mixin.js"

class T0 {
    prap00      : number = 0
    prap01      : number = 0
    prap02      : number = 0
    prap03      : number = 0
    prap04      : number = 0
    prap05      : number = 0
    prap06      : number = 0
    prap07      : number = 0
    prap08      : number = 0
    prap09      : number = 0

    prip00      : number = 0
    prip01      : number = 0
    prip02      : number = 0
    prip03      : number = 0
    prip04      : number = 0
    prip05      : number = 0
    prip06      : number = 0
    prip07      : number = 0
    prip08      : number = 0
    prip09      : number = 0

    prop00      : number = 0
    prop01      : number = 0
    prop02      : number = 0
    prop03      : number = 0
    prop04      : number = 0
    prop05      : number = 0
    prop06      : number = 0
    prop07      : number = 0
    prop08      : number = 0
    prop09      : number = 0
}

const AddProp1 = <Base extends AnyConstructor<T0>>(base : Base) =>
class AddProp1 extends base {
    prop10      : number = 0
    prop11      : string = 'abc'
    prop12      : object = undefined
    prop13      : boolean = false
    prop14      : number = 0
    prop15      : string = 'abc'
    prop16      : object = undefined
    prop17      : boolean = false
    prop18      : boolean = false
    prop19      : number = 0
}
export type AddProp1 = Mixin<typeof AddProp1>

const AddProp2 = <Base extends AnyConstructor<T0>>(base : Base) =>
class AddProp2 extends base {
    prop20      : number = 0
    prop21      : string = 'abc'
    prop22      : object = undefined
    prop23      : boolean = false
    prop24      : string = 'abc'
    prop25      : object = undefined
    prop26      : boolean = false
    prop27      : number = 0
    prop28      : string = 'abc'
    prop29      : string = 'abc'
}
export type AddProp2 = Mixin<typeof AddProp2>

const AddProp3 = <Base extends AnyConstructor<T0>>(base : Base) =>
class AddProp3 extends base {
    prop30      : number = 0
    prop31      : string = 'abc'
    prop32      : object = undefined
    prop33      : boolean = false
    prop34      : string = 'abc'
    prop35      : object = undefined
    prop36      : boolean = false
    prop37      : number = 0
    prop38      : string = 'abc'
    prop39      : string = 'abc'
}
export type AddProp3 = Mixin<typeof AddProp3>


class T1 extends AddProp1(AddProp2(AddProp3(T0))) {}
class T2 extends AddProp1(AddProp3(AddProp2(T0))) {}

class T3 extends AddProp2(AddProp1(AddProp3(T0))) {}
class T4 extends AddProp2(AddProp3(AddProp1(T0))) {}

class T5 extends AddProp3(AddProp1(AddProp2(T0))) {}
class T6 extends AddProp3(AddProp2(AddProp1(T0))) {}


const size = 50000

const instantiateMany = BenchmarkC<{ instances : any[] }>({
    profile     : true,

    name        : 'Instantiate many classes',

    async setup () : Promise<{ instances : any[] }> {
        return { instances : [] }
    },

    cycle (a, b, state) {
        const instances = state.instances = new Array(size)

        do {
            instances.push(new T0())
            instances.push(new T1())
            instances.push(new T2())
            instances.push(new T3())
            instances.push(new T4())
            instances.push(new T5())
            instances.push(new T6())
            // instances.push(new T7())

        } while (instances.length < size)
    }
})


const run = async () => {
    await instantiateMany.measureTillMaxTime()
}

run()
