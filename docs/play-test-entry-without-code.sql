-- The all-zero UUID identifies direct entry while the closed test is enabled.
-- Existing invitation URLs keep working. The actual invitation stays private.
create or replace function public.play_test_invitation_open(p_invite uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select from fasttrip_internal.play_test_settings
    where singleton and enabled
      and (p_invite = '00000000-0000-0000-0000-000000000000'::uuid or invitation = p_invite)
  )
$$;

create or replace function public.reserve_play_test_invited_enrollment(
  p_key uuid, p_role public.app_role, p_name text, p_phone text, p_invite uuid
)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from fasttrip_internal.play_test_settings
  where singleton and enabled
    and (p_invite = '00000000-0000-0000-0000-000000000000'::uuid or invitation = p_invite)
  for update;
  if not found then return false; end if;
  return public.reserve_play_test_enrollment(p_key, p_role, p_name, p_phone);
end;
$$;
