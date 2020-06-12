import { runAllGraphPopulation } from "./allocation.js"
import { runAllDeepChanges } from "./deep_changes.js"
import { runAllShallowChanges } from "./shallow_changes.js"

export const runAll = async () => {
    await runAllDeepChanges()
    await runAllShallowChanges()
    await runAllGraphPopulation()

    // await runAllMemoryLeak()
}

runAll()
