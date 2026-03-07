-- Forum: flat categories, topics, replies, images.
-- Run in Supabase SQL Editor. Create bucket "forum-images" in Storage (public or with RLS) for photos.

-- Categories (flat list)
create table if not exists forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0
);

-- Topics
create table if not exists forum_topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references forum_categories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  views_count int not null default 0,
  replies_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_topics_category_id on forum_topics(category_id);
create index if not exists forum_topics_created_at on forum_topics(created_at desc);

-- Replies (posts in topic)
create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_posts_topic_id on forum_posts(topic_id);

-- Images
create table if not exists forum_topic_images (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  file_path text not null
);

create table if not exists forum_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  file_path text not null
);

-- Trigger: update topic.replies_count and updated_at
create or replace function forum_on_new_post()
returns trigger as $$
begin
  update forum_topics set updated_at = now(), replies_count = replies_count + 1 where id = new.topic_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists forum_posts_after_insert on forum_posts;
create trigger forum_posts_after_insert after insert on forum_posts for each row execute function forum_on_new_post();

-- RLS
alter table forum_categories enable row level security;
alter table forum_topics enable row level security;
alter table forum_posts enable row level security;
alter table forum_topic_images enable row level security;
alter table forum_post_images enable row level security;

create policy "forum_categories_read" on forum_categories for select using (true);
create policy "forum_topics_read" on forum_topics for select using (true);
create policy "forum_topics_insert" on forum_topics for insert with check (auth.uid() = user_id);
create policy "forum_topics_update" on forum_topics for update using (auth.uid() = user_id);
create policy "forum_topics_delete" on forum_topics for delete using (auth.uid() = user_id);

create policy "forum_posts_read" on forum_posts for select using (true);
create policy "forum_posts_insert" on forum_posts for insert with check (auth.uid() = user_id);
create policy "forum_posts_update" on forum_posts for update using (auth.uid() = user_id);
create policy "forum_posts_delete" on forum_posts for delete using (auth.uid() = user_id);

create policy "forum_topic_images_read" on forum_topic_images for select using (true);
create policy "forum_topic_images_insert" on forum_topic_images for insert with check (
  exists (select 1 from forum_topics t where t.id = topic_id and t.user_id = auth.uid())
);
create policy "forum_topic_images_delete" on forum_topic_images for delete using (
  exists (select 1 from forum_topics t where t.id = topic_id and t.user_id = auth.uid())
);

create policy "forum_post_images_read" on forum_post_images for select using (true);
create policy "forum_post_images_insert" on forum_post_images for insert with check (
  exists (select 1 from forum_posts p where p.id = post_id and p.user_id = auth.uid())
);
create policy "forum_post_images_delete" on forum_post_images for delete using (
  exists (select 1 from forum_posts p where p.id = post_id and p.user_id = auth.uid())
);

-- Increment topic views (any authenticated user)
create or replace function increment_forum_topic_views(tid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update forum_topics set views_count = views_count + 1 where id = tid;
end;
$$;

-- Seed categories
insert into forum_categories (name, slug, sort_order) values
  ('Пристрой 2 стены', 'pristroy-2', 1),
  ('Пристрой 3 стены', 'pristroy-3', 2),
  ('Пристрой 4 стены', 'pristroy-4', 3),
  ('Фундамент', 'fundament', 4),
  ('Стены', 'steny', 5),
  ('Крыша', 'krysha', 6),
  ('Другое', 'drugoe', 7)
on conflict (slug) do nothing;
