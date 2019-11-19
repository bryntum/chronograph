import { runAllDeepChanges } from "./deep_changes.js"
import { runAllGraphPopulation } from "./allocation.js"
import { runAllMemoryLeak } from "./memory_leak.js"
import { runAllShallowChanges } from "./shallow_changes.js"

export const runAll = async () => {
    // await runAllDeepChanges()
    // await runAllShallowChanges()
    // await runAllGraphPopulation()

    await runAllMemoryLeak()
}

runAll()
