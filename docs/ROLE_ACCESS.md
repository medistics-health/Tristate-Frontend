# Frontend Role-Based Access Control

This document describes the frontend user role access changes made to align the UI with backend RBAC. The frontend does not create permissions beyond what the backend provides. It uses the backend role model to avoid showing or firing actions that would be rejected by the API.

## Source Of Truth

Backend authorization remains the source of truth. Frontend checks are only for user experience:

- Hide actions the current user can never perform.
- Avoid API calls that are known to be unauthorized for the current role.
- Allow `VIEWER` to access read pages because the backend now permits `VIEWER` on protected `GET` requests.
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
| `INTEGRATIONS_ROLES` | `ADMIN`, `FINANCE` | Integration mutation actions such as connect, sync, retry, reconcile, and disconnect. |
| `SETTINGS_ROLES` | `ADMIN` | Settings and user administration mutation actions. |

## Route-Level Access

Route guards are applied at the module level using `MODULE_ACCESS` from `src/utils/auth.ts`.

| Frontend route area | Allowed roles | Reason |
| --- | --- | --- |
| Dashboard and Client Portal | `ADMIN`, `SALES`, `ACCOUNTMANAGER`, `OPERATIONS`, `FINANCE`, `VIEWER` | Base authenticated access. |
| CRM modules | `ADMIN`, `SALES`, `ACCOUNTMANAGER`, `OPERATIONS` | Business workflow access. |
| Billing, invoices, purchase orders, and vendors | `ADMIN`, `OPERATIONS`, `FINANCE` | Operational and financial workflow access. |
| `/settings/*` | All authenticated roles | Backend now permits `VIEWER` on protected `GET` requests. Non-GET settings/user actions remain admin-only. |
| `/integrations/*` | All authenticated roles | Backend now permits `VIEWER` on protected `GET` requests. Connect, sync, retry, reconcile, and disconnect actions remain finance/admin-only. |
| Admin agreement queues | `ADMIN` | Frontend keeps admin workflow queues restricted to admin users. |

`VIEWER` has read page access but must not see or execute mutation actions.

## Sidebar Access

Sidebar visibility follows the same rule:

- All authenticated roles, including `VIEWER`, can see read-access modules.
- Mutation buttons remain hidden or blocked based on the action-level role helpers.
- Settings mutation controls are visible only to `ADMIN`.
- Integration mutation controls are visible only to `ADMIN` and `FINANCE`.

This keeps page navigation aligned with the frontend module access groups.

## Page Access By Role

Page access is based on the frontend module groups in `src/utils/auth.ts`, which are kept aligned with backend role groups. A user may have access to a page but still be blocked from specific actions on that page.

| Role | Pages they can access |
| --- | --- |
| `ADMIN` | All authenticated pages, including Dashboard, Client Portal, CRM modules, Billing, Invoices, Vendors, Agreements, Onboarding Review, Monthly Reports, Assessments, Audits, Integrations, and Settings. |
| `FINANCE` | All authenticated read pages. Finance/admin-only actions are available where applicable. |
| `OPERATIONS` | All authenticated read pages. Operations/finance write actions are available where applicable, but finance-only and integration write actions are hidden/blocked. |
| `SALES` | All authenticated read pages. Business write actions are available where applicable, but finance, operations/finance, settings, and integration write actions are hidden/blocked. |
| `ACCOUNTMANAGER` | All authenticated read pages. Business write actions are available where applicable, but finance, operations/finance, settings, and integration write actions are hidden/blocked. |
| `VIEWER` | All authenticated read pages. All non-GET actions are hidden or blocked. |

Notes:

- `/settings/*` and `/integrations/*` are readable by `VIEWER` after the backend GET-access change.
- Create-only and submit-only pages remain restricted to the backend write roles that can call their mutation endpoints.
- Other pages may still hide buttons or block action handlers when the user role can access the page but cannot call the related backend mutation.
- Read access and write/action access are different. A user may see a page but not see create, update, delete, approve, sync, release, post, or payment actions.

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
- Settings pages are readable by all authenticated roles after the backend GET-access change.
- User management mutation actions remain available only through `ADMIN` access.
- Settings inputs can load for `VIEWER`, but save, add, edit, and delete actions are hidden or blocked.

## Route Guard Components

File: `src/components/auth/RoleRoute.tsx`

`RoleRoute` accepts an `allowedRoles` list and redirects unauthorized users to `/dashboard`. It is used for routes where the frontend still needs role-based page access, such as create-only pages, admin workflow queues, or read modules that should follow backend GET access.

Example:

```tsx
<RoleRoute allowedRoles={[...MODULE_ACCESS.INTEGRATIONS]}>
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
