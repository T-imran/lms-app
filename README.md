# LMS App

This app now uses the central `ums-sso-app` for authentication, following the same SSO contract as `ums-admin-app`.

## Redirect contract

LMS sends users to the SSO login page with:

```text
/login?client_id=lms-app&redirect_uri=<lms callback url>&state=<random state>
```

After a successful sign-in, `ums-sso-app` must redirect back with:

```text
ums_login=success&client_id=lms-app&username=<value>&state=<same state>
```

## Optional environment variables

```text
VITE_UMS_SSO_LOGIN_URL=http://localhost:5173/login
VITE_LMS_CLIENT_ID=lms-app
VITE_LMS_REDIRECT_URI=http://localhost:5175/auth/callback
VITE_LMS_BASE_PATH=/lms
```

## Routes

- `/login` redirects users to the central UMS SSO page
- `/auth/callback` validates the SSO response
- `/dashboard` shows the protected LMS screen
