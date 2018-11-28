import {Base, Constructable, Mixin} from "../util/Mixin.js";
import {ChronoAtomReference} from "./ChronoGraph.js";


export type Name    = string
export type Type    = string


//-----------------------------------------------------------------------------
export class Field extends Base {
    name                : string
    type                : Type
}


//-----------------------------------------------------------------------------
export class Entity extends Base {
    name                : string

    fields              : Map<Name, Field>      = new Map()


    field (name : Name) : Field {
        return this.fields.get(name)
    }
}


//-----------------------------------------------------------------------------
export class Schema extends Base {
    name                : string

    entities            : Map<Name, Entity>     = new Map()


    entity (name : Name) : Entity {
        return this.entities.get(name)
    }


    entityDecorator (name : Name) {
        return () => {

        }
    }
}




export const ChronoEntity =

<T extends Constructable<Base>>(base : T) =>

class ChronoEntity extends base {
    meta            : Entity
}

export type ChronoEntity = Mixin<typeof ChronoEntity>


// const Ev = ChronoEntity(Base).new().



export const atom          = (...args) : any => {}
export const field         = (...args) : any => {}
export const entity        = (...args) : any => {}
export const as            = (...args) : any => {}
export const lifecycle     = (...args) : any => {}
export const before        = (...args) : any => {}
export const after          = (...args) : any => {}
export const superOf        = (...args) : any => {}
export const context       = (...args) : any => {}
export const inputs        = (...args) : any => {}
export const mutation       = (...args) : any => {}


// export function inputs(value: { [s : string] : ChronoAtomReference }) {
//
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//     };
// }
//
//
//
// function inputs2(value: { [s : string] : ChronoAtomReference }) {
//
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//     };
// }



// export    type ChronoMutation<CalculationContext = {}, InputObject = {}>  = (
//     inputs                  : { [keyof InputObject] : CReference },
//     as                      : CReference[],
//     // proposedValue           : ChronoValue,
//     // conflict                : (conflict : ChronoConflict, resolutions : ResolutionOption[]) => Promise<ResolutionOption>,
//     final                   : (ChronoValue) => void,
//     next                    : (value : ChronoValue) => ChronoValue,
//     context                 : CalculationContext
// ) => (any | Promise<any>)

//
//
// export type ChronoMutation<CalculationContext = {}>  = (
//     inputs                  : { [s : string] : ChronoAtomReference },
//     final                   : (ChronoValue) => ChronoValue,
//     context                 : CalculationContext
// ) => (ChronoValue | Promise<ChronoValue>)
//
//
//
// export const SELF = () => {}
//
//
// @entity('Event')
// class Event extends Entity {
//     fields          : any
//
//     @field({ type : 'Date' })
//     startDate       : Date
//
//     @field({ type : 'Date' })
//     endDate         : Date
//
//     @field({ type : 'number' })
//     duration        : number
//
//     @context(SELF)
//     @lifecycle(before())
//     @inputs({
//         selfStartDate           : CEntity(SELF, 'startDAte'),
//         selfDuration            : CEntity(SELF, 'duration'),
//
//         incomingDeps            : CEntity(SELF).has('incomingDeps')
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
//     markInput(...args) {
//
//     }
//
//
//     onJoinGraph (graph : ChronoGraph) {
//
//     }
//
//
//     setStartDate (value : Date, keepDuration : boolean = true) {
//         this.startDate      = value
//
//         if (keepDuration)
//             this.markInput(this.fields.duration)
//         else
//             this.endDate    = this.endDate
//
//         this.propagate()
//     }
//
//
//
//     propagate () {
//
//     }
//
//
//     runMutation (...args) {
//
//     }
// }
//
//
//
//
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
//
//
//
//
//
//
//
//
//
// //
// //
// //
// // class ChronoObject extends Base {
// //
// // }
// //
// //
// //
// // export type FieldName = string
// //
// //
// // export class ChronoField<ChronoEntity> extends ChronoAtom {
// //     name                : FieldName
// //
// // }
// //
// //
// // export class ChronoEntityMeta extends Base {
// //     fields              : Map<FieldName, ChronoField<this>> = new Map()
// //
// //     fieldsDecorator     :
// // }
