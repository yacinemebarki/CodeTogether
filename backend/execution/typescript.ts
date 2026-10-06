import { isDeepStrictEqual } from 'util';
import { Problem, RunResult } from '../../frontend/src/app/interfaces/Problem';
import { spawn } from 'child_process';

const MARKER = '__RESULTS__';
const ts = require('typescript');

function runNodeScript(script: string, timeoutMs = 5000): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; timeMs: number }> {
    return new Promise((resolve) => {
        const start = Date.now();
        const proc = spawn('node', ['-e', script], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        proc.stdout.on('data', (d) => (stdout += d.toString()));
        proc.stderr.on('data', (d) => (stderr += d.toString()));

        const timer = setTimeout(() => {
            timedOut = true;
            proc.kill('SIGKILL');
        }, timeoutMs);

        proc.on('close', (exitCode) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, exitCode, timedOut, timeMs: Date.now() - start });
        });
    });
}

export async function runTypeScript(code: string, problem: Problem): Promise<RunResult> {
    const inputs = problem.test_cases.map((t: any) => [t.input]);
    const compiled = ts.transpileModule(code, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
        },
    }).outputText;

    const script = [
        'const __inputs = ' + JSON.stringify(inputs),
        compiled,
        '',
        'const __results = []',
        'for (const __args of __inputs) {',
        '  try {',
        `    __results.push({ ok: true, value: ${problem.function_name}(...__args) });`,
        '  } catch (e) {',
        '    __results.push({ ok: false, error: String(e) });',
        '  }',
        '}',
        `console.log(${JSON.stringify(MARKER)} + JSON.stringify(__results));`,
    ].join('\n');

    const out = await runNodeScript(script);

    if (out.timedOut) {
        return { passed: false, error: 'Time limit exceeded' } as any;
    }

    const line = out.stdout.split('\n').find((l) => l.startsWith(MARKER));
    if (!line) {
        return { passed: false, error: out.stderr || 'No output' } as any;
    }

    const results = JSON.parse(line.slice(MARKER.length));
    const cases = results.map((r: any, i: number) => {
        const expected = (problem.test_cases[i] as any).expected_output;
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