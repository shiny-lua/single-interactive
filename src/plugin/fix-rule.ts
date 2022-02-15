import { ESLint, Rule } from 'eslint';
import {
  createFixToApplyAutoFixes,
  createFixToApplySuggestions,
  createFixToDisablePerFile,
  createFixToDisablePerLine,
  createFixToMakeFixableAndFix,
} from './fix/index.js';
import { Fix, FixContext } from './index.js';

/**
 * @file The rule to do the fix.
 * The fix function returns the `Rule.Fix` that describes how to fix the code.
 * To apply the fix to your code, you need to use ESLint's API to apply the `Rule.Fix`.
 *
 * However, there is no dedicated API in ESLint to apply `Rule.Fix` (there is an internal API
 * called `SourceCodeFixer`,but it is not exposed to the public). For now, the only way
 * to apply `Rule.Fix` is to report a fixable problem from a rule and fix it
 * with `ESLint.outputFixes`.
 *
 * This module is a rule that executes a fix function and converts the return value
 * to a fixable problem.
 */

const filenameToIsAlreadyFixed = new Map<string, boolean>();

function createFixes(context: Rule.RuleContext, ruleOption: FixRuleOption, fixer: Rule.RuleFixer): Rule.Fix[] | null {
  const { fix, results, ruleIds } = ruleOption;
  const result = results.find((result) => result.filePath === context.getFilename());
  if (!result) return null;
  const messages = result.messages.filter((message) => message.ruleId && ruleIds.includes(message.ruleId));

  const fixContext: FixContext = {
    filename: context.getFilename(),
    sourceCode: context.getSourceCode(),
    messages,
    ruleIds,
    fixer,
  };

  let fixes: Rule.Fix[] = [];
  if (fix.name === 'applyAutoFixes') {
    fixes = createFixToApplyAutoFixes(fixContext, fix.args);
  } else if (fix.name === 'disablePerLine') {
    fixes = createFixToDisablePerLine(fixContext, fix.args);
  } else if (fix.name === 'disablePerFile') {
    fixes = createFixToDisablePerFile(fixContext, fix.args);
  } else if (fix.name === 'applySuggestions') {
    fixes = createFixToApplySuggestions(fixContext, fix.args);
  } else if (fix.name === 'makeFixableAndFix') {
    fixes = createFixToMakeFixableAndFix(fixContext, fix.args);
  } else {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-explicit-any
    throw new Error(`Unknown fix: ${(fix as any).name}`);
  }

  if (fixes.length === 0) return null;

  // 🤯🤯🤯 THIS IS SUPER HACK!!! 🤯🤯🤯
  // `disablePerFile` などでは、1つ message を修正する度に、disable comment が 1 行追加されて、message に格納されている位置情報と、
  // 本来修正するべきコードの位置が 1 行ずれてしまう。そこで、ファイルの後ろ側の行の message から修正していくことで、
  // message の位置情報と本来修正するべきコードの位置情報がずれないようにしている。
  const sortedFixed = fixes.sort((a, b) => b.range[0] - a.range[0]);
  return sortedFixed;
}

export type FixRuleOption = {
  ruleIds: string[];
  results: ESLint.LintResult[];
  fix: Fix;
};

export const fixRule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
  },
  create(context: Rule.RuleContext) {
    const filename = context.getFilename();

    // 🤯🤯🤯 THIS IS SUPER HACK!!! 🤯🤯🤯
    // fix するとコードが変わり、また別の lint エラーが発生する可能性があるため、eslint は `context.report` で
    // 報告されたエラーの fix がすべて終わったら、再び create を呼び出し、また `context.report` で fix 可能なエラーが
    // 報告されないかを確認する仕様になっている (これは `context.report` で fix 可能なものがなくなるまで続く)。
    // そのため、ここでは2回目以降 create が呼び出された時に、誤って再び fix してしまわないよう、fix 済み
    // であれば early return するようにしている。
    const isAlreadyFixed = filenameToIsAlreadyFixed.get(filename) ?? false;
    if (isAlreadyFixed) {
      filenameToIsAlreadyFixed.set(filename, false); // 念の為戻しておく
      return {};
    }

    const ruleOption = context.options[0] as FixRuleOption;

    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Program: () => {
        context.report({
          loc: {
            // エラー位置の指定が必須なので、仕方なく設定する。
            // どうせユーザにはエラーメッセージを見せることはないので、適当に設定しておく。
            line: 0,
            column: 0,
          },
          message: `fix`,
          fix: (fixer) => {
            const fixes = createFixes(context, ruleOption, fixer);
            // if `fixes` is null, do not set the flag.
            if (fixes) filenameToIsAlreadyFixed.set(filename, true);
            return fixes;
          },
        });
      },
    };
  },
};
