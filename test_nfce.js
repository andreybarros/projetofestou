const handler = require('./api/nfce.js');

const req = {
  method: 'POST',
  body: {
    action: 'emitir',
    venda_pk: '6d123b45-1234-1234-1234-123456789012' // dummy pk
  }
};

const res = {
  setHeader: (k, v) => console.log('Header:', k, v),
  status: (code) => {
    console.log('Status:', code);
    return {
      json: (data) => console.log('JSON:', data),
      end: () => console.log('End')
    }
  }
};

handler(req, res)
  .then(() => console.log("Done"))
  .catch(err => console.error("Crash:", err));
