import { UriFactory } from '../types';

export const uriFactory: UriFactory = (
  pathPattern: string,
  options?: {
    path?: { [key: string]: string | number | boolean };
    query?: { [key: string]: string | number | boolean };
  },
) => {
  const path = options && options.path ? options.path : {};
  const query = options && options.query ? options.query : {};

  let uri = pathPattern;
  for (const paramName in path) {
    uri = uri
      .split(`{${paramName}}`)
      .join(`${encodeURIComponent(`${path[paramName]}`)}`);
  }

  const queryString = Object.keys(query)
    .map(
      key => [
        `${encodeURIComponent(key)}=${encodeURIComponent(`${query[key]}`)}`,
      ],
      [],
    )
    .join('&');

  if (queryString) {
    uri += `?${queryString}`;
  }

  return uri;
};
