import * as fs from 'fs';
import { serve, ServerOptions } from './server';
import { debounce } from './debounce';

export async function watch(
  dir: string,
  options?: ServerOptions,
): Promise<void> {
  let server = await serve(dir, options);
  console.log();

  const watcher = fs.watch(dir, { recursive: true });

  watcher.on('change', (eventType, filename) => {
    const fn = typeof filename === 'string' ? filename : filename.toString();

    if (/oas2\.json/.test(fn)) {
      console.log(`File changed: ${filename}`);
      restart();
    }
  });

  const restart = debounce(() => {
    server.close();
    console.log();
    serve(dir, options).then(s => {
      server = s;
      console.log();
    });
  }, 1000);
}
