#!/bin/bash
# Run this after pulling the updated code to apply the new DB migration
# (adds `role` field to User table)

echo "Running Prisma migration for admin role support..."
npx prisma migrate dev --name add_user_role
echo ""
echo "Done! Now add ADMIN_EMAILS to your .env file:"
echo "  ADMIN_EMAILS=\"your-admin@email.com\""
echo "Then restart the server. Admins will see the Admin Panel in the sidebar after next login."
