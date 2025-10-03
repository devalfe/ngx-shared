import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/projects/ngx-global-state/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: '<rootDir>/projects/ngx-global-state/tsconfig.spec.json' },
    ],
  },
  moduleNameMapper: {
    '^@devalfe/ngx-global-state$': '<rootDir>/projects/ngx-global-state/src/public-api.ts',
  },
  setupFiles: ['<rootDir>/projects/ngx-global-state/test/setup-tests.ts'],
  collectCoverageFrom: [
    'projects/ngx-global-state/src/lib/**/*.ts',
    '!projects/ngx-global-state/src/public-api.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/ngx-global-state',
  reporters: ['default'],
};

export default config;
