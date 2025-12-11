export interface ExecOptions {
    dryRun?: boolean;
    onLog?: (line: string) => void;
}
export declare function runFfmpeg(args: string[], opts?: ExecOptions): Promise<void>;
//# sourceMappingURL=executor.d.ts.map