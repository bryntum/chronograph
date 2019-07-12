const generatorFunc     = function * (a) { return a + 1 }

const N                 = 5000

//----------------------------------
let res                 = 0

for (let i = 0; i < N; i++) {
    res                 += generatorFunc(i).next().value
}
