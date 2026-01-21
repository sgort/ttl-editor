# TriplyDB Publishing Feature Documentation

**Version:** 1.6.0  
**Last Updated:** 2026-01-17  
**Status:** ✅ Production Ready

---

## Overview

The CPSV Editor now includes direct publishing to TriplyDB via an integrated publish dialog. Users can upload service metadata directly from the editor to their TriplyDB instance without manual file handling.

### Key Features

- ✅ Direct publish from editor to TriplyDB
- ✅ Beautiful, professional publish dialog with progress tracking
- ✅ Real-time progress indicators with step-by-step status
- ✅ Test connection before publishing
- ✅ Automatic service synchronization via backend proxy
- ✅ Error handling with user-friendly messages
- ✅ Secure token storage in browser localStorage
- ✅ Cumulative data storage (all services in single dataset)

---

## Quick Start

### For Users

1. Click the **"Publish"** button (purple, bottom-right)
2. Enter your TriplyDB credentials:
   - Base URL: `https://api.open-regels.triply.cc`
   - Account: Your account name
   - Dataset: Target dataset name
   - API Token: Create in TriplyDB → User Settings → API Tokens
3. Optional: Click **"Test Connection"** to verify
4. Click **"Publish to TriplyDB"**
5. Watch progress tracking
6. Done! Dialog shows success and auto-closes

### For Developers

**Files to deploy:**

- `src/App.js` - Publish handler with progress tracking
- `src/components/PublishDialog.jsx` - Dialog component
- `src/utils/triplydbHelper.js` - TriplyDB API integration

**No environment variables needed** - all config stored in browser localStorage.

---

## Architecture

```
User clicks Publish
    ↓
PublishDialog opens (form)
    ↓
User configures credentials
    ↓
Optional: Test Connection
    ↓
User clicks "Publish to TriplyDB"
    ↓
handlePublish() in App.js:
  - Validates form (10%)
  - Generates TTL (30%)
  - Uploads to TriplyDB (50%)
  - Updates service via backend (85%)
  - Shows result (100%)
    ↓
Progress tracking in dialog
    ↓
Success/Warning/Error displayed
    ↓
Dialog auto-closes
    ↓
Message appears under title
```

---

## User Interface

### States

1. **Initial:** Form with all fields, Test Connection, Security warning
2. **Publishing:** Progress bar, step indicators (○ → ✓), spinner
3. **Success:** Green box, checkmark, "Dialog will close automatically..."
4. **Warning:** Orange box, warning details, auto-close
5. **Error:** Red box, error details, auto-close

### Auto-Close Timings

- Success: 2 seconds
- Warning: 3 seconds
- Error: 5 seconds

### Message Display (Top of Page)

After dialog closes:

- Green success with TriplyDB URL (auto-dismiss 10s)
- Red error with details (auto-dismiss 8s)
- Yellow warning (auto-dismiss 12s)
- All have close button (✕)

---

## Configuration

### User Configuration (via Dialog)

**Required Fields:**

- **Base URL:** `https://api.open-regels.triply.cc`
- **Account:** Your TriplyDB account/organization name
- **Dataset:** Target dataset name
- **API Token:** From TriplyDB → User Settings → API Tokens

**Storage:** Browser localStorage (client-side only)

### Backend Proxy (Optional)

**Purpose:** Provides cumulative SPARQL endpoint

**If unavailable:**

- Upload still succeeds
- Warning shown: "Service update failed"
- Data is accessible in TriplyDB

**Required for:** Graph accumulation pattern

---

## Testing Checklist

### ✅ Test 1: Successful Publish

- [ ] Enter valid credentials
- [ ] Click Publish
- [ ] See progress tracking (all 4 steps)
- [ ] See green success in dialog
- [ ] Dialog closes after 2s
- [ ] Green message appears with URL
- [ ] URL opens TriplyDB dataset
- [ ] Message auto-dismisses after 10s

### ✅ Test 2: Error Handling

- [ ] Enter invalid account name
- [ ] Click Publish
- [ ] See progress start
- [ ] See red error box in dialog
- [ ] Error shows: "Not found or unauthorized"
- [ ] Dialog closes after 5s
- [ ] Red message appears under title
- [ ] Message auto-dismisses after 8s

### ✅ Test 3: Test Connection

- [ ] Enter valid credentials
- [ ] Click "Test Connection"
- [ ] See green "Successfully connected"
- [ ] Close dialog
- [ ] Reopen dialog
- [ ] Verify test result is gone (clean state)

### ✅ Test 4: No Duplicate Messages

- [ ] Import TTL → see ONE message
- [ ] Publish → see ONE message
- [ ] Error → see ONE message

---

## Bug Fixes (v1.6.0)

### Fixed Issues

1. **Duplicate Messages** ✅
   - Was: 3 import messages, 2 publish messages
   - Now: 1 message per action

2. **Error Display** ✅
   - Was: Errors only at top of page
   - Now: Errors show inside dialog with red box

3. **Test Result Persistence** ✅
   - Was: "Successfully connected" stayed forever
   - Now: Clears when dialog closes

4. **Progress Tracking** ✅
   - Was: Console error "setPublishingState is not a function"
   - Now: Works perfectly with step indicators

---

## Troubleshooting

| Issue                       | Cause               | Solution                                   |
| --------------------------- | ------------------- | ------------------------------------------ |
| "Not found or unauthorized" | Invalid credentials | Check account, dataset, token in TriplyDB  |
| "Network error"             | Firewall blocking   | Verify HTTPS access to TriplyDB API        |
| "Service update failed"     | Backend proxy down  | Continue without it (data still published) |
| Stale test results          | Old version         | Update to v1.6.0                           |
| Duplicate messages          | Old version         | Update App.js                              |
| Error not in dialog         | Old version         | Update PublishDialog.jsx                   |

**Debug Mode:**

```javascript
// In src/utils/triplydbHelper.js
const DEBUG = true; // Enable console logging
```

---

## API Reference

### uploadToTriplyDB(config, ttlContent, filename)

Uploads TTL to TriplyDB with 3 automatic retries.

**Returns:**

```javascript
{
  success: true,
  message: "Published successfully! View at: https://...",
  url: "https://open-regels.triply.cc/datasets/..."
}
```

### testTriplyDBConnection(config)

Tests connection without uploading.

**Returns:**

```javascript
{
  success: true,
  message: "Successfully connected to TriplyDB"
}
```

---

## Security

### API Token Storage

- **Location:** Browser localStorage (client-side only)
- **Transmission:** Only to TriplyDB API (HTTPS)
- **Not logged** or stored server-side
- **User controls** via TriplyDB settings

### Best Practices

- Create tokens with minimal permissions
- Rotate tokens regularly
- Never commit tokens to version control
- Don't share tokens between users

### Warning Box

Yellow security reminder in dialog:

- Never share API tokens
- Don't commit to version control
- Rotate regularly

---

## Deployment Checklist

### Frontend

- [ ] HTTPS access to TriplyDB API
- [ ] CORS enabled for your domain
- [ ] Test with production credentials
- [ ] Monitor browser console
- [ ] Test all error scenarios

### Backend Proxy (Optional)

- [ ] Deploy Node.js backend
- [ ] Configure environment variables
- [ ] Test TriplyDB connection
- [ ] Verify service update works
- [ ] Configure CORS

### Users

- [ ] Document API token creation
- [ ] Explain security (local storage)
- [ ] Provide TriplyDB instance URL
- [ ] Explain cumulative data storage

---

## Known Limitations

### Graph Accumulation Pattern

**Background:** TriplyDB creates auto-numbered graphs (graph1, graph2...) instead of accumulating in single graph.

**Attempts made:**

- SPARQL UPDATE → 403 Forbidden
- HTTP PUT → 405 Not Allowed
- Services API → Still auto-numbered
- Named graphs → Still auto-numbered

**Current solution:** Backend proxy queries all graphs, presents unified view.

**User impact:** Transparent - data appears cumulative.

**See:** `docs/TRIPLYDB_GRAPH_ACCUMULATION.md` for technical details

---

## Version History

### v1.6.0 (2026-01-17) ⭐ Current

- ✅ Complete publishing feature
- ✅ Beautiful dialog with progress tracking
- ✅ Fixed: Duplicate messages
- ✅ Fixed: Error display in dialog
- ✅ Fixed: Test result persistence
- ✅ Network retry logic (3 attempts)
- ✅ Auto-close states
- ✅ Production ready

---

## Support

**Documentation:**

- This file: `/docs/PUBLISH.md`
- Graph details: `/docs/TRIPLYDB_GRAPH_ACCUMULATION.md`

**Troubleshooting:**

1. Check Troubleshooting section
2. Enable debug mode
3. Check browser console
4. Contact maintainer

---

**Status:** ✅ Production Ready  
**Last Updated:** 2026-01-17
