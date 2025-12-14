import { BaseStep } from '../../domain/Step';
import { StepContext } from './index';

export interface ActionHandler {
  buildArgs(step: BaseStep, ctx: StepContext): string[];
}

export class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  register(action: string, handler: ActionHandler) {
    this.handlers.set(action, handler);
  }

  getHandler(action: string): ActionHandler | undefined {
    return this.handlers.get(action);
  }
}