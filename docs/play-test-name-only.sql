begin;

alter table fasttrip_internal.play_test_enrollments alter column phone drop not null;

create or replace function public.reserve_play_test_enrollment(
  p_key uuid, p_role public.app_role, p_name text, p_phone text
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare existing fasttrip_internal.play_test_enrollments%rowtype;
begin
  if not (select enabled from fasttrip_internal.play_test_settings where singleton for update) then
    return false;
  end if;
  select * into existing from fasttrip_internal.play_test_enrollments where enrollment_key = p_key;
  if found then
    return existing.role = p_role and (p_phone is null or existing.phone is not distinct from p_phone) and existing.full_name = p_name;
  end if;
  if (select count(*) from fasttrip_internal.play_test_enrollments where role = p_role) >= 100 then
    return false;
  end if;
  insert into fasttrip_internal.play_test_enrollments(enrollment_key, role, full_name, phone)
  values (p_key, p_role, p_name, p_phone) on conflict do nothing;
  return found;
end;
$$;

commit;
