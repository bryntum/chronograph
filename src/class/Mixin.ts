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

import { mixin, SELF } from "./InstanceOf.js"

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




export type MixinHelperFuncAny = <T>(required : AnyConstructor[], arg : T) =>
    T extends AnyFunction ?
        MixinConstructor<T> & { [SELF] : T }
    : never


export type MixinHelperFunc1 = <A1 extends AnyConstructor, T>(required : [ A1 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1>> ?
                InstanceType<A1> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SELF] : T }
                    : never
            : never
        : never
    : never

export type MixinHelperFunc2 = <A1 extends AnyConstructor, A2 extends AnyConstructor, T>(required : [ A1, A2 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2>> ?
                InstanceType<A1> & InstanceType<A2> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SELF] : T }
                    : never
                : never
            : never
        : never

export type MixinHelperFunc3 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, T>(required : [ A1, A2, A3 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3>> ?
                InstanceType<A1> & InstanceType<A2> & InstanceType<A3> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SELF] : T }
                    : never
                : never
            : never
        : never

export type MixinHelperFunc4 = <A1 extends AnyConstructor, A2 extends AnyConstructor, A3 extends AnyConstructor, A4 extends AnyConstructor, T>(required : [ A1, A2, A3, A4 ], arg : T) =>
    T extends AnyFunction ?
        Parameters<T> extends [ infer Base ] ?
            Base extends AnyConstructor<InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4>> ?
                InstanceType<A1> & InstanceType<A2> & InstanceType<A3> & InstanceType<A4> extends InstanceType<Base> ?
                    MixinConstructor<T> & { [SELF] : T }
                    : never
                : never
            : never
        : never


export const Mixin : MixinHelperFunc1 & MixinHelperFunc2 & MixinHelperFunc3 & MixinHelperFunc4 = mixin as any
export const MixinAny : MixinHelperFuncAny = mixin as any
