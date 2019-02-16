import { serve } from './server';
import { watch } from './watcher';

watch('/Users/skonves/code/api-specs/.resolved', { port: 8800 }).catch(
  console.error,
);
