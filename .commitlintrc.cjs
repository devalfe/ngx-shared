module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['ci', 'chore', 'docs', 'ticket', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style'],
    ],
    'header-max-length': [2, 'always', 200],
    'body-max-line-length': [2, 'always', 500],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
  prompt: {
    useEmoji: true,
  },
};
