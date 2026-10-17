-- Order serialisation (internal) ---------------------------------------------
create or replace function public._order_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_id', o.id, 'reference', o.reference, 'status', o.status, 'total', o.total,
    'has_preorder', o.has_preorder, 'customer_name', o.customer_name, 'customer_phone', o.customer_phone,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name, 'brand_name', i.brand_name, 'variant_label', i.variant_label,
        'unit_price', i.unit_price, 'quantity', i.quantity, 'line_total', i.line_total, 'is_preorder', i.is_preorder)
        order by i.product_name) from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o where o.id = p_id;
$$;
revoke all on function public._order_json(uuid) from public, anon, authenticated;

-- Checkout: validates everything on the server and reserves stock ---------------
create or replace function public.create_order(
  p_idempotency_key uuid, p_customer_name text, p_customer_phone text, p_notes text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid; v_item jsonb; v_pid uuid; v_vid uuid; v_qty int;
  v_p products; v_v product_variants; v_brand text; v_price numeric; v_label text;
  v_total numeric := 0; v_has_pre boolean := false; v_any_tracked boolean := false;
  v_pre boolean; v_tracked boolean; v_avail int; v_seen text[] := '{}'; v_key text;
begin
  if p_idempotency_key is null then raise exception 'INVALID_REQUEST'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'EMPTY_CART'; end if;
  if length(coalesce(p_customer_name,'')) > 100 or length(coalesce(p_notes,'')) > 1000
     or coalesce(p_customer_phone,'') !~ '^[0-9+() -]{0,25}$' then
    raise exception 'INVALID_CONTACT'; end if;

  insert into orders (reference, idempotency_key, customer_name, customer_phone, notes, total)
  values ('DS-' || nextval('order_ref_seq') || '-' || upper(substr(md5(random()::text),1,3)),
          p_idempotency_key, trim(coalesce(p_customer_name,'')), trim(coalesce(p_customer_phone,'')),
          trim(coalesce(p_notes,'')), 0)
  on conflict (idempotency_key) do nothing returning id into v_order_id;

  if v_order_id is null then  -- retry of an earlier checkout: return the original order
    select id into v_order_id from orders where idempotency_key = p_idempotency_key;
    return _order_json(v_order_id);
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_pid := (v_item->>'product_id')::uuid;
      v_vid := nullif(v_item->>'variant_id','')::uuid;
      v_qty := (v_item->>'quantity')::int;
    exception when others then raise exception 'INVALID_ITEM'; end;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'INVALID_QUANTITY'; end if;
    v_key := v_pid::text || '|' || coalesce(v_vid::text,'');
    if v_key = any(v_seen) then raise exception 'DUPLICATE_ITEM'; end if;
    v_seen := v_seen || v_key;

    select * into v_p from products where id = v_pid for update;
    if not found or not v_p.is_published
       or (v_p.brand_id is not null and not exists (select 1 from brands b where b.id = v_p.brand_id and b.is_visible))
       or not exists (select 1 from categories c where c.id = v_p.category_id and c.is_visible) then
      raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if v_p.price_on_request or v_p.price is null then raise exception 'PRICE_ON_REQUEST:%', v_p.name; end if;
    if v_p.status = 'sold_out' then raise exception 'SOLD_OUT:%', v_p.name; end if;

    v_label := ''; v_price := v_p.price; v_v := null;
    if exists (select 1 from product_variants where product_id = v_p.id) then
      if v_vid is null then raise exception 'VARIANT_REQUIRED:%', v_p.name; end if;
      select * into v_v from product_variants where id = v_vid and product_id = v_p.id for update;
      if not found then raise exception 'VARIANT_INVALID:%', v_p.name; end if;
      v_label := v_v.label; v_price := coalesce(v_v.price, v_p.price);
    elsif v_vid is not null then raise exception 'VARIANT_INVALID:%', v_p.name; end if;

    v_pre := v_p.status = 'preorder';
    v_tracked := (not v_pre) and v_p.track_inventory;
    if v_tracked then
      v_avail := case when v_v.id is not null then v_v.stock_quantity - v_v.reserved_quantity
                      else v_p.stock_quantity - v_p.reserved_quantity end;
      if v_avail < v_qty then raise exception 'INSUFFICIENT_STOCK:%:%', v_p.name, greatest(v_avail,0); end if;
      if v_v.id is not null then update product_variants set reserved_quantity = reserved_quantity + v_qty where id = v_v.id;
      else update products set reserved_quantity = reserved_quantity + v_qty where id = v_p.id; end if;
      v_any_tracked := true;
    end if;
    if v_pre then v_has_pre := true; end if;

    select coalesce(name,'') into v_brand from brands where id = v_p.brand_id;
    insert into order_items (order_id, product_id, variant_id, product_name, brand_name, variant_label,
                             unit_price, quantity, line_total, is_preorder, tracked)
    values (v_order_id, v_p.id, v_v.id, v_p.name, coalesce(v_brand,''), v_label, v_price, v_qty, v_price * v_qty, v_pre, v_tracked);
    v_total := v_total + v_price * v_qty;
  end loop;

  update orders set total = v_total, has_preorder = v_has_pre,
         stock_state = case when v_any_tracked then 'reserved' else 'none' end
   where id = v_order_id;
  return _order_json(v_order_id);
end $$;
revoke all on function public.create_order(uuid,text,text,text,jsonb) from public;
grant execute on function public.create_order(uuid,text,text,text,jsonb) to anon, authenticated;

-- Admin: order status transitions with stock policy ---------------------------
-- Policy: pending orders RESERVE stock; confirming/completing deducts it; cancelling releases it.
create or replace function public.admin_set_order_status(p_order_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders; i order_items;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('pending','confirmed','completed','cancelled') then raise exception 'INVALID_STATUS'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status = p_status then return _order_json(o.id); end if;
  if not ((o.status = 'pending' and p_status in ('confirmed','completed','cancelled'))
       or (o.status = 'confirmed' and p_status in ('completed','cancelled'))) then
    raise exception 'INVALID_TRANSITION:% to %', o.status, p_status; end if;

  if p_status in ('confirmed','completed') and o.stock_state = 'reserved' then
    for i in select * from order_items where order_id = o.id and tracked loop
      if i.variant_id is not null then
        update product_variants set stock_quantity = greatest(stock_quantity - i.quantity,0),
               reserved_quantity = greatest(reserved_quantity - i.quantity,0) where id = i.variant_id;
      elsif i.product_id is not null then
        update products set stock_quantity = greatest(stock_quantity - i.quantity,0),
               reserved_quantity = greatest(reserved_quantity - i.quantity,0) where id = i.product_id;
        update products set status = 'sold_out' where id = i.product_id and status = 'available' and track_inventory and stock_quantity = 0;
      end if;
    end loop;
    update orders set stock_state = 'deducted' where id = o.id;
  elsif p_status = 'cancelled' and o.stock_state in ('reserved','deducted') then
    for i in select * from order_items where order_id = o.id and tracked loop
      if o.stock_state = 'reserved' then
        if i.variant_id is not null then update product_variants set reserved_quantity = greatest(reserved_quantity - i.quantity,0) where id = i.variant_id;
        elsif i.product_id is not null then update products set reserved_quantity = greatest(reserved_quantity - i.quantity,0) where id = i.product_id; end if;
      else
        if i.variant_id is not null then update product_variants set stock_quantity = stock_quantity + i.quantity where id = i.variant_id;
        elsif i.product_id is not null then update products set stock_quantity = stock_quantity + i.quantity where id = i.product_id; end if;
      end if;
    end loop;
    update orders set stock_state = 'released' where id = o.id;
  end if;
  update orders set status = p_status where id = o.id;
  return _order_json(o.id);
end $$;
revoke all on function public.admin_set_order_status(uuid,text) from public, anon;
grant execute on function public.admin_set_order_status(uuid,text) to authenticated;

-- Admin: safe deletes ----------------------------------------------------------
create or replace function public._product_media_paths(p_ids uuid[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'path', storage_path)), '[]'::jsonb)
  from product_media where product_id = any(p_ids);
$$;
revoke all on function public._product_media_paths(uuid[]) from public, anon, authenticated;

create or replace function public.admin_delete_product(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  v := _product_media_paths(array[p_id]);
  delete from products where id = p_id;  -- order_items.product_id becomes NULL; snapshots remain
  return v;
end $$;

create or replace function public.admin_delete_brand(p_id uuid, p_mode text, p_reassign uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb; ids uuid[]; n int; logo text;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select array_agg(id) into ids from products where brand_id = p_id;
  n := coalesce(array_length(ids,1),0);
  select logo_path into logo from brands where id = p_id;
  if p_mode = 'reassign' then
    if p_reassign is not null and (p_reassign = p_id or not exists (select 1 from brands where id = p_reassign)) then raise exception 'INVALID_TARGET'; end if;
    update products set brand_id = p_reassign where brand_id = p_id;
    v := '[]'::jsonb;
  elsif p_mode = 'delete_products' then
    v := _product_media_paths(coalesce(ids,'{}'));
    delete from products where brand_id = p_id;
  elsif p_mode = 'none' then
    if n > 0 then raise exception 'HAS_PRODUCTS:%', n; end if;
    v := '[]'::jsonb;
  else raise exception 'INVALID_MODE'; end if;
  delete from brands where id = p_id;
  if logo is not null then v := v || jsonb_build_array(jsonb_build_object('bucket','product-images','path',logo)); end if;
  return v;
end $$;

create or replace function public.admin_delete_category(p_id uuid, p_mode text, p_reassign uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb := '[]'::jsonb; tree uuid[]; pids uuid[]; n int; c categories; imgs jsonb;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into c from categories where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select array_agg(id) into tree from categories where id = p_id or parent_id = p_id;
  select array_agg(id) into pids from products where category_id = any(tree);
  n := coalesce(array_length(pids,1),0);
  if c.parent_id is not null then
    n := 0; -- deleting a subcategory only unlinks it; products keep their main category
  elsif p_mode = 'reassign' then
    if p_reassign is null or p_reassign = any(tree) or not exists (select 1 from categories where id = p_reassign and parent_id is null) then
      raise exception 'INVALID_TARGET'; end if;
    update products set category_id = p_reassign, subcategory_id = null where category_id = any(tree);
  elsif p_mode = 'delete_products' then
    v := _product_media_paths(coalesce(pids,'{}'));
    delete from products where category_id = any(tree);
  elsif p_mode = 'none' then
    if n > 0 then raise exception 'HAS_PRODUCTS:%', n; end if;
  else raise exception 'INVALID_MODE'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('bucket','product-images','path',image_path)),'[]'::jsonb)
    into imgs from categories where id = any(tree) and image_path is not null;
  delete from categories where id = p_id;
  return v || imgs;
end $$;

create or replace function public.admin_duplicate_product(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid := gen_random_uuid(); p products;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into p from products where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  insert into products (id,name,slug,brand_id,category_id,subcategory_id,description,specifications,price,price_on_request,
                        original_price,status,track_inventory,stock_quantity,is_featured,is_published)
  values (new_id, p.name || ' (Copy)', p.slug || '-copy-' || substr(new_id::text,1,6), p.brand_id, p.category_id, p.subcategory_id,
          p.description, p.specifications, p.price, p.price_on_request, p.original_price, p.status, p.track_inventory, 0, false, false);
  insert into product_variants (product_id,label,size,color,price,stock_quantity,position)
    select new_id,label,size,color,price,0,position from product_variants where product_id = p_id;
  return new_id;
end $$;

create or replace function public.admin_set_primary_media(p_media_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select product_id into pid from product_media where id = p_media_id and media_type = 'image';
  if pid is null then raise exception 'NOT_FOUND'; end if;
  update product_media set is_primary = false where product_id = pid and is_primary;
  update product_media set is_primary = true where id = p_media_id;
end $$;

create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t int;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select low_stock_threshold into t from store_settings where id = 1;
  return jsonb_build_object(
    'published_products', (select count(*) from products where is_published),
    'total_products', (select count(*) from products),
    'maisons', (select count(*) from brands),
    'categories', (select count(*) from categories where parent_id is null),
    'pending_orders', (select count(*) from orders where status = 'pending'),
    'confirmed_orders', (select count(*) from orders where status = 'confirmed'),
    'completed_orders', (select count(*) from orders where status = 'completed'),
    'low_stock', (select count(*) from products where track_inventory and status = 'available'
                  and not exists (select 1 from product_variants v where v.product_id = products.id)
                  and stock_quantity - reserved_quantity <= t));
end $$;

do $$ declare f text; begin
  foreach f in array array['admin_delete_product(uuid)','admin_delete_brand(uuid,text,uuid)','admin_delete_category(uuid,text,uuid)',
    'admin_duplicate_product(uuid)','admin_set_primary_media(uuid)','admin_dashboard_stats()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop; end $$;

-- Storefront listing: search + filters + sort + pagination in one query (RLS applies) ----
create or replace function public.storefront_products(
  p_search text default null, p_brand_slugs text[] default null, p_category_slug text default null,
  p_min numeric default null, p_max numeric default null, p_availability text[] default null,
  p_sort text default 'recommended', p_limit int default 24, p_offset int default 0,
  p_featured boolean default null, p_status text default null)
returns table (id uuid, name text, slug text, price numeric, price_on_request boolean, original_price numeric,
  status text, track_inventory boolean, stock_quantity int, reserved_quantity int, is_featured boolean,
  created_at timestamptz, brand_name text, brand_slug text, category_name text, category_slug text,
  image_path text, total_count bigint)
language sql stable security invoker set search_path = public as $$
  select p.id, p.name, p.slug, p.price, p.price_on_request, p.original_price, p.status, p.track_inventory,
         p.stock_quantity, p.reserved_quantity, p.is_featured, p.created_at,
         b.name, b.slug, c.name, c.slug, img.storage_path, count(*) over()
  from products p
  left join brands b on b.id = p.brand_id
  join categories c on c.id = p.category_id
  left join categories sc on sc.id = p.subcategory_id
  left join lateral (select m.storage_path from product_media m where m.product_id = p.id and m.media_type = 'image'
                     order by m.is_primary desc, m.position limit 1) img on true
  where p.is_published
    and (p_featured is null or p.is_featured = p_featured)
    and (p_status is null or p.status = p_status)
    and (p_brand_slugs is null or cardinality(p_brand_slugs) = 0 or b.slug = any(p_brand_slugs))
    and (p_category_slug is null or p_category_slug = '' or c.slug = p_category_slug or sc.slug = p_category_slug)
    and (p_min is null or p.price >= p_min) and (p_max is null or p.price <= p_max)
    and (p_availability is null or cardinality(p_availability) = 0 or p.status = any(p_availability))
    and (p_search is null or trim(p_search) = '' or not exists (
          select 1 from unnest(string_to_array(trim(p_search), ' ')) t
          where t <> '' and concat_ws(' ', p.name, b.name, c.name, sc.name, p.description, p.sku)
                not ilike '%' || replace(replace(replace(t,'\','\\'),'%','\%'),'_','\_') || '%'))
  order by
    case when p_sort = 'recommended' then p.is_featured end desc nulls last,
    case when p_sort = 'price_asc' then p.price end asc nulls last,
    case when p_sort = 'price_desc' then p.price end desc nulls last,
    p.created_at desc, p.id
  limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
$$;
grant execute on function public.storefront_products(text,text[],text,numeric,numeric,text[],text,int,int,boolean,text) to anon, authenticated;

-- Login throttling (keyed by an HMAC of the client IP computed server-side) ---------
create table public.login_attempts (
  id bigint generated always as identity primary key,
  key_hash text not null,
  attempted_at timestamptz not null default now()
);
create index login_attempts_key_idx on public.login_attempts(key_hash, attempted_at desc);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

create or replace function public.login_is_blocked(p_key text) returns boolean
language sql security definer set search_path = public as $$
  select count(*) >= 5 from login_attempts where key_hash = p_key and attempted_at > now() - interval '15 minutes';
$$;
create or replace function public.login_record_failure(p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(p_key) not between 16 and 128 then return; end if;
  delete from login_attempts where attempted_at < now() - interval '1 day';
  insert into login_attempts (key_hash) values (p_key);
end $$;
create or replace function public.login_clear(p_key text) returns void
language sql security definer set search_path = public as $$
  delete from login_attempts where key_hash = p_key;
$$;
revoke all on function public.login_is_blocked(text), public.login_record_failure(text), public.login_clear(text) from public;
grant execute on function public.login_is_blocked(text), public.login_record_failure(text), public.login_clear(text) to anon, authenticated;
