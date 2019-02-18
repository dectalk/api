const Dectalk = require('../class/Dectalk');

module.exports = (req, res, next) => {
  const input = req.body.dectalk || req.query.dectalk || '';
  const dectalk = new Dectalk({ text: input });

  dectalk.execute()
    .then((file) => {
      res.sendFile(file, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': 'attachment; filename=error.wav'
        }
      });

      res.on('finish', () => {
        dectalk.deleteFile();
      });
    })
    .catch((err) => {
      next(err);
    });
};
