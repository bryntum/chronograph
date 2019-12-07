// //---------------------------------------------------------------------------------------------------------------------
// import { AnyConstructor, Base, Mixin } from "../../src/class/Mixin.js"
//
// export class SomeMixin0 extends Mixin(
//     [ Object ],
//
//     <T extends AnyConstructor<object>>(base : T) =>
//
//     class SomeMixin0 extends base {
//         prop0               : number            = 0
//
//         method0 () : number {
//             return this.prop0 + 1
//         }
//     }
// ){}
//
//
// export class SomeMixin1 extends Mixin(
//     [ Object ],
//
//     <T extends AnyConstructor<object>>(base : T) =>
//
//     class SomeMixin1 extends base {
//         prop1               : number            = 0
//
//         method1 () : number {
//             return this.prop1 + 1
//         }
//     }
// ){}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class SomeMixin2 extends Mixin(
//     [ SomeMixin1 ],
//
//     <T extends AnyConstructor<SomeMixin1>>(base : T) =>
//
//     class SomeMixin2 extends base {
//         prop2               : string            = ''
//
//         method2 () : string {
//             return this.prop2 + '1'
//         }
//
//         method (a : string, b : number) {
//             this.method1()
//         }
//     }
// ){}
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class SomeMixin3 extends Mixin(
//     [ Base, SomeMixin1, SomeMixin2 ],
//
//     <T extends AnyConstructor<Base & SomeMixin1 & SomeMixin2>>(base : T) =>
//
//     class SomeMixin3 extends base {
//         prop3               : Set<string>       = new Set()
//
//         method3 (a : string) : boolean {
//             return this.prop3.has(a)
//         }
//     }
// ){}
//
// const a : SomeMixin3     = SomeMixin3.new({ prop1 : 1, zxc : 11 })
//
// const b = (a : SomeMixin3) => {
//     a.method1()
//     a.method2()
//     a.method3('a')
//
//     a.prop2
//
//     a.zxc()
// }
//
//
// const aa : SomeMixin3     = SomeMixin3.new({ prop1 : 1, zxc : 11 })
//
// const bb = (a : SomeMixin3) => {
//     a.method1()
//
//     a.prop2
//
//     a.zxc()
// }
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class SomeMixin4 extends Mixin(
//     [ Base ],
//
//     <T extends AnyConstructor<Base>>(base : T) =>
//
//     class SomeMixin4 extends base {
//         // static wrap (any : any) : any {}
//
//         prop3               : SomeMixin5
//
//         another             : SomeMixin3
//
//         method (a : boolean) {
//
//         }
//     }
// ){}
// // export type SomeMixin4 = Mixin<typeof SomeMixin4>
//
// //---------------------------------------------------------------------------------------------------------------------
// export class SomeMixin5 extends Mixin(
//     [ Base ],
//
//     <T extends AnyConstructor<Base>>(base : T) =>
//
//     class SomeMixin5 extends base {
//         prop3               : SomeMixin4
//
//         method (a : string, b : number) {
//
//         }
//     }
// ){}
//
//
// const a4 : SomeMixin4     = SomeMixin4.new({ another : a, zanother : 1 })
// const a5 : SomeMixin5     = SomeMixin5.new({ prop3 : a4, zxc : 11 })
//
// a4.prop2 = 11
//
// a4.prop3    = new Set()
// a4.prop3    = a5
//
// a4.another  = 'a'
// a4.another  = a
//
// const bbb = (a : SomeMixin3) => {
//     a.method1()
//
//     a.prop2
//
//     a.zxc()
// }
//
//
//
// const ManuallyAppliedSomeMixin4 = SomeMixin2.wrap(SomeMixin4.wrap(Base)) // ??
//
// // instead:
//
// //---------------------------------------------------------------------------------------------------------------------
// export class MyClass extends Mixin(
//     [ SomeMixin2, SomeMixin4 ],
//
//     <T extends AnyConstructor<SomeMixin2 & SomeMixin4>>(base : T) =>
//
//     class MyClass extends base {
//         myClassProp   : Set<string>
//     }
// ){}
//
//
// const myCls1 = MyClass.new()
//
// myCls1.prop1     = 11
// myCls1.prop2     = '11'
// myCls1.method('a', 1)
// myCls1.method(true)
//
// myCls1.myClassProp
// myCls1.myClass2Prop
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class MyClass2/*<A>*/ extends Mixin(
//     [ SomeMixin2, SomeMixin4 ],
//
//     <T extends AnyConstructor<SomeMixin2 & SomeMixin4>>(base : T) =>
//
//         class MyClass2 extends base {
//             /*a : A*/
//
//             myClass2Prop    : Map<number, boolean>
//
//             prop2 : string
//         }
// ){}
//
//
// const myCls2 = MyClass2.new()
//
// myCls2.prop1     = 11
// myCls2.prop2     = '11'
// myCls2.method('a', 1)
// myCls2.method(true)
//
// myCls2.myClassProp
// myCls2.myClass2Prop
//
// myCls2.zxc
