-- Allow bounty frequency 'constant' (app feature: always on the board).
-- Run via Supabase CLI (`supabase db push`) or paste into SQL Editor → New query.
--
-- Handles:
--   • PostgreSQL ENUM on bounties.frequency → ALTER TYPE … ADD VALUE
--   • text/varchar + CHECK constraint mentioning frequency → replace with expanded CHECK

DO $$
DECLARE
  typ_nsp name;
  typ_name name;
  typtype "char";
  con record;
BEGIN
  SELECT ns.nspname, t.typname, t.typtype
  INTO typ_nsp, typ_name, typtype
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid AND c.relname = 'bounties'
  JOIN pg_namespace cn ON cn.oid = c.relnamespace AND cn.nspname = 'public'
  JOIN pg_type t ON t.oid = a.atttypid
  JOIN pg_namespace ns ON ns.oid = t.typnamespace
  WHERE a.attname = 'frequency'
    AND NOT a.attisdropped
  LIMIT 1;

  IF typ_name IS NULL THEN
    RAISE NOTICE 'chore-defense migration: public.bounties.frequency not found — skipped.';
    RETURN;
  END IF;

  -- Enum column: add new label (idempotent via pg_enum check)
  IF typtype = 'e' THEN
    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = typ_nsp
        AND t.typname = typ_name
        AND e.enumlabel = 'constant'
    ) THEN
      RAISE NOTICE 'chore-defense migration: enum %.% already has constant — skipped.', typ_nsp, typ_name;
      RETURN;
    END IF;
    EXECUTE format(
      'ALTER TYPE %I.%I ADD VALUE %L',
      typ_nsp,
      typ_name,
      'constant'
    );
    RAISE NOTICE 'chore-defense migration: added enum value constant on %.%', typ_nsp, typ_name;
    RETURN;
  END IF;

  -- text / varchar: drop CHECK constraints that reference frequency, then add one list
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE rel.relname = 'bounties'
      AND n.nspname = 'public'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%frequency%'
  LOOP
    EXECUTE format('ALTER TABLE public.bounties DROP CONSTRAINT %I', con.conname);
    RAISE NOTICE 'chore-defense migration: dropped constraint %', con.conname;
  END LOOP;

  ALTER TABLE public.bounties DROP CONSTRAINT IF EXISTS bounties_frequency_check;

  ALTER TABLE public.bounties
    ADD CONSTRAINT bounties_frequency_check CHECK (
      frequency IS NULL
      OR frequency::text IN (
        'constant',
        'daily',
        'weekly',
        'semi_weekly',
        'bi_weekly'
      )
    );

  RAISE NOTICE 'chore-defense migration: added bounties_frequency_check including constant.';
END $$;
