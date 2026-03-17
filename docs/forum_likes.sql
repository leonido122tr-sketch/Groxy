-- Лайки тем и комментариев форума.
-- Выполнить в Supabase → SQL Editor после forum_schema.sql.

-- Лайки тем
create table if not exists forum_topic_likes (
  topic_id uuid not null references forum_topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

create index if not exists forum_topic_likes_topic_id on forum_topic_likes(topic_id);
create index if not exists forum_topic_likes_user_id on forum_topic_likes(user_id);

alter table forum_topic_likes enable row level security;

create policy "forum_topic_likes_select" on forum_topic_likes for select using (true);
create policy "forum_topic_likes_insert" on forum_topic_likes for insert with check (auth.uid() = user_id);
create policy "forum_topic_likes_delete" on forum_topic_likes for delete using (auth.uid() = user_id);

-- Лайки комментариев (постов)
create table if not exists forum_post_likes (
  post_id uuid not null references forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists forum_post_likes_post_id on forum_post_likes(post_id);
create index if not exists forum_post_likes_user_id on forum_post_likes(user_id);

alter table forum_post_likes enable row level security;

create policy "forum_post_likes_select" on forum_post_likes for select using (true);
create policy "forum_post_likes_insert" on forum_post_likes for insert with check (auth.uid() = user_id);
create policy "forum_post_likes_delete" on forum_post_likes for delete using (auth.uid() = user_id);
