// import { AnyConstructor, Mixin } from "../class/BetterMixin.js"
// import { DEBUG } from "../environment/Debug.js"
// import { calculate, Entity, field } from "./Entity.js"
// import { Replica } from "./Replica.js"
//
// export class LinkedListElement extends Mixin(
//     [ Entity ],
//     (base : AnyConstructor<Entity, typeof Entity>) => {
//
//     class LinkedListElement extends base {
//         @field({ lazy : true })
//         index               : number
//
//         @field()
//         list                : LinkedList
//
//         @field()
//         next                : LinkedListElement
//
//         @field()
//         previous            : LinkedListElement
//
//         @calculate('parentIndex')
//         calculateParentIndex (Y) : number {
//             const previousSibling : LinkedListElement  = Y(this.$.previous)
//
//             return previousSibling ? Y(previousSibling.$.index) + 1 : 0
//         }
//
//
//         // @write('next')
//         // write (Y, proposedValue : LinkedListElement) {
//         //
//         // }
//
//     }
//     return LinkedListElement
// }){}
//
//
// export class LinkedList extends Mixin(
//     [ Entity ],
//     (base : AnyConstructor<Entity, typeof Entity>) => {
//
//     class LinkedList extends base {
//         @field({ lazy : true })
//         elements    : Array<LinkedListElement>
//
//         // @field()
//         // cachedTillIndex : number            = -1
//
//         @field()
//         first       : LinkedListElement     = null
//
//
//         @calculate('elements')
//         calculateElements (Y) : Array<LinkedListElement> {
//             let el          = this.first
//
//             const elements  = []
//
//             while (el) {
//                 if (DEBUG) if (el.list !== this) throw new Error("Invalid state")
//
//                 elements.push(el)
//                 el          = el.next
//             }
//
//             return elements
//         }
//
//
//         @message_handler()
//         insertFirst (Y, elToInsert : LinkedListElement) {
//             elToInsert.previous     = null
//             elToInsert.next         = this.first
//
//             if (this.first) {
//                 this.first.previous     = elToInsert
//                 this.first              = elToInsert
//             }
//         }
//
//
//         @message_handler()
//         insertFirstMany (Y, elsToInsert : LinkedListElement[]) {
//             elsToInsert.forEach((el, index) => {
//                 Y.$(el).list    = this
//
//                 if (index > 0) {
//                     el.previous = elsToInsert[ index - 1 ]
//                 } else
//                     el.previous = null
//
//                 if (index < elsToInsert.length) {
//                     el.next     = elsToInsert[ index + 1 ]
//                 } else
//                     el.next     = null
//             })
//
//             if (elsToInsert.length) {
//                 if (this.first) this.first.previous = elsToInsert[ elsToInsert.length - 1 ]
//
//                 Y.$(elsToInsert[ elsToInsert.length - 1 ]).next = this.first
//
//                 this.first = elsToInsert[ 0 ]
//             }
//         }
//
//
//         // // insertAfter(null, ...) means insert into beginning
//         // insertAfter (elAfter : LinkedListElement, elsToInsert : LinkedListElement[]) : LinkedList[] {
//         //     elToInsert.list     = elAfter.list
//         //
//         //     if (!elAfter) {
//         //         this.insertFirst(el)
//         //     }
//         //
//         //     return []
//         // }
//         //
//         //
//         // splice (index : number, howMany : number, elements : LinkedListElement[]) : LinkedListElement[] {
//         //
//         //
//         //     return []
//         // }
//
//     }
//     return LinkedList
// }){}
//
//
// const list = new LinkedList()
//
// const el = new LinkedListElement()
//
// const replica = Replica.new()
//
// replica.addEntities([ list, el ])
//
// list.insertFirst(replica.onYieldSync, el)
//
// list.insertFirstMany(replica.onYieldSync, [ el ])
