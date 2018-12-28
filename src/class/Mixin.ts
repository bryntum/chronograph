//---------------------------------------------------------------------------------------------------------------------
/*

    One should use Base as a base class, instead of Object
    this is because, when compiled to ES3 (which we use for NodeJS / IE11 compatibility), Object is called as a
    super constructor and returned value from it is used as an instance object
    that instance object will be missing prototype inheritance

    the contract is, that native JS constructor for the class is side-effect free
    all the effects may happen in the `initialize` method below
    for the instantiation with initialization one should use static `new` method
    the motivation for such design is that only in this case the attribute initializers, like

         class {
             some      : string   = "string"
         }
    works correctly
*/

export class Base {

    initialize<T extends Base>(props? : Partial<T>) {
        props && Object.assign(this, props)
    }


    static new<T extends typeof Base>(this: T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        instance.initialize<InstanceType<T>>(props)

        return instance as InstanceType<T>
    }
}

export type BaseConstructor         = typeof Base

//---------------------------------------------------------------------------------------------------------------------

export type AnyConstructor          = new (...input: any[]) => any
export type AnyConstructor1<A>      = new (...input: any[]) => A


export type AnyFunction             = (...input: any[]) => any
export type AnyFunction1<A>         = (...input: any[]) => A


//---------------------------------------------------------------------------------------------------------------------
export type Constructable<T extends any> = new (...args : any[]) => T

// export type Constructable1<T extends InstanceType<AnyConstructor>, Z> = new (...args : any[]) => T


//---------------------------------------------------------------------------------------------------------------------
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>

export type MixinConstructor<T extends AnyFunction> =
    T extends AnyFunction1<Base> ? ReturnType<T> & typeof Base : ReturnType<T>


//---------------------------------------------------------------------------------------------------------------------
type FilterFlags<Base, Condition> = {
    [Key in keyof Base] : Base[Key] extends Condition ? Key : never
}

type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[ keyof Base ]

export type OnlyPropertiesOfType<Base, Type> = Pick<Base, AllowedNames<Base, Type>>


/*

When you feel frivolous and want to have some useful distraction please feel free to encode your favorite
mixin typization scheme below, or another crazy experiment

*/
//----------------            go wild here              ------------------
// class ChronoNumber extends Number {
//     constructor (number : number) {
//         super(number)
//
//         return Number(number)
//     }
// }


// export type AnyConstructor11<A>      = new <A>(...input: any[]) => A
//
//
//
// export const Atom = <V, T extends Constructable<Base>>(base : T) =>
//
// class Atom extends base {
//     value               : V
//
//
//     hasValue () : boolean {
//         return this.hasOwnProperty('value')
//     }
// }
//
// export type Atom<V> = Mixin<typeof Atom>
//
// const mixAtom = <V>() => {
//     return Atom<V, typeof Base>(Base)
// }
//
// const AtomCls       = mixAtom<Date>()
//
// let a : InstanceType<typeof AtomCls>
//
// a.zxc
//
// a.value.getTime()
//
// a.value.zxc
//
//
//
//
// // type Atom1<V>       = ReturnType<typeof name>
//
// type ReturnType1<T extends <A>(...args: any[]) => any> = T extends <A>(...args: any[]) => infer R ? R : any;
//
//
//
//
// function some (a : Atom<Date>) {
//     a.zxc
//
//     a.value.getTime()
//
//     a.value.zxc
// }
