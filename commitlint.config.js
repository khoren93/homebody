/** Conventional Commits, see CONTRIBUTING.md. */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [0],
    'body-max-line-length': [2, 'always', 100],
  },
};
