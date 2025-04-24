/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: [
      '<rootDir>/src'
    ],
    testMatch: [
      '**/__tests__/**/*.ts?(x)',
      '**/?(*.)+(spec|test).ts?(x)'
    ],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    },
    moduleFileExtensions: [
      'ts',
      'tsx',
      'js',
      'jsx',
      'json',
      'node'
    ],
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/test/**/*.{ts,tsx}',
      '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    setupFilesAfterEnv: [
      '<rootDir>/src/test/setup.ts'
    ]
  };