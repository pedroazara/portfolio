import { expect, it } from "vitest";
import { createSerialQueue } from "../serialQueue";
it("does not overlap pending saves and reads the latest confirmed version", async () => {
  const queue = createSerialQueue(); const observed: number[] = []; let version = 0;
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const first = queue(async () => { observed.push(version); await gate; version++; });
  const second = queue(async () => { observed.push(version); version++; });
  await Promise.resolve(); expect(observed).toEqual([0]); release(); await Promise.all([first, second]); expect(observed).toEqual([0, 1]);
});
it("does not poison the queue after failure", async () => {
  const queue = createSerialQueue(); await expect(queue(async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  await expect(queue(async () => "retry")).resolves.toBe("retry");
});
