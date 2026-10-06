import { constrainedMemory } from 'process';
import { Language, Problem, RunResult } from '../../frontend/src/app/interfaces/Problem';
import { runC } from './c';
import { runCpp } from './cpp';
import { runJava } from './java';
import { runJavaScript } from './javascript';
import { runPython } from './python';
import { runTypeScript } from './typescript';



export async function runCode(code: string, language: Language, problemId: number, problems: Problem[]): Promise<RunResult> {
  const problem = problems.find(problem => problem.id === problemId);

  if (!problem) {
    return {
      passed: false,
      message: 'Problem not found',
      testResults: []
    };
  }

  switch (language) {
    case 'python':
      return runPython(code, problem);
    case 'javascript':
      return runJavaScript(code, problem);
    case 'typescript':
      return runTypeScript(code, problem);
    case 'cpp':
      return runCpp(code, problem);
    case 'c':
      return runC(code, problem);
    case 'java':
      return runJava(code, problem);
    default:
      return {
        passed: false,
        message: 'Unsupported language',
        testResults: []
      };
  }
}