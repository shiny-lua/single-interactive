import { ESLint } from 'eslint';
import { promptToInputRuleIds } from '../cli/prompt';
import { ESLintProxy } from '../eslint-proxy';
import { NextScene } from '../types';
import { selectAction } from './select-action';

export type SelectRuleIdsArgs = {
  /** The lint results of the project */
  results: ESLint.LintResult[];
  /** The rule ids that are in the `results`. */
  ruleIdsInResults: string[];
};

/**
 * Run the scene where a user select rule ids.
 */
export async function selectRuleIds(
  eslint: ESLintProxy,
  { results, ruleIdsInResults }: SelectRuleIdsArgs,
): Promise<NextScene> {
  const selectedRuleIds = await promptToInputRuleIds(ruleIdsInResults);
  return await selectAction(eslint, { results, ruleIdsInResults, selectedRuleIds });
}
