import { isDeepStrictEqual } from 'util';
import { Problem, RunResult } from '../../frontend/src/app/interfaces/Problem';
import { runPythonInDocker } from './runDocker';

const MARKER = '__RESULTS__';

export async function runPython(code: string, problem: Problem): Promise<RunResult> {
    const inputs = problem.test_cases.map((t: any) => t.input);

    const script = [
        'import json',
        code,
        '',
        `__inputs = json.loads(${JSON.stringify(JSON.stringify(inputs))})`,
        '__results = []',
        'for __args in __inputs:',
        '    try:',
        `        __results.append({"ok": True, "value": ${problem.function_name}(*__args)})`,
        '    except Exception as e:',
        '        __results.append({"ok": False, "error": repr(e)})',
        `print("${MARKER}" + json.dumps(__results))`,
    ].join('\n');

    const out = await runPythonInDocker(script);

    if (out.timedOut) {
        return { passed: false, error: 'Time limit exceeded' } as any;
    }

    const line = out.stdout.split('\n').find((l) => l.startsWith(MARKER));
    if (!line) {
        return { passed: false, error: out.stderr || 'No output' } as any;
    }

    const results = JSON.parse(line.slice(MARKER.length));
    const cases = results.map((r: any, i: number) => {
        const expected = (problem.test_cases[i] as any).expected;
        return {
            input: inputs[i],
            expected,
            actual: r.ok ? r.value : r.error,
            passed: r.ok && isDeepStrictEqual(r.value, expected),
        };
    });

    return {
        passed: cases.every((c: any) => c.passed),
        cases,
        stdout: out.stdout.split('\n').filter((l) => !l.startsWith(MARKER)).join('\n'),
        timeMs: out.timeMs,
    } as any;
}