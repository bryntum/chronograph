import { Benchmark } from "../../src/benchmark/Benchmark.js"

class EverythingAtOnce {
    $field00     : number    = 0
    get field00 () { return this.$field00 }
    set field00 (value) { this.$field00 = value}


    $field01     : number    = 0
    get field01 () { return this.$field01 }
    set field01 (value) { this.$field01 = value}


    $field02     : number    = 0
    get field02 () { return this.$field02 }
    set field02 (value) { this.$field02 = value}


    $field03     : number    = 0
    get field03 () { return this.$field03 }
    set field03 (value) { this.$field03 = value}


    $field04     : number    = 0
    get field04 () { return this.$field04 }
    set field04 (value) { this.$field04 = value}


    $field05     : number    = 0
    get field05 () { return this.$field05 }
    set field05 (value) { this.$field05 = value}


    $field06     : number    = 0
    get field06 () { return this.$field06 }
    set field06 (value) { this.$field06 = value}


    $field07     : number    = 0
    get field07 () { return this.$field07 }
    set field07 (value) { this.$field07 = value}


    $field08     : number    = 0
    get field08 () { return this.$field08 }
    set field08 (value) { this.$field08 = value}


    $field09     : number    = 0
    get field09 () { return this.$field09 }
    set field09 (value) { this.$field09 = value}
}

class Base {}

class Test00 extends Base {
    $field00     : number    = 0
    get field00 () { return this.$field00 }
    set field00 (value) { this.$field00 = value}
}

class Test01 extends Test00 {
    $field01     : number    = 0
    get field01 () { return this.$field01 }
    set field01 (value) { this.$field01 = value}
}

class Test02 extends Test01 {
    $field02     : number    = 0
    get field02 () { return this.$field02 }
    set field02 (value) { this.$field02 = value}
}

class Test03 extends Test02 {
    $field03     : number    = 0
    get field03 () { return this.$field03 }
    set field03 (value) { this.$field03 = value}
}

class Test04 extends Test03 {
    $field04     : number    = 0
    get field04 () { return this.$field04 }
    set field04 (value) { this.$field04 = value}
}

class Test05 extends Test04 {
    $field05     : number    = 0
    get field05 () { return this.$field05 }
    set field05 (value) { this.$field05 = value}
}

class Test06 extends Test05 {
    $field06     : number    = 0
    get field06 () { return this.$field06 }
    set field06 (value) { this.$field06 = value}
}

class Test07 extends Test06 {
    $field07     : number    = 0
    get field07 () { return this.$field07 }
    set field07 (value) { this.$field07 = value}
}

class Test08 extends Test07 {
    $field08     : number    = 0
    get field08 () { return this.$field08 }
    set field08 (value) { this.$field08 = value}
}

class BuildGradually extends Test08 {
    $field09     : number    = 0
    get field09 () { return this.$field09 }
    set field09 (value) { this.$field09 = value}
}


const size = 10000

const instantiateEverythingAtOnce = Benchmark.new({
    name        : 'Instantiate everything-at-once class',
    cycle () {
        const instances = new Array(size)

        for (let i = 0; i < size; i++) instances[ i ] = new EverythingAtOnce()
    }
})

const instantiateBuildGradually = Benchmark.new({
    name        : 'Instantiate gradually build class',
    cycle () {
        const instances = new Array(size)

        for (let i = 0; i < size; i++) instances[ i ] = new BuildGradually()
    }
})


const run = async () => {
    await instantiateEverythingAtOnce.measureTillMaxTime()
    await instantiateBuildGradually.measureTillMaxTime()
}

run()
