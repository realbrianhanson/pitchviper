CREATE OR REPLACE FUNCTION public.svc_release_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-only cleanup: delete the named reservation whether it is still
  -- unconsumed or was partially consumed (e.g. after a failed post-consume
  -- step in the invite flow). RLS is not involved (function is service-only).
  DELETE FROM public.seat_reservations
   WHERE id = p_reservation_id;
END $$;
REVOKE ALL ON FUNCTION public.svc_release_reservation(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_release_reservation(uuid) TO service_role;