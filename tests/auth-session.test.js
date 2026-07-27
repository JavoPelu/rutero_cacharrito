const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAuthPayload, setUserSession, resolveApiBase, hasValidSession } = require('../frontend/assets/app.js');

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

test('resuelve la API local cuando la app corre en localhost', () => {
  global.window = { location: { hostname: 'localhost' } };
  assert.equal(resolveApiBase(), '/api');
});

test('reconoce una sesión inválida cuando falta token o usuario', () => {
  global.localStorage = {
    getItem(key) { return key === 'rutero_token' ? null : null; },
    setItem() {},
    removeItem() {}
  };
  assert.equal(hasValidSession(), false);
});

test('acepta respuestas de login con payload anidado en varios niveles', () => {
  const payload = normalizeAuthPayload({ data: { data: { token: 'abc', usuario: { rol: 'vendedor' } } } });
  assert.equal(payload.token, 'abc');
  assert.equal(payload.usuario.rol, 'vendedor');
});
