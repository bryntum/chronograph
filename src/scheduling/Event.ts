import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {compute, field, mutation} from "../schema/Schema.js";


// type Field<V> = ChronoGraphNode & { get : () => V }
//
// type WritableField<V> = ChronoGraphNode & Writable & { get : () => V, set : (v : V) => unknown }

// type FieldOf<Entity extends Constructable<Instance>, Name extends keyof Instance, Instance = Base> =
//
//     Entity extends Constructable<infer Instance> ?
//         Pick<Instance, Name> extends Field<infer Value> ? Value : never
//     :
//         never


    // InstanceType<Entity>[ Name ] extends Field<infer Value> ? Value : never

export const Event = <T extends Constructable<Base>>(base : T) => {

    abstract class Event extends base {

        @field
        startDate       : Date

        @field
        endDate         : Date

        @field
        duration        : number

        @field
        schedulingMode  : string

        // @lifecycle(after())
        // @mutation((selfNs : ChronoNamespaceReference) => {
        //     return {
        //         inputs      : {
        //             startDate           : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'startDate' }),
        //             duration            : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'duration' }),
        //
        //             parentStartDate     : ChronoNamespacedAtomReference.new({
        //                 ns : ChronoNamespacedAtomReference.new({
        //                     ns : selfNs,
        //                     id : 'parentId'
        //                 }),
        //                 id : 'startDate'
        //             }),
        //
        //             super               : superOf(ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'endDate' }))
        //         },
        //         as          : [
        //             ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'endDate' })
        //         ]
        //     }
        // })
        // calculateEndDateBasedOnStartDateAndDuration (
        //     { selfStartDate, selfDuration } : { selfStartDate : Date, selfDuration : number },
        //     next : () => ChronoValue
        // ) : Date {
        //     return new Date(selfStartDate.getTime() + selfDuration)
        //
        //     // return final(new Date(selfStartDate.getTime() + selfDuration))
        // }


        // @action
        setStartDate (value : Date, keepDuration : boolean = true) {
            // this.startDate

            // this.startDate.set(value)
            //
            // if (keepDuration) {
            //
            //     this.runMutation(
            //         [ this ],
            //         this.moveTask
            //     )
            // } else {
            //
            //     this.duration.set(
            //         this.calculateDurationBasedOnStartAndEndDate(this.startDate.get(), this.endDate.get())
            //     )
            // }
            //
            // return this.commit()
        }


        onAnyFieldChange (field) {

            // if (field.name == 'startDate') {
            //
            //     if (this.project.get().schedulingDirection === SchedulingDirection.Forward) {
            //
            //         this.calculateEndDateBasedOnStartDate(this.startDate)
            //
            //     } else
            //         this.duration.set(
            //             this.calculateDurationBasedOnStartAndEndDate(this.startDate.get(), this.endDate.get())
            //         )
            // }
            //
            // return this.commit()
        }


        @compute('endDate')
        calculateEndDateMobXStyle () : Date {
            if (this.schedulingMode === 'EffortDriven') {

                return new Date(this.startDate.getTime() + this.duration)
            }
        }


        @mutation((me : Event) => {
            return {
                input       : [ me.schedulingMode, me.startDate, me.duration ],
                as          : [ me.endDate ]
            }
        })
        calculateEndDateChronoStyleExtraSafe<T extends this>(
            schedulingMode  : T[ 'schedulingMode' ],
            startDate       : T[ 'startDate' ],
            duration        : T[ 'duration' ],
        ) : Date {
            if (schedulingMode === 'EffortDriven') {

                return new Date(startDate.getTime() + duration)
            }
        }


        @mutation((me : Event) => {
            return {
                input       : [ me.startDate ],
                as          : [ me.endDate ]
            }
        })
        pushEndDate<T extends this> (startDate : T[ 'startDate' ], ...args) : Date {
            throw new Error("Abstract method called")
        }

        @mutation((me : Event) => {
            return {
                input       : [ me.endDate ],
                as          : [ me.startDate ]
            }
        })
        pushStartDate<T extends this> (endDate : T[ 'endDate' ], ...args) : Date {
            throw new Error("Abstract method called")
        }
    }

    return Event
}

export type Event = Mixin<typeof Event>



const BaseEvent = Event(Base)


export const Normalized = <T extends Constructable<Event>>(base : T) => {

    abstract class Normalized extends base {
//     @context('SELF')
//     @lifecycle(before())
//     @inputs({
//         selfStartDate           : CEntity('SELF', 'startDAte'),
//         selfDuration            : CEntity('SELF', 'duration')
//     })
//     @as(CEntity(SELF, 'endDate'))
//     // @as([
//     //     { selfEndDate           : CEntity(SELF, 'endDate') }
//     // ])
//     calculateEndDateBasedOnStartDateAndDuration (
//         { selfStartDate, selfDuration } : { selfStartDate : Date, selfDuration : number },
//         next : () => ChronoValue
//     ) : Date {
//         return new Date(selfStartDate.getTime() + selfDuration)
//
//         // return final(new Date(selfStartDate.getTime() + selfDuration))
//     }
//
//
//     onJoinGraph (graph : ChronoGraph) {
//         if (this.startDate && this.duration && !this.endDate) {
//             this.runMutation(
//                 this.calculateEndDateBasedOnStartDateAndDuration,
//                 {
//                     context     : { SELF : CEntity('Event', this) }
//                 }
//             )
//
//
//             this.runScenario(SetEndDateBasedOnStartDateAndDuration, entity('Event', this))
//         }
//     }

    }

    return Normalized
}

export type Normalized = Mixin<typeof Normalized>



export const DurationDriven = <T extends Constructable<Event & Normalized>>(base : T) => {

    abstract class DurationDriven extends base {

        @mutation((me : Event) => {
            return {
                inputs      : [ me.startDate, me.duration ],
                as          : [ me.endDate ]
            }
        })
        moveTaskByStartDate<T extends this> (startDate : T[ 'startDate' ], duration : T[ 'duration' ]) : Date {
            return
        }


        // @context(entity('Event'))
        // @inputs({
        //     endate                  : field('Event.endDate'), // entity('Event').field('endDate')
        //     duration                : field('Event.duration') // entity('Event').field('duration')
        // })
        // @as([ field('Event.startDate') ])
        // calculateStartDateBasedOnEndDateAndDuration (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
        //     return inputs.endDate - inputs.duration
        // }
        //
        //
        // @context(entity('Event'))
        // @inputs({
        //     endate                  : field('Event.startDate'), // entity('Event').field('startDate')
        //     duration                : field('Event.duration') // entity('Event').field('duration')
        // })
        // @as([ field('Event.endDate') ])
        // calculateEndDateBasedOnStartDateAndDuration (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
        //     return inputs.startDate + inputs.duration
        // }
        //
        //
        // @context(entity('Event'))
        // @inputs({
        //     startDate               : SelfVar('startDate'),
        //     duration                : SelfVar('duration')
        // })
        // @as([ field('Event.endDate') ])
        // calculateDurationBasedOnStartEndDates (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
        //     return inputs.endDate - inputs.duration
        // }
    }

    return DurationDriven
}

export type DurationDriven = Mixin<typeof DurationDriven>




