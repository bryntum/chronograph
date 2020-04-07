var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Mixin } from "./BetterMixin.js";
// //---------------------------------------------------------------------------------------------------------------------
// export const ContextSync    = Symbol('ContextSync')
// export const ContextAsync   = Symbol('ContextSync')
//
// export type Context         = typeof ContextSync | typeof ContextAsync
//
// export type Contexts<ResultT> = {
//     [ContextSync]   : ResultT,
//     [ContextAsync]  : Promise<ResultT>
// }
//---------------------------------------------------------------------------------------------------------------------
class EventMeta extends Array {
}
//---------------------------------------------------------------------------------------------------------------------
class EventInstance extends Array {
    constructor() {
        super(...arguments);
        this.emitter = undefined;
    }
    get listeners() {
        return this;
    }
    on(listener) {
        this.listeners.push(listener);
    }
    un(listener) {
        const index = this.listeners.indexOf(listener);
        this.listeners.splice(index, 1);
    }
    trigger(payload) {
        const event = new Event({ payload, emitter: this });
        this.reduce((event, listener) => listener(event, payload), event);
        return event;
    }
}
//---------------------------------------------------------------------------------------------------------------------
export const event = (eventConfig, eventCls = EventInstance) => {
    return function (target, propertyKey) {
        const eventNames = target.eventNames;
        if (!target.hasOwnProperty(propertyKey)) {
            target.eventNames = target.eventNames.slice();
        }
        eventNames.push(propertyKey);
        const storageKey = '$' + propertyKey;
        Object.defineProperty(target, propertyKey, {
            // generate a new Function where the storageKey will be encoded directly into source code?
            get: function () {
                if (this[storageKey] !== undefined)
                    return this[storageKey];
                const newEventInstance = new eventCls();
                newEventInstance.emitter = this;
                return this[storageKey] = newEventInstance;
            }
        });
    };
};
//---------------------------------------------------------------------------------------------------------------------
export class EventEmitter extends Mixin([], (base) => {
    class EventEmitter extends base {
        initEvents() {
            for (let i = 0; i < this.eventNames.length; i++) {
                this['$' + this.eventNames[i]] = undefined;
            }
        }
    }
    return EventEmitter;
}) {
}
//---------------------------------------------------------------------------------------------------------------------
class Event {
    constructor(config) {
        this.emitter = undefined;
        this.payload = undefined;
        Object.assign(this, config);
    }
}
//---------------------------------------------------------------------------------------------------------------------
// export type EventT<Payload, EventClass extends EventInstance<Payload> = EventInstance<Payload>> = ((arg : Payload) => void) & EventInstance<Payload>
//---------------------------------------------------------------------------------------------------------------------
export class ManagedArray extends Mixin([EventEmitter, Array], (base) => {
    class ManagedArray extends base {
        push(...args) {
            const res = super.push(...args);
            this.newElement.trigger({ pos: this.length });
            return res;
        }
    }
    __decorate([
        event()
    ], ManagedArray.prototype, "newElement", void 0);
    return ManagedArray;
}) {
}
const arr = new ManagedArray();
arr.slice;
const aa = arr.slice();
// aa.push(11)
//
// arr.push(11)
const newElementObservingDisposer = arr.newElement.on((data, event) => { });
