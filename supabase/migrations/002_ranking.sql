-- =====================================================================
-- Greenwar: protege o ranking "Jogadores" (rode DEPOIS do 001_init.sql)
-- Cole este arquivo inteiro no Supabase → SQL Editor → Run. Idempotente.
--
-- Antes: cada usuário podia gravar qualquer coisa em profiles.endings (sem limite de tamanho nem
-- validação), e o gatilho somava o tamanho dos arrays. Repetir um final 10 000 vezes inflava o
-- endings_count, e a consulta do ranking (top 300 por endings_count) podia ser tomada por contas falsas.
-- Agora o gatilho limpa "endings" antes de gravar: no máximo 10 cenários, cada um com no máximo 30
-- ids distintos no formato fim_xxx; e endings_count conta só esses ids distintos.
-- =====================================================================

create or replace function public.profiles_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare total integer := 0; k text; clean jsonb := '{}'::jsonb; ids jsonb;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.id := old.id;                 -- id e data de criação não mudam
    new.created_at := old.created_at;
  end if;
  if jsonb_typeof(new.endings) = 'object' then
    for k in select key from jsonb_each(new.endings) where char_length(key) between 1 and 40 order by key limit 10 loop
      if jsonb_typeof(new.endings -> k) = 'array' then
        select coalesce(jsonb_agg(v order by v), '[]'::jsonb) into ids from (
          select distinct e as v from jsonb_array_elements_text(new.endings -> k) as e
          where e ~ '^fim_[a-z0-9_]{1,40}$' limit 30) s;
        clean := clean || jsonb_build_object(k, ids);
        total := total + jsonb_array_length(ids);
      end if;
    end loop;
  end if;
  new.endings := clean;
  new.endings_count := total;
  return new;
end $$;

-- campaigns_by_scenario também ganha um teto de tamanho (é lido por qualquer visitante do ranking)
alter table public.profiles drop constraint if exists profiles_campaigns_size;
alter table public.profiles add  constraint profiles_campaigns_size check (pg_column_size(campaigns_by_scenario) < 4000) not valid;

-- Limpa os perfis que já existem (o gatilho roda em cada linha atualizada)
update public.profiles set endings = endings;

notify pgrst, 'reload schema';
