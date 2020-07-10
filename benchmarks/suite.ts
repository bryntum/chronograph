import { runAllGraphPopulation } from "./allocation.js"
import { runAllDeepChanges } from "./deep_changes.js"
import { runAllMassive } from "./chrono/graphless/deep_changes2.js"
import { runAllShallowChanges } from "./shallow_changes.js"

export const runAll = async () => {
    await runAllMassive()
    await runAllDeepChanges()
    await runAllShallowChanges()
    await runAllGraphPopulation()

    // await runAllMemoryLeak()
}

runAll()
