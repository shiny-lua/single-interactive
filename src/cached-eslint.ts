import { ESLint, Linter, Rule } from 'eslint';
import pager from 'node-pager';
import { format } from './formatter';

function filterResultsByRuleId(
  results: ESLint.LintResult[],
  ruleIds: string[],
): ESLint.LintResult[] {
  return results.map((result) => {
    return {
      ...result,
      messages: result.messages.filter(
        (message) =>
          message.ruleId !== null && ruleIds.includes(message.ruleId),
      ),
    };
  });
}

export class CachedESLint {
  readonly patterns: string[];
  readonly ruleNameToRuleModule: Map<string, Rule.RuleModule>;
  results: ESLint.LintResult[] | undefined;

  constructor(patterns: string[]) {
    this.patterns = patterns;
    const linter = new Linter();
    this.ruleNameToRuleModule = linter.getRules();
    this.results = undefined;
  }

  async lint(): Promise<ESLint.LintResult[]> {
    if (this.results !== undefined) {
      return this.results;
    }

    const eslint = new ESLint({});
    const results = await eslint.lintFiles(this.patterns);

    return results;
  }

  printResults(results: ESLint.LintResult[]): void {
    const resultText = format(results);
    console.log(resultText);
  }

  async showErrorAndWarningMessages(
    results: ESLint.LintResult[],
    ruleIds: string[],
  ): Promise<void> {
    const eslint = new ESLint({});
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(
      filterResultsByRuleId(results, ruleIds),
    );
    await pager(resultText);
  }

  async fix(ruleIds: string[]): Promise<void> {
    const eslint = new ESLint({
      fix: (message) =>
        message.ruleId !== null && ruleIds.includes(message.ruleId),
    });
    const results = await eslint.lintFiles(this.patterns);
    await ESLint.outputFixes(results);

    this.results = results;
  }
}