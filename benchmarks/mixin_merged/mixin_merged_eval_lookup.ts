import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { AnyConstructor } from "../../src/class/Mixin.js"

const FieldMixin = <B extends AnyConstructor>(nameArg : string, idx : number, base : B) => {
    const name          = String(nameArg)
    const storageProp   = `'$${name}'`
    const IDX           = idx

    const Class = eval(`(class extends base {
        constructor () {
            super(...arguments)

            this[ ${storageProp} ] = 0
        }
    })`)

    Object.defineProperty(Class.prototype, name, {
        get : eval(`(function () {
            return this[ ${storageProp} ]
        })`),

        set : eval(`(function (value) {
            return this[ ${storageProp} ] = value
        })`)
    })

    Object.defineProperty(Class.prototype, idx, {
        get : eval(`(function () {
            return this[ ${storageProp} ]
        })`),

        set : eval(`(function (value) {
            return this[ ${storageProp} ] = value
        })`)
    })

    return Class
}


class Test1 {
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

class Test2 extends
    FieldMixin('field09', 9,
    FieldMixin('field08', 8,
    FieldMixin('field07', 7,
    FieldMixin('field06', 6,
    FieldMixin('field05', 5,
    FieldMixin('field04', 4,
    FieldMixin('field03', 3,
    FieldMixin('field02', 2,
    FieldMixin('field01', 1,
    FieldMixin('field00', 0,
        Base
    ))))))))))
{
}




const size = 10000


const instantiatePlain = Benchmark.new({
    name        : 'Instantiate plain JS',
    cycle () {
        const instances = new Array(size)

        for (let i = 0; i < size; i++) instances[ i ] = new Test1()
    }
})

const instantiateMixed = Benchmark.new({
    name        : 'Instantiate merged mixins',
    cycle () {
        const instances = new Array(size)

        for (let i = 0; i < size; i++) instances[ i ] = new Test2()
    }
})

const fields = [
    'field00',
    'field01',
    'field02',
    'field03',
    'field04',
    'field05',
    'field06',
    'field07',
    'field08',
    'field09'
]

const fields2 = [
    me => me.field00++,
    me => me.field01++,
    me => me.field02++,
    me => me.field03++,
    me => me.field04++,
    me => me.field05++,
    me => me.field06++,
    me => me.field07++,
    me => me.field08++,
    me => me.field09++,
]

const acc_field00 = me => me.field00++
const acc_field01 = me => me.field01++
const acc_field02 = me => me.field02++
const acc_field03 = me => me.field03++
const acc_field04 = me => me.field04++
const acc_field05 = me => me.field05++
const acc_field06 = me => me.field06++
const acc_field07 = me => me.field07++
const acc_field08 = me => me.field08++
const acc_field09 = me => me.field09++



const accessPlain = Benchmark.new({
    name        : 'Access plain JS',

    async setup () {
        const instances = new Array(size)

        for (let i = 0; i < size; i++) instances[ i ] = new Test1()

        return instances

    },

    cycle (iteration : number, cycle : number, state : Test1[]) {
        for (let i = 0; i < size; i++) {
            const instance = state[ i ]

            for (let k = 0; k < fields.length; k++) instance[ fields[ k ]]++
        }
    }
})

const accessMixed = Benchmark.new({
    name        : 'Access mixed JS',

    async setup () {
        const instances = new Array(size)

        for (let i = 0; i < size; i++) instances[ i ] = new Test2()

        return instances

    },

    cycle (iteration : number, cycle : number, state : Test2[]) {
        for (let i = 0; i < size; i++) {
            const instance = state[ i ]

            // for (let k = 0; k < 10; k++) instance[ k ]++
            for (let k = 0; k < fields.length; k++) fields2[ k ](instance)
        }
    }
})


const run = async () => {
    // await instantiatePlain.measureTillMaxTime()
    // await instantiateMixed.measureTillMaxTime()
    //
    // await accessPlain.measureTillMaxTime()
    await accessMixed.measureTillMaxTime()
}

run()
