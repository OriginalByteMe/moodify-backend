const isCI = process.env.CI === 'true';

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
    '!**/coverage/**',
    // Exclude low-value or infra-heavy files from coverage metrics
    '!server/helpers/PixelPeeper.js',
    '!server/db/connection.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: isCI
    ? {
        global: {
          // CI baseline; increase as coverage improves
          branches: 30,
          functions: 45,
          lines: 35,
          statements: 30
        }
      }
    : {
        global: {
          // Local target; encourages writing tests
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
  
  // Test timeout for TestContainers
  testTimeout: 120000
};
