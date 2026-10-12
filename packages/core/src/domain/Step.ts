import type { RegisteredActionStep } from '../ffmpeg/actions';

export type BaseStep = RegisteredActionStep;
export type StepAction = BaseStep['action'];
