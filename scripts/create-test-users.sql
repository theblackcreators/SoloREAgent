-- ============================================
-- Elite Agent System - Create Test Users Script
-- ============================================
-- Run this FIRST in your Supabase SQL Editor to create auth users
-- Then run setup-test-user.sql to populate game data
--
-- This script creates users directly in auth.users table
-- Works with Supabase service role key
-- ============================================

-- Create test user (agent role)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'testuser@eliteagent.test',
  crypt('TestUser123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Test Agent"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW();

-- Create admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'admin@eliteagent.test',
  crypt('AdminUser123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Admin User"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW();

-- Create identities for the users (required for email auth)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub": "11111111-1111-1111-1111-111111111111", "email": "testuser@eliteagent.test", "email_verified": true}',
  'email',
  'testuser@eliteagent.test',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (provider, provider_id) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = NOW();

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '{"sub": "22222222-2222-2222-2222-222222222222", "email": "admin@eliteagent.test", "email_verified": true}',
  'email',
  'admin@eliteagent.test',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (provider, provider_id) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = NOW();

-- ============================================
-- VERIFICATION: Check that users were created
-- ============================================
-- SELECT id, email, email_confirmed_at FROM auth.users 
-- WHERE email IN ('testuser@eliteagent.test', 'admin@eliteagent.test');

