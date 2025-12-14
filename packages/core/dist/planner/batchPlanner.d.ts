import { JobConfigValidated } from "../yaml/schema";
import { PlannedJob } from "../domain/Job";
export declare function planJob(config: JobConfigValidated, onLog?: (msg: string) => void): Promise<PlannedJob>;
//# sourceMappingURL=batchPlanner.d.ts.map