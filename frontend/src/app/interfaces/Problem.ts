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
  stdout: string;
  timeMs: number;

  cases: {
    input: any[];
    expected: any;
    actual: any;
    passed: boolean;
  }[];
}

export type Language =| 'python'| 'javascript'| 'typescript'| 'cpp'| 'c'| 'java';
