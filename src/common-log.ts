import * as express from 'express';

export function commonLog(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void | express.Response | express.NextFunction {
  const d = new Date();
  res.on('finish', () => {
    const headersSize = getHeaderSize(res);

    const size = res.hasHeader('content-length')
      ? Number(res.getHeader('content-length')) + headersSize
      : headersSize;

    const dateStr = `${pad(d.getDate())}/${getMonth(
      d,
    )}/${d.getFullYear()}:${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
      d.getSeconds(),
    )} -${getOffset(d)}`;

    console.log(
      `${(req.ip === '::1' ? '127.0.0.1' : req.ip) || '-'} - - [${dateStr}] "${
        req.method
      } ${req.originalUrl}" ${res.statusCode} ${size || '-'}`,
    );
  });
  return next();
}

function getHeaderSize(res: express.Response): number {
  const buffer = Buffer.from(
    res
      .getHeaderNames()
      .map(h => `${h}: ${res.getHeader(h)}\n`)
      .join('') +
      'Date: xxx, ## xxx #### ##:##:## GMT\n' +
      'Connection: keep-alive\n' +
      '\n',
  );

  return buffer.byteLength;
}

function getOffset(date: Date): string {
  const h = Math.floor(date.getTimezoneOffset() / 60);
  const m = date.getTimezoneOffset() % 60;

  return pad(h) + pad(m);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function getMonth(date: Date): string {
  return [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][date.getMonth()];
}
