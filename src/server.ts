import { readFileSync } from 'fs';
import { Server } from 'http';
import { join } from 'path';

import * as express from 'express';
import { resolveRefs } from 'json-refs';
import { OpenAPI, Router, RouteHandler } from 'openapi-router';
import * as swaggerUi from 'swagger-ui-express';

import { commonLog } from './common-log';
import { Mocker } from './mocker';
import { walk } from './walk';

export type ServerOptions = {
  port?: number;
  regex?: RegExp;
};

/** Serves all Swagger specs within the specified directory from localhost */
export async function serve(
  dir: string,
  options?: ServerOptions,
): Promise<Server> {
  const app = express();
  const port = (options && options.port) || 8000;
  const regex = (options && options.regex) || /oas2\.json/;
  const apis: { [title: string]: string } = {};

  app.enable('trust proxy');

  app.use(commonLog);

  for await (const specpath of walk(dir, '', regex)) {
    // Load the spec
    const spec = (await resolveRefs(
      JSON.parse(readFileSync(join(dir, specpath)).toString()),
    )).resolved as OpenAPI.Schema;

    // Override host and schemes
    spec.host = `localhost:${port}`;
    spec.schemes = ['http'];

    // Serve the spec at the base path
    if (!spec.basePath) {
      console.warn(`${specpath} does not specify a base path. skipping...`);
      continue;
    }
    apis[`${spec.info.title} v${spec.info.version}`] = spec.basePath;
    app.use(spec.basePath, createSubapp(spec));
  }

  // Catch-all 404 for non-spec URIs
  app.all('*', (req, res, next) => {
    res.status(404).json({
      details: `${req.originalUrl} is not defined by any spec`,
      meta: apis,
    });
  });

  // Catch-all error handler
  app.use((err, req, res, next) => {
    if (!res.headersSent) {
      const { errors } = req.openapi || res.openapi;
      res.status(500).json({ errors });
    }
    console.error(JSON.stringify(err, null, 2));
  });
  return new Promise(resolve => {
    const server = app.listen(port, () => {
      console.log(
        `Serving ${
          Object.keys(apis).length
        } API(s) at http://localhost:${port}`,
      );
      resolve(server);
    });
  });
}

function createSubapp(spec: OpenAPI.Schema): express.Express {
  const subapp = express();
  const router = new Router(spec, subapp);

  // Serve spec and docs
  subapp.get('/spec', (req, res) => {
    res.json(spec);
  });
  subapp.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

  // Create handlers for declared paths and verbs
  const paths = new Set<string>();
  const verbs: { [path: string]: Set<string> } = {};
  for (const { path, verb, operation } of getOperations(spec)) {
    // TODO: handle security
    const x = operation.security || spec.security;

    // Handle response
    paths.add(path);
    verbs[path] = verbs[path] || new Set<string>();
    verbs[path].add(verb);
    if (operation.operationId) {
      router.use(operation.operationId, createHandler(path, verb, operation));
    } else {
      console.log(`WARNING! No operation ID for ${verb.toUpperCase()} ${path}`);
    }
  }

  // Create OPTIONS handlers
  for (const path of paths) {
    subapp.options(path, (req, res) => {
      verbs[path].add('options').add('head');
      res
        .status(200)
        .set({
          Allow: Array.from(verbs[path].values())
            .map(verb => verb.toUpperCase())
            .join(', '),
        })
        .send();
    });
  }

  // Create 405 handlers for unhandled verbs
  for (const path of paths) {
    subapp.all(path, (req, res) => {
      res.status(405).json({
        details: `Method ${req.method.toUpperCase()} is not allow for ${
          req.originalUrl
        }`,
      });
    });
  }

  // Create catch all 404 handler for unspecified routes
  subapp.all('*', (req, res, next) => {
    res.status(404).json({
      details: `Cannot ${req.method.toUpperCase()} ${req.originalUrl}`,
    });
  });

  // Create 400 handler for request validation errors
  subapp.use((err, req, res, next) => {
    if (err.code === 'OPENAPI_ERRORS' && err.scope === 'request') {
      if (!res.headersSent) {
        res.status(400).json({ errors: req.openapi.errors });
      }
    }
    next(err);
  });

  // Create 500 handler for response validation errors
  subapp.use((err, req, res, next) => {
    if (err.code === 'OPENAPI_ERRORS' && err.scope === 'response') {
      if (!res.headersSent) {
        if (req.method === 'HEAD') {
          if (res.openapi.errors.some(e => e.type !== 'INVALID_BODY')) {
            res.status(500);
          }
          res.send();
        } else {
          res.status(500).json({ errors: res.openapi.errors });
        }
      }
    }
    next(err);
  });

  return subapp;
}

function createHandler(
  path: string,
  verb: string,
  operation: OpenAPI.Operation,
): RouteHandler {
  return (req, res) => {
    const { code, response } = selectResponse(operation.responses);

    const seed = req.get('x-random-seed');

    const mocker = new Mocker(seed);
    const mock = mocker.createValue(response['schema']);
    res.set('x-random-seed', `${mocker.seed}`);

    res.status(code);

    console.log(req.method);

    if (req.method === 'HEAD') {
      res.send();
    } else {
      res.json(mock);
    }
  };
}

function selectResponse(
  responses: OpenAPI.Responses,
): { code: number; response: OpenAPI.Response } {
  const statusCode = Object.keys(responses).sort((a, b) =>
    a.localeCompare(b),
  )[0];

  const code = statusCode === 'default' ? 200 : Number(statusCode);
  return { code, response: responses[statusCode] as OpenAPI.Response };
}

function* getOperations(
  spec: OpenAPI.Schema,
): IterableIterator<{
  path: string;
  verb: string;
  operation: OpenAPI.Operation;
}> {
  for (const path in spec.paths) {
    for (const verb in spec.paths[path]) {
      yield { path, verb, operation: spec.paths[path][verb] };
    }
  }
}
