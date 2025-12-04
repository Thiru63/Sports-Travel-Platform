export default {
  testEnvironment: "node",

  transform: {},

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1.js",
  },

  testMatch: ["**/tests/**/*.test.js"],

  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
