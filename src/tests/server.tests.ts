import { Server } from 'http';
import { serve } from '../server';
import { srcDir, port } from './constants';

let server: Server;

before(async () => {
  process.env['TEST_HOST'] = `localhost:${port}`;
  server = await serve(srcDir, { port });
});

after(() => {
  server.close();
});
