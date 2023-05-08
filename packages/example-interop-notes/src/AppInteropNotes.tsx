import { useEffect, useState } from 'react';
import { ulid } from 'ulid';
import {
  CollectionKey,
  Database,
  buildRef,
  getAliasSeedFromAlias,
  getRoomDocuments,
  newDocument,
} from '@eweser/db';
import type { Documents, Note, LoginData, Room, Flashcard } from '@eweser/db';
import * as config from './config';

import { styles, StatusBar, LoginForm } from '@eweser/examples-components';
import { WEB_RTC_PEERS } from './config';

const aliasSeed = 'notes-default';
const collectionKey = CollectionKey.notes;
const initialRoomConnect = {
  collectionKey,
  aliasSeed,
  name: 'My Notes on Life and Things',
};

// This app, along with AppInteropFlashcards is an example of how two independent apps can interoperate by both connecting to the user's database. All this requires is the user signs in with the same matrix account. There will be real-time syncing between them.
// The example here is a note-taking app that would let you link notes to flashcards and vice versa

const db = new Database({
  // set `debug` to true to see debug messages in the console
  // debug: true,
  webRTCPeers: WEB_RTC_PEERS,
  baseUrl: 'http://localhost:3000',
});

const App = () => {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    db.on('my-listener-name', ({ event }) => {
      if (event === 'started') {
        setStarted(true);
      }
    });
    db.load([initialRoomConnect]);
    return () => {
      db.off('my-listener-name');
      db.disconnectRoom(initialRoomConnect);
    };
  }, []);

  const handleLogin = (loginData: LoginData) =>
    db.login({ initialRoomConnect, ...loginData });

  const handleSignup = (loginData: LoginData) =>
    db.signup({ initialRoomConnect, ...loginData });

  const defaultNotesRoom = db.getRoom<Note>(collectionKey, aliasSeed);

  return (
    <div style={styles.appRoot}>
      {started && defaultNotesRoom?.ydoc ? (
        <NotesInternal notesRoom={defaultNotesRoom} />
      ) : (
        <LoginForm
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          db={db}
          {...config}
        />
      )}
      <StatusBar db={db} />
    </div>
  );
};

const sortNotesByRecent = (notes: Documents<Note>): Documents<Note> => {
  const sortedArray: [string, Note][] = Object.entries(notes).sort(
    (a, b) => b[1]._updated - a[1]._updated
  );
  return Object.fromEntries(sortedArray);
};

const NotesInternal = ({ notesRoom }: { notesRoom: Room<Note> }) => {
  const Notes = db.getDocuments(notesRoom);

  const [notes, setNotes] = useState<Documents<Note>>(
    sortNotesByRecent(Notes.getUndeleted())
  );

  const [selectedNote, setSelectedNote] = useState(notes[0]?._id);

  // listen for changes to the ydoc and update the state
  Notes.onChange((_event) => {
    const unDeleted = sortNotesByRecent(Notes.getUndeleted());
    setNotes(unDeleted);
    if (!notes[selectedNote] || notes[selectedNote]?._deleted) {
      setSelectedNote(Object.keys(unDeleted)[0]);
    }
  });

  const createNote = () => {
    const newNote = Notes.new({ text: 'New Note Body' });
    setSelectedNote(newNote._id);
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    note.text = text;
    Notes.set(note._id, note);
  };

  const deleteNote = (note: Note) => {
    Notes.delete(note._id);
  };

  const [linkFlashcardModalOpen, setLinkFlashcardModalOpen] = useState(false);

  const handleLinkFlashcard = async (
    flashcard: Flashcard,
    flashcardsRoom: Room<Flashcard>
  ) => {
    // add the note to the flashcards list of noteRefs and safe it to the doc.

    const note = notes[selectedNote];
    if (!note) return;

    const noteRefs = flashcard.noteRefs ?? [];
    noteRefs.push(flashcard._ref);
    flashcard.noteRefs = noteRefs;
    const flashcardsDocuments = getRoomDocuments(flashcardsRoom);
    flashcardsDocuments.set(flashcard._id, flashcard);

    // add the flashcard to the notes list of flashcardRefs and save it to the doc.
    const flashcardRefs = note.flashcardRefs ?? [];
    flashcardRefs.push(flashcard._ref);
    note.flashcardRefs = flashcardRefs;
    Notes.set(note._id, note);
  };

  return (
    <>
      <h1>Edit</h1>
      {Object.keys(notes).length === 0 ? (
        <div>No notes found. Please create one</div>
      ) : (
        <textarea
          style={styles.editor}
          name="main-card-editor"
          value={notes[selectedNote]?.text ?? ''}
          onChange={(e) => {
            updateNoteText(e.target.value, notes[selectedNote]);
          }}
        />
      )}

      <h1>Notes</h1>

      <button onClick={() => createNote()}>New note</button>

      <div style={styles.flexWrap}>
        {Object.keys(notes).map((id) => {
          const note = notes[id];
          if (note && !notes[id]?._deleted)
            return (
              <div
                onClick={() => setSelectedNote(note._id)}
                style={styles.card}
                key={note._id}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note);
                  }}
                  style={styles.deleteButton}
                >
                  X
                </button>
                <p> {note.text}</p>

                <button onClick={() => setLinkFlashcardModalOpen(true)}>
                  + Link flashcard
                </button>

                <div style={{ display: 'flex', marginTop: '2rem' }}>
                  {note.flashcardRefs?.length &&
                    note.flashcardRefs.length > 0 && (
                      <div>
                        <p>Linked Flashcards:</p>
                        {note.flashcardRefs.map((ref) => (
                          <LinkedFlashcard key={ref} docRef={ref} />
                        ))}
                      </div>
                    )}
                </div>
              </div>
            );
        })}
      </div>
      {linkFlashcardModalOpen && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setLinkFlashcardModalOpen(false)}
              style={styles.modalCloseButton}
            >
              X
            </button>
            <LinkFlashcardModal
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              note={notes[selectedNote]!}
              handleLinkFlashcard={handleLinkFlashcard}
            />
          </div>
        </div>
      )}
    </>
  );
};

const LinkedFlashcard = ({ docRef }: { docRef?: string }) => {
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  useEffect(() => {
    if (!docRef) return;
    const loadFlashcard = async () => {
      const flashcard = await db.getDocumentByRef<Flashcard>(docRef);
      setFlashcard(flashcard);
    };
    loadFlashcard();
  }, [docRef]);
  return <div>{flashcard?.frontText}</div>;
};

const LinkFlashcardModal = ({
  note,
  handleLinkFlashcard,
}: {
  note: Note;
  handleLinkFlashcard: (
    flashcard: Flashcard,
    flashcardsRoom: Room<Flashcard>
  ) => Promise<void>;
}) => {
  const flashcardRoomRegistry = db.getCollectionRegistry(
    CollectionKey.flashcards
  );
  const [connectedRoms, setConnectedRooms] = useState<Room<Flashcard>[]>([]);

  useEffect(() => {
    const createDefaultFlashcardsRoom = async () => {
      const room = await db.createAndConnectRoom<Flashcard>({
        collectionKey: CollectionKey.flashcards,
        aliasSeed: 'flashcards-default',
      });
      setConnectedRooms([room]);
    };

    const populateRooms = async () => {
      const connected: Room<Flashcard>[] = [];
      for (const aliasSeed of Object.keys(flashcardRoomRegistry)) {
        try {
          const room = await db.loadAndConnectRoom<Flashcard>(
            { collectionKey: CollectionKey.flashcards, aliasSeed }
            // performance could be improved by using the offline room which returns earlier.
          );
          connected.push(room);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }

      setConnectedRooms(connected);
    };

    if (
      flashcardRoomRegistry &&
      Object.keys(flashcardRoomRegistry).length === 0
    ) {
      createDefaultFlashcardsRoom();
    } else if (
      connectedRoms.length < Object.keys(flashcardRoomRegistry).length
    ) {
      populateRooms();
    }
  }, [connectedRoms, flashcardRoomRegistry]);
  const [newFlashcardModalOpen, setNewFlashcardModalOpen] = useState(false);

  return (
    <div>
      {connectedRoms.map((room) => {
        const docs: Documents<Flashcard> =
          room?.ydoc?.getMap('documents')?.toJSON() ?? {};
        return (
          <div key={room.roomAlias}>
            {newFlashcardModalOpen && (
              <div style={styles.modal}>
                <div style={styles.modalContent}>
                  <button
                    onClick={() => setNewFlashcardModalOpen(false)}
                    style={styles.modalCloseButton}
                  >
                    X
                  </button>
                  <NewFlashcardModal room={room} noteText={note.text ?? ''} />
                </div>
              </div>
            )}
            <button onClick={() => setNewFlashcardModalOpen(true)}>
              + New Flashcard
            </button>
            <p> Click a flashcard to link to note:</p>
            {Object.values(docs)?.map((flashcard) => (
              <FlashcardComponent
                key={flashcard?._id}
                flashcard={flashcard}
                room={room}
                handleLinkFlashcard={handleLinkFlashcard}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

const FlashcardComponent = ({
  flashcard,
  handleLinkFlashcard,
  room,
}: {
  flashcard?: Flashcard;
  handleLinkFlashcard: (
    flashcard: Flashcard,
    flashcardsRoom: Room<Flashcard>
  ) => Promise<void>;
  room: Room<Flashcard>;
}) => {
  if (!flashcard || flashcard._deleted) return null;
  return (
    <div
      key={flashcard._id}
      onClick={() => {
        handleLinkFlashcard(flashcard, room);
      }}
      style={{
        border: '1px solid black',
        padding: '1rem',
        margin: '1rem',
        cursor: 'pointer',
      }}
    >
      <p>{flashcard.frontText}</p>
      <hr />
      <p>{flashcard.backText}</p>
    </div>
  );
};

const NewFlashcardModal = ({
  room,
  noteText,
}: {
  room: Room<Flashcard>;
  noteText: string;
}) => {
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState(noteText);

  const handleCreateFlashcard = async () => {
    const documentId = ulid();
    const aliasSeed = getAliasSeedFromAlias(room.roomAlias);
    const ref = buildRef({
      collectionKey: CollectionKey.flashcards,
      aliasSeed,
      documentId,
    });
    const newFlashcard = newDocument<Flashcard>(ref, { frontText, backText });

    room.ydoc?.getMap('documents').set(documentId, newFlashcard);
  };
  return (
    <>
      <label htmlFor="front-text">Front Text</label>
      <input
        id="front-text"
        value={frontText}
        onChange={(e) => setFrontText(e.target.value)}
      />
      <label htmlFor="back-text">Back Text</label>
      <input
        id="back-text"
        value={backText}
        onChange={(e) => setBackText(e.target.value)}
      />
      <button onClick={handleCreateFlashcard}>Create</button>
    </>
  );
};

export default App;
