# Deployment Edge Case Verification

## All Possible VPS States & Expected Behavior

### **EDGE CASE 1: Fresh VPS (Nothing Running)**
**State:**
- Postgres: DOWN
- Redis: DOWN  
- Nginx: DOWN
- Blue: DOWN
- Green: DOWN
- State file: Doesn't exist (defaults to "blue")

**Execution Trace:**
```bash
1. analyze_and_fix_state()
   ├─ Detects: All DOWN
   ├─ Calls: start_base_services()
   │   ├─ Starts: postgres, redis, meilisearch, portainer, uptime-kuma
   │   └─ Starts: nginx (will use existing nginx.conf or fail gracefully)
   ├─ Detects: No deployment containers
   ├─ Skips: Recovery (lets deploy() handle it)
   └─ Returns: 0

2. get_current_deployment()
   ├─ No containers running
   └─ Returns: "blue" (from file default)

3. get_target_deployment()  
   └─ Returns: "green" (opposite of blue)

4. deploy()
   ├─ Cold start check: No medusa_ containers → TRUE
   ├─ Creates: nginx-green.conf → nginx.conf
   ├─ Starts: base services (already running, no-op)
   ├─ Starts: GREEN deployment
   ├─ Waits: GREEN healthy
   ├─ Switches: nginx to green
   │   ├─ Stops nginx
   │   ├─ Removes nginx
   │   └─ Creates nginx with green config
   ├─ Updates: state file to "green"
   └─ Stops: blue (nothing to stop)
```

**Result:** ✅ Green running, nginx pointing to green

---

### **EDGE CASE 2: Blue Running, Nginx Down**
**State:**
- Postgres: UP
- Redis: UP
- Nginx: DOWN
- Blue: UP (healthy)
- Green: DOWN  
- State file: "green" (mismatch!)

**Execution Trace:**
```bash
1. analyze_and_fix_state()
   ├─ Detects: Postgres=UP, Redis=UP, Nginx=DOWN
   ├─ Calls: start_base_services()
   │   └─ Starts: nginx (will fail - wrong config references green)
   ├─ Detects: Blue running, file says green
   ├─ Corrects: state file to "blue"
   ├─ Generates: nginx-blue.conf, nginx-green.conf
   ├─ Updates: nginx.conf from blue config
   ├─ Nginx down: skip reload
   └─ Returns: 0

2. get_current_deployment() → "blue" ✓

3. get_target_deployment() → "green" ✓

4. deploy()
   ├─ Cold start: FALSE (blue exists)
   ├─ Starts: base services (nginx will start with blue config now) ✓
   ├─ Starts: GREEN deployment ✓
   ├─ Waits: GREEN healthy ✓
   ├─ Switches: nginx to green ✓
   ├─ Updates: state file to "green" ✓
   └─ Stops: blue ✓
```

**Result:** ✅ Green running, nginx pointing to green

---

### **EDGE CASE 3: Nginx in Restart Loop**
**State:**
- Postgres: UP
- Redis: UP
- Nginx: RESTARTING (crash loop)
- Blue: UP
- Green: DOWN
- State file: "blue"

**Execution Trace:**
```bash
1. analyze_and_fix_state()
   ├─ Detects: Nginx status != "running" 
   ├─ Calls: start_base_services() (nginx already exists, skip)
   ├─ Generates: configs
   ├─ Updates: nginx.conf to blue
   ├─ Tries: docker restart medusa_nginx (fails, still restarting)
   └─ Returns: 0

2. deploy()
   ├─ Starts: base services (nginx still restarting)
   ├─ Starts: GREEN ✓
   ├─ Waits: GREEN healthy ✓
   ├─ Switches nginx to green:
   │   ├─ Detects: container_state == "restarting"
   │   ├─ Stops: nginx (breaks restart loop) ✓
   │   ├─ Removes: nginx ✓
   │   ├─ Creates: fresh nginx with green config ✓
   │   └─ Waits: healthy ✓
   ├─ Stops: blue ✓
   └─ Success ✓
```

**Result:** ✅ Green running, nginx recovered and pointing to green

---

### **EDGE CASE 4: Both Blue AND Green Running**
**State:**
- Blue: UP
- Green: UP
- State file: "blue"

**Execution Trace:**
```bash
1. analyze_and_fix_state()
   ├─ Detects: Both running (invalid state!)
   ├─ File says: "blue"
   ├─ Keeps: blue
   ├─ Stops: green ✓
   └─ Returns: 0

2. get_current_deployment() → "blue" ✓

3. deploy()
   ├─ Starts: GREEN (fresh start) ✓
   └─ Continues normal flow ✓
```

**Result:** ✅ Proper blue-green deployment

---

### **EDGE CASE 5: Only Green Running (Should Deploy Blue)**
**State:**
- Green: UP
- Blue: DOWN
- State file: "green"

**Execution Trace:**
```bash
1. analyze_and_fix_state()
   ├─ State matches (green in file, green running)
   ├─ No corrections needed
   └─ Returns: 0

2. get_current_deployment() → "green" ✓

3. get_target_deployment() → "blue" ✓

4. deploy()
   ├─ Starts: BLUE (green keeps running) ✓
   ├─ Switches: nginx to blue ✓
   ├─ Stops: green ✓
   └─ Success ✓
```

**Result:** ✅ Blue running, nginx pointing to blue

---

### **EDGE CASE 6: Deployment Fails Health Check**
**State:**
- Blue: UP (healthy)
- Deploying: Green
- Green health check: FAIL

**Execution Trace:**
```bash
4. deploy()
   ├─ Starts: GREEN
   ├─ Health check: FAIL after 120s
   ├─ Cleanup: stop_deployment("green") ✓
   ├─ Exit: 1
   └─ Blue still running ✓
```

**Result:** ✅ Blue keeps serving traffic, green cleaned up

---

### **EDGE CASE 7: Nginx Switch Fails**
**State:**
- Blue: UP
- Green: UP (healthy)
- Nginx switch: FAIL

**Execution Trace:**
```bash
4. deploy()
   ├─ Starts: GREEN ✓
   ├─ Health: GREEN healthy ✓
   ├─ Switch nginx: FAIL
   ├─ Calls: rollback()
   │   ├─ Previous: blue
   │   ├─ Switch nginx to blue
   │   └─ Returns based on result
   ├─ Cleanup: stop_deployment("green")
   └─ Exit: 1
```

**ISSUE FOUND:** Rollback tries to switch to "previous" but previous might be DOWN!

Let me check rollback logic:

<function_calls>
<invoke name="read_file">
<parameter name="target_file">busbasisberlin/scripts/deploy.sh
