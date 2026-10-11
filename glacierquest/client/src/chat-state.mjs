// Preserve a confirmed send if an older room response arrives afterwards.
export function mergeMessages(current, incoming) {
  const messages = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-30);
}
