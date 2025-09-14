export default {
  // Test environment
  testEnvironment: 'node',
  
  // ES Modules support
  preset: null,
  transform: {},
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/server.js', // Exclude main server file
    '!**/node_modules/**',
    '!**/migrations/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test timeout for TestContainers
  testTimeout: 120000
};