// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {}, // Skip Babel
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Fix ESM import paths
  },
};
