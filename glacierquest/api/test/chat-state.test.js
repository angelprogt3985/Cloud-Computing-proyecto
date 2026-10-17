const { test } = require('node:test');
const assert = require('node:assert/strict');

test('An older room response does not remove or duplicate a confirmed outgoing chat', async () => {
  const { mergeMessages } = await import('../../client/src/chat-state.mjs');
  const old = { id: 'old', createdAt: 1, body: 'Earlier message' };
  const sent = { id: 'sent', createdAt: 2, body: 'Confirmed send' };
  let messages = mergeMessages([old], [sent]);
  messages = mergeMessages(messages, [old]);
  assert.deepEqual(messages, [old, sent]);
  assert.deepEqual(mergeMessages(messages, [old, sent]), [old, sent]);
});

test('Client chat history stays bounded while newer messages arrive', async () => {
  const { mergeMessages } = await import('../../client/src/chat-state.mjs');
  const history = Array.from({ length: 30 }, (_, i) => ({ id: String(i), createdAt: i }));
  const messages = mergeMessages(history, [{ id: 'new', createdAt: 31 }]);
  assert.equal(messages.length, 30);
  assert.equal(messages[0].id, '1');
  assert.equal(messages.at(-1).id, 'new');
});
