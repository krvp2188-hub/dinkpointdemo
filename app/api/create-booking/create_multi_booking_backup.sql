function_backup
"CREATE OR REPLACE FUNCTION public.create_multi_booking(p_booking_reference text, p_customer_name text, p_customer_email text, p_customer_phone text, p_court_ids uuid[], p_booking_date date, p_start_times text[])
 RETURNS SETOF bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_profile_customer_id uuid;
  v_role text;
  v_i integer;
  v_court_id uuid;
  v_start_time text;
  v_start_minutes integer;
  v_end_minutes integer;
  v_open_minutes integer;
  v_close_minutes integer;
  v_hour integer;
  v_amount numeric;
  v_is_open boolean;
  v_open_time time;
  v_close_time time;
  v_booking public.bookings;
BEGIN
  IF p_booking_date IS NULL OR p_booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Please select a valid booking date.';
  END IF;

  IF p_customer_name IS NULL OR trim(p_customer_name) = ''
     OR p_customer_email IS NULL OR trim(p_customer_email) = ''
     OR p_customer_phone IS NULL OR trim(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'Please provide your name, email, and phone number.';
  END IF;

  IF p_court_ids IS NULL OR p_start_times IS NULL
     OR cardinality(p_court_ids) = 0
     OR cardinality(p_court_ids) <> cardinality(p_start_times) THEN
    RAISE EXCEPTION 'Select at least one court and time slot.';
  END IF;

  IF cardinality(p_court_ids) > 120 THEN
    RAISE EXCEPTION 'Too many court-hours selected.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_court_ids) AS c(court_id)
    WHERE c.court_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.courts ct
         WHERE ct.id = c.court_id AND ct.status = 'available'
       )
  ) THEN
    RAISE EXCEPTION 'One or more selected courts are not currently available.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_start_times) AS t(value)
    WHERE t.value IS NULL
       OR t.value NOT IN (
         '06:00','07:00','08:00','09:00','10:00','11:00',
         '12:00','13:00','14:00','15:00','16:00','17:00',
         '18:00','19:00','20:00','21:00','22:00','23:00',
         '00:00','01:00'
       )
  ) THEN
    RAISE EXCEPTION 'One or more selected booking times are invalid.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_court_ids, p_start_times) AS s(court_id, start_time)
    GROUP BY s.court_id, s.start_time
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A court and time slot was selected more than once.';
  END IF;

  SELECT is_open, open_time, close_time
  INTO v_is_open, v_open_time, v_close_time
  FROM public.operating_hours
  WHERE day_of_week = EXTRACT(DOW FROM p_booking_date)::integer;

  IF NOT FOUND OR v_is_open IS DISTINCT FROM TRUE
     OR v_open_time IS NULL OR v_close_time IS NULL THEN
    RAISE EXCEPTION 'The courts are closed on the selected date.';
  END IF;

  v_open_minutes := EXTRACT(HOUR FROM v_open_time)::integer * 60
                     + EXTRACT(MINUTE FROM v_open_time)::integer;
  v_close_minutes := EXTRACT(HOUR FROM v_close_time)::integer * 60
                      + EXTRACT(MINUTE FROM v_close_time)::integer;
  IF v_close_minutes <= v_open_minutes THEN
    v_close_minutes := v_close_minutes + 1440;
  END IF;

  FOR v_i IN 1..cardinality(p_court_ids) LOOP
    v_start_time := p_start_times[v_i];
    v_hour := split_part(v_start_time, ':', 1)::integer;
    v_start_minutes := v_hour * 60;
    IF v_start_minutes < v_open_minutes THEN
      v_start_minutes := v_start_minutes + 1440;
    END IF;
    v_end_minutes := v_start_minutes + 60;

    IF v_start_minutes < v_open_minutes OR v_end_minutes > v_close_minutes THEN
      RAISE EXCEPTION 'Selected time % is outside operating hours for the selected date.', v_start_time;
    END IF;
  END LOOP;

  -- Registered players must use their own linked customer record.
  IF auth.uid() IS NOT NULL THEN
    SELECT role, customer_id
    INTO v_role, v_profile_customer_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role = 'player' THEN
      IF v_profile_customer_id IS NULL THEN
        RAISE EXCEPTION 'Your player account is not linked to a customer record. Please contact staff.';
      END IF;
      v_customer_id := v_profile_customer_id;
    END IF;
  END IF;

  -- Reuse existing customer records without changing saved contact details.
  IF v_customer_id IS NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE lower(email) = lower(trim(p_customer_email))
    LIMIT 1;

    IF v_customer_id IS NULL THEN
      INSERT INTO public.customers (name, email, phone)
      VALUES (trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone))
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  -- Validate every selected court/time pair before inserting any rows.
  IF EXISTS (
    SELECT 1
    FROM unnest(p_court_ids, p_start_times) AS s(court_id, start_time)
    JOIN public.bookings b
      ON b.court_id = s.court_id
     AND b.booking_date = p_booking_date
     AND b.start_time = s.start_time::time
     AND b.status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'One or more selected time slots have already been booked.';
  END IF;

  FOR v_i IN 1..cardinality(p_court_ids) LOOP
    v_court_id := p_court_ids[v_i];
    v_start_time := p_start_times[v_i];
    v_hour := split_part(v_start_time, ':', 1)::integer;

    IF v_hour >= 17 OR v_hour <= 1 THEN
      v_amount := 300;
    ELSIF v_hour >= 12 THEN
      v_amount := 250;
    ELSE
      v_amount := 200;
    END IF;

    v_end_minutes := ((v_hour + 1) % 24) * 60;

    INSERT INTO public.bookings (
      booking_reference, court_id, customer_id,
      customer_name_at_booking, customer_email_at_booking,
      customer_phone_at_booking, booking_date, start_time,
      end_time, amount, status, payment_status
    ) VALUES (
      p_booking_reference, v_court_id, v_customer_id,
      trim(p_customer_name), trim(p_customer_email),
      trim(p_customer_phone), p_booking_date, v_start_time::time,
      ((v_end_minutes / 60)::text || ':' || lpad((v_end_minutes % 60)::text, 2, '0') || ':00')::time,
      v_amount, 'pending', 'unpaid'
    ) RETURNING * INTO v_booking;

    RETURN NEXT v_booking;
  END LOOP;

  RETURN;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'One or more selected time slots have already been booked.';
END;
$function$
"