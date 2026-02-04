# Supabase Auth Setup Guide

## Step 1: Create Auth User in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Fill in:
   - Email: `john@adogs.world`
   - Password: `password123`
   - ✅ Check **Auto Confirm User**
6. Click **Create user**
7. **Copy the UUID** from the new user row

## Step 2: Create Matching Profile in Database

Go to **SQL Editor** in Supabase and run this command.
Replace `YOUR-USER-UUID` with the UUID you copied:

```sql
INSERT INTO profiles (id, organization_id, email, full_name, role, status)
VALUES (
    'YOUR-USER-UUID',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'john@adogs.world',
    'John Wayne',
    'owner',
    'active'
);
```

## Step 3: Sign In

Go to http://localhost:3000 and sign in with:
- Email: `john@adogs.world`
- Password: `password123`

You should now see the dashboard!
