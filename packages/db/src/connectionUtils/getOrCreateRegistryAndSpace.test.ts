import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { Database } from '..';
import {
  dummyUserName,
  dummyUserPass,
  baseUrl,
  userLoginInfo,
  registryAlias,
  spaceAlias,
  userIdWithServer,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import type { IDatabase } from '../types';
import { loginToMatrix } from '../methods/login';
import { createMatrixClient } from './createMatrixClient';
import {
  getOrCreateRegistry,
  getOrCreateSpace,
} from './getOrCreateRegistryAndSpace';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('getOrCreateRegistry', () => {
  it('Can get or create registry', async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
    await loginToMatrix(DB, userLoginInfo);
    const registryAliasReturned = await getOrCreateRegistry(DB);
    expect(registryAliasReturned).toEqual(registryAlias);
  });
});

describe('getOrCreateSpace', () => {
  it('Can get or create a matrix space which is a room that owns other rooms', async () => {
    const matrixClient = await createMatrixClient(userLoginInfo);

    const spaceAliasReturned = await getOrCreateSpace(
      matrixClient,
      userIdWithServer
    );
    expect(spaceAliasReturned).toEqual(spaceAlias);
  });
});