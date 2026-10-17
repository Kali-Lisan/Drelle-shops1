-- Row Level Security -------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_pages enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- admin_users: an admin may see only their own row; no client writes at all.
create policy admin_users_self on public.admin_users for select to authenticated using (user_id = auth.uid());

-- Settings / pages: public read, admin write.
create policy settings_read on public.store_settings for select to anon, authenticated using (true);
create policy settings_write on public.store_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pages_read on public.store_pages for select to anon, authenticated using (true);
create policy pages_write on public.store_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Brands / categories
create policy brands_read on public.brands for select to anon, authenticated using (is_visible or public.is_admin());
create policy brands_write on public.brands for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_read on public.categories for select to anon, authenticated using (is_visible or public.is_admin());
create policy categories_write on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Products: public sees published items whose brand/category are visible.
create policy products_read on public.products for select to anon, authenticated using (
  public.is_admin() or (
    is_published
    and (brand_id is null or exists (select 1 from public.brands b where b.id = brand_id and b.is_visible))
    and exists (select 1 from public.categories c where c.id = category_id and c.is_visible)
  ));
create policy products_write on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy variants_read on public.product_variants for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id));
create policy variants_write on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy media_read on public.product_media for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id));
create policy media_write on public.product_media for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Orders: admin read only; no direct inserts/deletes. Status changes go through a function.
create policy orders_read on public.orders for select to authenticated using (public.is_admin());
create policy orders_notes on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy order_items_read on public.order_items for select to authenticated using (public.is_admin());

-- Column-level privileges ------------------------------------------------------
revoke all on public.orders, public.order_items, public.admin_users from anon, authenticated;
grant select on public.orders, public.order_items, public.admin_users to authenticated;
grant update (admin_notes) on public.orders to authenticated;

-- reserved_quantity is managed only by order functions
revoke insert, update on public.products from authenticated;
grant insert (id,name,slug,brand_id,category_id,subcategory_id,description,specifications,price,price_on_request,original_price,sku,status,track_inventory,stock_quantity,is_featured,is_published)
  on public.products to authenticated;
grant update (name,slug,brand_id,category_id,subcategory_id,description,specifications,price,price_on_request,original_price,sku,status,track_inventory,stock_quantity,is_featured,is_published)
  on public.products to authenticated;
revoke insert, update on public.product_variants from authenticated;
grant insert (id,product_id,label,size,color,sku,price,stock_quantity,position) on public.product_variants to authenticated;
grant update (label,size,color,sku,price,stock_quantity,position) on public.product_variants to authenticated;

-- Storage ----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('product-images','product-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif']),
 ('product-videos','product-videos', true, 52428800, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admin insert media" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images','product-videos') and public.is_admin());
create policy "admin update media" on storage.objects for update to authenticated
  using (bucket_id in ('product-images','product-videos') and public.is_admin())
  with check (bucket_id in ('product-images','product-videos') and public.is_admin());
create policy "admin delete media" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images','product-videos') and public.is_admin());
create policy "admin read media" on storage.objects for select to authenticated
  using (bucket_id in ('product-images','product-videos') and public.is_admin());
