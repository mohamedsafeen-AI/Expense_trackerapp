function notFound(req, res) {
  res.status(404).json({ error: 'Not Found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.expose ? err.message : 'Internal Server Error';
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };

