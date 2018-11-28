import {ChronoNamespacedAtomReference, ChronoAtomReference, ChronoNamespaceReference, ChronoValue} from "../chrono/ChronoGraph.js";
import {after, as, before, ChronoEntity, context, entity, field, Field, inputs, lifecycle, mutation, Schema, superOf} from "../chrono/Schema.js";
import {Base, Constructable} from "../util/Mixin.js";

export const schema : Schema  = Schema.new({ name : 'Scheduling Schema' })

// export const entity = schema.getEntityDecorator()


@entity('Event')
class Event extends ChronoEntity(Base) {

    // startDate       : Field<Date>   = Field.new(this)


    @field({ type : 'Date' })
    startDate       : ChronoAtom<Date>

    @field({ type : 'Date' })
    endDate         : Date

    @field({ type : 'number' })
    duration        : number


    @lifecycle(after())
    @mutation((selfNs : ChronoNamespaceReference) => {
        return {
            inputs      : {
                startDate           : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'startDate' }),
                duration            : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'duration' }),

                parentStartDate     : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'parentId' }),

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


    markInput(...args) {

    }


    onJoinGraph (graph : ChronoGraph) {

    }


    @mutation
    setStartDate (value : Date, keepDuration : boolean = true) {
        this.startDate.set(value)

        if (keepDuration)
            this.endDate.set(
                this.calculateEndDateBasedOnStartDateAndDuration(this.startDate.get(), this.duration.get())
            )
        else
            this.duration.set(
                this.calculateDurationBasedOnStartAndEndDate(this.startDate.get(), this.endDate.get())
            )

        return this.commit()
    }



    propagate () {

    }


    runMutation (...args) {

    }
}




export const NormalizedEvent = <T extends Constructable<Event>>(base : T) => class NormalizedEvent extends base {

    @context('SELF')
    @lifecycle(before())
    @inputs({
        selfStartDate           : CEntity('SELF', 'startDAte'),
        selfDuration            : CEntity('SELF', 'duration')
    })
    @as(CEntity(SELF, 'endDate'))
    // @as([
    //     { selfEndDate           : CEntity(SELF, 'endDate') }
    // ])
    calculateEndDateBasedOnStartDateAndDuration (
        { selfStartDate, selfDuration } : { selfStartDate : Date, selfDuration : number },
        next : () => ChronoValue
    ) : Date {
        return new Date(selfStartDate.getTime() + selfDuration)

        // return final(new Date(selfStartDate.getTime() + selfDuration))
    }


    onJoinGraph (graph : ChronoGraph) {
        if (this.startDate && this.duration && !this.endDate) {
            this.runMutation(
                this.calculateEndDateBasedOnStartDateAndDuration,
                {
                    context     : { SELF : CEntity('Event', this) }
                }
            )


            this.runScenario(SetEndDateBasedOnStartDateAndDuration, entity('Event', this))
        }
    }
}




export const DurationDrivenEventMixin = <T extends Constructable<Event>>(base : T) =>

class DurationDrivenEvent extends base {
    static tag          : Symbol = Symbol("duration based event")


    @lifecycle(after())
    @mutation((selfNs : ChronoNamespaceReference) => {
        return {
            inputs      : {
                startDate           : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'startDate' }),
                duration            : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'duration' }),

                parentStartDate     : ChronoNamespacedAtomReference.new({ ns : selfNs, id : 'parentId' }),

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


    @context(entity('Event'))
    @inputs({
        endate                  : field('Event.endDate'), // entity('Event').field('endDate')
        duration                : field('Event.duration') // entity('Event').field('duration')
    })
    @as([ field('Event.startDate') ])
    calculateStartDateBasedOnEndDateAndDuration (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
        return inputs.endDate - inputs.duration
    }


    @context(entity('Event'))
    @inputs({
        endate                  : field('Event.startDate'), // entity('Event').field('startDate')
        duration                : field('Event.duration') // entity('Event').field('duration')
    })
    @as([ field('Event.endDate') ])
    calculateEndDateBasedOnStartDateAndDuration (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
        return inputs.startDate + inputs.duration
    }


    @context(entity('Event'))
    @inputs({
        startDate               : SelfVar('startDate'),
        duration                : SelfVar('duration')
    })
    @as([ field('Event.endDate') ])
    calculateDurationBasedOnStartEndDates (inputs : object, currentValue : Date, previous : () => Date, context : CalculationContext) {
        return inputs.endDate - inputs.duration
    }


}
