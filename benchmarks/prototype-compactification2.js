class Classic {
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


class Override1 extends Classic {
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

class Override2 extends Override1 {
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

class Override3 extends Override2 {
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

class Override4 extends Override3 {
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

class Override5 extends Override4 {
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

class Override6 extends Override5 {
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

class Override7 extends Override6 {
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


class Partial1_1 extends Classic {
    method1 () {
        return super.method1() + 1
    }
}
class Partial1_2 extends Partial1_1 {
    method2 () {
        return super.method2() + 1
    }
}
class Partial1_3 extends Partial1_2 {
    method3 () {
        return super.method3() + 1
    }
}
class Partial1_4 extends Partial1_3 {
    method4 () {
        return super.method4() + 1
    }
}


class Partial2_1 extends Partial1_4 {
    method1 () {
        return super.method1() + 1
    }
}
class Partial2_2 extends Partial2_1 {
    method2 () {
        return super.method2() + 1
    }
}
class Partial2_3 extends Partial2_2 {
    method3 () {
        return super.method3() + 1
    }
}
class Partial2_4 extends Partial2_3 {
    method4 () {
        return super.method4() + 1
    }
}


class Partial3_1 extends Partial2_4 {
    method1 () {
        return super.method1() + 1
    }
}
class Partial3_2 extends Partial3_1 {
    method2 () {
        return super.method2() + 1
    }
}
class Partial3_3 extends Partial3_2 {
    method3 () {
        return super.method3() + 1
    }
}
class Partial3_4 extends Partial3_3 {
    method4 () {
        return super.method4() + 1
    }
}


class Partial4_1 extends Partial3_4 {
    method1 () {
        return super.method1() + 1
    }
}
class Partial4_2 extends Partial4_1 {
    method2 () {
        return super.method2() + 1
    }
}
class Partial4_3 extends Partial4_2 {
    method3 () {
        return super.method3() + 1
    }
}
class Partial4_4 extends Partial4_3 {
    method4 () {
        return super.method4() + 1
    }
}


class Partial5_1 extends Partial4_4 {
    method1 () {
        return super.method1() + 1
    }
}
class Partial5_2 extends Partial5_1 {
    method2 () {
        return super.method2() + 1
    }
}
class Partial5_3 extends Partial5_2 {
    method3 () {
        return super.method3() + 1
    }
}
class Partial5_4 extends Partial5_3 {
    method4 () {
        return super.method4() + 1
    }
}


class Partial6_1 extends Partial5_4 {
    method1 () {
        return super.method1() + 1
    }
}
class Partial6_2 extends Partial6_1 {
    method2 () {
        return super.method2() + 1
    }
}
class Partial6_3 extends Partial6_2 {
    method3 () {
        return super.method3() + 1
    }
}
class Partial6_4 extends Partial6_3 {
    method4 () {
        return super.method4() + 1
    }
}


class Partial7_1 extends Partial6_4 {
    method1 () {
        return super.method1() + 1
    }
}
class Partial7_2 extends Partial7_1 {
    method2 () {
        return super.method2() + 1
    }
}
class Partial7_3 extends Partial7_2 {
    method3 () {
        return super.method3() + 1
    }
}
class Partial7_4 extends Partial7_3 {
    method4 () {
        return super.method4() + 1
    }
}



const count         = 10000
const instancesCompact     = []
const instancesSparse      = []

for (let i = 0; i < count; i++) instancesSparse.push(new Partial7_4())
for (let i = 0; i < count; i++) instancesCompact.push(new Override7())


let res = 0

for (let i = 0; i < count; i++) {
    const instance  = instances[ i ]

    res += instance.method1() + instance.method2() + instance.method3() + instance.method4()
}

