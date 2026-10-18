export const BUBBLE_MS = 5000;

// Legacy messages without sender IDs never become bubbles; names are not identity.
export function activeBubbles(messages, now = Date.now()) {
  const latest = new Map();
  for (const message of messages) {
    if (!message.player_id || typeof message.body !== 'string' || !Number.isFinite(message.createdAt)) continue;
    if (message.createdAt > now || now - message.createdAt >= BUBBLE_MS) continue;
    const previous = latest.get(message.player_id);
    if (!previous || message.createdAt >= previous.createdAt) latest.set(message.player_id, message);
  }
  return latest;
}

export function bubbleLines(text, measure, maxWidth = 176) {
  const chars = Array.from(text.replace(/\s+/gu, ' ').trim());
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (line && measure(line + char) > maxWidth) {
      if (lines.length === 2) {
        while (line && measure(line + '…') > maxWidth) line = Array.from(line).slice(0, -1).join('');
        lines.push(line.trimEnd() + '…');
        return lines;
      }
      const space = line.lastIndexOf(' ');
      if (space > 0 && char !== ' ') {
        lines.push(line.slice(0, space)); line = line.slice(space + 1) + char;
      } else {
        lines.push(line.trimEnd()); line = char.trimStart();
      }
    } else line += char;
  }
  if (line) lines.push(line);
  return lines;
}

export function bubbleBox(x, y, width, height, viewWidth=640, viewHeight=400) {
  return {
    x: Math.max(4, Math.min(viewWidth - 4 - width, x - width / 2)),
    y: y - 30 - height >= 4 ? y - 30 - height : Math.min(viewHeight - 4 - height, y + 40),
    width, height
  };
}

export function drawBubble(ctx, text, x, y, viewWidth=640, viewHeight=400) {
  ctx.save(); ctx.font = '13px sans-serif';
  const lines = bubbleLines(text, value => ctx.measureText(value).width);
  if (!lines.length) { ctx.restore(); return; }
  const width = Math.max(40, ...lines.map(line => ctx.measureText(line).width + 20));
  const box = bubbleBox(x, y, width, lines.length * 17 + 16, viewWidth, viewHeight);
  const above = box.y < y;
  const tailX = Math.max(box.x + 10, Math.min(box.x + width - 10, x));
  const edge = above ? box.y + box.height : box.y;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#376b7b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(box.x, box.y, box.width, box.height, 9); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tailX - 5, edge); ctx.lineTo(tailX, edge + (above ? 7 : -7)); ctx.lineTo(tailX + 5, edge); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#173b50'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, box.x + 10, box.y + 8 + i * 17));
  ctx.restore();
}
