// Enables jest.fn() in ESM
import { jest } from '@jest/globals';

global.jest = jest;
