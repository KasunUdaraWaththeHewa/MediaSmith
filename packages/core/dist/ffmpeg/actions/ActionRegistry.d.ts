import { BaseStep } from '../../domain/Step';
import { StepContext } from './index';
export interface ActionHandler {
    buildArgs(step: BaseStep, ctx: StepContext): string[];
}
export declare class ActionRegistry {
    private handlers;
    register(action: string, handler: ActionHandler): void;
    getHandler(action: string): ActionHandler | undefined;
}
//# sourceMappingURL=ActionRegistry.d.ts.map