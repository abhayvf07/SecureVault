const http = require('http');
const https = require('https');
const { URL } = require('url');
const { AppError } = require('../middleware/errorHandler');

const streamRemoteFile = async (fileUrl, res, filename = 'download') => {
  if (!fileUrl) {
    throw new AppError('Invalid remote file URL', 400);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(fileUrl);
  } catch (err) {
    throw new AppError('Invalid remote file URL', 400);
  }

  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.get(parsedUrl, (remoteRes) => {
      if (remoteRes.statusCode >= 400) {
        return reject(new AppError(`Failed to stream remote file: ${remoteRes.statusCode}`, remoteRes.statusCode));
      }

      res.setHeader('Content-Type', remoteRes.headers['content-type'] || 'application/octet-stream');
      if (remoteRes.headers['content-length']) {
        res.setHeader('Content-Length', remoteRes.headers['content-length']);
      }
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      remoteRes.pipe(res);
      remoteRes.on('end', resolve);
      remoteRes.on('error', reject);
    });

    request.setTimeout(30000); // 30s timeout for slow/hung remote servers
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(new AppError('Remote request timed out', 504));
    });
  });
};

module.exports = { streamRemoteFile };