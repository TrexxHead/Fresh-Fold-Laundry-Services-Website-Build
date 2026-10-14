-- FreshFold production workflow structures.
-- Apply to disposable staging first and run the documented RLS role matrix.
-- No function in this migration publishes owner-blocked policies or activates a provider.

alter table public.orders
  add column if not exists guest_token_expires_at timestamptz,
  add column if not exists actual_weight_lb numeric(8,2) check (actual_weight_lb is null or actual_weight_lb > 0),
  add column if not exists confirmed_at timestamptz,
  add column if not exists return_window_start timestamptz,
  add column if not exists return_window_end timestamptz,
  add column if not exists completed_at timestamptz;

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  event_type text not null,
  channel text not null check (channel in ('EMAIL','WHATSAPP','IN_APP')),
  recipient_ref text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SENT','FAILED','CANCELLED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now()
);

create table public.order_communications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  direction text not null check (direction in ('OUTBOUND','INBOUND','SYSTEM')),
  channel text not null check (channel in ('EMAIL','WHATSAPP','PHONE','IN_APP')),
  event_type text not null,
  customer_visible_summary text not null,
  provider_reference text,
  delivery_status text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.order_change_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  request_type text not null check (request_type in ('RESCHEDULE','CANCELLATION','PRICE_QUESTION','GENERAL_SUPPORT')),
  requested_value jsonb not null default '{}'::jsonb,
  customer_note text check (char_length(customer_note) <= 1000),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','DECLINED','WITHDRAWN')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

create table public.customer_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  issue_type text not null,
  customer_summary text not null check (char_length(customer_summary) between 10 and 1500),
  status text not null default 'OPEN' check (status in ('OPEN','INVESTIGATING','AWAITING_CUSTOMER','RESOLVED','CLOSED')),
  resolution_type text,
  assigned_to uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.operation_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  event_type text not null check (event_type in ('BAG_COUNT','WEIGHT','RECEIVED','SORTED','WASHING','DRYING','FOLDING','IRONING','QUALITY_CHECK','PACKED','READY','EXCEPTION','REWASH','HANDOFF')),
  station text,
  bag_count integer check (bag_count is null or bag_count >= 0),
  weight_lb numeric(8,2) check (weight_lb is null or weight_lb > 0),
  package_count integer check (package_count is null or package_count >= 0),
  customer_visible_note text,
  internal_note text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.dispatch_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  run_type text not null check (run_type in ('PICKUP','RETURN','MIXED')),
  status text not null default 'PLANNING' check (status in ('PLANNING','READY','IN_PROGRESS','COMPLETED','CANCELLED')),
  assigned_to uuid references auth.users(id),
  route_label text not null,
  starts_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.dispatch_stops (
  id uuid primary key default gen_random_uuid(),
  dispatch_run_id uuid not null references public.dispatch_runs(id) on delete cascade,
  order_id uuid not null references public.orders(id),
  stop_order integer not null check (stop_order > 0),
  stop_type text not null check (stop_type in ('PICKUP','RETURN')),
  status text not null default 'PLANNED' check (status in ('PLANNED','EN_ROUTE','ARRIVED','COMPLETED','FAILED','SKIPPED')),
  arrived_at timestamptz,
  completed_at timestamptz,
  handoff_method text,
  failure_reason text,
  unique(dispatch_run_id, stop_order)
);

create table public.commercial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  account_type text not null,
  status text not null default 'ENQUIRY' check (status in ('ENQUIRY','REVIEW','ACTIVE','ON_HOLD','CLOSED')),
  primary_customer_id uuid references public.customer_profiles(id),
  billing_reference text,
  approved_terms_version text,
  created_at timestamptz not null default now()
);

create table public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create index notification_outbox_pending_idx on public.notification_outbox(status, available_at) where status in ('PENDING','FAILED');
create index communications_order_time_idx on public.order_communications(order_id, created_at desc);
create index change_requests_queue_idx on public.order_change_requests(status, created_at);
create index issues_queue_idx on public.customer_issues(status, created_at);
create index operation_events_order_time_idx on public.operation_events(order_id, created_at);
create index dispatch_runs_date_idx on public.dispatch_runs(run_date, status);
create index dispatch_stops_run_idx on public.dispatch_stops(dispatch_run_id, stop_order);
create index orders_guest_expiry_idx on public.orders(guest_token_hash, guest_token_expires_at) where guest_token_hash is not null;

alter table public.notification_outbox enable row level security;
alter table public.order_communications enable row level security;
alter table public.order_change_requests enable row level security;
alter table public.customer_issues enable row level security;
alter table public.operation_events enable row level security;
alter table public.dispatch_runs enable row level security;
alter table public.dispatch_stops enable row level security;
alter table public.commercial_accounts enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy staff_notifications on public.notification_outbox for all using (public.is_staff()) with check (public.is_staff());
create policy staff_communications on public.order_communications for all using (public.is_staff()) with check (public.is_staff());
create policy customer_communications_read on public.order_communications for select using (public.owns_order(order_id));
create policy staff_change_requests on public.order_change_requests for all using (public.is_staff()) with check (public.is_staff());
create policy customer_change_requests_read on public.order_change_requests for select using (public.owns_order(order_id));
create policy customer_change_requests_insert on public.order_change_requests for insert with check (public.owns_order(order_id));
create policy staff_issues on public.customer_issues for all using (public.is_staff()) with check (public.is_staff());
create policy customer_issues_read on public.customer_issues for select using (public.owns_order(order_id));
create policy customer_issues_insert on public.customer_issues for insert with check (public.owns_order(order_id));
create policy staff_operation_events on public.operation_events for all using (public.is_staff()) with check (public.is_staff());
create policy customer_operation_events_read on public.operation_events for select using (public.owns_order(order_id) and customer_visible_note is not null);
create policy staff_dispatch_runs on public.dispatch_runs for all using (public.is_staff()) with check (public.is_staff());
create policy staff_dispatch_stops on public.dispatch_stops for all using (public.is_staff()) with check (public.is_staff());
create policy staff_commercial_accounts on public.commercial_accounts for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;
  insert into public.rate_limit_buckets(bucket_key, window_started_at, request_count, updated_at)
  values (p_bucket_key, v_now, 1, v_now)
  on conflict (bucket_key) do update set
    window_started_at = case when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now else public.rate_limit_buckets.window_started_at end,
    request_count = case when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1 else public.rate_limit_buckets.request_count + 1 end,
    updated_at = v_now
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;

create or replace function public.create_booking_request(
  p_payload jsonb,
  p_idempotency_key uuid,
  p_reference text,
  p_guest_token_hash text,
  p_guest_token_expires_at timestamptz,
  p_pickup_starts_at time,
  p_estimate jsonb,
  p_initial_status public.order_status
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_existing public.orders%rowtype;
  v_customer_id uuid;
  v_address_id uuid;
  v_slot_id uuid;
  v_order_id uuid;
  v_terms_id uuid;
  v_privacy_id uuid;
  v_line jsonb;
  v_preferences text[];
begin
  select * into v_existing from public.orders where idempotency_key=p_idempotency_key;
  if found then
    return jsonb_build_object('order_id',v_existing.id);
  end if;

  select id into v_terms_id from public.terms_versions where document_type='TERMS' and status='PUBLISHED' and effective_at<=now() order by effective_at desc limit 1;
  select id into v_privacy_id from public.terms_versions where document_type='PRIVACY' and status='PUBLISHED' and effective_at<=now() order by effective_at desc limit 1;
  if v_terms_id is null or v_privacy_id is null then
    raise exception 'PUBLISHED_TERMS_REQUIRED';
  end if;

  select id into v_slot_id from public.pickup_slots
    where pickup_date=(p_payload->>'pickupDate')::date and starts_at=p_pickup_starts_at and not closed
    for update;
  if v_slot_id is null or not public.reserve_pickup_slot(v_slot_id) then
    raise exception 'PICKUP_SLOT_UNAVAILABLE';
  end if;

  insert into public.customer_profiles(full_name,phone_e164,email)
  values (p_payload->>'fullName',p_payload->>'phone',p_payload->>'email') returning id into v_customer_id;

  insert into public.addresses(customer_id,address_type,campus_or_building,address_line,community,landmark,handoff_notes)
  values (v_customer_id,p_payload->>'addressType',nullif(p_payload->>'campusOrBuilding',''),p_payload->>'addressLine',p_payload->>'community',nullif(p_payload->>'landmark',''),nullif(p_payload->>'handoffNotes',''))
  returning id into v_address_id;

  insert into public.orders(reference,customer_id,guest_token_hash,guest_token_expires_at,address_id,pickup_slot_id,customer_category,service_type,status,payment_preference,idempotency_key,referral_source)
  values (p_reference,v_customer_id,p_guest_token_hash,p_guest_token_expires_at,v_address_id,v_slot_id,p_payload->>'customerCategory',p_payload->>'serviceType',p_initial_status,p_payload->>'paymentPreference',p_idempotency_key,nullif(p_payload->>'referralSource',''))
  returning id into v_order_id;

  if p_payload->>'customerCategory'='STUDENT' then
    insert into public.student_verifications(customer_id,institution,status)
    values (v_customer_id,p_payload->>'institution','PENDING');
  end if;

  for v_line in select * from jsonb_array_elements(p_estimate->'lines') loop
    insert into public.order_items(order_id,catalogue_item_id,item_name_snapshot,pricing_type_snapshot,quantity,unit_amount_jmd,requires_quote)
    values (
      v_order_id,
      (select id from public.service_catalogue_items where slug=v_line->>'id' limit 1),
      v_line->>'label',
      (v_line->>'pricingType')::public.pricing_type,
      greatest((v_line->>'quantity')::integer,1),
      case when v_line->>'amountJmd' is null then null else ((v_line->>'amountJmd')::integer / greatest((v_line->>'quantity')::integer,1)) end,
      coalesce((v_line->>'amountJmd') is null,false)
    );
  end loop;

  select coalesce(array_agg(value),array[]::text[]) into v_preferences from jsonb_array_elements_text(coalesce(p_payload->'preferences','[]'::jsonb));
  insert into public.order_preferences(order_id,preferences,special_instructions,stain_treatment_requested)
  values (v_order_id,v_preferences,nullif(p_payload->>'specialInstructions',''),'Stain-treatment request'=any(v_preferences));

  insert into public.order_estimates(order_id,version,known_total_jmd,provisional,line_snapshot)
  values (v_order_id,(p_estimate->>'version')::integer,(p_estimate->>'knownTotalJmd')::integer,(p_estimate->>'provisional')::boolean,p_estimate->'lines');

  insert into public.order_status_history(order_id,status,actor_label,customer_visible_note)
  values (v_order_id,p_initial_status,'Customer','Pickup request received and awaiting staff confirmation.');

  insert into public.consent_records(order_id,terms_version_id,consent_text_snapshot,subject_identifier)
  select v_order_id,id,body_markdown,p_reference from public.terms_versions where id in (v_terms_id,v_privacy_id);

  insert into public.notification_outbox(order_id,event_type,channel,recipient_ref,template_key,payload)
  values (v_order_id,'REQUEST_RECEIVED','EMAIL',p_payload->>'email','request-received',jsonb_build_object('reference',p_reference));

  insert into public.audit_events(action,entity_type,entity_id,metadata)
  values ('BOOKING_REQUESTED','ORDER',v_order_id::text,jsonb_build_object('reference',p_reference,'estimateVersion',p_estimate->>'version'));

  return jsonb_build_object('order_id',v_order_id);
end;
$$;

create or replace function public.get_guest_order(
  p_reference text,
  p_guest_token_hash text
) returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',o.id,
    'reference',o.reference,
    'customerName',c.full_name,
    'location',coalesce(a.campus_or_building,a.community),
    'pickupDate',s.pickup_date,
    'pickupSlot',to_char(s.starts_at,'FMHH12:MI a.m.') || '–' || to_char(s.ends_at,'FMHH12:MI a.m.'),
    'status',o.status,
    'paymentStatus',o.payment_status,
    'studentStatus',coalesce((select sv.status from public.student_verifications sv where sv.customer_id=c.id order by sv.created_at desc limit 1),'NOT_APPLICABLE'),
    'estimate',coalesce((select jsonb_build_object('version',e.version,'currency','JMD','knownTotalJmd',e.known_total_jmd,'provisional',e.provisional,'hasQuoteRequired',exists(select 1 from jsonb_array_elements(e.line_snapshot) line where line->>'amountJmd' is null),'lines',e.line_snapshot,'createdAt',e.created_at) from public.order_estimates e where e.order_id=o.id order by e.version desc limit 1),'{}'::jsonb),
    'serviceType',o.service_type,
    'carePreferences',coalesce((select to_jsonb(op.preferences) from public.order_preferences op where op.order_id=o.id),'[]'::jsonb),
    'actualWeightLb',o.actual_weight_lb,
    'returnWindow',case when o.return_window_start is null then null else to_char(o.return_window_start,'Dy, DD Mon · HH12:MI a.m.') end,
    'priceRevision',(select case when count(*)<2 then null else jsonb_build_object(
      'originalTotalJmd',(array_agg(e.known_total_jmd order by e.version))[1],
      'revisedTotalJmd',(array_agg(e.known_total_jmd order by e.version desc))[1],
      'reason',coalesce((select pa.reason from public.price_adjustments pa where pa.order_id=o.id and pa.voided_at is null order by pa.created_at desc limit 1),'FreshFold recorded an inspected-price revision for this order.'),
      'status',coalesce((select cpa.decision from public.customer_price_approvals cpa where cpa.order_id=o.id order by cpa.decision_at desc limit 1),'PENDING')
    ) end from public.order_estimates e where e.order_id=o.id),
    'invoice',(select jsonb_build_object('invoiceNumber',i.invoice_number,'amountJmd',i.amount_jmd,'status',i.status,'issuedAt',i.issued_at) from public.invoices i where i.order_id=o.id order by i.created_at desc limit 1),
    'history',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'status',h.status,'actor',case when h.actor_label='Customer' then 'Customer' else 'FreshFold' end,'occurredAt',h.created_at,'note',h.customer_visible_note) order by h.created_at) from public.order_status_history h where h.order_id=o.id),'[]'::jsonb),
    'communications',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'channel',m.channel,'direction',m.direction,'summary',m.customer_visible_summary,'deliveryStatus',coalesce(m.delivery_status,'QUEUED'),'occurredAt',m.created_at) order by m.created_at) from public.order_communications m where m.order_id=o.id),'[]'::jsonb),
    'changeRequests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'type',r.request_type,'status',r.status,'note',r.customer_note,'requestedDate',r.requested_value->>'pickupDate','requestedSlot',r.requested_value->>'pickupSlot','createdAt',r.created_at) order by r.created_at) from public.order_change_requests r where r.order_id=o.id),'[]'::jsonb),
    'operationEvents',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'type',x.event_type,'label',x.customer_visible_note,'station',x.station,'customerVisible',true,'occurredAt',x.created_at) order by x.created_at) from public.operation_events x where x.order_id=o.id and x.customer_visible_note is not null),'[]'::jsonb)
  )
  from public.orders o
  join public.customer_profiles c on c.id=o.customer_id
  join public.addresses a on a.id=o.address_id
  join public.pickup_slots s on s.id=o.pickup_slot_id
  where lower(o.reference)=lower(p_reference)
    and o.guest_token_hash=p_guest_token_hash
    and o.guest_token_expires_at>now()
  limit 1;
$$;

create or replace function public.create_guest_order_action(
  p_reference text,
  p_guest_token_hash text,
  p_action text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.orders%rowtype;
  v_estimate public.order_estimates%rowtype;
  v_request_id uuid;
  v_issue_id uuid;
  v_decision text;
begin
  select * into v_order
  from public.orders
  where lower(reference)=lower(p_reference)
    and guest_token_hash=p_guest_token_hash
    and guest_token_expires_at>now()
  for update;

  if not found then
    raise exception 'INVALID_OR_EXPIRED_GUEST_ACCESS';
  end if;

  if p_action='PRICE_DECISION' then
    v_decision := p_payload->>'decision';
    if v_decision not in ('APPROVED','REJECTED') or v_order.status<>'PRICE_APPROVAL_REQUIRED' then
      raise exception 'PRICE_DECISION_NOT_AVAILABLE';
    end if;
    select * into v_estimate from public.order_estimates where order_id=v_order.id order by version desc limit 1;
    if v_estimate.id is null then raise exception 'ESTIMATE_REQUIRED'; end if;
    if exists(select 1 from public.customer_price_approvals where order_id=v_order.id and estimate_id=v_estimate.id) then
      raise exception 'PRICE_DECISION_ALREADY_RECORDED';
    end if;
    insert into public.customer_price_approvals(order_id,estimate_id,decision,customer_identifier,note)
    values (v_order.id,v_estimate.id,v_decision,'secure guest link','Recorded through the private order hub.');
    update public.orders set status=case when v_decision='APPROVED' then 'PRICE_APPROVED'::public.order_status else 'ON_HOLD'::public.order_status end where id=v_order.id;
    insert into public.order_status_history(order_id,status,actor_label,customer_visible_note)
    values (v_order.id,case when v_decision='APPROVED' then 'PRICE_APPROVED'::public.order_status else 'ON_HOLD'::public.order_status end,'Customer',case when v_decision='APPROVED' then 'Revised estimate approved through the private order hub.' else 'Revised estimate not approved; FreshFold will follow up.' end);
    return jsonb_build_object('action','PRICE_DECISION','decision',v_decision);
  elsif p_action='RESCHEDULE' then
    if coalesce(p_payload->>'pickupDate','')='' or coalesce(p_payload->>'pickupSlot','')='' then
      raise exception 'RESCHEDULE_DETAILS_REQUIRED';
    end if;
    insert into public.order_change_requests(order_id,request_type,requested_value,customer_note)
    values (v_order.id,'RESCHEDULE',jsonb_build_object('pickupDate',p_payload->>'pickupDate','pickupSlot',p_payload->>'pickupSlot'),nullif(p_payload->>'note',''))
    returning id into v_request_id;
    update public.orders set status='RESCHEDULE_REQUESTED' where id=v_order.id;
    insert into public.order_status_history(order_id,status,actor_label,customer_visible_note)
    values (v_order.id,'RESCHEDULE_REQUESTED','Customer','A different pickup window was requested. The existing window remains until staff confirms a change.');
    return jsonb_build_object('action','RESCHEDULE','requestId',v_request_id);
  elsif p_action='SUPPORT' then
    if char_length(coalesce(p_payload->>'note','')) not between 10 and 1000 then
      raise exception 'SUPPORT_DETAILS_REQUIRED';
    end if;
    insert into public.customer_issues(order_id,issue_type,customer_summary)
    values (v_order.id,'ORDER_SUPPORT',p_payload->>'note') returning id into v_issue_id;
    return jsonb_build_object('action','SUPPORT','issueId',v_issue_id);
  else
    raise exception 'UNSUPPORTED_GUEST_ACTION';
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(text,integer,integer) from public, anon, authenticated;
revoke all on function public.create_booking_request(jsonb,uuid,text,text,timestamptz,time,jsonb,public.order_status) from public, anon, authenticated;
revoke all on function public.get_guest_order(text,text) from public, anon, authenticated;
revoke all on function public.create_guest_order_action(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant execute on function public.create_booking_request(jsonb,uuid,text,text,timestamptz,time,jsonb,public.order_status) to service_role;
grant execute on function public.get_guest_order(text,text) to service_role;
grant execute on function public.create_guest_order_action(text,text,text,jsonb) to service_role;
