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

import { mixin } from "./InstanceOf.js"

export class Base {

    static wrap (any : any) : any {}


    initialize<T extends Base> (props? : Partial<T>) {
        props && Object.assign(this, props)
    }


    static new<T extends typeof Base> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        instance.initialize<InstanceType<T>>(props)

        return instance as InstanceType<T>
    }
}

export type BaseConstructor             = typeof Base


//---------------------------------------------------------------------------------------------------------------------
export type AnyFunction<A = any>        = (...input : any[]) => A
export type AnyConstructor<A = object>  = new (...input : any[]) => A


//---------------------------------------------------------------------------------------------------------------------
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>

export type MixinConstructor<T extends AnyFunction> =
    T extends AnyFunction<infer M> ? (M extends AnyConstructor<Base> ? M & BaseConstructor : M) : ReturnType<T>


//---------------------------------------------------------------------------------------------------------------------
// very rough typing for a mixin function
export type MixinFunction = (base : AnyConstructor) => AnyConstructor

// //---------------------------------------------------------------------------------------------------------------------
// type FilterFlags<Base, Condition> = {
//     [Key in keyof Base] : Base[Key] extends Condition ? Key : never
// }
//
// type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[ keyof Base ]
//
// export type OnlyPropertiesOfType<Base, Type> = Pick<Base, AllowedNames<Base, Type>>


// //---------------------------------------------------------------------------------------------------------------------
// export type ReplaceTypeOfProperty<Type, Property extends keyof Type, NewPropertyType> =
//     NewPropertyType extends Type[ Property ] ? Omit<Type, Property> & { [ P in Property ] : NewPropertyType } : never





//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin1 = mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) =>

        class SomeMixin extends base {
            prop1               : number            = 0

            method1 () : number {
                return this.prop1 + 1
            }
        }
)
export type SomeMixin1 = Mixin<typeof SomeMixin1>


//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin2 = mixin(
    [ SomeMixin1 ],

    <T extends AnyConstructor<SomeMixin1>>(base : T) =>

        class SomeMixin extends base {
            prop2               : string            = ''

            method2 () : string {
                return this.prop2 + '1'
            }
        }
)
export type SomeMixin2 = Mixin<typeof SomeMixin2>


//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin3 = mixin(
    [ SomeMixin2 ],

    <T extends AnyConstructor<SomeMixin2>>(base : T) =>

        class SomeMixin3 extends base {
            prop3               : Set<string>       = new Set()

            method3 (a : string) : boolean {
                return this.prop3.has(a)
            }
        }
)
export type SomeMixin3 = Mixin<typeof SomeMixin3>

const a : SomeMixin3     = SomeMixin3.new({ prop1 : 1, zxc : 11 })

const b = (a : SomeMixin3) => {
    a.method1()

    a.prop2

    a.zxc()
}

const ManuallyAppliedSomeMixin3 = SomeMixin3(Base)

const a : SomeMixin3     = SomeMixin3.new({ prop1 : 1, zxc : 11 })

const b = (a : SomeMixin3) => {
    a.method1()

    a.prop2

    a.zxc()
}



//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin4 extends mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) =>

        class SomeMixin4 extends base {
            // static wrap (any : any) : any {}

            prop3               : SomeMixin5

            another             : SomeMixin3
        }
){}
// export type SomeMixin4 = Mixin<typeof SomeMixin4>

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin5 extends mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) =>

        class SomeMixin5 extends base {
            prop3               : SomeMixin4
        }
){}

const ManuallyAppliedSomeMixin4 = SomeMixin4.wrap(Base)

const a4 : SomeMixin4     = SomeMixin4.new({ another : a, zanother : 1 })
const a5 : SomeMixin5     = SomeMixin5.new({ prop3 : a4, zxc : 11 })

a4.prop2 = 11

a4.prop3    = new Set()
a4.prop3    = a5

a4.another  = 'a'
a4.another  = a

const b = (a : SomeMixin3) => {
    a.method1()

    a.prop2

    a.zxc()
}
