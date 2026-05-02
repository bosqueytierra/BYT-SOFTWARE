-- =====================================================================
-- Tabla: pagos_clientes_asignaciones
-- Permite distribuir un pago en múltiples proyectos (cotizaciones).
-- Un pago (pagos_clientes) puede tener N asignaciones, cada una con su
-- propio monto_asignado. La suma de monto_asignado debe igualar el monto
-- total del pago (validación a nivel de aplicación).
--
-- Retrocompatibilidad:
--   Pagos antiguos sin filas en esta tabla se asumen como 100% asignados
--   a la cotización indicada en pagos_clientes.cotizacion_id.
-- =====================================================================

create table if not exists public.pagos_clientes_asignaciones (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references public.pagos_clientes(id) on delete cascade,
  cotizacion_id uuid not null,
  venta_id uuid,
  proyecto_nombre text,
  cliente_nombre text,
  monto_asignado numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pagos_clientes_asignaciones enable row level security;

create policy "select_all"
on public.pagos_clientes_asignaciones for select
to public using (true);

create policy "insert_all"
on public.pagos_clientes_asignaciones for insert
to public with check (true);

create policy "update_all"
on public.pagos_clientes_asignaciones for update
to public using (true) with check (true);

create policy "delete_all"
on public.pagos_clientes_asignaciones for delete
to public using (true);

create index if not exists idx_pago_id
on public.pagos_clientes_asignaciones(pago_id);

create index if not exists idx_cotizacion_id
on public.pagos_clientes_asignaciones(cotizacion_id);
