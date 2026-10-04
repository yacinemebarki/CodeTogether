export interface TestCase {
    input: unknown;
    expected_output: unknown;
    user_output: unknown;
    success: string;
}

export interface Problem {
    id: number;
    title: string;
    category: string;
    difficulty: string;
    description: string;
    constraints: string[];
    function_name: string;
    input: {
        type: string;
        description: string;
    };

    starterCode: {
        python: string;
        javascript: string;
        typescript: string;
        cpp: string;
        c: string;
        java: string;
    };

    output: {
        type: string;
        description: string;
    };

    test_cases: TestCase[];
}

export interface RunResult {
  passed: boolean;
  message: string;
  testResults: {
    passed: boolean;
    expected: any;
    actual: any;
  }[];
  stats?: {
    runTime: number;
    memory: number;
  };
}

export type Language =| 'python'| 'javascript'| 'typescript'| 'cpp'| 'c'| 'java';

export async function runPython(code: string, problem: Problem): Promise<RunResult>{

}
export async function runCpp(code: string, problem: Problem): Promise<RunResult>{
    
}
export async function runC(code: string, problem: Problem): Promise<RunResult>{
    
}
export async function runJava(code: string, problem: Problem): Promise<RunResult>{
    
}
export async function runJavaScript(code: string, problem: Problem): Promise<RunResult>{
    
}
export async function runTypeScript(code: string, problem: Problem): Promise<RunResult>{
    
}