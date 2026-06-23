# Frontend Role-Based Access Control

This document describes the frontend user role access changes made to align the UI with backend RBAC. The frontend does not create permissions beyond what the backend provides. It uses the backend role model to avoid showing or firing actions that would be rejected by the API.

## Source Of Truth

Backend authorization remains the source of truth. Frontend checks are only for user experience:

- Hide actions the current user can never perform.
- Avoid API calls that are known to be unauthorized for the current role.
- Keep route guards only where the backend blocks the whole module.
- Do not expose frontend-only roles or permissions.

The backend currently supports these user roles:

- `ADMIN`
- `SALES`
- `ACCOUNTMANAGER`
- `OPERATIONS`
- `FINANCE`
- `VIEWER`

`INTERNAL` is not a valid backend user role and was removed from frontend role checks and role selection.

## Frontend Permission Groups

Frontend role helpers live in `src/utils/auth.ts`.

| Helper / group | Roles | Purpose |
| --- | --- | --- |
| `ALL_AUTHENTICATED_ROLES` | `ADMIN`, `SALES`, `ACCOUNTMANAGER`, `OPERATIONS`, `FINANCE`, `VIEWER` | Authenticated read access where backend allows all logged-in users. |
| `BUSINESS_WRITE_ROLES` | `ADMIN`, `SALES`, `ACCOUNTMANAGER`, `OPERATIONS` | Business/CRM write actions. |
| `OPERATIONS_AND_FINANCE_WRITE_ROLES` | `ADMIN`, `OPERATIONS`, `FINANCE` | Operational/financial write actions. |
| `FINANCE_WRITE_ROLES` | `ADMIN`, `FINANCE` | Finance-only actions such as approval, posting, payment, release, and deletion of finance records. |
| `INTEGRATIONS_ROLES` | `ADMIN`, `FINANCE` | Integration module access and QuickBooks/Mercury/Stripe sync actions. |
| `SETTINGS_ROLES` | `ADMIN` | Settings and user administration. |

## Route-Level Access

Route guards are intentionally limited to modules where the backend blocks the whole module.

| Frontend route area | Allowed roles | Reason |
| --- | --- | --- |
| `/settings/*` | `ADMIN` | Backend settings and user APIs are admin-only. |
| `/integrations/*` | `ADMIN`, `FINANCE` | Backend integration routers require `INTEGRATIONS_ROLES`. |

General CRM, billing, invoice, vendor, agreement, practice, assessment, audit, and monthly reporting pages are not hard-blocked at the route level unless the backend blocks the whole route. Those pages may still hide write/action buttons based on role.

## Sidebar Access

Sidebar visibility follows the same rule:

- `Settings` is visible only to `ADMIN`.
- `Integrations` is visible only to `ADMIN` and `FINANCE`.
- Other modules remain visible to authenticated users if the backend allows read access.

This prevents frontend from hiding a whole module when the backend still allows read access.

## Action-Level Access

The main access changes are action-level. Users can view pages where reads are allowed, but they only see actions their role can perform.

### Create Lead

File: `src/components/leads/CreateLead.tsx`

- The page no longer calls admin-only `getAllUsers()` for non-admin users.
- `getAllUsers()` is called only when `canManageSettings()` returns true.
- This avoids a 403 during page load for non-admin users.

### Billing Runs

Files:

- `src/components/billing/BillingRuns.tsx`
- `src/components/billing/BillingStatusBoard.tsx`

| Action | Allowed roles |
| --- | --- |
| Create billing run | `ADMIN`, `OPERATIONS`, `FINANCE` |
| Calculate billing run | `ADMIN`, `OPERATIONS`, `FINANCE` |
| Approve billing run | `ADMIN`, `FINANCE` |
| Post billing run | `ADMIN`, `FINANCE` |
| Delete billing run | `ADMIN`, `FINANCE` |
| Record payment | `ADMIN`, `FINANCE` |

Restricted buttons are hidden for unauthorized users. Handler-level checks also prevent accidental calls if a button is triggered some other way.

### Vendor Payables

Files:

- `src/components/payables/VendorPayableDashboard.tsx`
- `src/components/payables/PayVendorPayable.tsx`

| Action | Allowed roles |
| --- | --- |
| Create vendor payable | `ADMIN`, `OPERATIONS`, `FINANCE` |
| Release payable | `ADMIN`, `FINANCE` |
| Sync vendor bill to QuickBooks | `ADMIN`, `FINANCE` |
| Sync bill payment to QuickBooks | `ADMIN`, `FINANCE` |
| Mark payable as paid | `ADMIN`, `FINANCE` |
| Delete payable | `ADMIN`, `FINANCE` |
| Process payment from pay page | `ADMIN`, `FINANCE` |

The pay page can still render payable details for authenticated users with read access, but payment submission is blocked unless the user has finance access.

### Invoices

Files:

- `src/components/invoices/AllInvoices.tsx`
- `src/components/invoices/StripeInvoiceFlow.tsx`

| Action | Allowed roles |
| --- | --- |
| Create invoice | `ADMIN`, `OPERATIONS`, `FINANCE` |
| Update invoice | `ADMIN`, `OPERATIONS`, `FINANCE` |
| Delete invoice | `ADMIN`, `OPERATIONS`, `FINANCE` |
| Resend invoice/payment email | `ADMIN`, `FINANCE` |
| Sync invoice to QuickBooks | `ADMIN`, `FINANCE` |
| Sync payment to QuickBooks | `ADMIN`, `FINANCE` |
| Quick-sync invoice payment | `ADMIN`, `FINANCE` |

QuickBooks and resend actions are hidden for unauthorized roles. Mutation handlers also check the role before making API calls.

## Admin-Only Role Management

File: `src/components/settings/Settings.tsx`

Changes:

- Removed `INTERNAL` from both add-user and edit-user role dropdowns.
- Settings pages are admin-only via route guard.
- User management API calls remain available only through `ADMIN` access.

## Route Guard Components

File: `src/components/auth/RoleRoute.tsx`

`RoleRoute` accepts an `allowedRoles` list and redirects unauthorized users to `/dashboard`. It is used only for routes where backend blocks the whole module, such as settings and integrations.

Example:

```tsx
<RoleRoute allowedRoles={[...INTEGRATIONS_ROLES]}>
  <AccountingSyncDashboard />
</RoleRoute>
```

## Implementation Rules For Future Changes

When adding a new page or action:

1. Check the backend route first.
2. If the backend blocks the whole router/module, add a route guard and sidebar restriction.
3. If the backend only blocks write endpoints, keep the page visible but hide or guard the action button.
4. Add a handler-level permission check before calling a restricted API.
5. Do not invent a frontend permission that does not exist in the backend.
6. Keep `src/utils/auth.ts` role groups aligned with backend `ROLE_GROUPS`.

## Verification

After the access updates:

- Edited files were checked with IDE diagnostics.
- `npm run build` completed successfully.
- Full project lint still has existing unrelated warnings/errors in older files; changed files were kept clean.
