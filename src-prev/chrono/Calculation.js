//---------------------------------------------------------------------------------------------------------------------
export const ChronoCalculation = (base) => class ChronoCalculation extends base {
    isCalculationStarted() {
        return Boolean(this.iterator);
    }
    isCalculationCompleted() {
        return Boolean(this.iterationResult && this.iterationResult.done);
    }
    get value() {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined;
    }
    startCalculation(...args) {
        const iterator = this.iterator = this.calculation.call(this.calculationContext || this, ...args);
        return this.iterationResult = iterator.next();
    }
    supplyYieldValue(value) {
        return this.iterationResult = this.iterator.next(value);
    }
    *calculation(...args) {
        throw new Error("Abstract method `calculation` called");
    }
    runSyncWithEffect(onEffect, ...args) {
        this.startCalculation(...args);
        while (!this.isCalculationCompleted()) {
            this.supplyYieldValue(onEffect(this.iterationResult.value));
        }
        return this.value;
    }
    async runAsyncWithEffect(onEffect, ...args) {
        this.startCalculation(...args);
        while (!this.isCalculationCompleted()) {
            this.supplyYieldValue(await onEffect(this.iterationResult.value));
        }
        return this.value;
    }
};
