export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
      branches: 70,
    },
  },
  moduleNameMapper: {
    '^@ricton/(.*)$': '<rootDir>/../../packages/$1/src',
  },
};
