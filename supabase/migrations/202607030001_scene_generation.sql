create extension if not exists pgcrypto;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_name text not null,
  status text not null default 'designing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null check (kind in ('product','scene_preset','scene_custom','generation_result')),
  bucket text not null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  byte_size bigint check (byte_size is null or byte_size > 0),
  sha256 text,
  created_at timestamptz not null default now()
);

create table public.scene_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_id uuid not null unique references public.assets(id) on delete cascade,
  tags text[] not null default '{}',
  default_parameters jsonb not null default '{}'::jsonb,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose text not null,
  active_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.prompt_templates(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content text not null,
  variable_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_id, version_number)
);

alter table public.prompt_templates
  add constraint prompt_templates_active_version_fk
  foreign key (active_version_id) references public.prompt_template_versions(id) on delete set null;

insert into public.prompt_templates (id, name, purpose)
values ('00000000-0000-4000-8000-000000000101', '默认地毯场景替换', 'carpet_scene_edit')
on conflict (id) do nothing;

insert into public.prompt_template_versions (
  id, template_id, version_number, content, variable_schema
)
values (
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000101',
  1,
  '第一张图是产品地毯，第二张图是目标场景。用产品地毯替换场景原地毯，保持产品图案、颜色、材质、边缘和比例，不生成文字、水印、价格或营销标签。',
  '{}'::jsonb
)
on conflict (template_id, version_number) do nothing;

update public.prompt_templates
set active_version_id = '00000000-0000-4000-8000-000000000102'
where id = '00000000-0000-4000-8000-000000000101';

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_asset_id uuid not null references public.assets(id),
  scene_asset_id uuid not null references public.assets(id),
  prompt_template_version_id uuid references public.prompt_template_versions(id) on delete set null,
  prompt_snapshot text not null,
  structured_parameters jsonb not null default '{}'::jsonb,
  provider text not null default 'jmr' check (provider = 'jmr'),
  model text not null default 'gpt-image-2' check (model = 'gpt-image-2'),
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed')),
  provider_request_id text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  cost_points numeric(12,4) check (cost_points is null or cost_points >= 0),
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (product_asset_id <> scene_asset_id)
);

create table public.generation_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  asset_id uuid not null unique references public.assets(id) on delete cascade,
  candidate_order integer not null default 1 check (candidate_order > 0),
  is_selected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (job_id, candidate_order)
);

alter table public.projects enable row level security;
alter table public.assets enable row level security;
alter table public.scene_presets enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.prompt_template_versions enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generation_results enable row level security;

create index generation_jobs_project_created_idx
  on public.generation_jobs (project_id, created_at desc);
create index scene_presets_active_order_idx
  on public.scene_presets (is_active, sort_order);
create unique index scene_presets_sort_order_unique_idx
  on public.scene_presets (sort_order);
create index assets_project_id_idx
  on public.assets (project_id);
create index prompt_templates_active_version_id_idx
  on public.prompt_templates (active_version_id);
create index generation_jobs_product_asset_id_idx
  on public.generation_jobs (product_asset_id);
create index generation_jobs_scene_asset_id_idx
  on public.generation_jobs (scene_asset_id);
create index generation_jobs_prompt_template_version_id_idx
  on public.generation_jobs (prompt_template_version_id);

insert into storage.buckets (id, name, public)
values ('carpet-assets', 'carpet-assets', false)
on conflict (id) do update set public = excluded.public;
