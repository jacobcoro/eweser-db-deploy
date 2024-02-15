import { db } from '@/services/database';
import { and, eq, inArray } from 'drizzle-orm';
import type { Room } from './schema';
import { rooms } from './schema';
import type { RoomInsert, RoomUpdate } from './validation';
import { updateUserRooms, users } from '../users';
import type { DBInstance } from '@/services/database/drizzle/init';

export async function getRoomsByUserId(userId: string): Promise<Room[]> {
  const usersRooms =
    (
      await db()
        .select({ rooms: users.rooms })
        .from(users)
        .where(eq(users.id, userId))
    )[0]?.rooms || [];
  if (usersRooms.length == 0) {
    return [];
  }
  return await db().select().from(rooms).where(inArray(rooms.id, usersRooms));
}

export async function getProfileRoomsByUserId(
  userId: string,
  instance?: DBInstance
) {
  return await db(instance).transaction(async (dbInstance) => {
    const usersRooms =
      (
        await db(dbInstance)
          .select({ rooms: users.rooms })
          .from(users)
          .where(eq(users.id, userId))
      )[0]?.rooms || [];
    if (usersRooms.length == 0) {
      return [];
    }
    return await db(dbInstance)
      .select({
        token: rooms.token,
        id: rooms.id,
        name: rooms.name,
      })
      .from(rooms)
      .where(
        and(inArray(rooms.id, usersRooms), eq(rooms.collectionKey, 'profiles'))
      );
  });
}

/**
 *
 * locks the rows for update
 */
export async function getProfileRoomsByUserIdForUpdate(
  userId: string,
  instance?: DBInstance
) {
  return await db(instance).transaction(async (dbInstance) => {
    const usersRooms =
      (
        await db(dbInstance)
          .select({ rooms: users.rooms })
          .from(users)
          .for('update')
          .where(eq(users.id, userId))
      )[0]?.rooms || [];
    if (usersRooms.length == 0) {
      return [];
    }
    return await db(dbInstance)
      .select({
        token: rooms.token,
        id: rooms.id,
        name: rooms.name,
      })
      .from(rooms)

      .where(
        and(inArray(rooms.id, usersRooms), eq(rooms.collectionKey, 'profiles'))
      );
  });
}

/**
 * Insert rooms and update the user's rooms list
 */
export async function insertRooms(
  inserts: RoomInsert[],
  userId: string,
  instance?: DBInstance
) {
  return await db(instance).transaction(async (dbInstance) => {
    const usersRooms =
      (
        await db()
          .select({ rooms: users.rooms })
          .from(users)
          .where(eq(users.id, userId))
      )[0]?.rooms || [];
    await updateUserRooms(
      userId,
      usersRooms.concat(inserts.map(({ id }) => id)),
      dbInstance
    );

    return dbInstance
      .insert(rooms)
      .values(inserts)
      .returning({ token: rooms.token, id: rooms.id, name: rooms.name });
  });
}

/**

 * Deletes rooms and removes them from the user's rooms list
 */
export async function deleteRooms(
  ids: string[],
  userId: string,
  instance?: DBInstance
) {
  return await db(instance).transaction(async (dbInstance) => {
    const usersRooms =
      (
        await db()
          .select({ rooms: users.rooms })
          .from(users)
          .where(eq(users.id, userId))
      )[0]?.rooms || [];
    await updateUserRooms(
      userId,
      usersRooms.filter((r) => !ids.includes(r)),
      dbInstance
    );
    await dbInstance.delete(rooms).where(inArray(rooms.id, ids));
  });
}

export async function updateRooms(update: RoomUpdate) {
  return await db().update(rooms).set(update).where(eq(rooms.id, update.id));
}
