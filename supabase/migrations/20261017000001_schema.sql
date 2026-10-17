-- Drelle Shops: core schema
create extension if not exists pg_trgm;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Admin identity ------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Store settings (singleton) ------------------------------------------------
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Drelle Shops',
  tagline text not null default 'Designer fashion, jewelry and accessories',
  whatsapp_number text not null default '' check (whatsapp_number ~ '^[0-9]{0,20}$'),
  support_email text not null default '',
  announcement_text text not null default '',
  show_announcement boolean not null default false,
  inquiry_template text not null default 'Hello, I am interested in the {brand} {product_name} listed on Drelle Shops. Please confirm availability and provide any additional details.',
  preorder_policy text not null default 'Preorder items are ordered for you once your order is confirmed. Delivery times and any deposit will be agreed with you on WhatsApp.',
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.store_settings
  for each row execute function public.set_updated_at();

create table public.store_pages (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);
create trigger trg_pages_updated before update on public.store_pages
  for each row execute function public.set_updated_at();

-- Catalog -------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  origin text not null default '',
  logo_path text,
  is_visible boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_brands_updated before update on public.brands
  for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  image_path text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories(parent_id);
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand_id uuid references public.brands(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid references public.categories(id) on delete set null,
  description text not null default '',
  specifications text[] not null default '{}',
  price numeric(12,2) check (price is null or price >= 0),
  price_on_request boolean not null default false,
  original_price numeric(12,2) check (original_price is null or original_price >= 0),
  sku text unique,
  status text not null default 'available' check (status in ('available','preorder','sold_out')),
  track_inventory boolean not null default true,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  reserved_quantity int not null default 0 check (reserved_quantity >= 0),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_or_request check (price_on_request or price is not null),
  constraint original_gt_price check (original_price is null or price is null or original_price >= price)
);
create index products_brand_idx on public.products(brand_id);
create index products_category_idx on public.products(category_id);
create index products_sub_idx on public.products(subcategory_id);
create index products_published_created_idx on public.products(is_published, created_at desc);
create index products_price_idx on public.products(price);
create index products_name_trgm on public.products using gin (name gin_trgm_ops);
create index products_desc_trgm on public.products using gin (description gin_trgm_ops);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  size text,
  color text,
  sku text unique,
  price numeric(12,2) check (price is null or price >= 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  reserved_quantity int not null default 0 check (reserved_quantity >= 0),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index variants_product_idx on public.product_variants(product_id, position);
create trigger trg_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  bucket text not null check (bucket in ('product-images','product-videos')),
  storage_path text not null check (storage_path !~ '\.\.' and length(storage_path) > 0),
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  alt_text text not null default '',
  position int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint media_bucket_matches_type check (
    (media_type = 'image' and bucket = 'product-images' and mime_type like 'image/%') or
    (media_type = 'video' and bucket = 'product-videos' and mime_type like 'video/%')),
  unique (bucket, storage_path)
);
create index media_product_idx on public.product_media(product_id, position);
create unique index media_one_primary_idx on public.product_media(product_id) where is_primary;

-- Orders --------------------------------------------------------------------
create sequence public.order_ref_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key uuid not null unique,
  customer_name text not null default '',
  customer_phone text not null default '',
  notes text not null default '',
  admin_notes text not null default '',
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  stock_state text not null default 'none' check (stock_state in ('none','reserved','deducted','released')),
  total numeric(12,2) not null check (total >= 0),
  has_preorder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders(created_at desc);
create index orders_status_idx on public.orders(status, created_at desc);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  brand_name text not null default '',
  variant_label text not null default '',
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  is_preorder boolean not null default false,
  tracked boolean not null default false
);
create index order_items_order_idx on public.order_items(order_id);
