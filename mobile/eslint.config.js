// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // src/shared được sinh từ src/lib của bản web (đã lint ở đó)
    ignores: ['dist/*', 'src/shared/*'],
  },
]);
