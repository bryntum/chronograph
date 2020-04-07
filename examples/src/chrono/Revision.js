import { Base } from "../class/BetterMixin.js";
import { throwUnknownIdentifier } from "./Identifier.js";
import { TombStone } from "./Quark.js";
import { Transaction } from "./Transaction.js";
let CLOCK = 0;
export class Revision extends Base {
    constructor() {
        super(...arguments);
        this.createdAt = CLOCK++;
        this.name = 'revision-' + this.createdAt;
        this.previous = undefined;
        this.scope = new Map();
        this.reachableCount = 0;
        this.referenceCount = 0;
        this.selfDependent = new Set();
    }
    getLatestEntryFor(identifier) {
        let revision = this;
        while (revision) {
            const entry = revision.scope.get(identifier);
            if (entry)
                return entry;
            revision = revision.previous;
        }
        return null;
    }
    hasIdentifier(identifier) {
        const latestEntry = this.getLatestEntryFor(identifier);
        return Boolean(latestEntry && latestEntry.getValue() !== TombStone);
    }
    *previousAxis() {
        let revision = this;
        while (revision) {
            yield revision;
            revision = revision.previous;
        }
    }
    readIfExists(identifier, graph) {
        const latestEntry = this.getLatestEntryFor(identifier);
        if (!latestEntry)
            return undefined;
        const value = latestEntry.getValue();
        return value !== TombStone ? (value !== undefined ? value : this.read(identifier, graph)) : undefined;
    }
    readIfExistsAsync(identifier, graph) {
        const latestEntry = this.getLatestEntryFor(identifier);
        if (!latestEntry)
            return undefined;
        const value = latestEntry.getValue();
        return value !== TombStone ? (value !== undefined ? value : this.readAsync(identifier, graph)) : undefined;
    }
    get(identifier, graph) {
        const latestEntry = this.getLatestEntryFor(identifier);
        // && DEBUG?
        if (!latestEntry)
            throwUnknownIdentifier(identifier);
        const value = latestEntry.getValue();
        // && DEBUG?
        if (value === TombStone)
            throwUnknownIdentifier(identifier);
        if (value !== undefined) {
            return value;
        }
        else {
            return this.calculateLazyQuarkEntry(latestEntry, graph);
        }
    }
    read(identifier, graph) {
        const latestEntry = this.getLatestEntryFor(identifier);
        // && DEBUG?
        if (!latestEntry)
            throwUnknownIdentifier(identifier);
        const value = latestEntry.getValue();
        // && DEBUG?
        if (value === TombStone)
            throwUnknownIdentifier(identifier);
        if (value !== undefined) {
            return value;
        }
        else {
            return this.calculateLazyQuarkEntry(latestEntry, graph);
        }
    }
    readAsync(identifier, graph) {
        const latestEntry = this.getLatestEntryFor(identifier);
        // && DEBUG?
        if (!latestEntry)
            throwUnknownIdentifier(identifier);
        const value = latestEntry.getValue();
        // && DEBUG?
        if (value === TombStone)
            throwUnknownIdentifier(identifier);
        if (value !== undefined) {
            return value;
        }
        else {
            return this.calculateLazyQuarkEntryAsync(latestEntry, graph);
        }
    }
    calculateLazyQuarkEntry(entry, graph) {
        // if (!entry.identifier.sync) throw new Error("Can not calculate value of the asynchronous identifier synchronously")
        const transaction = Transaction.new({ baseRevision: this, candidate: this, graph });
        transaction.entries.set(entry.identifier, entry);
        transaction.stackGen.push(entry);
        entry.forceCalculation();
        transaction.commit();
        return entry.getValue();
    }
    async calculateLazyQuarkEntryAsync(entry, graph) {
        const transaction = Transaction.new({ baseRevision: this, candidate: this, graph });
        transaction.entries.set(entry.identifier, entry);
        transaction.stackGen.push(entry);
        entry.forceCalculation();
        await transaction.commitAsync();
        return entry.getValue();
    }
    mergePrevious() {
    }
    mergeNext() {
    }
}
