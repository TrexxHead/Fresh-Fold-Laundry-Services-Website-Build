-- FreshFold production foundation. Review with the Supabase project owner before applying.
-- Money is integer JMD. Sensitive uploads store private object paths, never public URLs.
create extension if not exists pgcrypto;

create type public.app_role as enum ('CUSTOMER','ADMIN','SUPER_ADMIN');
create type public.order_status as enum ('REQUESTED','AWAITING_STUDENT_VERIFICATION','AWAITING_STAFF_CONFIRMATION','CONFIRMED','PICKUP_SCHEDULED','PICKED_UP','WEIGHED','PRICE_APPROVAL_REQUIRED','PRICE_APPROVED','PAYMENT_PENDING','PAYMENT_REVIEW','PAID','PROCESSING','READY_FOR_RETURN','OUT_FOR_DELIVERY','COMPLETED','RESCHEDULE_REQUESTED','ON_HOLD','CANCELLED');
create type public.payment_status as enum ('NOT_REQUESTED','PENDING','REVIEW','PAID','REJECTED','REFUNDED');
create type public.pricing_type as enum ('FIXED','PER_ITEM','PER_BUNDLE','SURCHARGE','STARTING_AT','QUOTE_REQUIRED');

create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 100), phone_e164 text not null,
  email text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), anonymised_at timestamptz
);
create table public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade, role public.app_role not null check (role in ('ADMIN','SUPER_ADMIN')),
  active boolean not null default true, granted_by uuid references auth.users(id), granted_at timestamptz not null default now()
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), customer_id uuid references public.customer_profiles(id), address_type text not null,
  campus_or_building text, address_line text not null, community text not null, landmark text, handoff_notes text,
  created_at timestamptz not null default now(), deactivated_at timestamptz
);
create table public.student_verifications (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customer_profiles(id), institution text not null,
  student_id_number_ciphertext text, evidence_object_path text, status text not null default 'PENDING' check (status in ('PENDING','VERIFIED','REJECTED','EXPIRED')),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz, reason text, created_at timestamptz not null default now()
);
create table public.service_catalogue_items (
  id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, category text not null,
  pricing_type public.pricing_type not null, active boolean not null default true, public_visible boolean not null default true,
  display_order integer not null default 0, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.price_versions (
  id uuid primary key default gen_random_uuid(), catalogue_item_id uuid not null references public.service_catalogue_items(id),
  customer_category text, load_size_lb integer, amount_jmd integer check (amount_jmd is null or amount_jmd >= 0),
  currency text not null default 'JMD' check (currency='JMD'), effective_from timestamptz not null,
  effective_to timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(), weekday smallint not null check (weekday between 0 and 6),
  start_time time not null, end_time time not null, default_capacity integer not null check (default_capacity >= 0),
  active boolean not null default true, effective_from date not null, effective_to date
);
create table public.blackout_dates (
  id uuid primary key default gen_random_uuid(), blackout_date date not null, reason text not null, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), unique (blackout_date)
);
create table public.pickup_slots (
  id uuid primary key default gen_random_uuid(), pickup_date date not null, starts_at time not null, ends_at time not null,
  capacity integer not null check (capacity >= 0), reserved_count integer not null default 0 check (reserved_count >= 0 and reserved_count <= capacity),
  closed boolean not null default false, created_at timestamptz not null default now(), unique (pickup_date, starts_at)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), reference text unique not null, customer_id uuid references public.customer_profiles(id),
  guest_token_hash text unique, address_id uuid not null references public.addresses(id), pickup_slot_id uuid not null references public.pickup_slots(id),
  customer_category text not null check (customer_category in ('STUDENT','NON_STUDENT')), service_type text not null,
  status public.order_status not null default 'REQUESTED', payment_status public.payment_status not null default 'NOT_REQUESTED',
  payment_preference text not null, idempotency_key uuid unique not null, referral_source text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), cancelled_at timestamptz
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), catalogue_item_id uuid references public.service_catalogue_items(id),
  item_name_snapshot text not null, pricing_type_snapshot public.pricing_type not null, quantity integer not null check (quantity > 0),
  unit_amount_jmd integer check (unit_amount_jmd is null or unit_amount_jmd >= 0), requires_quote boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.order_preferences (
  order_id uuid primary key references public.orders(id), preferences text[] not null default '{}', special_instructions text,
  stain_treatment_requested boolean not null default false, created_at timestamptz not null default now()
);
create table public.order_uploads (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), upload_type text not null,
  object_path text unique not null, mime_type text not null, size_bytes bigint not null check (size_bytes > 0),
  scan_status text not null default 'PENDING' check (scan_status in ('PENDING','CLEAN','REJECTED','FAILED')),
  uploaded_by uuid references auth.users(id), created_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.order_estimates (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), version integer not null,
  known_total_jmd integer not null check (known_total_jmd >= 0), provisional boolean not null, line_snapshot jsonb not null,
  accepted_at timestamptz, created_at timestamptz not null default now(), unique(order_id,version)
);
create table public.price_adjustments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), adjustment_type text not null,
  amount_jmd integer not null, reason text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), voided_at timestamptz
);
create table public.customer_price_approvals (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), estimate_id uuid not null references public.order_estimates(id),
  decision text not null check (decision in ('APPROVED','REJECTED')), customer_identifier text not null, decision_at timestamptz not null default now(), note text
);
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), status public.order_status not null,
  actor_user_id uuid references auth.users(id), actor_label text not null, customer_visible_note text, internal_note text,
  created_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), invoice_number text unique not null,
  amount_jmd integer not null check (amount_jmd >= 0), status text not null, issued_at timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id), method text not null,
  amount_jmd integer not null check (amount_jmd >= 0), status public.payment_status not null default 'PENDING', external_reference text,
  verified_by uuid references auth.users(id), verified_at timestamptz, created_at timestamptz not null default now()
);
create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id), object_path text unique not null,
  review_status text not null default 'PENDING', reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table public.subscription_plan_versions (
  id uuid primary key default gen_random_uuid(), plan_slug text not null, version integer not null, name text not null,
  amount_jmd integer check (amount_jmd is null or amount_jmd >= 0), benefits jsonb not null default '{}'::jsonb,
  purchasing_enabled boolean not null default false, effective_from timestamptz, effective_to timestamptz, unique(plan_slug,version)
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customer_profiles(id), plan_version_id uuid not null references public.subscription_plan_versions(id),
  status text not null default 'ENQUIRY', starts_at timestamptz, ends_at timestamptz, created_at timestamptz not null default now()
);
create table public.terms_versions (
  id uuid primary key default gen_random_uuid(), document_type text not null check (document_type in ('TERMS','PRIVACY')),
  version text not null, body_markdown text not null, status text not null check (status in ('DRAFT','PUBLISHED','RETIRED')),
  effective_at timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(document_type,version)
);
create table public.consent_records (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), terms_version_id uuid not null references public.terms_versions(id),
  consent_text_snapshot text not null, subject_identifier text not null, consented_at timestamptz not null default now(), ip_hash text, user_agent_hash text
);
create table public.business_settings (
  id boolean primary key default true check (id), business_name text not null, phone_display text, whatsapp_e164 text, email text, instagram_url text,
  contact_verified boolean not null default false, retention_workflow_enabled boolean not null default false, settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.service_notices (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null, severity text not null,
  starts_at timestamptz, ends_at timestamptz, active boolean not null default false, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.audit_events (
  id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id), action text not null,
  entity_type text not null, entity_id text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_status_pickup_idx on public.orders(status, pickup_slot_id);
create index history_order_idx on public.order_status_history(order_id, created_at);
create index uploads_order_idx on public.order_uploads(order_id, upload_type);
create index audit_actor_time_idx on public.audit_events(actor_user_id, created_at desc);
create index student_queue_idx on public.student_verifications(status, created_at) where status='PENDING';

create or replace function public.is_staff(required public.app_role default 'ADMIN') returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.staff_roles where user_id=auth.uid() and active and (role=required or role='SUPER_ADMIN'));
$$;
create or replace function public.owns_order(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.orders o join public.customer_profiles c on c.id=o.customer_id where o.id=target and c.user_id=auth.uid());
$$;
create or replace function public.reserve_pickup_slot(target_slot uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
  update public.pickup_slots set reserved_count=reserved_count+1 where id=target_slot and not closed and reserved_count<capacity;
  get diagnostics changed=row_count;
  return changed=1;
end; $$;

alter table public.customer_profiles enable row level security; alter table public.staff_roles enable row level security;
alter table public.addresses enable row level security;
alter table public.student_verifications enable row level security; alter table public.service_catalogue_items enable row level security;
alter table public.price_versions enable row level security; alter table public.availability_rules enable row level security;
alter table public.blackout_dates enable row level security; alter table public.pickup_slots enable row level security;
alter table public.orders enable row level security; alter table public.order_items enable row level security;
alter table public.order_preferences enable row level security; alter table public.order_uploads enable row level security;
alter table public.order_estimates enable row level security; alter table public.price_adjustments enable row level security;
alter table public.customer_price_approvals enable row level security; alter table public.order_status_history enable row level security;
alter table public.invoices enable row level security; alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security; alter table public.subscriptions enable row level security;
alter table public.subscription_plan_versions enable row level security; alter table public.terms_versions enable row level security;
alter table public.consent_records enable row level security; alter table public.business_settings enable row level security;
alter table public.service_notices enable row level security; alter table public.audit_events enable row level security;

create policy customer_self_select on public.customer_profiles for select using (user_id=auth.uid() or public.is_staff());
create policy customer_order_select on public.orders for select using (public.owns_order(id) or public.is_staff());
create policy order_item_select on public.order_items for select using (public.owns_order(order_id) or public.is_staff());
create policy order_preference_select on public.order_preferences for select using (public.owns_order(order_id) or public.is_staff());
create policy order_estimate_select on public.order_estimates for select using (public.owns_order(order_id) or public.is_staff());
create policy order_history_select on public.order_status_history for select using (public.owns_order(order_id) or public.is_staff());
create policy consent_self_select on public.consent_records for select using (public.owns_order(order_id) or public.is_staff());
create policy public_catalogue_read on public.service_catalogue_items for select using (active and public_visible or public.is_staff());
create policy public_price_read on public.price_versions for select using (effective_from<=now() and (effective_to is null or effective_to>now()) or public.is_staff());
create policy public_slot_read on public.pickup_slots for select using (pickup_date>=current_date and not closed or public.is_staff());
create policy public_notice_read on public.service_notices for select using (active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) or public.is_staff());
create policy public_policy_read on public.terms_versions for select using (status='PUBLISHED' or public.is_staff());
create policy staff_all_orders on public.orders for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_customers on public.customer_profiles for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_addresses on public.addresses for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_verifications on public.student_verifications for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_catalogue on public.service_catalogue_items for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_price_versions on public.price_versions for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_availability_rules on public.availability_rules for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_blackouts on public.blackout_dates for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_pickup_slots on public.pickup_slots for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_order_items on public.order_items for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_order_preferences on public.order_preferences for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_operational_uploads on public.order_uploads for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_order_estimates on public.order_estimates for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_adjustments on public.price_adjustments for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_price_approvals on public.customer_price_approvals for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_status_history on public.order_status_history for insert with check (public.is_staff());
create policy staff_all_invoices on public.invoices for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_payments on public.payments for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_proofs on public.payment_proofs for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_subscriptions on public.subscriptions for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_plan_versions on public.subscription_plan_versions for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_terms_versions on public.terms_versions for all using (public.is_staff()) with check (public.is_staff());
create policy staff_all_consent_records on public.consent_records for select using (public.is_staff());
create policy super_admin_settings_write on public.business_settings for all using (public.is_staff('SUPER_ADMIN')) with check (public.is_staff('SUPER_ADMIN'));
create policy staff_all_notices on public.service_notices for all using (public.is_staff()) with check (public.is_staff());
create policy staff_audit_read on public.audit_events for select using (public.is_staff());
create policy staff_audit_append on public.audit_events for insert with check (public.is_staff());
create policy super_admin_settings on public.staff_roles for all using (public.is_staff('SUPER_ADMIN')) with check (public.is_staff('SUPER_ADMIN'));

-- History and audit tables are append-only. Application roles receive no update/delete policy.
-- Private storage policies should mirror owns_order/is_staff after the three private buckets are created.
