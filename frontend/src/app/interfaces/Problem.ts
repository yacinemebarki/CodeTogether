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

    input: {
        type: string;
        description: string;
    };

    output: {
        type: string;
        description: string;
    };

    test_cases: TestCase[];
}