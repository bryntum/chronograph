Mixins formalization
====================

Prior art
---------

To observe the prior art on the mixin pattern please refer to [this blog post](https://www.bryntum.com/blog/the-mixin-pattern-in-typescript-all-you-need-to-know) 

Definitions
-----------

Let `C` be a set of all "regular" TypeScript classes. Corresponding TypeScript definition:

```ts
export type AnyConstructor<A = object>  = new (...input : any[]) => A
```

Let `M` be a set of all "regular" TypeScript functions, that accepts a "base" class and returns its subclass, extended with internal "m-class".

```ts
export type MixinFunction   = (base : AnyConstructor) => AnyConstructor
```

Lets call elements of `M` - mixin lambdas.

An example of mixin lambda will look like:

```ts
// mixin lambda
const MixableClass = <T extends AnyConstructor<object>>(base : T) =>

// internal m-class
class MixableClass extends base {
    someProperty : string = 'initialValue'

    someMethod (arg : number) {
        const res = super.someMethodFromAlreadyImplementsMixin(arg)
        // ...
        return res + 1
    }
}
```

To get a "regular" class from the mixin lambda, one need to apply it to another regular class:

```ts
class Base {}

const MixableClassDerivedFromBase = MixableClass(Base)

const instance  = new MixableClassDerivedFromBase()
```

Let `MC` be a set of all "regular" TypeScript classes, received as a result of all possible applications of `M` elements (all possible calls to mixin lambdas), plus a zero element - `Object` class (`object` type in TypeScript). Let the `mZ` be the zero element of `MC`


Requirements
------------

A mixin lambda may have a list of requirements on the base class it is being applied. A requirement can be an element of the `C` or `M`. Only a single `C` requirement is allowed per requirements declaration. If `C` requirement is not given, and implicit requirement on `mZ` is assumed.  

Requirement of type `C` means the regular class, the base class, given as an argument for this lambda should extend (classes extends themselves by definition).
Requirement of type `M` means the another lambda, which should have been applied to derive one of the superclasses of the base class, or the base class itself.

An example of the base class requirement: 

```ts
const MixableClass1 = <T extends AnyConstructor<Base>>(base : T) =>

class MixableClass1 extends base {
}
```

An example of the another lambda requirement: 

```ts
const MixableClass2 = <T extends AnyConstructor<MixableClass1>>(base : T) =>

class MixableClass2 extends base {
}
```

An error - base class requirements should match: 

```ts
class Base2 {}


const MixableClass3 = <T extends AnyConstructor<MixableClass1 & Base2>>(base : T) =>

class MixableClass3 extends base {
}
```



Partial ordering
----------------

Note, that requirements relation establishes a partial order on `MC`.

If lambda `m1` requires base class `b1`, we denote that with `m1 ⊇ b1`. If lambda `m1` requires lambda `m2`, and `m1 ⊇ b && m2 ⊇ b` (same base class requirements), we denote that with `m1 ≽ m2`.

The required properties holds obviously:

- Reflexivity - holds by definition
- Antisymmetry - if lambda `m1 ≽ m2` and `m2 ≽ m1`, the only possible option is that `m1 = m2`. Indeed, if 2 lambdas each requires another be applied prior it, that creates a function call that does not terminate. This property basically forbids cyclic requirements.
- Transitivity - if lambda `m1 ≽ m2` and `m2 ≽ m3`, the relation `m1 ≽ m3` holds by definition    


Minimal elements
----------------

Because the relation `≽` (lambda requirement) depends on the `⊇` (matching base class requirement) and there are many possible base classes, the order is partial. Its globally minimal element is `mZ` and it has many other minimal elements.

Those minimal elements are isomorphic to mixin lambdas, up to the base class. In other words, for every mixin lambda `m` we can construct an element of `MC`, which will contain only its `M` requirements, gathered deeply and topologically sorted (In fact we can construct several such elements because if elements don't require each other, they are uncomparable, see the [Implementation]() below). Such mixin lambdas "chain" creates a minimal element in the set of `MC` elements, that requires the `m` lambda.   

Let the `MinMC` be a set of all minimal elements of `MC` for relation `≽`. Lets call the elements of `MinMC` - mixable classes or mixin classes.

To illustrate:

```ts
const MixableClass1 = <T extends AnyConstructor<object>>(base : T) =>

class MixableClass1 extends base {
    prop1 : string = 'prop1'

    method1 (arg : number) : number {
        return arg + 1
    }
}

const MixableClass2 = <T extends AnyConstructor<MixableClass1 & Base>>(base : T) =>

class MixableClass2 extends base {
    prop2 : string = 'prop2'

    method2 (arg : number) : number {
        return arg + 1
    }
}

```

The "minimal" element of lambda `MixableClass1`: `MixableClass1(Object)`

The "minimal" element of lambda `MixableClass2`: `MixableClass2(MixableClass1(Base))`

It is convenient to think about the minimal elements as the mixins themselves, or composable classes, mixable classes.


Implementation
--------------

We can still establish some artificial ordering for the implementation purposes, but end-users should not rely on the order of the mixin lambdas application.


Suggested notation
------------------


Open questions
--------------

Generic class arguments (a workaround possible). 

Generic class arguments that extends mixable classes.



## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
