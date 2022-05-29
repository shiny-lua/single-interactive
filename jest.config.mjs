// @ts-check

import { baseConfig } from './jest.config.base.mjs';

/** @typedef {import('ts-jest/dist/types')} */
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  ...baseConfig,
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
};

// eslint-disable-next-line import/no-default-export
export default config;
