# TriplyDB Publishing Feature - Complete Documentation

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Development Journey](#development-journey)
4. [Technical Details](#technical-details)
5. [Options Investigated](#options-investigated)
6. [Known Limitations](#known-limitations)
7. [Future Possibilities](#future-possibilities)
8. [Troubleshooting](#troubleshooting)
9. [References](#references)

---

### Features

**One-Click Publishing**
- Purple "Publish" button next to Validate and Download
- Direct upload to TriplyDB without leaving the editor

**Configuration Dialog**
- TriplyDB Base URL (customizable)
- Account name (customizable)
- Dataset name (customizable)
- API token with show/hide toggle
- Persistent configuration (saved in browser)

**Connection Testing**
- "Test Connection" button
- Real-time feedback before publishing
- Validates credentials without uploading

**Validation Before Upload**
- Runs same validation as Download button
- Prevents uploading invalid data
- Shows clear error messages

**Real-Time Status**
- "Publishing to TriplyDB..." message
- Success notification with dataset URL
- Error messages with specific details
- Auto-hide after 10 seconds

**Security**
- API tokens stored in browser localStorage only
- No server-side token storage
- HTTPS-only communication
- Show/hide toggle for token visibility

**Data Integrity**
- All service metadata preserved
- DMN data maintained (186 lines)
- CPRMV rules included
- Temporal rules preserved

---

## Current Implementation

### Architecture

**Files Created:**
1. `src/utils/triplydbHelper.js` - TriplyDB API integration
2. `src/components/PublishDialog.jsx` - Configuration UI

**Files Modified:**
1. `src/hooks/useEditorState.js` - Added TriplyDB config state
2. `src/utils/index.js` - Exported TriplyDB functions
3. `src/App.js` - Added Publish button and logic
4. `src/data/changelog.json` - Documented v1.6.0

### How It Works

```
User clicks "Publish"
        ↓
Opens PublishDialog
        ↓
User enters/confirms credentials
        ↓
(Optional) Tests connection
        ↓
Clicks "Publish to TriplyDB"
        ↓
Validates TTL content
        ↓
Generates TTL from form data
        ↓
Creates File object
        ↓
Uploads via FormData to /jobs endpoint
        ↓
TriplyDB creates new graph
        ↓
Success! Shows dataset URL
```

### API Endpoint

**Working Endpoint:**
```
POST https://api.open-regels.triply.cc/datasets/{account}/{dataset}/jobs
```

**Method:** POST with FormData  
**Content-Type:** multipart/form-data  
**Authentication:** Bearer token in Authorization header

**Request:**
```javascript
const formData = new FormData();
formData.append('file', fileObject);

fetch(uploadUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`
  },
  body: formData
});
```

**Response (Success):**
```json
{
  "type": "upload",
  "status": "indexing",
  "jobId": "...",
  "datasetId": "...",
  "files": [{
    "fileName": "aow-leeftijd.ttl",
    "fileSize": 13113
  }],
  "graphNames": ["graph:default-1"]
}
```

### Current Behavior

**Each publish creates a new graph:**
```
Publish #1 → graph:default-1 (208 triples)
Publish #2 → graph:default-2 (208 triples)
Publish #3 → graph:default-3 (208 triples)
```

**Result:**
- ✅ Each service gets its own graph
- ✅ Data is isolated and safe
- ⚠️  Multiple graphs accumulate in dataset
- ⚠️  Services may need manual updates to use latest graph

---

## Development Journey

### Phase 1: Initial Implementation (Success)

**Goal:** Get basic publishing working

**Approach:** Use File object upload to `/jobs` endpoint

**Result:** ✅ **SUCCESS**
- Published successfully to TriplyDB
- File uploaded: 13,113 bytes
- Status: 200 OK
- Data queryable via backend API

**Code:**
```javascript
const file = new File([ttlContent], filename, {
  type: 'text/turtle;charset=utf-8'
});

const formData = new FormData();
formData.append('file', file);

const response = await fetch(uploadUrl, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiToken}` },
  body: formData
});
```

**Key Learning:** File objects work better than Blob objects for TriplyDB uploads.

---

### Phase 2: Attempting Single-Graph Accumulation (Failed)

#### Requirement Change

Desired behavior:
```
Publish Service A → graph:default (209 triples)
Publish Service B → graph:default (418 triples) ← Accumulates!
Publish Service C → graph:default (627 triples) ← All three!
```

**Goal:** All services in one graph, not separate graphs.

---

#### Attempt 1: POST to /graphs/default Endpoint

**Approach:** Upload directly to named graph endpoint

**Code Attempted:**
```javascript
const graphUploadUrl = `${baseUrl}/datasets/${account}/${dataset}/graphs/default`;

fetch(graphUploadUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'text/turtle'
  },
  body: ttlContent
});
```

**Result:** ❌ **FAILED**
```
405 Method Not Allowed
Response: {"message":"Method Not Allowed."}
```

**Why:** TriplyDB doesn't support POST to `/graphs/{name}` endpoint

---

#### Attempt 2: Named Graph Parameter in /jobs

**Approach:** Use `/jobs` endpoint with `defaultGraphName` parameter

**Code Attempted:**
```javascript
const uploadUrl = `${baseUrl}/datasets/${account}/${dataset}/jobs?defaultGraphName=default`;

formData.append('defaultGraphName', 'default');
```

**Result:** ❌ **FAILED**
```
400 Bad Request
Response: {"message":"'default' is not a valid IRI."}
```

**Why:** Graph names must be full IRIs (URIs), not simple strings

---

#### Attempt 3: Named Graph with Full IRI

**Approach:** Use proper IRI for graph name

**Code Attempted:**
```javascript
const graphIRI = 'graph:default';
const uploadUrl = `${baseUrl}/datasets/${account}/${dataset}/jobs?defaultGraphName=${encodeURIComponent(graphIRI)}`;

formData.append('defaultGraphName', graphIRI);
```

**Result:** ❌ **PARTIAL SUCCESS, BUT...**
```
200 OK - Upload succeeded
But created: graph:default-1, graph:default-2, graph:default-3
```

**Why:** The `/jobs` endpoint always creates new graphs to avoid conflicts, even with `defaultGraphName` parameter. It auto-numbers them to prevent overwrites.

---

#### Attempt 4: SPARQL UPDATE with INSERT DATA

**Approach:** Use SPARQL UPDATE to insert directly into specific graph

**Code Attempted:**
```javascript
const sparqlUrl = `${baseUrl}/datasets/${account}/${dataset}/sparql`;

// Convert @prefix to PREFIX
const sparqlUpdate = `
PREFIX cpsv: <http://purl.org/vocab/cpsv#>
PREFIX dct: <http://purl.org/dc/terms/>

INSERT DATA {
  GRAPH <https://regels.overheid.nl/graphs/default> {
    <service-uri> a cpsv:PublicService ;
        dct:title "..."@nl .
  }
}
`;

fetch(sparqlUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/sparql-update'
  },
  body: sparqlUpdate
});
```

**Result:** ❌ **FAILED**
```
403 Forbidden
Response: {"message":"SPARQL Update is not enabled on this instance."}
```

**Why:** The TriplyDB instance doesn't have SPARQL UPDATE enabled (requires admin configuration)

**Note:** SPARQL syntax conversion worked perfectly (extracted `@prefix`, converted to `PREFIX`, placed outside INSERT DATA block), but the endpoint is disabled on this TriplyDB instance.

---

### Phase 3: Current Solution (Working)

**Decision:** Accept the current `/jobs` behavior and keep working implementation

**Rationale:**
1. ✅ Publishing works reliably
2. ✅ Data integrity is perfect
3. ✅ Backend can query all graphs
4. ⚠️  Multiple graphs are a management issue, not a blocker
5. 🔮 Can revisit when TriplyDB support enables SPARQL UPDATE

**Current State:**
- File in `src/utils/triplydbHelper.js` uses `/jobs` endpoint
- File in `src/utils/triplydbHelper_SPARQL.js` contains SPARQL UPDATE code (for future)
- Documentation includes both approaches

---

## Options Investigated

### Summary Table

| Approach | Endpoint | Method | Result | Reason |
|----------|----------|--------|--------|--------|
| **File Upload** | `/jobs` | POST FormData | ✅ **WORKS** | Standard upload, creates new graphs |
| **Named Graph POST** | `/graphs/default` | POST raw TTL | ❌ 405 Error | Method not allowed on this endpoint |
| **Named Graph Param** | `/jobs?defaultGraphName=default` | POST FormData | ❌ 400 Error | "default" is not valid IRI |
| **Named Graph IRI** | `/jobs?defaultGraphName=graph:default` | POST FormData | ⚠️  Creates numbered | Auto-numbers to avoid conflicts |
| **SPARQL UPDATE** | `/sparql` | POST SPARQL | ❌ 403 Forbidden | SPARQL UPDATE disabled on instance |

### Detailed Analysis

#### Option 1: File Upload (Current)

**Pros:**
- ✅ Works reliably
- ✅ Simple implementation
- ✅ No special configuration needed
- ✅ Data integrity guaranteed
- ✅ TriplyDB handles indexing automatically

**Cons:**
- ⚠️  Creates new graph for each upload
- ⚠️  Graphs accumulate (graph:default-1, graph:default-2, etc.)
- ⚠️  Service may need manual update to use latest graph

**Best For:**
- Current use case
- Individual service files
- When data isolation is important

---

#### Option 2: SPARQL UPDATE (Future)

**Pros:**
- ✅ Direct control over graph
- ✅ Can accumulate in single graph
- ✅ Can delete/replace specific triples
- ✅ Standard RDF approach

**Cons:**
- ❌ Requires SPARQL UPDATE to be enabled
- ⚠️  More complex syntax (Turtle → SPARQL conversion)
- ⚠️  Need to handle prefix declarations
- ⚠️  Requires careful triple management

**Best For:**
- When accumulation in single graph is required
- When updating specific services without affecting others
- Production deployment with SPARQL UPDATE enabled

---

## Known Limitations

### 1. Multiple Graphs Created

**Issue:** Each publish creates a new numbered graph

**Impact:**
- Dataset accumulates graphs over time
- May need periodic cleanup
- Services may need manual updates

**Workarounds:**
- Manually delete old graphs via TriplyDB portal
- Manually update services to use latest graph
- Periodic cleanup scripts

**Future Solution:** Enable SPARQL UPDATE on TriplyDB instance

---

### 2. No Automatic Service Update

**Issue:** Published data creates new graph, but service still points to old graph

**Impact:**
- Backend queries may return stale data until service updated
- Manual "Click here to update" required in TriplyDB

**Workarounds:**
- Document the manual update step
- Check for service updates after publishing
- Contact TriplyDB to enable SPARQL UPDATE

**Future Solution:** 
- Enable SPARQL UPDATE for direct graph insertion
- Or use TriplyDB API to update service programmatically

---

### 3. Token Security

**Issue:** API tokens stored in browser localStorage

**Impact:**
- Tokens accessible via browser DevTools
- Not synced across browsers/devices
- Lost if localStorage cleared

**Workarounds:**
- User must remember to rotate tokens
- Re-enter token if switching browsers
- Keep tokens secure and don't share

**Future Solution:** 
- Server-side token management
- OAuth integration
- Token encryption

---

### 4. No Version History

**Issue:** New uploads create new graphs, but no version tracking

**Impact:**
- Hard to know which graph is "current"
- Can't easily roll back to previous version
- Graph names are auto-generated

**Workarounds:**
- Use descriptive dataset names
- Keep track of publish timestamps
- Download copies before publishing updates

**Future Solution:**
- Versioning system
- Graph naming conventions
- Metadata tracking

---

## Future Possibilities

### Short Term (Next Sprint)

1. **Add "View in TriplyDB" Link**
   - After successful publish, show direct link to dataset
   - Opens in new tab
   - Easy verification

2. **Publish History Log**
   - Track publish timestamps
   - Show which services were published
   - Store in localStorage

3. **Batch Publishing**
   - Select multiple services
   - Publish all at once
   - Progress indicator

### Medium Term (Next Quarter)

4. **Enable SPARQL UPDATE**
   - Contact TriplyDB support
   - Get SPARQL UPDATE enabled on instance
   - Implement single-graph accumulation
   - Update/replace functionality

5. **Graph Management UI**
   - List all graphs in dataset
   - Delete old graphs
   - Rename graphs
   - Set "current" graph

6. **Service Auto-Update**
   - After publish, automatically update service to use new graph
   - Requires TriplyDB services API integration
   - Eliminates manual step

### Long Term (Roadmap)

7. **Versioning System**
   - Track versions of each service
   - Compare versions
   - Roll back to previous version
   - Version metadata

8. **Multi-Dataset Support**
   - Publish to different datasets
   - Dataset selection dropdown
   - Per-dataset configurations

9. **Scheduled Publishing**
   - Cron-like scheduling
   - Automatic re-publishing
   - Update triggers

10. **Conflict Resolution**
    - Detect duplicate services
    - Merge or replace options
    - User confirmation for overwrites

---

## Troubleshooting

### Common Issues

#### Issue: Connection Test Fails

**Symptoms:**
```
Authentication failed. Please check your API token.
```

**Solutions:**
1. Verify API token is correct
2. Check token hasn't expired
3. Ensure token has write permissions
4. Try generating new token in TriplyDB

---

#### Issue: Validation Fails Before Publish

**Symptoms:**
```
Validation failed: Service identifier is required
```

**Solutions:**
1. Fill in all required fields (marked with *)
2. Check Service tab for identifier
3. Verify organization details
4. Review validation messages

---

#### Issue: Upload Succeeds But Backend Shows Old Data

**Symptoms:**
- Publish shows success
- Backend API returns old/missing data
- TriplyDB shows multiple graphs

**Solutions:**
1. Check TriplyDB Services tab
2. Click "Click here to update" if shown
3. Verify which graph the service is using
4. Wait a few seconds for indexing to complete

---

#### Issue: Filename Has Double Extension

**Symptoms:**
- `aow-leeftijd.ttl.ttl`

**Solution:**
Already fixed in current version. If still occurring:
```javascript
// In handlePublish, don't add .ttl
const filename = sanitizeFilename(service.identifier);
// Helper adds it automatically
```

---

### Debug Mode

**Enable console logging:**
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Look for messages starting with:
   - `=== TriplyDB Upload Debug Info ===`
   - `Upload URL:`
   - `Response received:`

**Useful log messages:**
```javascript
console.log('Content length:', ttlContent.length);
console.log('File size:', file.size);
console.log('Response status:', response.status);
console.log('Response text:', responseText);
```

---

## References

### Documentation

- [TriplyDB API Documentation](https://docs.triply.cc/triply-api)
- [CPSV-AP 3.2.0 Specification](https://semiceu.github.io/CPSV-AP/releases/3.2.0/)
- [SPARQL 1.1 Update](https://www.w3.org/TR/sparql11-update/)
- [RDF Turtle Syntax](https://www.w3.org/TR/turtle/)

### Project Files

**Implementation:**
- `src/utils/triplydbHelper.js` - Current working implementation
- `src/components/PublishDialog.jsx` - Configuration UI
- `src/hooks/useEditorState.js` - State management
- `src/App.js` - Main integration

---
