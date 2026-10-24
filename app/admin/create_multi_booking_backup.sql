CREATE OR REPLACE FUNCTION public.create_multi_booking(p_booking_reference text, p_customer_name text, p_customer_email text, p_customer_phone text, p_court_id uuid, p_booking_date date, p_start_times text[])
 RETURNS SETOF bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_customer_id uuid;
  v_profile_customer_id uuid;
  v_role text;
  v_start_time text;
  v_end_time time;
  v_amount numeric;
  v_hour integer;
  v_existing_count integer;
  v_booking public.bookings;
begin

  -- Make sure the court is currently available
  if not exists (
    select 1
    from public.courts
    where id = p_court_id
      and status = 'available'
  ) then
    raise exception 'This court is not currently available for booking.';
  end if;


  -- Use linked customer for logged-in players
  if auth.uid() is not null then

    select role, customer_id
    into v_role, v_profile_customer_id
    from public.profiles
    where id = auth.uid();

    if v_role = 'player'
       and v_profile_customer_id is not null then

      v_customer_id := v_profile_customer_id;

    end if;

  end if;


  -- Guests: find or create customer by email
  if v_customer_id is null then

    select id
    into v_customer_id
    from public.customers
    where lower(email) = lower(trim(p_customer_email))
    limit 1;

    if v_customer_id is null then

      insert into public.customers (
        name,
        email,
        phone
      )
      values (
        trim(p_customer_name),
        lower(trim(p_customer_email)),
        trim(p_customer_phone)
      )
      returning id into v_customer_id;

    else

      update public.customers
      set
        name = trim(p_customer_name),
        phone = trim(p_customer_phone)
      where id = v_customer_id;

    end if;

  end if;


  -- Make sure at least one hour was selected
  if p_start_times is null
     or array_length(p_start_times, 1) is null then

    raise exception 'Please select at least one booking hour.';

  end if;


  -- Validate selected hours
  foreach v_start_time in array p_start_times loop

    if v_start_time not in (
      '06:00','07:00','08:00','09:00',
      '10:00','11:00','12:00','13:00',
      '14:00','15:00','16:00','17:00',
      '18:00','19:00','20:00','21:00',
      '22:00','23:00','00:00','01:00'
    ) then

      raise exception 'Invalid booking time: %', v_start_time;

    end if;

  end loop;


  -- Prevent duplicate selected hours
  if (
    select count(*)
    from unnest(p_start_times)
  )
  <>
  (
    select count(distinct selected_time)
    from unnest(p_start_times) as selected_time
  ) then

    raise exception 'A booking hour was selected more than once.';

  end if;


  -- Check whether any selected slots are already booked
  select count(*)
  into v_existing_count
  from public.bookings
  where court_id = p_court_id
    and booking_date = p_booking_date
    and start_time::text = any(p_start_times)
    and status in ('pending', 'confirmed');


  if v_existing_count > 0 then

    raise exception 'One or more selected time slots have already been booked.';

  end if;


  -- Create one booking row for each selected hour
  foreach v_start_time in array p_start_times loop

    v_hour := split_part(v_start_time, ':', 1)::integer;


    -- Pricing
    if v_hour >= 17 or v_hour <= 1 then
      v_amount := 290;
    else
      v_amount := 240;
    end if;


    -- End time
    if v_hour = 1 then
      v_end_time := '02:00'::time;
    else
      v_end_time := ((v_hour + 1)::text || ':00')::time;
    end if;


    -- Insert booking
    insert into public.bookings (
      booking_reference,
      court_id,
      customer_id,
      booking_date,
      start_time,
      end_time,
      amount,
      status,
      payment_status
    )
    values (
      p_booking_reference,
      p_court_id,          -- ✅ FIXED
      v_customer_id,
      p_booking_date,
      v_start_time::time,
      v_end_time,
      v_amount,
      'pending',
      'unpaid'
    )
    returning * into v_booking;


    return next v_booking;

  end loop;


  return;


exception

  when unique_violation then
    raise exception 'One or more selected time slots have already been booked.';

end;
$function$
