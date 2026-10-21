// 무거운 인코딩(BMP·TIFF·GIF·ICO·PDF·SVG·ZIP)을 메인 스레드 밖에서 처리하는 워커.
import * as codecs from './codecs.js';

self.onmessage = async (e) => {
  const { id, op, args } = e.data;
  if (op === 'ping') { self.postMessage({ pong: true }); return; }
  try {
    const result = await codecs[op](...args);
    self.postMessage({ id, result }, [result.buffer]);
  } catch (err) {
    self.postMessage({ id, error: err && err.message ? err.message : String(err) });
  }
};
