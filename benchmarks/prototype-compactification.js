class Base {
    method1 () {
        return 1
    }

    method2 () {
        return 1
    }

    method3 () {
        return 1
    }

    method4 () {
        return 1
    }
}

const Mixin1 = (base) =>
    class Mixin1 extends base {
        method1 () {
            return super.method1() + 1
        }
    }

const Mixin2 = (base) =>
    class Mixin2 extends base {
        method2 () {
            return super.method2() + 1
        }
    }

const Mixin3 = (base) =>
    class Mixin3 extends base {
        method3 () {
            return super.method3() + 1
        }
    }

const Mixin4 = (base) =>
    class Mixin4 extends base {
        method4 () {
            return super.method4() + 1
        }
    }


const MixinAll = (base) =>
    class MixinAll extends base {
        method1 () {
            return super.method1() + 1
        }
        method2 () {
            return super.method2() + 1
        }
        method3 () {
            return super.method3() + 1
        }
        method4 () {
            return super.method4() + 1
        }
    }

const Cls1Sparse =
    Mixin1(
    Mixin2(
    Mixin3(
    Mixin4(

    Mixin1(
    Mixin2(
    Mixin3(
    Mixin4(

    Mixin1(
    Mixin2(
    Mixin3(
    Mixin4(

    Mixin1(
    Mixin2(
    Mixin3(
    Mixin4(

    Mixin1(
    Mixin2(
    Mixin3(
    Mixin4(

    Mixin1(
    Mixin2(
    Mixin3(
    Mixin4(

    Mixin1(
    Mixin2(
    Mixin3(
    Mixin4(
        Base
    ))))))))))))))))))))))))))))

const Cls2Compact =
    MixinAll(
    MixinAll(
    MixinAll(
    MixinAll(
    MixinAll(
    MixinAll(
    MixinAll(
        Base
    )))))))


const count         = 10000
const instances     = []


for (let i = 0; i < count; i++) instances.push(new Cls1Sparse())

for (let i = 0; i < count; i++) instances.push(new Cls2Compact())


let res = 0

for (let i = 0; i < count; i++) {
    const instance  = instances[ i ]

    res += instance.method1() + instance.method2() + instance.method3() + instance.method4()
}

