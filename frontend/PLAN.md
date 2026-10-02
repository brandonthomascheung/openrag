# API Base Path Fix Plan

## Problem Statement

The frontend is deployed at `https://cpd-cpd-instance.apps.emry.cp.fyre.ibm.com/openrag-fe/` with `basePath: "/openrag-fe"` configured in `next.config.ts`. While `/_next` calls were successfully redirected, API calls at `/api/*` are failing with 404 errors because they need to be prefixed with `/openrag-fe/api/*`.

## Root Cause Analysis

1. **Current Setup:**
   - `next.config.ts` has `basePath: "/openrag-fe"`
   - All API calls use relative paths: `fetch("/api/...")`
   - The catch-all proxy at `app/api/[...path]/route.ts` forwards to backend

2. **Why It's Failing:**
   - Next.js `basePath` automatically handles page routes and static assets
   - However, in this CPD deployment scenario, the API proxy route isn't being prefixed correctly
   - The browser makes requests to `/api/*` instead of `/openrag-fe/api/*`

3. **Affected Files:**
   - **62 total fetch calls** to `/api/*` across the codebase:
     - 34 files in `app/api/queries/*.ts`
     - 28 files in `app/api/mutations/*.ts`
     - 19 files with direct fetch calls in `.tsx` components
     - Additional files in `enhancements/connectors/`

## Solution Approach

### Option 1: Centralized API Utility Function (RECOMMENDED)

Create a utility function that automatically prefixes API calls with the basePath when needed.

**Advantages:**
- Single source of truth for API URL construction
- Environment-aware (works in local dev and CPD)
- Easy to maintain and update
- Can add additional logic (error handling, retries, etc.) in one place

**Implementation Steps:**

1. **Create `lib/api-client.ts`:**
   ```typescript
   // Get basePath from Next.js config at runtime
   const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
   
   export function getApiUrl(path: string): string {
     // Ensure path starts with /
     const normalizedPath = path.startsWith('/') ? path : `/${path}`;
     
     // In browser, use basePath; in server-side, use relative path
     if (typeof window !== 'undefined') {
       return `${basePath}${normalizedPath}`;
     }
     return normalizedPath;
   }
   
   export async function apiClient(path: string, init?: RequestInit): Promise<Response> {
     const url = getApiUrl(path);
     return fetch(url, init);
   }
   ```

2. **Update all fetch calls** to use the utility:
   - Replace `fetch("/api/...")` with `apiClient("/api/...")`
   - Or use `fetch(getApiUrl("/api/..."))` for more control

3. **Add environment variable:**
   - Set `NEXT_PUBLIC_BASE_PATH=/openrag-fe` in `.env` for CPD deployments
   - Leave unset or empty for local development

### Option 2: Next.js Rewrite Rule

Add a rewrite rule in `next.config.ts` to handle API routes.

**Disadvantages:**
- May conflict with existing proxy setup
- Less flexible than a utility function
- Harder to debug

### Option 3: Middleware

Use Next.js middleware to rewrite API requests.

**Disadvantages:**
- Adds complexity
- May impact performance
- Harder to maintain

## Recommended Solution: Option 1

**Why:**
- Most maintainable and testable
- Works consistently across all environments
- Provides a single point of control
- Can be extended with additional features (logging, error handling, etc.)

## Implementation Plan

### Phase 1: Create Utility Function
1. Create `frontend/lib/api-client.ts` with `getApiUrl()` and `apiClient()` functions
2. Add `NEXT_PUBLIC_BASE_PATH` environment variable support
3. Add unit tests for the utility functions

### Phase 2: Update API Queries (34 files)
Update all files in `app/api/queries/`:
- `useGetTasksQuery.ts`
- `useGetConnectorsQuery.ts`
- `useGetSettingsQuery.ts`
- ... (31 more files)

Replace:
```typescript
const response = await fetch("/api/tasks/enhanced");
```

With:
```typescript
import { apiClient } from "@/lib/api-client";
const response = await apiClient("/api/tasks/enhanced");
```

### Phase 3: Update API Mutations (28 files)
Update all files in `app/api/mutations/`:
- `useDeleteTaskMutation.ts`
- `useUpdateSettingsMutation.ts`
- `useOnboardingMutation.ts`
- ... (25 more files)

### Phase 4: Update Component Direct Fetches (19+ files)
Update components with direct fetch calls:
- `components/knowledge-dropdown.tsx` (3 calls)
- `contexts/auth-context.tsx` (6 calls)
- `app/auth/callback/page.tsx` (1 call)
- ... (16 more files)

### Phase 5: Update Connector Enhancements
Update connector-specific files:
- `enhancements/connectors/ibm-cos/useIBMCOSDefaultsQuery.ts`
- `enhancements/connectors/azure-blob/useAzureBlobDefaultsQuery.ts`
- ... (additional connector files)

### Phase 6: Testing & Verification
1. Test in local development (without basePath)
2. Test in CPD deployment (with basePath)
3. Verify all API calls work correctly
4. Check for any missed fetch calls

## Files to Modify

### New Files:
- `frontend/lib/api-client.ts` (utility function)
- `frontend/lib/api-client.test.ts` (unit tests)

### Modified Files (62+ total):

**Queries (34 files):**
- `app/api/queries/useGetTasksQuery.ts`
- `app/api/queries/useGetConnectorsQuery.ts`
- `app/api/queries/useGetSettingsQuery.ts`
- `app/api/queries/useGetModelsQuery.ts`
- `app/api/queries/useGetSearchQuery.ts`
- `app/api/queries/useGetNudgesQuery.ts`
- ... (28 more query files)

**Mutations (28 files):**
- `app/api/mutations/useDeleteTaskMutation.ts`
- `app/api/mutations/useUpdateSettingsMutation.ts`
- `app/api/mutations/useOnboardingMutation.ts`
- `app/api/mutations/useSyncConnector.ts`
- `app/api/mutations/useConnectConnectorMutation.ts`
- ... (23 more mutation files)

**Components (19+ files):**
- `components/knowledge-dropdown.tsx`
- `components/dev-role-toggle.tsx`
- `components/user-nav.tsx`
- `contexts/auth-context.tsx`
- `app/auth/callback/page.tsx`
- `app/settings/_components/agent-settings-section.tsx`
- `app/settings/_components/ingest-settings-section.tsx`
- `app/settings/_components/s3-settings-dialog.tsx`
- ... (11 more component files)

**Enhancements:**
- `enhancements/connectors/ibm-cos/useIBMCOSDefaultsQuery.ts`
- `enhancements/connectors/ibm-cos/useIBMCOSConfigureMutation.ts`
- `enhancements/connectors/azure-blob/useAzureBlobDefaultsQuery.ts`
- `enhancements/connectors/azure-blob/useAzureBlobConfigureMutation.ts`
- `lib/upload-utils.ts`

## Environment Configuration

### Local Development (.env)
```bash
# Leave unset or empty for local dev
# NEXT_PUBLIC_BASE_PATH=
```

### CPD Deployment (.env.cpd)
```bash
# Set for CPD deployment
NEXT_PUBLIC_BASE_PATH=/openrag-fe
```

## Testing Strategy

1. **Unit Tests:**
   - Test `getApiUrl()` with and without basePath
   - Test browser vs server-side behavior

2. **Integration Tests:**
   - Test API calls in local dev environment
   - Test API calls in CPD deployment
   - Verify all endpoints return expected responses

3. **Manual Testing:**
   - Check browser network tab for correct URLs
   - Verify no 404 errors on API calls
   - Test all major features (tasks, connectors, settings, etc.)

## Rollback Plan

If issues arise:
1. Revert changes to individual files
2. The utility function is additive, so removing it won't break existing code
3. Can gradually roll out changes file-by-file if needed

## Success Criteria

- [ ] All API calls use the centralized utility function
- [ ] API calls work correctly in local development (no basePath)
- [ ] API calls work correctly in CPD deployment (with basePath)
- [ ] No 404 errors on API endpoints
- [ ] All features function as expected
- [ ] Unit tests pass
- [ ] Integration tests pass

## Next Steps

1. Review and approve this plan
2. Switch to `code` mode to implement the solution
3. Create the utility function
4. Update all fetch calls systematically
5. Test thoroughly in both environments
