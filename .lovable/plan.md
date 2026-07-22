Grant admin role to the account with email `mayarapoolerj@gmail.com` so it can access the `/admin` panel.

## Steps

1. Run a migration that inserts an `admin` row into `public.user_roles` for the user whose `auth.users.email` matches `mayarapoolerj@gmail.com`, using `ON CONFLICT (user_id, role) DO NOTHING` so it's idempotent.

## Notes

- Requires that the user has already signed up (account exists in `auth.users`). If not, the insert will affect 0 rows and they'll need to register first.
- After approval, the admin shortcut appears in Profile and `/admin` becomes accessible for that account.