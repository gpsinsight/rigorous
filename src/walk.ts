import { join } from 'path';
import * as fs from 'fs';

export async function* walk(
  root: string,
  sub: string,
  regex: RegExp,
): AsyncIterableIterator<string> {
  const files = await readdir(join(root, sub));

  for (const file of files) {
    const stats = await stat(join(root, sub, file));

    if (stats.isDirectory()) {
      yield* walk(root, join(sub, file), regex);
    } else if (regex && regex.test(file)) {
      yield join(sub, file);
    }
  }
}

export function* walkSync(
  root: string,
  sub: string,
  regex: RegExp,
): IterableIterator<string> {
  const files = fs.readdirSync(join(root, sub));

  for (const file of files) {
    const stats = fs.statSync(join(root, sub, file));

    if (stats.isDirectory()) {
      yield* walkSync(root, join(sub, file), regex);
    } else if (regex && regex.test(file)) {
      yield join(sub, file);
    }
  }
}

function readdir(dir: fs.PathLike): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

function stat(file: fs.PathLike): Promise<fs.Stats> {
  return new Promise((resolve, reject) => {
    fs.stat(file, (err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });
}
