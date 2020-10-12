import { Benchmark } from "../../src/benchmark/Benchmark.js"

class T0 {
    prop0       : number = 0
}


class T1 extends T0 {
    prop1       : number = 0
}


class T2 extends T0 {
    prop2       : number = 0
}


const size = 10000

const instantiateOne = Benchmark.new({
    name        : 'Instantiate one class',

    cycle () {
        const instances = new Array(size)

        do {
            for (let i = 0; i < size; i++) {
                instances.push(new T2())
                instances.push(new T2())
                instances.push(new T2())
            }

        } while (instances.length < size)
    }
})


const instantiateMany = Benchmark.new({
    name        : 'Instantiate many classes',
    cycle () {
        const instances = new Array(size)

        do {
            for (let i = 0; i < size; i++) {
                instances.push(new T0())
                instances.push(new T1())
                instances.push(new T2())
            }

        } while (instances.length < size)
    }
})


const run = async () => {
    await instantiateOne.measureTillMaxTime()
    await instantiateMany.measureTillMaxTime()
}

run()
