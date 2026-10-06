import { isDeepStrictEqual } from 'util';
import { Problem, RunResult } from '../../frontend/src/app/interfaces/Problem';
import { spawn } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const MARKER = '__RESULTS__';

function runCommand(command: string, args: string[], timeoutMs = 5000): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; timeMs: number }> {
    return new Promise((resolve) => {
        const start = Date.now();
        const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
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

export async function runCpp(code: string, problem: Problem): Promise<RunResult> {
    const inputs = problem.test_cases.map((t: any) => t.input);
    const cases = inputs.map((input: any, i: number) => {
        const arr = Array.isArray(input) ? input : [input];
        const literal = arr.map((v: any) => (typeof v === 'number' ? String(v) : JSON.stringify(v))).join(', ');
        return `
            {
              std::vector<int> __arr = { ${literal} };
              auto __value = ${problem.function_name}(__arr);
              __results.push_back({"ok": true, "value": __value});
            }
        `;
    }).join('\n');

    const source = `
        #include <iostream>
        #include <vector>
        #include <string>
        #include <sstream>
        ${code}
        int main() {
            std::vector<std::string> __results;
            ${cases}
            std::cout << "${MARKER}" << "[";
            for (size_t i = 0; i < __results.size(); ++i) {
                if (i > 0) std::cout << ",";
                std::cout << __results[i];
            }
            std::cout << "]" << std::endl;
            return 0;
        }
    `;

    const tmpDir = mkdtempSync(join(tmpdir(), 'algolearn-cpp-'));
    const srcPath = join(tmpDir, 'main.cpp');
    const exePath = join(tmpDir, 'main');
    writeFileSync(srcPath, source, 'utf8');

    try {
        const compile = await runCommand('g++', [srcPath, '-std=c++17', '-o', exePath], 10000);
        if (compile.exitCode !== 0 || compile.timedOut) {
            return { passed: false, error: compile.stderr || 'Compilation failed', cases: [] } as any;
        }

        const out = await runCommand(exePath, [], 5000);
        const line = out.stdout.split('\n').find((l) => l.startsWith(MARKER));
        if (!line) {
            return { passed: false, error: out.stderr || 'No output', cases: [] } as any;
        }

        const results = JSON.parse(line.slice(MARKER.length));
        const checked = results.map((r: any, i: number) => {
            const expected = (problem.test_cases[i] as any).expected_output;
            return {
                input: inputs[i],
                expected,
                actual: r.value,
                passed: isDeepStrictEqual(r.value, expected),
            };
        });

        return {
            passed: checked.every((c: any) => c.passed),
            cases: checked,
            stdout: out.stdout.replace(line, '').trim(),
            timeMs: out.timeMs,
        } as any;
    } finally {
        rmSync(tmpDir, { recursive: true, force: true });
    }
}