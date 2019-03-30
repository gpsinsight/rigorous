import { readFileSync } from 'fs';
import { Server } from 'http';
import { join } from 'path';

import * as bodyParser from 'body-parser';
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
  unauthorizedHandler?: ErrorHandler;
  notFoundHandler?: ErrorHandler;
  methodNotAllowedHandler?: ErrorHandler;
  badRequestHandler?: ErrorHandler;
  badResponseHandler?: ErrorHandler;
  unknownHandler?: ErrorHandler;
};

const handleUnauthorized: ErrorHandler = () => ({
  body: { message: 'unauthorized' },
});

const handleNotFound: ErrorHandler = ({ method, originalUrl }) => ({
  body: { message: `Cannot ${method.toUpperCase()} ${originalUrl}` },
});

const handleMethodNotAllowed: ErrorHandler = ({ method, originalUrl }) => ({
  body: {
    message: `Method ${method.toUpperCase()} is not allowed for ${originalUrl}`,
  },
});

const handleBadRequest: ErrorHandler = ({ errors }) => ({
  body: { message: 'Bad request', errors },
});

const handleBadResponse: ErrorHandler = ({ errors }) => ({
  body: { message: 'Bad response', errors },
});

const handleUnknown: ErrorHandler = ({ method, originalUrl }) => ({
  body: { message: `Cannot ${method.toUpperCase()} ${originalUrl}` },
});

export type ErrorHandler = (args: {
  method: string;
  originalUrl: string;
  errors: any[];
}) => Response;

export type Response = {
  headers?: { [name: string]: string | number };
  body: any;
};

/** Serves all Swagger specs within the specified directory from localhost */
export async function serve(
  dir: string,
  options?: ServerOptions,
): Promise<Server> {
  const app = express();
  const port = (options && options.port) || 8000;
  const regex = (options && options.regex) || /oas2\.json/;
  const unauthorizedHandler =
    (options && options.unauthorizedHandler) || handleUnauthorized;
  const unknownHandler = (options && options.unknownHandler) || handleUnknown;
  const apis: { [title: string]: string } = {};

  app.enable('trust proxy');

  app.use(bodyParser.json());
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
    app.use(spec.basePath, createSubapp(spec, options));
  }

  // Create 401 handler for unauthorized requests
  app.use((err, req, res, next) => {
    if (err.code === 'AUTH_ERROR') {
      if (!res.headersSent) {
        const { method, originalUrl } = req;
        const { headers, body } = unauthorizedHandler({
          method,
          originalUrl,
          errors: [],
        });
        res.set(headers || {});
        res.status(401).json(body);
      }
    }
    next(err);
  });

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
      const errors = [
        ...((req.openapi && req.openapi.errors) || []),
        ...((res.openapi && res.openapi.errors) || []),
        ...[err].filter(x => x),
      ];

      const { method, originalUrl } = req;
      const { headers, body } = unknownHandler({
        method,
        originalUrl,
        errors,
      });
      res.set(headers || {});

      res.status(500).json(body);
    }
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

function createSubapp(
  spec: OpenAPI.Schema,
  options: ServerOptions,
): express.Express {
  const subapp = express();
  const router = new Router(spec, subapp);
  const notFoundHandler =
    (options && options.notFoundHandler) || handleNotFound;
  const methodNotAllowedHandler =
    (options && options.methodNotAllowedHandler) || handleMethodNotAllowed;
  const badRequestHandler =
    (options && options.badRequestHandler) || handleBadRequest;
  const badResponseHandler =
    (options && options.badResponseHandler) || handleBadResponse;

  // Serve spec and docs
  subapp.get('/spec', (req, res) => {
    res.json(spec);
  });
  subapp.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

  // Create handlers for declared paths and verbs
  const paths = new Set<string>();
  const verbs: { [path: string]: Set<string> } = {};
  for (const path of getPaths(spec)) {
    for (const { verb, operation } of getOperations(path, spec)) {
      const security = (operation.security || spec.security).map(name =>
        Object.keys(name).map(x => spec.securityDefinitions[x]),
      );

      // Handle response
      paths.add(path);
      verbs[path] = verbs[path] || new Set<string>();
      verbs[path].add(verb);
      if (operation.operationId) {
        router.use(
          operation.operationId,
          createHandler(path, verb, operation, security),
        );
      } else {
        console.log(
          `WARNING! No operation ID for ${verb.toUpperCase()} ${path}`,
        );
      }
    }

    // Create OPTIONS handler
    const generalSecurity = spec.security.map(name =>
      Object.keys(name).map(x => spec.securityDefinitions[x]),
    );
    subapp.options(toExpressTemplate(path), (req, res, next) => {
      if (!evalSecurity(req, generalSecurity))
        return next({ code: 'AUTH_ERROR' });
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

    // Create 405 handlers for unhandled verbs
    subapp.all(toExpressTemplate(path), (req, res) => {
      const { method, originalUrl } = req;
      const { headers, body } = methodNotAllowedHandler({
        method,
        originalUrl,
        errors: [],
      });
      res.set(headers || {});
      res.status(405).json(body);
    });
  }

  // Create catch all 404 handler for unspecified routes
  subapp.all('*', (req, res, next) => {
    const { method, originalUrl } = req;
    const { headers, body } = notFoundHandler({
      method,
      originalUrl,
      errors: [],
    });
    res.set(headers || {});
    res.status(404).json(body);
  });

  // Create 400 handler for request validation errors
  subapp.use((err, req, res, next) => {
    if (err.code === 'OPENAPI_ERRORS' && err.scope === 'request') {
      if (!res.headersSent) {
        const { method, originalUrl } = req;
        const { headers, body } = badRequestHandler({
          method,
          originalUrl,
          errors: req.openapi.errors,
        });
        res.set(headers || {});
        res.status(400).json(body);
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
            const { method, originalUrl } = req;
            const { headers } = badResponseHandler({
              method,
              originalUrl,
              errors: res.openapi.errors,
            });
            res.set(headers || {});
            res.status(500);
          }
          res.send();
        } else {
          const { method, originalUrl } = req;
          const { headers, body } = badResponseHandler({
            method,
            originalUrl,
            errors: res.openapi.errors,
          });
          res.set(headers || {});
          res.status(500).json(body);
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
  security: OpenAPI.SecurityScheme[][],
): RouteHandler {
  return (req, res, next) => {
    if (!evalSecurity(req, security)) {
      next({ code: 'AUTH_ERROR' });
    } else {
      const { code, response } = selectResponse(operation.responses);

      const seed = req.get('x-random-seed');

      const mocker = new Mocker(seed);
      const mock = mocker.createValue(response['schema']);
      res.set('x-random-seed', `${mocker.seed}`);

      res.status(code);

      if (req.method === 'HEAD') {
        res.send();
      } else {
        res.json(mock);
      }
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
  path: string,
  spec: OpenAPI.Schema,
): IterableIterator<{
  verb: string;
  operation: OpenAPI.Operation;
}> {
  for (const verb in spec.paths[path]) {
    yield { verb, operation: spec.paths[path][verb] };
  }
}

export function getPaths(spec: OpenAPI.Schema): string[] {
  const tree: RouteTree = Object.keys(spec.paths).reduce(
    (acc, path) => addRoute(acc, path),
    {},
  );

  return Array.from(traverse(tree)).map(x => '/' + x);
}

export type RouteTree = { [seg: string]: RouteTree };

export function addRoute(tree: RouteTree, path: string): RouteTree {
  const i = path.substr(1).indexOf('/');

  if (i === -1) {
    const x = path.substr(1);
    return {
      ...tree,
      [x]: tree[x] ? addRoute(tree[x], '') : null,
    };
  }

  const a = path.substr(1, i);
  const b = path.substr(i + 1);

  if (tree[a] === null) {
    return {
      ...tree,
      [a]: addRoute({ '': null }, b),
    };
  } else if (tree[a]) {
    return {
      ...tree,
      [a]: addRoute(tree[a], b),
    };
  } else {
    return {
      ...tree,
      [a]: addRoute({}, b),
    };
  }
}

export function* traverse(tree: RouteTree): IterableIterator<string> {
  const nodes = Object.keys(tree);

  const literal = nodes
    .filter(node => !node.startsWith('{') && node !== '')
    .sort((a, b) =>
    a.startsWith(b) ? -1 : b.startsWith(a) ? 1 : a.localeCompare(b),
  );
  const params = nodes.filter(node => node.startsWith('{') && node !== '');
  const empty = nodes.filter(node => node === '');

  for (const node of literal) {
    if (tree[node])
      for (const child of traverse(tree[node])) {
        if (child) yield node + '/' + child;
        else yield node;
      }
    else yield node;
  }

  for (const node of params) {
    if (tree[node])
      for (const child of traverse(tree[node])) {
        if (child) yield node + '/' + child;
        else yield node;
      }
    else yield node;
  }

  for (const node of empty) {
    if (tree[node])
      for (const child of traverse(tree[node])) {
        if (child) yield node + '/' + child;
        else yield node;
      }
    else yield node;
  }
}

function evalSecurity(
  req: express.Request,
  security: OpenAPI.SecurityScheme[][],
): boolean {
  for (const schemes of security) {
    if (!schemes.some(scheme => !evalScheme(req, scheme))) return true;
  }
  return false;
}

function evalScheme(
  req: express.Request,
  scheme: OpenAPI.SecurityScheme,
): boolean {
  switch (scheme.type) {
    case 'basic': {
      const value = req.get('authorization');
      return value && value.startsWith('Basic ');
    }
    case 'apiKey': {
      const value =
        scheme.in === 'header' ? req.get(scheme.name) : req.query(scheme.name);
      return !!value;
    }
    case 'oauth2': {
      return true;
    }
    default:
      return false;
  }
}

function toExpressTemplate(path: string): string {
  return path
    .split('{')
    .join(':')
    .split('}')
    .join('');
}
