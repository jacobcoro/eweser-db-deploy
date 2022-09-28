import { buildRef, buildRoomAlias, newDocument } from '@eweser/db';
import { useSyncedStore } from '@syncedstore/react';

import { useCallback, useEffect, useState } from 'react';
import type {
  CollectionKey,
  IDatabase,
  ConnectStatus,
  Documents,
  RegistryData,
} from '@eweser/db/types/types';

type CollectionData = {
  collectionKey: CollectionKey;
  aliasKey: string;
  name?: string;
};

const connectOrCreateRoom = async ({
  registryStore,
  roomAlias,
  db,
  collectionKey,
  name,
  aliasKey,
  setConnectStatus,
  setStore,
}: {
  registryStore: {
    documents: Documents<RegistryData>;
  };
  roomAlias: string;
  db: IDatabase;
  collectionKey: CollectionKey;
  aliasKey: string;
  name?: string;
  setConnectStatus: (status: ConnectStatus) => void;
  setStore: (store: any) => void;
}) => {
  const notesRegistry = registryStore?.documents[0]?.notes ?? {};
  const registryKeys = Object.keys(notesRegistry);
  // lookup notes rooms in registry
  const callback = (status: ConnectStatus) => {
    if (status === 'ok') setStore(db.collections[collectionKey][roomAlias]?.store);
    setConnectStatus(status);
  };
  try {
    if (registryKeys.length === 0 || !registryKeys.includes(roomAlias)) {
      console.log('creating room');
      await db.createAndConnectRoom(
        {
          collectionKey,
          aliasKey,
          name,
          registryStore,
        },
        callback
      );
    } else {
      console.log('connecting existing room');
      await db.connectRoom(roomAlias, collectionKey, registryStore, callback);
    }
  } catch (error) {
    setConnectStatus('failed');
  }
};

/**
 *
 * @param collectionName roomAliasKey (not full room alias, just the unique part)
 */
function useCollection<T = any>(db: IDatabase, collectionData: CollectionData) {
  const roomAlias = buildRoomAlias(collectionData.aliasKey, db.userId);
  const registryStore = useSyncedStore(db.getRegistryStore());
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>('initial');
  const [store, setStore] = useState<{ documents: Documents<T> } | null>(null);

  /** if not provided an id, uses the length of the collection's documents */
  const createNewDocument = useCallback(
    function <DocBase>(docBase: DocBase, id?: string) {
      if (!store) throw new Error('Store not ready');
      const newId = id ?? Object.keys(store.documents).length.toString();
      return newDocument(docBase, newId, buildRef(collectionData.collectionKey, roomAlias, newId));
    },
    [store]
  );

  useEffect(() => {
    if (connectStatus === 'initial')
      connectOrCreateRoom({
        ...collectionData,
        roomAlias,
        db,
        registryStore: registryStore as any,
        setConnectStatus,
        setStore,
      });
  }, [roomAlias, db, registryStore, setConnectStatus]);

  return { connectStatus, store, newDocument: createNewDocument };
}

export default useCollection;
