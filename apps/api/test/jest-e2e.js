module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/setup-e2e.ts'],
};
