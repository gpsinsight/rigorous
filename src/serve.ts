'use strict';

import { watch } from './watcher';
import { Response } from './server';

watch('/Users/skonves/code/api-specs/.resolved', {
  port: 9001,
  unauthorizedHandler,
  notFoundHandler,
  methodNotAllowedHandler,
  badRequestHandler,
  badResponseHandler,
  unknownHandler,
});

function unauthorizedHandler(): Response {
  return {
    body: { erorrs: [{ details: 'Unauthorized' }] },
  };
}

function notFoundHandler({ originalUrl }): Response {
  return {
    body: {
      erorrs: [
        {
          details: `Resource ${originalUrl} was not found for the current user`,
        },
      ],
    },
  };
}

function methodNotAllowedHandler({ method, originalUrl }): Response {
  return {
    body: {
      erorrs: [
        {
          details: `Method ${method.toUpperCase()} is not allowed for ${originalUrl}`,
        },
      ],
    },
  };
}
function badRequestHandler({ method, originalUrl, errors }): Response {
  return {
    body: {
      erorrs: errors.map(meta => ({ code: 'BAD_REQUEST', meta })),
    },
  };
}
function badResponseHandler({ method, originalUrl, errors }): Response {
  return {
    body: {
      erorrs: errors.map(meta => ({ code: 'BAD_RESPONSE', meta })),
    },
  };
}

function unknownHandler({ method, originalUrl, errors }): Response {
  return {
    body: {
      erorrs: errors.map(meta => ({ code: 'INTERNAL_SERVER_ERROR', meta })),
    },
  };
}
