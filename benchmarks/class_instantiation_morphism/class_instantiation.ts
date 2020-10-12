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
    prop11      : number = 0
    prop12      : number = 0
    prop13      : number = 0
    prop14      : number = 0
    prop15      : number = 0
    prop16      : number = 0
    prop17      : number = 0
    prop18      : number = 0
    prop19      : number = 0
}

class T2 extends T0 {
    prop20      : number = 0
    prop21      : number = 0
    prop22      : number = 0
    prop23      : number = 0
    prop24      : number = 0
    prop25      : number = 0
    prop26      : number = 0
    prop27      : number = 0
    prop28      : number = 0
    prop29      : number = 0
}

class T3 extends T0 {
    prop30      : number = 0
    prop31      : number = 0
    prop32      : number = 0
    prop33      : number = 0
    prop34      : number = 0
    prop35      : number = 0
    prop36      : number = 0
    prop37      : number = 0
    prop38      : number = 0
    prop39      : number = 0
}

class T4 extends T0 {
    prop40      : number = 0
    prop41      : number = 0
    prop42      : number = 0
    prop43      : number = 0
    prop44      : number = 0
    prop45      : number = 0
    prop46      : number = 0
    prop47      : number = 0
    prop48      : number = 0
    prop49      : number = 0
}

class T5 extends T0 {
    prop50      : number = 0
    prop51      : number = 0
    prop52      : number = 0
    prop53      : number = 0
    prop54      : number = 0
    prop55      : number = 0
    prop56      : number = 0
    prop57      : number = 0
    prop58      : number = 0
    prop59      : number = 0
}

class T6 extends T0 {
    prop60      : number = 0
    prop61      : number = 0
    prop62      : number = 0
    prop63      : number = 0
    prop64      : number = 0
    prop65      : number = 0
    prop66      : number = 0
    prop67      : number = 0
    prop68      : number = 0
    prop69      : number = 0
}

class T7 extends T0 {
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
            // instances.push(new T1())
            // instances.push(new T2())
            // instances.push(new T3())
            // instances.push(new T4())
            // instances.push(new T5())
            // instances.push(new T6())
            // instances.push(new T7())

        } while (instances.length < size)
    }
})


const run = async () => {
    await instantiateMany.measureTillMaxTime()
}

run()
