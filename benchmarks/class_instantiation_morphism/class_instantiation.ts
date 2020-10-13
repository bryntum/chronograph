import { Benchmark, BenchmarkC } from "../../src/benchmark/Benchmark.js"

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

class T1 extends T0 {
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

class T2 extends T1 {
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

class T3 extends T0 {
    prop25      : boolean = false
    prop26      : string = 'abc'
    prop27      : object = undefined
    prop28      : boolean = false
    prop29      : number = 0

    prop20      : string = 'abc'
    prop21      : object = undefined
    prop22      : boolean = false
    prop23      : string = 'abc'
    prop24      : object = undefined
}

class T4 extends T3 {
    prop15      : string = 'abc'
    prop16      : object = undefined
    prop17      : boolean = false
    prop18      : number = 0
    prop19      : string = 'abc'

    prop10      : string = 'abc'
    prop11      : object = undefined
    prop12      : string = 'abc'
    prop13      : object = undefined
    prop14      : boolean = false
}

class T5 extends T0 {
    prop13      : string = 'abc'
    prop14      : object = undefined
    prop15      : boolean = false
    prop16      : string = 'abc'

    prop10      : number = 0
    prop11      : number = 0
    prop12      : string = 'abc'

    prop17      : number = 0
    prop18      : number = 0
    prop19      : string = 'abc'

    prop24      : number = 0
    prop25      : number = 0

    prop22      : number = 0
    prop27      : object = undefined

    prop23      : string = 'abc'
    prop26      : number = 0
}

class T6 extends T5 {
    prop28      : number = 0
    prop29      : object = undefined

    prop20      : number = 0
    prop21      : string = 'abc'

}

class T7 extends T6 {
    prop70      : number = 0
    prop71      : number = 0
    prop72      : number = 0
    prop73      : number = 0
    prop74      : number = 0
    prop75      : number = 0
    prop76      : number = 0
    prop77      : number = 0
    prop78      : number = 0
    prop79      : number = 0
}

const size = 50000

const instantiateMany = BenchmarkC<{ instances : any[] }>({
    // profile     : true,

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
            instances.push(new T7())

        } while (instances.length < size)
    }
})


const run = async () => {
    await instantiateMany.measureTillMaxTime()
}

run()