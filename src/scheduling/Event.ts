import {ChronoAtom, ChronoValue} from "../chrono/ChronoAtom.js";
import {ChronoGraphLayer, ChronoGraphNode} from "../chrono/ChronoGraph.js";
import {ChronoMutation} from "../chrono/ChronoMutation.js";
import {ChronoEntity} from "../chrono/ChronoObject.js";
import {ChronoNamespacedAtomReference, ChronoNamespaceReference} from "../chrono/ChronoReference.js";
import {after, entity, field, lifecycle, mutation, superOf} from "../schema/Schema.js";
import {Base} from "../util/Mixin.js";


// @entity('Event')
class Event extends ChronoEntity(Base) {

    // startDate       : Field<Date>   = Field.new(this)


    @field({ type : 'Date' })
    startDate       : Date

    @field({ type : 'Date' })
    endDate         : Date

    @field({ type : 'number' })
    duration        : number


    graph           : ChronoGraphLayer


    @lifecycle(after())
    @mutation((selfNs : ChronoNamespaceReference) => {
        return {
            inputs      : {
                startDate           : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'startDate' }),
                duration            : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'duration' }),

                parentStartDate     : ChronoNamespacedAtomReference.new({
                    ns : ChronoNamespacedAtomReference.new({
                        ns : selfNs,
                        id : 'parentId'
                    }),
                    id : 'startDate'
                }),

                super               : superOf(ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'endDate' }))
            },
            as          : [
                ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'endDate' })
            ]
        }
    })
    calculateEndDateBasedOnStartDateAndDuration (
        { selfStartDate, selfDuration } : { selfStartDate : Date, selfDuration : number },
        next : () => ChronoValue
    ) : Date {
        return new Date(selfStartDate.getTime() + selfDuration)

        // return final(new Date(selfStartDate.getTime() + selfDuration))
    }


    @action
    setStartDate (value : Date, keepDuration : boolean = true) {
        this.startDate.set(value)

        if (keepDuration) {

            this.runMutation(
                [ this ],
                this.calculateEndDateBasedOnStartDateAndDuration
            )
        } else {

            this.duration.set(
                this.calculateDurationBasedOnStartAndEndDate(this.startDate.get(), this.endDate.get())
            )
        }

        return this.commit()
    }


    onAnyFieldChange (field) {

        if (field.name == 'startDate') {

            if (this.project.get().schedulingDirection === SchedulingDirection.Forward) {

                this.calculateEndDateBasedOnStartDate(this.startDate)

            } else
                this.duration.set(
                    this.calculateDurationBasedOnStartAndEndDate(this.startDate.get(), this.endDate.get())
                )
        }

        return this.commit()
    }


    @mutation((me : Event) : ChronoMutation => {
        return {
            inputs      : [ me.startDate ],
            as          : [ me.endDate ]
        }
    })
    moveTask<T extends this> (startDate : T[ 'startDate' ]) : Date {
        throw new Error("Abstract method `calculateEndDateBasedOnStartDate` called")
    }


    @mutation((me : Event) => {
        return {
            inputs      : [ me.startDate ],
            as          : [ me.endDate ]
        }
    })
    resizeTaskByEndDate<T extends this> (endDate : T[ 'startDate' ]) : Date {
        throw new Error("Abstract method `calculateEndDateBasedOnStartDate` called")
    }


    @mutation((me : Event) => {
        return {
            inputs      : [ me.startDate ],
            as          : [ me.endDate ]
        }
    })
    resizeTaskByDuration<T extends this> (endDate : T[ 'startDate' ]) : Date {
        throw new Error("Abstract method `calculateEndDateBasedOnStartDate` called")
    }


}




// export const NormalizedEvent = <T extends Constructable<Event>>(base : T) => class NormalizedEvent extends base {
//
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
// }
//
//
//
//
// export const DurationDrivenEventMixin = <T extends Constructable<Event>>(base : T) =>
//
// class DurationDrivenEvent extends base {
//     static tag          : Symbol = Symbol("duration based event")
//
//
//     // @lifecycle(after())
//     // @mutation((selfNs : ChronoNamespaceReference) => {
//     //     return {
//     //         inputs      : {
//     //             startDate           : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'startDate' }),
//     //             duration            : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'duration' }),
//     //
//     //             parentStartDate     : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'parentId' }),
//     //
//     //             super               : superOf(ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'endDate' }))
//     //         },
//     //         as          : [
//     //             ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'endDate' })
//     //         ]
//     //     }
//     // })
//     calculateEndDateBasedOnStartDateAndDuration (selfStartDate : Date, selfDuration : number) : Date {
//         return new Date(selfStartDate.getTime() + selfDuration)
//
//         // return final(new Date(selfStartDate.getTime() + selfDuration))
//     }
//
//
//     @context(entity('Event'))
//     @inputs({
//         endate                  : field('Event.endDate'), // entity('Event').field('endDate')
//         duration                : field('Event.duration') // entity('Event').field('duration')
//     })
//     @as([ field('Event.startDate') ])
//     calculateStartDateBasedOnEndDateAndDuration (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
//         return inputs.endDate - inputs.duration
//     }
//
//
//     @context(entity('Event'))
//     @inputs({
//         endate                  : field('Event.startDate'), // entity('Event').field('startDate')
//         duration                : field('Event.duration') // entity('Event').field('duration')
//     })
//     @as([ field('Event.endDate') ])
//     calculateEndDateBasedOnStartDateAndDuration (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
//         return inputs.startDate + inputs.duration
//     }
//
//
//     @context(entity('Event'))
//     @inputs({
//         startDate               : SelfVar('startDate'),
//         duration                : SelfVar('duration')
//     })
//     @as([ field('Event.endDate') ])
//     calculateDurationBasedOnStartEndDates (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
//         return inputs.endDate - inputs.duration
//     }
//
//
// }
