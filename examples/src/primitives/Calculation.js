import { Mixin } from "../class/BetterMixin.js";
//---------------------------------------------------------------------------------------------------------------------
/**
 * Symbol to denote the synchronous calculation context
 */
export const ContextSync = Symbol('ContextSync');
/**
 * Symbol to denote the generator calculation context
 */
export const ContextGen = Symbol('ContextGen');
//---------------------------------------------------------------------------------------------------------------------
export class CalculationGen extends Mixin([], (base) => class CalculationGen extends base {
    constructor() {
        super(...arguments);
        this.iterator = undefined;
        this.iterationResult = undefined;
    }
    isCalculationStarted() {
        return Boolean(this.iterator || this.iterationResult);
    }
    isCalculationCompleted() {
        return Boolean(this.iterationResult && this.iterationResult.done);
    }
    get result() {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined;
    }
    startCalculation(onEffect, ...args) {
        const iterator = this.iterator = this.calculation.call(this.context || this, onEffect, ...args);
        return this.iterationResult = iterator.next();
    }
    continueCalculation(value) {
        return this.iterationResult = this.iterator.next(value);
    }
    cleanupCalculation() {
        this.iterationResult = undefined;
        this.iterator = undefined;
    }
    *calculation(onEffect, ...args) {
        throw new Error("Abstract method `calculation` called");
    }
    runSyncWithEffect(onEffect, ...args) {
        this.startCalculation(onEffect, ...args);
        while (!this.isCalculationCompleted()) {
            this.continueCalculation(onEffect(this.iterationResult.value));
        }
        // help to garbage collector
        this.iterator = undefined;
        return this.result;
    }
    async runAsyncWithEffect(onEffect, ...args) {
        this.startCalculation(onEffect, ...args);
        while (!this.isCalculationCompleted()) {
            this.continueCalculation(await onEffect(this.iterationResult.value));
        }
        // help to garbage collector
        this.iterator = undefined;
        return this.result;
    }
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export const SynchronousCalculationStarted = Symbol('SynchronousCalculationStarted');
const calculationStartedConstant = { value: SynchronousCalculationStarted };
export class CalculationSync extends Mixin([], (base) => class CalculationSync extends base {
    constructor() {
        super(...arguments);
        this.iterationResult = undefined;
    }
    isCalculationStarted() {
        return Boolean(this.iterationResult);
    }
    isCalculationCompleted() {
        return Boolean(this.iterationResult && this.iterationResult.done);
    }
    get result() {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined;
    }
    startCalculation(onEffect, ...args) {
        // this assignment allows other code to observe, that calculation has started
        this.iterationResult = calculationStartedConstant;
        return this.iterationResult = {
            done: true,
            value: this.calculation.call(this.context || this, onEffect, ...args)
        };
    }
    continueCalculation(value) {
        throw new Error("Can not continue synchronous calculation");
    }
    cleanupCalculation() {
        this.iterationResult = undefined;
    }
    calculation(onEffect, ...args) {
        throw new Error("Abstract method `calculation` called");
    }
    runSyncWithEffect(onEffect, ...args) {
        this.startCalculation(onEffect, ...args);
        return this.result;
    }
    async runAsyncWithEffect(onEffect, ...args) {
        throw new Error('Can not run synchronous calculation asynchronously');
    }
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export function runGeneratorSyncWithEffect(effect, func, args, scope) {
    const gen = func.apply(scope || null, args);
    let iteration = gen.next();
    while (!iteration.done) {
        iteration = gen.next(effect(iteration.value));
    }
    return iteration.value;
}
//---------------------------------------------------------------------------------------------------------------------
export async function runGeneratorAsyncWithEffect(effect, func, args, scope) {
    const gen = func.apply(scope || null, args);
    let iteration = gen.next();
    while (!iteration.done) {
        const effectResolution = effect(iteration.value);
        if (effectResolution instanceof Promise)
            iteration = gen.next(await effectResolution);
        else
            iteration = gen.next(effectResolution);
    }
    return iteration.value;
}
