import { applyPatch } from './store';
import * as exercises from './transforms/exercises';
import * as sessions from './transforms/sessions';
import * as settings from './transforms/settings';
import type { Patch, Snapshot } from './types';

/** Turns a pure transform into an action that updates and persists the store. */
function bind<Args extends unknown[]>(transform: (snapshot: Snapshot, ...args: Args) => Patch) {
  return (...args: Args): void => applyPatch((snapshot) => transform(snapshot, ...args));
}

/**
 * Everything the UI can do to the stored data. Each action is a pure
 * transform from `./transforms` bound to the store.
 */
export const actions = {
  setProfile: bind(settings.setProfile),
  setBodyWeight: bind(settings.setBodyWeight),
  setLoadScale: bind(settings.setLoadScale),
  nudgeLoadScale: bind(settings.nudgeLoadScale),
  toggleTrainingDay: bind(settings.toggleTrainingDay),
  setSessionMinutes: bind(settings.setSessionMinutes),
  setPlanShape: bind(settings.setPlanShape),
  toggleEquipment: bind(settings.toggleEquipment),
  setEquipmentConfig: bind(settings.setEquipmentConfig),

  toggleSessionDone: bind(sessions.toggleSessionDone),
  startNextBlock: bind(sessions.startNextBlock),

  swapExercise: bind(exercises.swapExercise),
  excludeExercise: bind(exercises.excludeExercise),
  restoreExercise: bind(exercises.restoreExercise),
  editPrescription: bind(exercises.editPrescription),
  restoreCalculation: bind(exercises.restoreCalculation),
};
