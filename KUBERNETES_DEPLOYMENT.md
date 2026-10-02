# Kubernetes Deployment Guide - Dynamic Base Path Configuration

This guide explains how to configure the OpenRAG frontend with a dynamic base path in Kubernetes deployments (e.g., CPD).

## Overview

The frontend now supports runtime configuration of the base path through environment variables, allowing the same container image to work in different deployment contexts without rebuilding.

## How It Works

1. **Runtime Configuration Script**: The container entrypoint runs `generate-runtime-config.sh` which reads the `NEXT_PUBLIC_BASE_PATH` environment variable and generates `/app/public/runtime-config.js`

2. **Client-Side Loading**: The `runtime-config.js` file is loaded in the HTML `<head>` and sets `window.__RUNTIME_CONFIG__.basePath`

3. **API Client**: The `lib/api-client.ts` utility checks for runtime config first, then falls back to build-time environment variables

## Kubernetes Configuration

### Option 1: ConfigMap

Create a ConfigMap with the base path:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openrag-frontend-config
  namespace: openrag
data:
  NEXT_PUBLIC_BASE_PATH: "/openrag-fe"
```

Reference it in your Deployment:

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
        envFrom:
        - configMapRef:
            name: openrag-frontend-config
        ports:
        - containerPort: 3000
```

### Option 2: Direct Environment Variable

Set the environment variable directly in the Deployment:

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
        env:
        - name: NEXT_PUBLIC_BASE_PATH
          value: "/openrag-fe"
        ports:
        - containerPort: 3000
```

### Option 3: Helm Values

If using Helm, add to your `values.yaml`:

```yaml
frontend:
  env:
    NEXT_PUBLIC_BASE_PATH: "/openrag-fe"
```

And reference in your Helm template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "openrag.fullname" . }}-frontend
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: {{ .Values.frontend.image }}
        env:
        {{- range $key, $value := .Values.frontend.env }}
        - name: {{ $key }}
          value: {{ $value | quote }}
        {{- end }}
```

## Ingress Configuration

Your Ingress should route traffic to the frontend with the base path:

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
      - path: /openrag-fe(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: openrag-frontend
            port:
              number: 3000
```

## Verification

After deployment, verify the configuration:

1. **Check the runtime config file**:
   ```bash
   kubectl exec -it <frontend-pod> -n openrag -- cat /opt/app-root/src/public/runtime-config.js
   ```
   
   Should show:
   ```javascript
   window.__RUNTIME_CONFIG__ = {
     basePath: '/openrag-fe'
   };
   ```

2. **Check browser console**:
   Open the browser developer console and run:
   ```javascript
   window.__RUNTIME_CONFIG__
   ```
   
   Should return:
   ```javascript
   { basePath: '/openrag-fe' }
   ```

3. **Verify API calls**:
   In the Network tab, check that API calls are going to `/openrag-fe/api/*` instead of `/api/*`

## Troubleshooting

### API calls still going to /api/* instead of /openrag-fe/api/*

**Cause**: Runtime config not loaded or environment variable not set

**Solution**:
1. Check pod environment: `kubectl exec -it <pod> -n openrag -- env | grep NEXT_PUBLIC_BASE_PATH`
2. Check runtime config file exists: `kubectl exec -it <pod> -n openrag -- ls -la /opt/app-root/src/public/runtime-config.js`
3. Restart the pod to regenerate config: `kubectl rollout restart deployment/openrag-frontend -n openrag`

### 404 errors on static assets

**Cause**: Next.js `basePath` in `next.config.ts` doesn't match the runtime base path

**Solution**: Ensure `next.config.ts` has `basePath: "/openrag-fe"` matching your deployment

### Runtime config not updating after changing environment variable

**Cause**: The config is generated at container startup, not dynamically

**Solution**: Restart the deployment to regenerate the config:
```bash
kubectl rollout restart deployment/openrag-frontend -n openrag
```

## Local Development

For local development without base path:

```bash
# Don't set NEXT_PUBLIC_BASE_PATH or set it to empty
unset NEXT_PUBLIC_BASE_PATH
npm run dev
```

For local development with base path (testing CPD-like setup):

```bash
export NEXT_PUBLIC_BASE_PATH=/openrag-fe
npm run dev
```

## Build-Time vs Runtime Configuration

| Aspect | Build-Time | Runtime |
|--------|-----------|---------|
| Set via | `NEXT_PUBLIC_BASE_PATH` during `npm run build` | `NEXT_PUBLIC_BASE_PATH` in pod environment |
| When applied | During container image build | At container startup |
| Flexibility | Requires rebuild to change | Can change per deployment |
| Use case | Local development, single deployment | Multi-tenant, dynamic deployments |

**Recommendation**: Use runtime configuration for Kubernetes deployments to maintain a single container image across environments.
