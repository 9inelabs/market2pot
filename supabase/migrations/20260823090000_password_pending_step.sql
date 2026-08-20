-- Auth overhaul: a password is now created right after phone/OTP
-- verification, before the rest of onboarding (identity/location/bank).
-- Nothing about the password itself is stored here — it lives in Supabase
-- Auth's own store, written via supabase.auth.updateUser({ password })
-- while the user already has a live session from OTP verification. This
-- just gives the existing onboarding_step machine a place to sit while
-- that screen is pending, so the routing gate can resume there if the app
-- closes mid-signup.
alter type onboarding_step
add value 'password_pending' before 'identity_pending';
