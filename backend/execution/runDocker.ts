import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { exitCode } from 'process';

export interface DockerOutput {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    timeMs: number;
}
export function runPythonInDocker(code: string, timeoutMs = 5000): Promise<DockerOutput> {
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
            'python-runner',
            'python', '-',
        ]);
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        proc.stdout.on('date', (d) => (stdout += d));
        proc.stderr.on('date', (d) => (stderr += d));
        
        const timer = setTimeout(() => {
            timedOut = true;
            spawn('docker', ['kill', name]);
        }, timeoutMs);

        proc.on('close', (exitCode) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, exitCode, timedOut, timeMs: Date.now() - start});
        });
        proc.stdin.write(code);
        proc.stdin.end();
    })
}

