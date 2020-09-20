import { Benchmark } from "../../src/benchmark/Benchmark.js";

class StringProps {
    constructor() {
        this.$field00 = 0;
        this.$field01 = 0;
        this.$field02 = 0;
        this.$field03 = 0;
        this.$field04 = 0;
        this.$field05 = 0;
        this.$field06 = 0;
        this.$field07 = 0;
        this.$field08 = 0;
        this.$field09 = 0;
    }
    get field00() { return this.$field00; }
    set field00(value) { this.$field00 = value; }
    get field01() { return this.$field01; }
    set field01(value) { this.$field01 = value; }
    get field02() { return this.$field02; }
    set field02(value) { this.$field02 = value; }
    get field03() { return this.$field03; }
    set field03(value) { this.$field03 = value; }
    get field04() { return this.$field04; }
    set field04(value) { this.$field04 = value; }
    get field05() { return this.$field05; }
    set field05(value) { this.$field05 = value; }
    get field06() { return this.$field06; }
    set field06(value) { this.$field06 = value; }
    get field07() { return this.$field07; }
    set field07(value) { this.$field07 = value; }
    get field08() { return this.$field08; }
    set field08(value) { this.$field08 = value; }
    get field09() { return this.$field09; }
    set field09(value) { this.$field09 = value; }
}


class NumericProps {
    constructor() {
        this[0] = 0;
        this[1] = 0;
        this[2] = 0;
        this[3] = 0;
        this[4] = 0;
        this[5] = 0;
        this[6] = 0;
        this[7] = 0;
        this[8] = 0;
        this[9] = 0;
    }
    get field00() { return this[0]; }
    set field00(value) { this[0] = value; }
    get field01() { return this[1]; }
    set field01(value) { this[1] = value; }
    get field02() { return this[2]; }
    set field02(value) { this[2] = value; }
    get field03() { return this[3]; }
    set field03(value) { this[3] = value; }
    get field04() { return this[4]; }
    set field04(value) { this[4] = value; }
    get field05() { return this[5]; }
    set field05(value) { this[5] = value; }
    get field06() { return this[6]; }
    set field06(value) { this[6] = value; }
    get field07() { return this[7]; }
    set field07(value) { this[7] = value; }
    get field08() { return this[8]; }
    set field08(value) { this[8] = value; }
    get field09() { return this[9]; }
    set field09(value) { this[9] = value; }
}

const size = 10000;

const instantiateStringProps = Benchmark.new({
    name: 'Instantiate class with string props',
    cycle() {
        const instances = new Array(size);
        for (let i = 0; i < size; i++)
            instances[i] = new StringProps();
    }
});

const instantiateNumericProps = Benchmark.new({
    name: 'Instantiate class with numeric props',
    cycle() {
        const instances = new Array(size);
        for (let i = 0; i < size; i++)
            instances[i] = new NumericProps();
    }
});

const fields = [ 'field00', 'field01', 'field02', 'field03', 'field04', 'field05', 'field06', 'field07', 'field08', 'field09' ]

const accessStringProps = Benchmark.new({
    name        : 'Access string props',

    async setup () {
        const instances = new Array(size)
        for (let i = 0; i < size; i++) instances[ i ] = new StringProps()
        return instances
    },

    cycle (iteration, cycle, state) {
        for (let i = 0; i < size; i++) {
            const instance = state[ i ]

            // Dynamic lookup
            for (let k = 0; k < fields.length; k++) instance[ fields[ k ]]++

            // Static lookup
            // instance.field00++
            // instance.field01++
            // instance.field02++
            // instance.field03++
            // instance.field04++
            // instance.field05++
            // instance.field06++
            // instance.field07++
            // instance.field08++
            // instance.field09++
        }
    }
})

const accessNumericProps = Benchmark.new({
    name        : 'Access numeric props',

    async setup () {
        const instances = new Array(size)
        for (let i = 0; i < size; i++) instances[ i ] = new NumericProps()
        return instances
    },

    cycle (iteration, cycle, state) {
        for (let i = 0; i < size; i++) {
            const instance = state[ i ]

            // Dynamic lookup
            for (let k = 0; k < fields.length; k++) instance[ k ]++

            // Static lookup
            // instance[0]++
            // instance[1]++
            // instance[2]++
            // instance[3]++
            // instance[4]++
            // instance[5]++
            // instance[6]++
            // instance[7]++
            // instance[8]++
            // instance[9]++
        }
    }
})


const run = async () => {
    await instantiateStringProps.measureTillMaxTime();
    await instantiateNumericProps.measureTillMaxTime();

    await accessStringProps.measureTillMaxTime();
    await accessNumericProps.measureTillMaxTime();
};

run();
