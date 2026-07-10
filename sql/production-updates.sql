BEGIN;

ALTER TABLE municipios
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(30);

DROP INDEX IF EXISTS municipios_codigo_unique;

WITH base AS (
  SELECT
    id,
    UPPER(
      RPAD(
        LEFT(
          REGEXP_REPLACE(
            TRANSLATE(
              nombre,
              U&'\00E1\00E9\00ED\00F3\00FA\00C1\00C9\00CD\00D3\00DA\00F1\00D1\00FC\00DC',
              'aeiouAEIOUnNuU'
            ),
            '[^A-Za-z0-9]',
            '',
            'g'
          ),
          5
        ),
        5,
        'X'
      )
    ) AS prefijo
  FROM municipios
),
numerados AS (
  SELECT id, prefijo || ROW_NUMBER() OVER (PARTITION BY prefijo ORDER BY id)::text AS codigo
  FROM base
)
UPDATE municipios m
SET codigo = n.codigo
FROM numerados n
WHERE m.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS municipios_codigo_unique
  ON municipios (codigo)
  WHERE codigo IS NOT NULL;

ALTER TABLE vendedores
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS vendedor_id INTEGER,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'clientes_vendedor_id_fkey'
      AND table_name = 'clientes'
  ) THEN
    ALTER TABLE clientes
      ADD CONSTRAINT clientes_vendedor_id_fkey
      FOREIGN KEY (vendedor_id)
      REFERENCES vendedores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS clientes_vendedor_id_idx
  ON clientes (vendedor_id);

CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(80) PRIMARY KEY,
  valor TEXT,
  actualizado_en TIMESTAMP DEFAULT NOW()
);

INSERT INTO configuracion (clave, valor)
VALUES ('nombre_negocio', 'Rutero Cacharrito')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO configuracion (clave, valor)
VALUES ('logo_url', NULL)
ON CONFLICT (clave) DO NOTHING;

COMMIT;
