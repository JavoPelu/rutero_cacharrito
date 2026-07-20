BEGIN;

ALTER TABLE vendedores
  ADD COLUMN IF NOT EXISTS es_repartidor BOOLEAN NOT NULL DEFAULT FALSE;

-- Marca la cuenta "repartidor" existente con el flag.
-- Ajusta el WHERE si tu vendedor tiene otro nombre exacto en la tabla.
UPDATE vendedores
SET es_repartidor = TRUE
WHERE nombre = 'repartidor';

COMMIT;
