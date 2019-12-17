// import { AnyConstructor, Base, isInstanceOf, Mixin } from "../../src/class/BetterMixin.js"
//
// class Base {
//
//     * gen () {
//
//     }
// }
//
//
// class Next extends Base {
//
//     * gen () {
//         const supGen    = super.gen
//
//         const a = function * () {
//             yield* supGen()
//         }
//
//
//
//         yield* a()
//     }
// }
//
// class A { comp () { console.log(this) } }
// class B extends A { comp () { return super.comp } }
//
// b = new B()
// c = b.comp()
// c() === b
//
//
//
// // //---------------------------------------------------------------------------------------------------------------------
// // export class Event extends Mixin(
// //     [ Base ],
// //     <T extends AnyConstructor<Base>>(base : T) => {
// //
// //         class Event extends base {
// //             @bucket<Dependency>()
// //             incomingDependncies     : Collection<Dependency>
// //
// //             @reference<Event>({ bucket : () => this.$.childEvents })
// //             parentEvent             : Event
// //
// //             @bucket()
// //             childEvents             : Collection<Dependency>
// //
// //             @bucket<DateInterval>()
// //             incomingStartDateConstraintsIntervals : Collection<DateInterval>
// //
// //
// //             @formula('combinedConstraintsInterval')
// //             $combinedConstraintsInterval (Y : SyncEffectHandler) : DateInterval {
// //                 const {
// //                     incomingStartDateConstraintsIntervals
// //                 } : Partial<this> = Y(this.$.incomingStartDateConstraintsIntervals)
// //
// //                 const reduced = incomingStartDateConstraintsIntervals.reduce()
// //
// //                 return reduced
// //             }
// //         }
// //
// //         return Event
// //     }
// // ){}
//
//
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class Dependency extends Mixin(
//     [ Base ],
//     <T extends AnyConstructor<Base>>(base : T) => {
//
//         class Dependency extends base {
//             @ref<Event>(() => this.$.incomingDependencies)
//             toEvent         : Event
//
//             @bucket<DateInterval>()
//             startDateDependencyIntervals    : Collection<DateInterval>
//
//             @formula('startDate')
//             calculateStartDate (Y : SyncEffectHandler) {
//                 Y(this.$.dispatcher).then(({ dispatcher } : Partial<this>) => {
//                     return dispatcher.resolution.get(this.$.startDate).call(this, Y)
//                 })
//             }
//
//             @formula('startDateByEndDateDuration')
//             calculateStartDate (Y : SyncEffectHandler) {
//                 Y(this.$.endDate, this.$.duration, this.$.durationUnit, this.$.calendar).then(
//                     ({ endDate, duration, durationUnit, calendar } : Partial<this>) => {
//                         return calendar.calcualteStartDate(endDate, duration, this.project.convertDuration(Y, duration, durationUnit, TimeUnit.Millisecond))
//                     }
//                 )
//             }
//
//
//             @formula<Dependency>(startDate)
//             startDateByEndDateDuration (Y : SyncEffectHandler, endDate, duration, durationUnit, calendar) {
//                 const startDate = calendar.calcualteStartDate(endDate, duration, this.project.convertDuration(Y, duration, durationUnit, TimeUnit.Millisecond))
//
//                 if (startDate > 0) {
//                     return startDate
//                 } else {
//                     Y.write(this.$.duration, 0)
//
//                     return startDate
//                 }
//             }
//
//
//             @formula<Dependency>('dispatcher', () => [ this.$.startDate), this.$.endDate, this.$.duration ])
//             calculateDispatcher (Y : Ctx, startDate, endDate, duration) : SEDDispatcher {
//                 dispatcher.collectInput(Y, this)
//
//                 return dispatcher
//             }
//
//
//             @input('startDate')
//             setStartDate (startDate : Date, keepDuration : boolean) {
//                 this.Y.write(this.$.startDate, startDate)
//                 this.Y.write(this.$.duration, 'KEEP')
//             }
//
//
//
//             @formula('startDateDependencyInterval')
//             calculateEndToStartDependencyInterval (Y : SyncEffectHandler) {
//                 yield Input(this.$.lag, this.$.lagUnit, this.$.calendar).compute(function* ({ lag, lagUnit, calendar } : Partial<this>) => {
//
//                     yield Continue(super.calculateEndToStartDependencyInterval)
//
//                     if (lag > 0) {
//                         yield Input(this.$.lag, this.$.lagUnit, this.$.calendar).compute(function* ({ lag, lagUnit, calendar } : Partial<this>) => {
//                             yield Output(this.$.toEvent.$.incomingStartDateConstraintsIntervals)
//                         })
//                     } else {
//                         yield Input(this.$.lag, this.$.lagUnit, this.$.calendar).compute(function* ({ lag, lagUnit, calendar } : Partial<this>) => {
//                             yield Output(this.$.startDateDependencyIntervals)
//                         })
//                     }
//                 })
//             }
//
//         }
//
//         return Dependency
//     }
// ){}
//
