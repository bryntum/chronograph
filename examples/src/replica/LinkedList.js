var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Mixin } from "../class/BetterMixin.js";
import { DEBUG } from "../environment/Debug.js";
import { calculate, Entity, field } from "./Entity.js";
import { Replica } from "./Replica.js";
export class LinkedListElement extends Mixin([Entity], (base) => {
    class LinkedListElement extends base {
        calculateParentIndex(Y) {
            const previousSibling = Y(this.$.previous);
            return previousSibling ? Y(previousSibling.$.index) + 1 : 0;
        }
    }
    __decorate([
        field({ lazy: true })
    ], LinkedListElement.prototype, "index", void 0);
    __decorate([
        field()
    ], LinkedListElement.prototype, "list", void 0);
    __decorate([
        field()
    ], LinkedListElement.prototype, "next", void 0);
    __decorate([
        field()
    ], LinkedListElement.prototype, "previous", void 0);
    __decorate([
        calculate('parentIndex')
    ], LinkedListElement.prototype, "calculateParentIndex", null);
    return LinkedListElement;
}) {
}
export class LinkedList extends Mixin([Entity], (base) => {
    class LinkedList extends base {
        constructor() {
            super(...arguments);
            // @field()
            // cachedTillIndex : number            = -1
            this.first = null;
            // // insertAfter(null, ...) means insert into beginning
            // insertAfter (elAfter : LinkedListElement, elsToInsert : LinkedListElement[]) : LinkedList[] {
            //     elToInsert.list     = elAfter.list
            //
            //     if (!elAfter) {
            //         this.insertFirst(el)
            //     }
            //
            //     return []
            // }
            //
            //
            // splice (index : number, howMany : number, elements : LinkedListElement[]) : LinkedListElement[] {
            //
            //
            //     return []
            // }
        }
        calculateElements(Y) {
            let el = this.first;
            const elements = [];
            while (el) {
                if (DEBUG)
                    if (el.list !== this)
                        throw new Error("Invalid state");
                elements.push(el);
                el = el.next;
            }
            return elements;
        }
        insertFirst(Y, elToInsert) {
            elToInsert.previous = null;
            elToInsert.next = this.first;
            if (this.first) {
                this.first.previous = elToInsert;
                this.first = elToInsert;
            }
        }
        insertFirstMany(Y, elsToInsert) {
            elsToInsert.forEach((el, index) => {
                Y.$(el).list = this;
                if (index > 0) {
                    el.previous = elsToInsert[index - 1];
                }
                else
                    el.previous = null;
                if (index < elsToInsert.length) {
                    el.next = elsToInsert[index + 1];
                }
                else
                    el.next = null;
            });
            if (elsToInsert.length) {
                if (this.first)
                    this.first.previous = elsToInsert[elsToInsert.length - 1];
                Y.$(elsToInsert[elsToInsert.length - 1]).next = this.first;
                this.first = elsToInsert[0];
            }
        }
    }
    __decorate([
        field({ lazy: true })
    ], LinkedList.prototype, "elements", void 0);
    __decorate([
        field()
    ], LinkedList.prototype, "first", void 0);
    __decorate([
        calculate('elements')
    ], LinkedList.prototype, "calculateElements", null);
    __decorate([
        message_handler()
    ], LinkedList.prototype, "insertFirst", null);
    __decorate([
        message_handler()
    ], LinkedList.prototype, "insertFirstMany", null);
    return LinkedList;
}) {
}
const list = new LinkedList();
const el = new LinkedListElement();
const replica = Replica.new();
replica.addEntities([list, el]);
list.insertFirst(replica.onYieldSync, el);
list.insertFirstMany(replica.onYieldSync, [el]);
