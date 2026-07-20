const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAuthPayload, setUserSession } = require('../frontend/assets/app.js');

test('normaliza respuestas de login con payload anidado', () => {
  const payload = normalizeAuthPayload({ data: { token: 'abc', usuario: { rol: 'ADMINISTRADOR' } } });
  assert.equal(payload.token, 'abc');
  assert.equal(payload.usuario.rol, 'ADMINISTRADOR');
});

test('guarda la sesión incluso si el backend devuelve un objeto de usuario distinto', () => {
  const storage = {};
  global.localStorage = {
    getItem(key) { return storage[key] ?? null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  };

  const result = setUserSession({ token: 'xyz', usuario: { rol: 'vendedor' } });
  assert.equal(result.usuario.rol, 'vendedor');
  assert.equal(storage.rutero_token, 'xyz');
});
