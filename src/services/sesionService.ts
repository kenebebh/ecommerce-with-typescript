import Session from "../models/session.model.ts";

export const deleteSessionFromDB = async (sessionId: string): Promise<void> => {
  const deletedSession = await Session.findByIdAndDelete(sessionId);

  if (!deletedSession) {
    throw new Error("Session not found or already deleted");
  }

  // Placeholder for demonstration:
  console.log(
    `Session document with ID: ${sessionId} successfully terminated.`
  );

  return Promise.resolve();
};
