import { describe, it, expect, vitest } from 'vitest';
import type { IDatabase } from '..';
import { getRegistry, newDocument } from '..';
import { CollectionKey, Database, buildAliasFromSeed } from '..';
import {
  createRoom,
  getAliasNameFromAlias,
  getOrCreateRegistry,
} from '../connectionUtils';
import { loginToMatrix } from './login';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  userLoginInfo,
} from '../test-utils';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('connectRoom', () => {
  it(` * 1. Joins the Matrix room if not in it
  * 2. Creates a Y.Doc and saves it to the room object
  * 3. Creates a matrixCRDT provider and saves it to the room object
  * 4. Save the room's metadata to the registry`, async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
    await loginToMatrix(DB, userLoginInfo);
    const registryRoomAlias = await getOrCreateRegistry(DB);
    if (!registryRoomAlias)
      throw new Error('could not get registry room alias');

    await DB.connectRegistry();
    const registry = getRegistry(DB);

    // need to have `profiles.public` in the registry so satisfy 'checkRegistryPopulated'
    registry.set(
      '0',
      newDocument('registry.0.0', {
        flashcards: {},
        profiles: {
          public: {
            roomAlias: 'test',
          },
        },
        notes: {},
      })
    );
    const seed = 'test' + (Math.random() * 10000).toFixed();
    const roomAlias = buildAliasFromSeed(
      seed,
      CollectionKey.flashcards,
      DB.userId
    );

    const room = await createRoom(DB.matrixClient, {
      roomAliasName: getAliasNameFromAlias(roomAlias),
      name: 'Test Room',
      topic: 'This is a test room',
    });

    updateRegistryEntry(DB, {
      collectionKey: CollectionKey.flashcards,
      roomAliasSeed: seed,
      roomId: room.room_id,
    });

    const eventListener = vitest.fn();
    DB.on(eventListener);

    const resRoom = await DB.connectRoom(seed, CollectionKey.flashcards);

    expect(resRoom).toBeDefined();
    expect(resRoom.ydoc).toBeDefined();
    expect(resRoom.matrixProvider).toBeDefined();

    expect(eventListener).toBeCalledTimes(5);
    expect(eventListener).toBeCalledWith({
      event: 'DB.connectRoom',
      data: {
        collectionKey: CollectionKey.flashcards,
        roomAlias,
      },
      level: 'info',
      message: 'starting connectRoom',
    });
    expect(eventListener).toBeCalledWith({
      event: 'DB.connectRoom',
      data: {
        collectionKey: CollectionKey.flashcards,
        roomAlias,
      },
      level: 'info',
      message: 'room joined',
    });
    expect(eventListener).toBeCalledWith({
      event: 'DB.connectRoom',
      data: {
        collectionKey: CollectionKey.flashcards,
        roomAlias,
      },
      level: 'info',
      message: 'ydoc created',
    });
    expect(eventListener).toBeCalledWith({
      event: 'DB.connectRoom',
      data: {
        collectionKey: CollectionKey.flashcards,
        roomAlias,
      },
      level: 'info',
      message: 'registry updated',
    });
    expect(eventListener).toBeCalledWith({
      event: 'DB.connectRoom',
      data: {
        collectionKey: CollectionKey.flashcards,
        roomAlias,
      },
      level: 'info',
      message: 'matrix provider connected',
    });
  }, 10000);
});
