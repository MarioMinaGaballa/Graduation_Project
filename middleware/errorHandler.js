module.exports = (err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).send('Something broke!');
};