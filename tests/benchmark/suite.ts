import { runAllDeepChanges } from "./deepChanges.js"
import { runAllGraphPopulation } from "./graphPopulation.js"
import { runAllShallowChanges } from "./shallowChanges.js"

export const runAll = async () => {
    await runAllDeepChanges()
    await runAllShallowChanges()
    await runAllGraphPopulation()
}

runAll()
