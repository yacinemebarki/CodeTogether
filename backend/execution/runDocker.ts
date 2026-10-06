import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

export interface DockerOutput {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    timeMs: number;
}

export function runLanguageInDocker(image: string, command: string[], code: string, timeoutMs = 5000): Promise<DockerOutput> {
    return new Promise((resolve) => {
        const name = `run-${randomUUID()}`;
        const start = Date.now();
        const proc = spawn('docker', [
            'run', '--rm', '-i',
            '--name', name,
            '--network', 'none',
            '--memory', '128m',
            '--cpus', '0.5',
            '--pids-limit', '64',
            '--read-only',
            image,
            ...command,
        ]);

        let stdout = '';
        let stderr = '';
        let timedOut = false;
        proc.stdout.on('data', (d) => (stdout += d.toString()));
        proc.stderr.on('data', (d) => (stderr += d.toString()));

        const timer = setTimeout(() => {
            timedOut = true;
            spawn('docker', ['kill', name]);
        }, timeoutMs);

        proc.on('close', (exitCode) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, exitCode, timedOut, timeMs: Date.now() - start });
        });

        proc.stdin.write(code);
        proc.stdin.end();
    });
}

export function runPythonInDocker(code: string, timeoutMs = 5000): Promise<DockerOutput> {
    return runLanguageInDocker('python-runner', ['python', '-'], code, timeoutMs);
}

export function runJavaScriptInDocker(code: string, timeoutMs = 5000): Promise<DockerOutput> {
    return runLanguageInDocker('javascript-runner', ['node', '-'], code, timeoutMs);
}

export function runTypeScriptInDocker(code: string, timeoutMs = 5000): Promise<DockerOutput> {
    return runLanguageInDocker('typescript-runner', ['tsx', '-'], code, timeoutMs);
}

export function runCInDocker(code: string, timeoutMs = 5000): Promise<DockerOutput> {
    return runLanguageInDocker('c-runner', ['bash', '-lc', 'cat > main.c && gcc main.c -o main && ./main'], code, timeoutMs);
}

export function runCppInDocker(code: string, timeoutMs = 5000): Promise<DockerOutput> {
    return runLanguageInDocker('cpp-runner', ['bash', '-lc', 'cat > main.cpp && g++ main.cpp -std=c++17 -o main && ./main'], code, timeoutMs);
}

export function runJavaInDocker(code: string, timeoutMs = 5000): Promise<DockerOutput> {
    return runLanguageInDocker('java-runner', ['bash', '-lc', 'cat > Main.java && javac Main.java && java Main'], code, timeoutMs);
}

