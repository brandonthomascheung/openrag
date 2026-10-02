# Kubernetes Deployment Guide - Environment-Based API Base Path

This guide explains how to configure the OpenRAG frontend with a dynamic API base path in Kubernetes deployments (e.g., CPD) using environment variables.

## Overview

The frontend supports environment-based configuration of the API base path:
- ✅ **Default**: `/openrag-fe` (for CPD deployments)
- ✅ **Configurable**: Set `NEXT_PUBLIC_BASE_PATH` in pod environment to override
- ✅ **Disable**: Set `NEXT_PUBLIC_BASE_PATH=""` for local development
- ✅ **No runtime script**: Reads directly from `process.env` (Next.js built-in)

## How It Works

1. **Environment Variable**: `NEXT_PUBLIC_BASE_PATH` is read by Next.js at build time and runtime
2. **Default Value**: If not set, defaults to `/openrag-fe` (see `lib/api-client.ts`)
3. **API Client Only**: Only API calls (`/api/*`) get prefixed, not static assets (`/_next/*`)
4. **No Build-Time basePath**: Next.js config has no `basePath`, so builds work cleanly in CI

## Architecture

```
Local Development (NEXT_PUBLIC_BASE_PATH=""):
  /_next/static/*     → Next.js static assets
  /api/tasks          → API calls (no prefix)

CPD Deployment (default or NEXT_PUBLIC_BASE_PATH=/openrag-fe):
  /_next/static/*     → Next.js static assets (no prefix)
  /openrag-fe/api/tasks → API calls (prefixed)
```

## Kubernetes Configuration

### Option 1: Use Default (Recommended for CPD)

Don't set `NEXT_PUBLIC_BASE_PATH` - it defaults to `/openrag-fe`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openrag-frontend
  namespace: openrag
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: langflowai/openrag-frontend:latest
        # No NEXT_PUBLIC_BASE_PATH needed - defaults to /openrag-fe
        ports:
        - containerPort: 3000
```

### Option 2: Override with ConfigMap

Create a ConfigMap to override the default:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openrag-frontend-config
  namespace: openrag
data:
  NEXT_PUBLIC_BASE_PATH: "/custom-path"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openrag-frontend
  namespace: openrag
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: langflowai/openrag-frontend:latest
        envFrom:
        - configMapRef:
            name: openrag-frontend-config
```

### Option 3: Disable Base Path (Local/Dev)

Set to empty string to disable the prefix:

```yaml
env:
- name: NEXT_PUBLIC_BASE_PATH
  value: ""
```

### Option 4: Helm Values

If using Helm, add to your `values.yaml`:

```yaml
frontend:
  env:
    # Omit to use default /openrag-fe
    # Or set to custom value:
    NEXT_PUBLIC_BASE_PATH: "/openrag-fe"
```

## Ingress Configuration

### For CPD Deployment with /openrag-fe prefix

Your Ingress should route both the base path and static assets:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openrag-ingress
  namespace: openrag
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: cpd-cpd-instance.apps.emry.cp.fyre.ibm.com
    http:
      paths:
      # Route /openrag-fe/* to frontend
      - path: /openrag-fe(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: openrag-frontend
            port:
              number: 3000
      # Route /_next/* to frontend (no prefix)
      - path: /_next(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: openrag-frontend
            port:
              number: 3000
```

## Verification

After deployment, verify the configuration:

1. **Check pod environment**:
   ```bash
   kubectl exec -it <frontend-pod> -n openrag -- env | grep NEXT_PUBLIC_BASE_PATH
   ```
   
   - If not set: defaults to `/openrag-fe`
   - If set to `""`: no prefix
   - If set to custom value: uses that value

2. **Test API calls**:
   In the browser Network tab, verify:
   - API calls go to `/openrag-fe/api/*` ✅
   - Static assets go to `/_next/*` (no prefix) ✅

3. **Test the application**:
   ```bash
   # Access the frontend
   curl https://cpd-cpd-instance.apps.emry.cp.fyre.ibm.com/openrag-fe/
   
   # Verify API endpoint
   curl https://cpd-cpd-instance.apps.emry.cp.fyre.ibm.com/openrag-fe/api/health
   ```

## Troubleshooting

### API calls going to wrong path

**Check the default**: If `NEXT_PUBLIC_BASE_PATH` is not set, it defaults to `/openrag-fe`

**Solution**: Set `NEXT_PUBLIC_BASE_PATH=""` to disable, or set to your desired path

### 404 errors on /_next/* static assets

**Cause**: Ingress not routing `/_next/*` paths to the frontend

**Solution**: Add a separate Ingress path rule for `/_next/*` (see Ingress Configuration above)

### Build failing in CI

**Cause**: Should NOT happen - no build-time basePath in `next.config.ts`

**Verification**: Ensure `next.config.ts` does NOT have `basePath` set

## Local Development

### With default base path (testing CPD setup):

```bash
# Uses default /openrag-fe
npm run dev
```

### Without base path (standard local dev):

```bash
export NEXT_PUBLIC_BASE_PATH=""
npm run dev
```

### With custom base path:

```bash
export NEXT_PUBLIC_BASE_PATH="/custom-path"
npm run dev
```

## Summary

✅ **Default to /openrag-fe**: No configuration needed for CPD deployments
✅ **Environment Override**: Set `NEXT_PUBLIC_BASE_PATH` in pod environment to customize
✅ **No Runtime Script**: Uses Next.js built-in environment variable support
✅ **Clean CI Builds**: No `basePath` in `next.config.ts`
✅ **API-Only Prefix**: Static assets remain at root paths