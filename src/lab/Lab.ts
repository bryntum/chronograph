// // No exports from this module
// //---------------------------------------------------------------------------------------------------------------------
// import { AnyConstructor } from "./BetterMixin.js"
//
// type FilterFlags<Base, Condition> = {
//     [Key in keyof Base] : Base[Key] extends Condition ? Key : never
// }
//
// type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[ keyof Base ]
//
// export type OnlyPropertiesOfType<Base, Type> = Pick<Base, AllowedNames<Base, Type>>
//
//
// //---------------------------------------------------------------------------------------------------------------------
// type ReplaceTypeOfProperty<Type, Property extends keyof Type, NewPropertyType> =
//     NewPropertyType extends Type[ Property ] ? Omit<Type, Property> & { [ P in Property ] : NewPropertyType } : never
//
//
//
// export type MixinFunction   = <T extends AnyConstructor<object>, MClass extends object>(base : T) => AnyConstructor<T & MClass>
//     //AnyConstructor<Extract<MClass, T>>
//
//
// //
// // //---------------------------------------------------------------------------------------------------------------------
// // class SomeMixin1 extends Mixin(
// //     [ Base ],
// //     <T extends AnyConstructor<Base>>(base : T) =>
// //
// //         class SomeMixin1 extends base {
// //             prop1       : string    = '1'
// //
// //             method1 (p1 : boolean) : string {
// //                 return this.prop1
// //             }
// //         }
// // ){}
// //
// // //---------------------------------------------------------------------------------------------------------------------
// // class SomeMixin2 extends Mixin(
// //     [ Base ],
// //     <T extends AnyConstructor<Base>>(base : T) =>
// //
// //         class SomeMixin2 extends base {
// //             prop2       : string    = '2'
// //
// //             method2 (p2 : boolean) : string {
// //                 return this.prop2
// //             }
// //         }
// // ){}
// //
// //
// // //---------------------------------------------------------------------------------------------------------------------
// // class SomeMixin12 extends Mixin(
// //     [ SomeMixin1, SomeMixin2 ],
// //     <T extends AnyConstructor<SomeMixin1 & SomeMixin2>>(base : T) =>
// //
// //         class SomeMixin12 extends base {
// //             prop12       : string   = '12'
// //
// //             method12 (p12 : boolean) : string {
// //                 this.prop1
// //                 this.prop2
// //
// //                 // this.zxc
// //
// //                 return this.prop12
// //             }
// //         }
// // ){}
// //
// //
// // //---------------------------------------------------------------------------------------------------------------------
// // class SomeMixin3<A extends any> extends Mixin(
// //     [ Base ],
// //     <T extends AnyConstructor<Base>>(base : T) =>
// //
// //         class SomeMixin3 extends base {
// //             prop3       : string    = '3'
// //
// //             A           : unknown
// //
// //             method3 (p3 : boolean) : string {
// //                 return this.prop3
// //             }
// //
// //             method3A (a : this[ 'A' ]) : this[ 'A' ][] {
// //                 const bb : this[ 'A' ] = a
// //
// //                 bb.length
// //                 bb.zxc
// //
// //                 return [ bb ]
// //             }
// //         }
// // ){}
// //
// // interface SomeMixin3<A extends any> {
// //     A       : A
// // }
// //
// // // type Extends<A, B> = A extends B ? A : never
// // //
// // // type SomeMixin3M = SomeMixin3<SomeMixin12>
// // //
// // // type ZZ = SomeMixin12 extends SomeMixin1 ? true : false
// // //
// // // const a : ZZ = true
// // // const b : ZZ = false
// //
// // //---------------------------------------------------------------------------------------------------------------------
// // class SomeMixin23 extends Mixin(
// //     [ SomeMixin2, SomeMixin3 ],
// //     <T extends AnyConstructor<SomeMixin2 & SomeMixin3<number>>>(base : T) =>
// //
// //         class SomeMixin23 extends base {
// //             prop23       : string   = '23'
// //
// //             method23 (p23 : boolean, p23a : this[ 'A' ]) : string {
// //                 this.prop2
// //                 this.prop3
// //
// //                 this.method3A(p23a)
// //                 this.method3A(11)
// //                 this.method3A('zz')
// //
// //                 // this.zxc
// //
// //                 return this.prop23
// //             }
// //         }
// // ){}
// //
// //
// // // // //---------------------------------------------------------------------------------------------------------------------
// // // // @mix(SomeMixin3, SomeMixin2)
// // // // class SomeMixin32<A> {
// // // //     prop32       : string    = '32'
// // // //
// // // //     method2 (p2 : boolean) : string {
// // // //         return super.method2()
// // // //     }
// // // //
// // // //     method32 (p2 : A) : A[] {
// // // //         this.prop2
// // // //         this.prop3
// // // //         this.prop32
// // // //
// // // //         this.zxc
// // // //
// // // //         return [ p2 ]
// // // //     }
// // // // }
// // // //
// // // // interface SomeMixin32<A> extends SomeMixin3, SomeMixin2 {}
// // //
// // //
// // // class Base<A extends any> { }
// // //
// // // class Base0 { }
// // //
// // // export type AnyFunction<A = any>        = (...input : any[]) => A
// // // export type AnyConstructor<A = object>  = new (...input : any[]) => A
// // //
// // // //---------------------------------------------------------------------------------------------------------------------
// // // export type MixinClassConstructor<T> =
// // //     T extends AnyFunction<infer M> ?
// // //         (M extends AnyConstructor<Base0> ? M : M) & { mix : T }
// // //     : never
// // //
// // // //---------------------------------------------------------------------------------------------------------------------
// // // export type MixinHelperFuncAny = <T>(required : AnyConstructor[], arg : T) =>
// // //     T extends AnyFunction ?
// // //         MixinClassConstructor<T>
// // //     : never
// // //
// // //
// // // const mixin = <T>(required: (AnyConstructor)[], mixinLambda: T): MixinClassConstructor<T> => {
// // //     return null as any
// // // }
// // //
// // // export const MixinAny : MixinHelperFuncAny = mixin as any
// // //
// // // class ABC<A> extends Base0 {
// // //
// // // }
// // //
// // //
// // // class SomeMixin3<A> extends MixinAny(
// // //     [ Base ],
// // //     <T extends AnyConstructor<Base<any>>>(base : T) =>
// // //
// // //         class SomeMixin3<B> extends base {
// // //
// // //             prop3       : string    = '3'
// // //
// // //             A           : unknown
// // //
// // //             method3 (p3 : boolean) : string {
// // //                 return this.prop3
// // //             }
// // //
// // //             method3A (a : this[ 'A' ]) : this[ 'A' ][] {
// // //                 const bb : this[ 'A' ] = a
// // //
// // //                 bb.length
// // //                 bb.zxc
// // //
// // //                 return [ bb ]
// // //             }
// // //         }
// // // ){}
