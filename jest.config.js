module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // TS first: stray compiled .js next to sources must never shadow live source.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['<rootDir>/apps/', '<rootDir>/.*/\.next/'],
  modulePathIgnorePatterns: ['<rootDir>/apps/web/.next/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.base.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@ricton/auth-middleware$': '<rootDir>/packages/auth-middleware/src',
    '^@ricton/db$': '<rootDir>/packages/db/src',
    '^@ricton/shared$': '<rootDir>/packages/shared/src',
    '^@ricton/shared/jobs$': '<rootDir>/packages/shared/src/jobs',
    '^@ricton/service-client$': '<rootDir>/packages/service-client/src',
  },
  testTimeout: 30000,
};
