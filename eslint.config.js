const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'supabase/functions/**'],
  },
  ...expoConfig,
  {
    rules: {},
  },
];
