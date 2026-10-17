const { test } = require('node:test');
const assert = require('node:assert/strict');

test('Bubbles use player identity, expire without replay, and skip legacy messages', async () => {
  const { activeBubbles } = await import('../../client/src/chat-bubbles.mjs');
  const messages = [
    { id: 'old', player_id: 'a', player_name: 'Alex', body: 'primero', createdAt: 1000 },
    { id: 'new', player_id: 'a', player_name: 'Alex', body: 'segundo', createdAt: 2000 },
    { id: 'other', player_id: 'b', player_name: 'Alex', body: 'otro jugador', createdAt: 2000 },
    { id: 'legacy', player_name: 'Alex', body: 'sin ID', createdAt: 2500 }
  ];
  const bubbles = activeBubbles(messages, 3000);
  assert.equal(bubbles.size, 2);
  assert.equal(bubbles.get('a').body, 'segundo');
  assert.equal(bubbles.get('b').body, 'otro jugador');
  assert.equal(activeBubbles(messages, 7000).size, 0);
  assert.equal(activeBubbles(messages, 7001).size, 0);
});

test('Long unbroken messages are capped to three lines and remain inside the map', async () => {
  const { bubbleLines, bubbleBox } = await import('../../client/src/chat-bubbles.mjs');
  const measure = text => Array.from(text).length * 8;
  assert.deepEqual(bubbleLines('Hola desde la plaza', measure, 80), ['Hola desde', 'la plaza']);
  for (const text of ['W'.repeat(140), '😀'.repeat(70), 'Hola\n'.repeat(28)]) {
    const lines = bubbleLines(text, measure);
    assert.equal(lines.length, 3);
    assert.ok(lines.every(line => measure(line) <= 176));
    assert.ok(lines[2].endsWith('…'));
  }
  for (const [x, y] of [[16,16],[624,16],[16,384],[624,384]]) {
    const box = bubbleBox(x, y, 196, 67);
    assert.ok(box.x >= 0 && box.x + box.width <= 640);
    assert.ok(box.y >= 0 && box.y + box.height <= 400);
  }
});
