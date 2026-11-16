// Minimal OpenStep-plist reader for Glyphs 3 sources.
// Every parsed value keeps its [start, end) offsets in the source text so that callers
// can splice edits back into the file without re-serialising (and reformatting) it.

export function parse(text) {
  let i = 0;

  const ws = () => {
    for (;;) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) i++;
      else if (text.startsWith('//', i)) i = text.indexOf('\n', i) + 1 || text.length;
      else if (text.startsWith('/*', i)) i = text.indexOf('*/', i) + 2;
      else return;
    }
  };

  const fail = (msg) => {
    throw new Error(`${msg} at offset ${i}: ${JSON.stringify(text.slice(i, i + 40))}`);
  };

  const value = () => {
    ws();
    const start = i;
    const c = text[i];
    if (c === '{') {
      i++;
      const entries = {};
      for (;;) {
        ws();
        if (text[i] === '}') { i++; break; }
        const key = value();
        ws();
        if (text[i] !== '=') fail('expected =');
        i++;
        const val = value();
        ws();
        if (text[i] !== ';') fail('expected ;');
        i++;
        entries[key.value] = val;
      }
      return { kind: 'dict', value: entries, start, end: i };
    }
    if (c === '(') {
      i++;
      const items = [];
      for (;;) {
        ws();
        if (text[i] === ')') { i++; break; }
        items.push(value());
        ws();
        if (text[i] === ',') i++;
        else if (text[i] !== ')') fail('expected , or )');
      }
      return { kind: 'array', value: items, start, end: i };
    }
    if (c === '"') {
      i++;
      let s = '';
      while (text[i] !== '"') {
        if (text[i] === '\\') { s += text[i + 1]; i += 2; }
        else s += text[i++];
      }
      i++;
      return { kind: 'string', value: s, start, end: i };
    }
    const m = /^[^\s{}()=;,"]+/.exec(text.slice(i, i + 200));
    if (!m) fail('unexpected token');
    i += m[0].length;
    return { kind: 'string', value: m[0], start, end: i };
  };

  const root = value();
  return root;
}

/** Plain-JS view of a node tree (dicts → objects, arrays → arrays, scalars → strings). */
export function plain(node) {
  if (node.kind === 'dict') {
    return Object.fromEntries(Object.entries(node.value).map(([k, v]) => [k, plain(v)]));
  }
  if (node.kind === 'array') return node.value.map(plain);
  return node.value;
}
