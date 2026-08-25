-- =====================================================================
-- 자리배치 기능용 테이블 및 RPC 함수 (v2.16)
--
-- 실행 방법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- 기존 테이블(subjects, students, group_assignments)은 변경하지 않습니다.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- 1) 과목별 자리배치 테이블 (과목당 1행)
create table if not exists public.seating_arrangements (
    subject_id      bigint primary key,
    seats_per_row   integer not null default 6,   -- 한 줄에 앉는 인원 (앞에서 봤을 때 보이는 인원 수)
    names           text[]  not null default '{}', -- 저장된 학생 명단
    seat_names      text[]  not null default '{}', -- 자리배치 결과 (1번 자리부터 순서대로)
    updated_at      timestamptz not null default now()
);

-- subjects 삭제 시 함께 삭제
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'seating_arrangements_subject_id_fkey'
    ) then
        alter table public.seating_arrangements
            add constraint seating_arrangements_subject_id_fkey
            foreign key (subject_id) references public.subjects(id) on delete cascade;
    end if;
end $$;

-- 2) RLS: 조회는 누구나(다른 기기에서 결과 보기), 쓰기는 아래 RPC로만 가능
alter table public.seating_arrangements enable row level security;

drop policy if exists "seating_select_all" on public.seating_arrangements;
create policy "seating_select_all"
    on public.seating_arrangements
    for select
    using (true);

-- 쓰기 정책은 만들지 않음 → anon 키로는 직접 insert/update/delete 불가

-- 3) 학생 명단 + 줄 수 저장
create or replace function public.admin_save_seating_list(
    admin_pw        text,
    p_subject_id    bigint,
    p_seats_per_row integer,
    p_names         text[]
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.verify_admin_password(admin_pw) then
        return false;
    end if;

    if p_seats_per_row < 1 or p_seats_per_row > 20 then
        return false;
    end if;

    insert into public.seating_arrangements (subject_id, seats_per_row, names, updated_at)
    values (p_subject_id, p_seats_per_row, p_names, now())
    on conflict (subject_id) do update
        set seats_per_row = excluded.seats_per_row,
            names         = excluded.names,
            updated_at    = now();

    return true;
end;
$$;

-- 4) 자리배치 실행 결과 저장 (명단/줄 수도 함께 갱신)
create or replace function public.admin_run_seating(
    admin_pw        text,
    p_subject_id    bigint,
    p_seats_per_row integer,
    p_names         text[],
    p_seat_names    text[]
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.verify_admin_password(admin_pw) then
        return false;
    end if;

    if p_seats_per_row < 1 or p_seats_per_row > 20 then
        return false;
    end if;

    insert into public.seating_arrangements (subject_id, seats_per_row, names, seat_names, updated_at)
    values (p_subject_id, p_seats_per_row, p_names, p_seat_names, now())
    on conflict (subject_id) do update
        set seats_per_row = excluded.seats_per_row,
            names         = excluded.names,
            seat_names    = excluded.seat_names,
            updated_at    = now();

    return true;
end;
$$;

-- 5) 자리배치 결과만 초기화 (명단은 유지)
create or replace function public.admin_reset_seating(
    admin_pw     text,
    p_subject_id bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.verify_admin_password(admin_pw) then
        return false;
    end if;

    update public.seating_arrangements
        set seat_names = '{}',
            updated_at = now()
        where subject_id = p_subject_id;

    return true;
end;
$$;

-- 6) 실행 권한 (테이블 직접 쓰기 권한은 부여하지 않음)
grant execute on function public.admin_save_seating_list(text, bigint, integer, text[]) to anon, authenticated;
grant execute on function public.admin_run_seating(text, bigint, integer, text[], text[]) to anon, authenticated;
grant execute on function public.admin_reset_seating(text, bigint) to anon, authenticated;
